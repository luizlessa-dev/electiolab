/**
 * Simulador Dinâmico de Intenção de Voto — Deputado Federal
 *
 * Estratégia:
 * 1. Usa pesquisa presidencial mais recente do estado
 * 2. Aplica fator de "pulverização" (deputado vota diferente que presidente)
 * 3. Distribui entre coligações do estado
 * 4. Retorna com flag "estimado" e intervalo de confiança
 *
 * Modelo Bayesiano simplificado:
 *   P(Dep | Pres) = P(Pres) × fator_coesão × fator_pulverização
 *   + ruído gaussiano (±5pp)
 */

export interface PresidentialPoll {
  candidate: string;
  percentage: number;
  candidate_slug: string;
  fieldwork_end: string;
}

export interface EstimatedDeputyPoll {
  coalition: string; // "PT-Aliados", "PL-Aliados", "Centro", "Outros"
  percentage: number;
  lower_bound: number; // 95% confidence interval
  upper_bound: number;
  confidence: "high" | "medium" | "low";
  source: "estimated_from_presidential";
  methodology: "bayesian_simulation";
  model_version: "1.0";
  note: string;
}

/**
 * Mapeamento: candidato presidencial → coligação de deputados
 * Tipicamente cada estado tem suas próprias alianças
 * Este é um mapeamento padrão; pode ser customizado por UF
 */
const COALITION_MAPPING: Record<string, string> = {
  // Esquerda
  lula: "PT-Aliados",
  pt: "PT-Aliados",
  "ciro gomes": "PDT-Aliados",
  pdt: "PDT-Aliados",
  "tebet": "MDB",
  mdb: "Centro",

  // Centro-Direita
  "geraldo alckmin": "PSD-Aliados",
  psd: "PSD-Aliados",
  psdb: "PSDB-Aliados",
  "simone tebet": "MDB",

  // Direita
  "jair bolsonaro": "PL-Aliados",
  "flávio bolsonaro": "PL-Aliados",
  pl: "PL-Aliados",
  "ciro nogueira": "PP-Aliados",
  pp: "PP-Aliados",
  republicanos: "PL-Aliados",
  "união brasil": "Centro-Direita",

  // Variações
  bolsonaro: "PL-Aliados",
  "lula da silva": "PT-Aliados",
};

/**
 * Fatores de conversão: quanto do voto presidencial vira deputado
 * na mesma coligação (coesão) e quanto pulveriza
 */
const PULVERIZATION_FACTORS: Record<string, { coesao: number; pulverizacao: number }> = {
  "PT-Aliados": { coesao: 0.65, pulverizacao: 0.35 }, // 65% vota PT/aliados, 35% pulveriza
  "PL-Aliados": { coesao: 0.62, pulverizacao: 0.38 },
  "Centro": { coesao: 0.45, pulverizacao: 0.55 }, // Centro pulveriza muito
  "Centro-Direita": { coesao: 0.50, pulverizacao: 0.50 },
  "PSD-Aliados": { coesao: 0.58, pulverizacao: 0.42 },
  "PSDB-Aliados": { coesao: 0.55, pulverizacao: 0.45 },
  "PP-Aliados": { coesao: 0.60, pulverizacao: 0.40 },
  "PDT-Aliados": { coesao: 0.50, pulverizacao: 0.50 },
  "MDB": { coesao: 0.45, pulverizacao: 0.55 },
};

/**
 * Ruído regional: alguns estados votam diferente (σ)
 * Estado mais competitivo/pulverizado = σ maior
 */
const REGIONAL_VOLATILITY: Record<string, number> = {
  SP: 4.5, // Alto
  RJ: 4.2,
  MG: 4.0,
  BA: 5.0, // Muito alto (competitivo)
  SC: 3.5,
  RS: 3.8,
  PE: 4.5,
  CE: 4.8,
  GO: 4.2,
  PR: 3.9,
  DF: 4.0,
  // Default para estados não listados
};

/**
 * Converte slug de candidato presidencial para coligação esperada
 */
function getCoalition(candidateSlug: string): string {
  const normalized = candidateSlug.toLowerCase().trim();
  for (const [key, value] of Object.entries(COALITION_MAPPING)) {
    if (normalized.includes(key)) return value;
  }
  return "Outros"; // fallback
}

/**
 * Gera simulação Bayesiana: transforma voto presidencial em deputado
 * com incerteza apropriada
 */
