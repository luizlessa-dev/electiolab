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
  timeout_ms: number;
  max_retries: number;
}

export interface AgentMemory {
  vector?: number[];
  metadata?: Record<string, any>;
  timestamp: string;
}

export abstract class RufloAgent {
  protected config: AgentConfig;
  protected supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor(config: AgentConfig) {
    this.config = config;
  }

  abstract run(): Promise<any>;

  protected async logAudit(result: any, error?: Error) {
    const audit = {
      agent_id: this.config.id,
      run_date: new Date().toISOString(),
      status: error ? "error" : "success",
      details: error ? { error: error.message } : result,
    };

    console.log(`[${this.config.id}] audit:`, audit);

    // TODO: Insert into data_source_audit table
    // await this.supabase.from("data_source_audit").insert({ ... });
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
