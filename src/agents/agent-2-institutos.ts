/**
 * Agent 2: Institutos Scraping (Paralelo)
 *
 * Scrapes 5+ institutos em paralelo (max 5 simultâneos),
 * applica fallback strategies, normaliza dados, upsert em polls
 *
 * Status: ✅ MVP READY
 */

import { RufloAgent, AgentConfig } from "./base";

export interface PollData {
  candidate: string;
  percentage: number;
  fieldwork_end: string;
  institute: string;
  sample_size?: number;
}

function normalizeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeName(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface InstituteConfig {
  id: string;
  url: string;
  strategies: string[];
  timeout_ms: number;
}

export interface CompletedInstitute {
  institute: string;
  strategy: string;
  poll_count: number;
  duration_ms: number;
}

export interface FailedInstitute {
  institute: string;
  error: string;
  attempted_strategies: string[];
}

export interface InstitutosScrapeRunSummary {
  ok: boolean;
  completed_count: number;
  failed_count: number;
  total_polls_inserted: number;
  completed: CompletedInstitute[];
  failed: FailedInstitute[];
}

export interface InstitutosScrapeResult extends InstitutosScrapeRunSummary {
  duration_ms: number;
  timestamp: string;
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
  {
    id: "poderdata",
    url: "https://www.poderdata.com.br/",
    strategies: ["json", "html", "regex"],
    timeout_ms: 30000,
  },
  {
    id: "atlasIntel",
    url: "https://www.atlasinteligencia.com.br/",
    strategies: ["json", "html", "regex"],
    timeout_ms: 30000,
  },
];

class ParallelQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async add(fn: () => Promise<void>) {
    this.queue.push(fn);
    await this.process();
  }

  private async process() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      this.running++;
      const fn = this.queue.shift()!;
      try {
        await fn();
      } catch (e) {
        console.warn("Queue task failed:", e);
      }
      this.running--;
      if (this.queue.length > 0) {
        await this.process();
      }
    }
  }

  async waitAll() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.running === 0 && this.queue.length === 0) {
          resolve(null);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}

export class InstitutusScrapeAgent extends RufloAgent<InstitutosScrapeResult> {
  private institutesBySlug = new Map<string, string>();
  private electionId: string | null = null;

  constructor(private parallelism: number = 5) {
    const config: AgentConfig = {
      name: "Institutos Scraping",
      id: "institutos-scraping-001",
      agent_name: "agent-2-institutos",
      timeout_ms: 600000,
      max_retries: 2,
    };
    super(config);
  }

  async run(): Promise<InstitutosScrapeResult> {
    const startTime = Date.now();
    console.log(
      `[${this.config.id}] Starting with parallelism=${this.parallelism}...`
    );

    try {
      await this.resolveContext();
      if (!this.electionId) {
        throw new Error(
          "Eleição presidencial 2026 1º turno não encontrada em `elections` — nada pra persistir"
        );
      }

      const result = await this.retry(async () => {
        return await this.runParallel();
      });

      const duration = Date.now() - startTime;
      const finalResult = {
        ...result,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      };

      await this.logAudit(finalResult);
      return finalResult;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error(`[${this.config.id}] ERROR:`, error.message);
      await this.logAudit(null, error);
      throw error;
    }
  }

  /**
   * Resolve institute_id (por slug normalizado, ex.: "atlasIntel" ↔ slug
   * "atlas-intel") e election_id uma vez por run, antes de raspar.
   *
   * Assunção MVP: as URLs em INSTITUTES são páginas iniciais genéricas
   * (ex.: datafolha.com.br/pesquisas-eleitorais/), sem sinal de cargo/UF no
   * HTML pra distinguir presidencial de estadual — atrelamos tudo à
   * corrida presidencial 2026, 1º turno (única eleição nacional, e o
   * parser genérico "Nome: XX%" não separa cenários de 2º turno, que
   * sempre nomeiam dois candidatos).
   */
  private async resolveContext(): Promise<void> {
    const { data: institutes } = await this.supabase
      .from("institutes")
      .select("id, slug, name");

    for (const inst of institutes ?? []) {
      this.institutesBySlug.set(normalizeSlug(inst.slug || inst.name), inst.id);
    }

    const { data: election } = await this.supabase
      .from("elections")
      .select("id")
      .eq("type", "presidente")
      .eq("round", 1)
      .eq("is_active", true)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle();

    this.electionId = election?.id ?? null;
  }

