/**
 * Rate limit por IP para endpoints públicos.
 *
 * Uso:
 *   const rl = await checkIpRate(request, "newsletter", { limit: 5, windowSeconds: 3600 });
 *   if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rl.headers });
 *
 * Privacidade: armazena SHA-256(IP), não o IP em claro.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

type CheckOpts = { limit?: number; windowSeconds?: number };

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: Date;
  headers: Record<string, string>;
};

function getClientIp(request: Request): string {
  // Vercel/Cloudflare/proxies comuns. Vercel popula x-forwarded-for + x-real-ip.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function checkIpRate(
  request: Request,
  scope: string,
  opts: CheckOpts = {},
): Promise<RateLimitResult> {
  const limit = opts.limit ?? 30;
  const windowSeconds = opts.windowSeconds ?? 3600;
  const ipHash = hashIp(getClientIp(request));

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await sb.rpc("check_ip_rate", {
    p_ip_hash: ipHash,
    p_scope: scope,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  // Em caso de erro, fail-open (permite request) para não derrubar o site se a tabela quebrar.
  if (error || !data?.[0]) {
    return {
      allowed: true,
      count: 0,
      remaining: limit,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
      headers: {},
    };
  }

  const row = data[0] as { allowed: boolean; count: number; remaining: number; reset_at: string };
  const resetAt = new Date(row.reset_at);

  return {
    allowed: row.allowed,
    count: row.count,
    remaining: row.remaining,
    resetAt,
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(Math.max(0, row.remaining)),
      "X-RateLimit-Reset": resetAt.toISOString(),
      ...(row.allowed ? {} : { "Retry-After": String(Math.max(1, Math.floor((resetAt.getTime() - Date.now()) / 1000))) }),
    },
  };
}
