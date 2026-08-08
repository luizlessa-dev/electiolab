/**
 * Agent 1: TSE Ingestão
 *
 * Runs: Daily 10h UTC
 * Input: TSE CDN ZIP URL
 * Output: Upsert pesqele_registry + update pesqele_missing
 *
 * Status: 🚧 SCAFFOLD (implementation next)
 */

import { RufloAgent, AgentConfig } from "./base";

export class TseIngestAgent extends RufloAgent {
  constructor() {
    const config: AgentConfig = {
      name: "TSE Ingestão",
      id: "tse-ingestion-001",
      timeout_ms: 300000, // 5 min for ZIP download + parse
      max_retries: 4,
    };
    super(config);
  }

  async run() {
    console.log(`[${this.config.id}] Starting...`);

    try {
      const result = await this.retry(async () => {
        // TODO: Implement
        // 1. Download ZIP from TSE CDN
        // 2. Parse CSV
        // 3. Upsert pesqele_registry
        // 4. Call update_pesqele_missing() RPC
        // 5. Return { ok, upserted_count, missing_count, checksum }

        throw new Error("Not yet implemented");
      });

      await this.logAudit(result);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      await this.logAudit(null, error);
      throw error;
    }
  }
}

// Export for webhook handler
export async function handleTseIngestWebhook(result: any) {
  console.log("[tse-complete webhook] received:", result);
  // TODO: Trigger Agent 2
}