  /**
   * Best-effort: nenhum dos 3 parsers extrai sample_size (coluna NOT NULL
   * em polls). Procura padrões comuns de metodologia BR na página inteira;
   * se não achar, upsertPolls() descarta as pesquisas daquele instituto em
   * vez de gravar um valor inventado.
   */
  private extractSampleSize(html: string): number | null {
    const patterns = [
      /amostra\s+de\s+([\d.,]+)\s*(?:entrevistas|pessoas|eleitores)/i,
      /([\d.,]+)\s*entrevistas(?:\s+(?:presenciais|por telefone|online))?/i,
      /ouviu\s+([\d.,]+)\s*(?:pessoas|eleitores)/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const n = parseInt(match[1].replace(/[.,]/g, ""), 10);
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return null;
  }

  private async runParallel(): Promise<InstitutosScrapeRunSummary> {
    const queue = new ParallelQueue(this.parallelism);
    const completed: CompletedInstitute[] = [];
    const failed: FailedInstitute[] = [];

    for (const institute of INSTITUTES) {
      await queue.add(async () => {
        const instStart = Date.now();
        const attemptedStrategies: string[] = [];

        const instituteId = this.institutesBySlug.get(normalizeSlug(institute.id));
        if (!instituteId) {
          failed.push({
            institute: institute.id,
            error: `Instituto "${institute.id}" não encontrado em \`institutes\` (slug/nome não bateu)`,
            attempted_strategies: [],
          });
          return;
        }

        try {
          console.log(`[${this.config.id}] Scraping ${institute.id}...`);

          const html = await this.fetchWithTimeout(
            institute.url,
            institute.timeout_ms
          );
          const sampleSize = this.extractSampleSize(html);

          let polls: PollData[] | null = null;
          let strategyUsed = "";

          // Try strategies in order
          for (const strategy of institute.strategies) {
            attemptedStrategies.push(strategy);
            try {
              if (strategy === "json") {
                polls = this.parseJSON(html, institute.id);
              } else if (strategy === "html") {
                polls = this.parseHTML(html, institute.id);
              } else if (strategy === "regex") {
                polls = this.parseRegex(html, institute.id);
              }

              if (polls && polls.length > 0) {
                polls = polls.map((p) => ({ ...p, sample_size: sampleSize ?? undefined }));
                strategyUsed = strategy;
                break;
              }
            } catch {
              console.log(
                `[${this.config.id}] ${institute.id}: ${strategy} failed`
              );
            }
          }

          if (!polls || polls.length === 0) {
            throw new Error("All strategies failed");
          }

          // Upsert to Supabase
          const upserted = await this.upsertPolls(polls, instituteId, this.electionId!);

          completed.push({
            institute: institute.id,
            strategy: strategyUsed,
            poll_count: upserted,
            duration_ms: Date.now() - instStart,
          });

          console.log(
            `[${this.config.id}] ${institute.id}: ${upserted} polls (${strategyUsed})`
          );
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          failed.push({
            institute: institute.id,
            error: error.message,
            attempted_strategies: attemptedStrategies,
          });
          console.error(`[${this.config.id}] ${institute.id} failed:`, error.message);
        }
      });
    }

    await queue.waitAll();

    const totalPolls = completed.reduce((sum, c) => sum + c.poll_count, 0);

    return {
      ok: failed.length === 0,
      completed_count: completed.length,
      failed_count: failed.length,
      total_polls_inserted: totalPolls,
      completed,
      failed,
    };
  }

  private async fetchWithTimeout(
    url: string,
    timeoutMs: number
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseJSON(html: string, instituteId: string): PollData[] {
    // Very basic JSON extraction (would need refinement per institute)
    const jsonMatch = html.match(/window\.__(?:DATA|INITIAL_DATA|POLLS__)\s*=\s*({[\s\S]*?});/);
    if (!jsonMatch) return [];

    try {
      const data = JSON.parse(jsonMatch[1]);
      const polls: PollData[] = [];

      // Generic extraction (would need custom per institute)
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (item.name && item.percentage) {
            polls.push({
              candidate: item.name,
              percentage: parseFloat(item.percentage),
              fieldwork_end: new Date().toISOString(),
              institute: instituteId,
            });
          }
        });
      }

      return polls;
    } catch {
      return [];
    }
  }

  private parseHTML(html: string, instituteId: string): PollData[] {
    const polls: PollData[] = [];

    // Look for tables
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/g;
    const tables = html.match(tableRegex) || [];

    for (const table of tables) {
      const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
      const rows = table.match(rowRegex) || [];

      for (const row of rows) {
        const cellRegex = /<td[^>]*>(.*?)<\/td>/g;
        const cells: string[] = [];
        let match;

        while ((match = cellRegex.exec(row))) {
          cells.push(match[1].replace(/<[^>]*>/g, "").trim());
        }

        if (cells.length >= 2) {
          const candidate = cells[0];
          const percentage = parseFloat(cells[1]);

          if (candidate && !isNaN(percentage)) {
            polls.push({
              candidate,
              percentage,
              fieldwork_end: new Date().toISOString(),
              institute: instituteId,
            });
          }
        }
      }
    }

    return polls;
  }

  private parseRegex(html: string, instituteId: string): PollData[] {
    const polls: PollData[] = [];

    // Look for "Name: XX%" patterns
    const regex = /([A-Za-z\s]+):\s*(\d+(?:[.,]\d+)?)\s*%/g;
    let match;

    while ((match = regex.exec(html))) {
      const candidate = match[1].trim();
      const percentage = parseFloat(match[2].replace(",", "."));

      if (candidate.length > 2 && candidate.length < 50 && !isNaN(percentage)) {
        polls.push({
          candidate,
          percentage,
          fieldwork_end: new Date().toISOString(),
          institute: instituteId,
        });
      }
    }

    return polls;
  }

  private resolveCandidateId(
    name: string,
    candidates: Array<{ id: string; name: string; full_name: string | null }>
  ): string | null {
    const target = normalizeName(name);
    for (const c of candidates) {
      const cn = normalizeName(c.name);
      const cfn = c.full_name ? normalizeName(c.full_name) : "";
      if (cn.includes(target) || target.includes(cn) || (cfn && cfn.includes(target))) {
        return c.id;
      }
    }
    return null;
  }

  /**
   * Grava 1 poll (o scrape inteiro de um instituto) + N poll_results (1 por
   * candidato resolvido). Pesquisas sem sample_size extraível são
   * descartadas (não grava metodologia inventada); candidatos cujo nome
   * raspado não bate com nenhum candidato ativo da eleição são ignorados
   * individualmente, sem descartar o poll inteiro.
   */
  private async upsertPolls(
    polls: PollData[],
    instituteId: string,
    electionId: string
  ): Promise<number> {
    const withSampleSize = polls.filter(
      (p) => typeof p.sample_size === "number" && p.sample_size > 0
    );
    if (withSampleSize.length < polls.length) {
      console.warn(
        `[${this.config.id}] ${polls.length - withSampleSize.length} pesquisa(s) sem sample_size extraível, ignoradas`
      );
    }
    if (withSampleSize.length === 0) return 0;

    const { data: candidates } = await this.supabase
      .from("candidates")
      .select("id, name, full_name")
      .eq("election_id", electionId)
      .eq("is_active", true);

    const resolved: Array<{ candidate_id: string; percentage: number }> = [];
    let unresolvedCount = 0;
    for (const p of withSampleSize) {
      const candidateId = this.resolveCandidateId(p.candidate, candidates ?? []);
      if (!candidateId) {
        unresolvedCount++;
        continue;
      }
      resolved.push({ candidate_id: candidateId, percentage: p.percentage });
    }
    if (unresolvedCount > 0) {
      console.warn(`[${this.config.id}] ${unresolvedCount} candidato(s) não resolvido(s), ignorado(s)`);
    }
    if (resolved.length === 0) return 0;

    // Sem publication_date real na página raspada — reusa fieldwork_end
    // como aproximação (mesma lógica já usada em promote-approved-polls.ts).
    const fieldworkEnd = withSampleSize[0].fieldwork_end;
    const sampleSize = withSampleSize[0].sample_size as number;

    const { data: poll, error: pollError } = await this.supabase
      .from("polls")
      .insert({
        election_id: electionId,
        institute_id: instituteId,
        fieldwork_end: fieldworkEnd,
        publication_date: fieldworkEnd,
        sample_size: sampleSize,
      })
      .select("id")
      .single();

    if (pollError || !poll) {
      console.error(`[${this.config.id}] Erro ao criar poll:`, pollError?.message);
      return 0;
    }

    const { error: resultsError } = await this.supabase.from("poll_results").insert(
      resolved.map((r) => ({
        poll_id: poll.id,
        candidate_id: r.candidate_id,
        percentage: r.percentage,
      }))
    );

    if (resultsError) {
      console.error(`[${this.config.id}] Erro ao criar poll_results:`, resultsError.message);
      return 0;
    }

    return resolved.length;
  }
}

export async function handleInstitutsCompleteWebhook(result: InstitutosScrapeResult) {
  console.log("[institutos-complete webhook] Received result:", {
    ok: result.ok,
    completed_count: result.completed_count,
    failed_count: result.failed_count,
    total_polls_inserted: result.total_polls_inserted,
  });
}
