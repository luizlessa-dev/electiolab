/**
 * Webhook utilities — retry logic, fallback handling, error tracking
 * Used by agents to notify downstream (1→2, 2→3, 3→alerting)
 */

interface WebhookPayload {
  agent: string;
  timestamp: string;
  data: Record<string, any>;
  attempt?: number;
}

interface WebhookResult {
  ok: boolean;
  status_code?: number;
  error?: string;
  attempts: number;
  duration_ms: number;
}

/**
 * Send webhook with exponential backoff retry (3 attempts: 1s, 2s, 4s)
 */
export async function sendWebhookWithRetry(
  url: string,
  payload: WebhookPayload,
  maxAttempts: number = 3
): Promise<WebhookResult> {
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ElectioLab-Ruflo/1.0",
          "X-Webhook-Attempt": String(attempt),
        },
        body: JSON.stringify({
          ...payload,
          attempt,
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout per attempt
      });

      if (response.ok) {
        return {
          ok: true,
          status_code: response.status,
          attempts: attempt,
          duration_ms: Date.now() - startTime,
        };
      }

      // Non-2xx response
      const text = await response.text();
      lastError = new Error(
        `HTTP ${response.status}: ${text.substring(0, 100)}`
      );

      if (attempt === maxAttempts) {
        return {
          ok: false,
          status_code: response.status,
          error: lastError.message,
          attempts: attempt,
          duration_ms: Date.now() - startTime,
        };
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      if (attempt === maxAttempts) {
        return {
          ok: false,
          error: lastError.message,
          attempts: attempt,
          duration_ms: Date.now() - startTime,
        };
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    const delayMs = Math.pow(2, attempt - 1) * 1000;
    console.log(
      `[webhook] Retry ${attempt}/${maxAttempts} in ${delayMs}ms: ${url}`
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return {
    ok: false,
    error: lastError?.message || "Unknown error",
    attempts: maxAttempts,
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Queue webhook to database for async retry (if immediate fails)
 * Assumes table: webhook_queue (id, url, payload, status, attempts, next_retry_at, error)
 */
export async function queueWebhook(
  url: string,
  payload: WebhookPayload,
  supabase: any
): Promise<void> {
  try {
    await supabase.from("webhook_queue").insert({
      url,
      payload,
      status: "pending",
      attempts: 0,
      next_retry_at: new Date(),
      created_at: new Date(),
    });
  } catch (e) {
    console.error("[webhook:queue] error:", e);
  }
}

/**
 * Fallback: Send alert email if webhook fails (via Resend or similar)
 */
export async function sendFallbackAlert(
  agent: string,
  error: string,
  payload: WebhookPayload
): Promise<void> {
  try {
    // TODO: Wire Resend integration
    console.warn(`[webhook:fallback] Alert for ${agent}: ${error}`);
    console.warn(`[webhook:fallback] Payload:`, JSON.stringify(payload, null, 2));

    // For now, just log. In production:
    // const { data, error: emailError } = await resend.emails.send({
    //   from: "alerts@electiolab.com",
    //   to: "team@electiolab.com",
    //   subject: `⚠️ Agent ${agent} webhook failed`,
    //   html: `<p>Agent: ${agent}</p><p>Error: ${error}</p>`,
    // });
  } catch (e) {
    console.error("[webhook:fallback] error:", e);
  }
}

/**
 * Log webhook attempt to database (for monitoring/debugging)
 */
export async function logWebhookAttempt(
  url: string,
  result: WebhookResult,
  agent: string,
  supabase: any
): Promise<void> {
  try {
    await supabase.from("webhook_logs").insert({
      agent,
      url,
      ok: result.ok,
      status_code: result.status_code,
      error: result.error,
      attempts: result.attempts,
      duration_ms: result.duration_ms,
      created_at: new Date(),
    });
  } catch (e) {
    console.error("[webhook:log] error:", e);
  }
}