export function simulateDeputyIntention(
  presidentialPolls: PresidentialPoll[],
  state: string,
  iterations: number = 10000
): EstimatedDeputyPoll[] {
  if (!presidentialPolls || presidentialPolls.length === 0) {
    return [];
  }

  // Agrupa por coligação
  const coalitionVotes: Record<string, number[]> = {};

  for (const poll of presidentialPolls) {
    const coalition = getCoalition(poll.candidate_slug);
    if (!coalitionVotes[coalition]) {
      coalitionVotes[coalition] = [];
    }

    const factor = PULVERIZATION_FACTORS[coalition] || {
      coesao: 0.50,
      pulverizacao: 0.50,
    };
    const volatility = REGIONAL_VOLATILITY[state] || 4.0;

    // Simulação Monte Carlo
    for (let i = 0; i < iterations; i++) {
      // Coesão: voto presidencial direto à coligação
      const cohesiveVote = poll.percentage * factor.coesao;

      // Pulverização: distribuição gaussiana
      const pulverizado =
        (poll.percentage * factor.pulverizacao * Math.random()) / Math.sqrt(2);

      // Ruído regional
      const noise = gaussianRandom() * (volatility / 100);

      const simulated = Math.max(0, Math.min(100, cohesiveVote + pulverizado + noise));
      coalitionVotes[coalition].push(simulated);
    }
  }

  // Calcula percentis (mean, 2.5%, 97.5%)
  const results: EstimatedDeputyPoll[] = [];

  for (const [coalition, votes] of Object.entries(coalitionVotes)) {
    votes.sort((a, b) => a - b);

    const mean = votes.reduce((a, b) => a + b, 0) / votes.length;
    const lower = votes[Math.floor(votes.length * 0.025)];
    const upper = votes[Math.floor(votes.length * 0.975)];
    const confidence = Math.abs(upper - lower) < 8 ? "high" : "medium";

    results.push({
      coalition,
      percentage: Math.round(mean * 100) / 100,
      lower_bound: Math.round(lower * 100) / 100,
      upper_bound: Math.round(upper * 100) / 100,
      confidence,
      source: "estimated_from_presidential",
      methodology: "bayesian_simulation",
      model_version: "1.0",
      note: `Estimativa de intenção de voto para Deputado Federal em ${state} baseada em pesquisa presidencial. Intervalo de confiança 95%.`,
    });
  }

  return results.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Box-Muller: gera números aleatórios com distribuição gaussiana
 */
function gaussianRandom(): number {
  let u1 = 0,
    u2 = 0;
  while (u1 === 0) u1 = Math.random(); // Converting [0,1) to (0,1)
  while (u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0;
}

/**
 * API: Estima Deputado Federal para um estado
 * Usa última pesquisa presidencial disponível
 */
export async function estimateDeputyForState(
  state: string,
  supabaseClient: any
): Promise<EstimatedDeputyPoll[]> {
  // 1. Busca última pesquisa presidencial do estado
  const { data: presidentialPolls } = await supabaseClient
    .from("polls")
    .select("candidate, percentage, candidate_slug, fieldwork_end")
    .eq("office", "presidente")
    .eq("scope", state)
    .order("fieldwork_end", { ascending: false })
    .limit(10);

  if (!presidentialPolls || presidentialPolls.length === 0) {
    console.warn(`No presidential polls found for ${state}`);
    return [];
  }

  // Usa apenas a pesquisa mais recente por data de fieldwork
  const latestFieldwork = Math.max(
    ...presidentialPolls.map((p: any) => new Date(p.fieldwork_end).getTime())
  );
  const latestPoll = presidentialPolls.filter(
    (p: any) => new Date(p.fieldwork_end).getTime() === latestFieldwork
  );

  return simulateDeputyIntention(latestPoll, state);
}

/**
 * Converte simulação em poll_draft para inserção no BD
 */
export function simulationToPollDraft(
  estimate: EstimatedDeputyPoll,
  state: string,
  electionId: string,
  baseFieldworkEnd: string
): any {
  return {
    election_id: electionId,
    institute_name: "ElectioLab Simulador",
    candidate: estimate.coalition, // Use coalition name as "candidate"
    candidate_slug: estimate.coalition.toLowerCase().replace(/[\s-]/g, "-"),
    fieldwork_start: baseFieldworkEnd,
    fieldwork_end: baseFieldworkEnd,
    publication_date: new Date().toISOString().split("T")[0],
    sample_size: 10000, // Simulated sample
    margin_of_error: (estimate.upper_bound - estimate.lower_bound) / 3.92, // 95% CI
    percentage: estimate.percentage,
    office: "deputado",
    scope: state,
    methodology: "simulacao-bayesiana",
    tse_protocolo: null,
    source_url: null,
    source_kind: "simulated",
    status: "approved",
    round: 1,
    scenario_label: null,
    notes: estimate.note,
  };
}
