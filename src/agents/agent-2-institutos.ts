/**
 * Agent 2: Institutos Scraping (Paralelo)
 *
 * Runs: Every 6h (triggered by Agent 1 webhook)
 * Input: List of institutes (Datafolha, Ipec, Quaest, PoderData, AtlasIntel, ...)
 * Output: Upsert polls + election_results_candidatos
 *
 * Status: 🚧 SCAFFOLD (implementation next)
 */

import { RufloAgent, AgentConfig } from "./base";

export interface InstituteConfig {
  id: string;
  url: string;
  strategies: string[]; // json | html | regex
  timeout_ms: number;
}

const INSTITUTES: InstituteConfig[] = [
  {
    id: "datafolha",
    url: "https://www.datafolha.com.br/pesquisas-eleitorais/",
    strategies: ["json", "html", "regex"],
    timeout_ms: 30000,
  },
  {
    id: "ipec",
    url: "https://www.ipec.org.br/pesquisas-eleitorais/",
    strategies: ["json", "html", "regex"],
    timeout_ms: 30000,
  },
  {
    id: "quaest",
    url: "https://quaest.com.br/",
    strategies: ["json", "html", "regex"],
    timeout_ms: 30000,
  },
  // TODO: Add remaining 7+ institutes
];

export class InstitutusScrapeAgent extends RufloAgent {
  constructor(private parallelism: number = 5) {
    const config: AgentConfig = {
      name: "Institutos Scraping",
      id: "institutos-scraping-001",
      timeout_ms: 600000, // 10 min for all institutes
      max_retries: 2,
    };
    super(config);
  }

  async run() {
    console.log(
      `[${this.config.id}] Starting with parallelism=${this.parallelism}...`
    );

    try {
      const result = await this.runParallel();
      await this.logAudit(result);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      await this.logAudit(null, error);
      throw error;
    }
  }

  private async runParallel() {
    // TODO: Implement
    // 1. Create queue with parallelism limit
    // 2. For each institute:
    //    a. Fetch page
    //    b. Try strategies (json → html → regex)
    //    c. Normalize data
    //    d. Upsert polls + election_results_candidatos
    // 3. Track failures for memória HNSW
    // 4. Return { ok, completed_count, failed_count, total_polls_inserted }

    throw new Error("Not yet implemented");
  }
}

// Export for webhook handler
export async function handleInstitutsCompleteWebhook(result: any) {
  console.log("[institutos-complete webhook] received:", result);
  // TODO: Trigger Agent 3
}
