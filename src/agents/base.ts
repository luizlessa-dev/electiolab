/**
 * Ruflo Agent Base Class
 * 
 * Shared by all 3 agents:
 * - Agent 1: TSE Ingestão
 * - Agent 2: Institutos (Paralelo)
 * - Agent 3: Validação + Alertas
 */

import { createClient } from "@supabase/supabase-js";

export interface AgentConfig {
  name: string;
  id: string;
  agent_name: string; // matches agent_runs.agent_name / VALID_AGENTS (health endpoint)
  timeout_ms: number;
  max_retries: number;
}

export interface AgentMemory {
  vector?: number[];
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Fields `logAudit` reads to populate the `agent_runs` row. Each agent's
 * concrete run() result (TseIngestResult, InstitutosScrapeResult,
 * ValidacaoRunResult — one shape per subclass, see agent-1/2/3) only needs
 * to be structurally compatible with this subset; extra agent-specific
 * fields (e.g. `alerts`, `completed`, `checksum_sha256`) are untouched by
 * logAudit and pass through via `details`/`output`.
 */
export interface AgentRunResult {
  ok?: boolean;
  duration_ms?: number;
  row_count?: number;
  upserted_count?: number;
  poll_count?: number;
  total_polls_inserted?: number;
  completed_count?: number;
  failed_count?: number;
}

export abstract class RufloAgent<TResult extends AgentRunResult = AgentRunResult> {
  protected config: AgentConfig;
  protected supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor(config: AgentConfig) {
    this.config = config;
  }

  abstract run(): Promise<TResult>;

  protected async logAudit(result: TResult | null, error?: Error) {
    const audit = {
      agent_id: this.config.id,
      run_date: new Date().toISOString(),
      status: error ? "error" : "success",
      details: error ? { error: error.message } : result,
    };

    console.log(`[${this.config.id}] audit:`, audit);

    const { error: insertError } = await this.supabase.from("agent_runs").insert({
      agent_name: this.config.agent_name,
      success: !error,
      error: error?.message ?? null,
      duration_ms: result?.duration_ms ?? null,
      row_count: result?.row_count ?? null,
      upserted_count: result?.upserted_count ?? null,
      poll_count: result?.total_polls_inserted ?? result?.poll_count ?? null,
      completed_count: result?.completed_count ?? null,
      failed_count: result?.failed_count ?? null,
      output: error ? { error: error.message } : result,
    });

    if (insertError) {
      console.warn(`[${this.config.id}] failed to insert agent_runs:`, insertError.message);
    }
  }

  protected async retry<T>(
    fn: () => Promise<T>,
    backoffMs: number[] = [0, 5000, 10000, 30000]
  ): Promise<T> {
    for (let attempt = 0; attempt < backoffMs.length; attempt++) {
      try {
        if (attempt > 0) {
          console.log(
            `[${this.config.id}] Retry attempt ${attempt}, waiting ${backoffMs[attempt]}ms`
          );
          await new Promise((r) => setTimeout(r, backoffMs[attempt]));
        }
        return await fn();
      } catch (e) {
        if (attempt === backoffMs.length - 1) throw e;
        console.warn(`[${this.config.id}] Attempt ${attempt + 1} failed:`, e);
      }
    }
    throw new Error("All retry attempts exhausted");
  }
}
