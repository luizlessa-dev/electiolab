/**
 * Fuzzy matching de nomes de candidatos para o pipeline de ingestão.
 *
 * Trata variações comuns entre fontes externas (Wikipedia, GP, etc.) e
 * os nomes canônicos armazenados no banco:
 *   - Acentos e capitalização
 *   - Sufixos de partido entre parênteses: "Tarcísio(REP)" → "Tarcísio"
 *   - Referências de rodapé: "Quaest[1]" → "Quaest"
 *   - Nomes completos vs. apelidos: "Tarcísio de Freitas" → "Tarcísio"
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normaliza uma string para comparação: sem acentos, lowercase, sem pontuação extra */
function normalize(name: string): string {
  return name
    .replace(/\[\d+\]/g, "")          // remove [1], [2], notas de rodapé
    .replace(/\([^)]{1,20}\)/g, "")   // remove (PT), (REP), (partido)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // remove diacríticos
    .replace(/[^\w\s]/g, "")          // remove pontuação
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/** Distância de Levenshtein entre duas strings */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[a.length][b.length];
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface CandidateRef {
  id: string;
  name: string;
}

/**
 * Encontra o candidato mais provável para um nome bruto.
 *
 * Ordem de prioridade:
 * 1. Match exato (após normalização)
 * 2. Primeira palavra ("Tarcísio de Freitas" → "Tarcísio") — mínimo 4 chars
 * 3. Inclusão de substring
 * 4. Distância de Levenshtein ≤ 3
 *
 * Retorna null se nenhum match for encontrado com confiança suficiente.
 */
export function matchCandidate(
  rawName: string,
  candidates: CandidateRef[]
): string | null {
  if (!rawName || candidates.length === 0) return null;

  const norm = normalize(rawName);
  if (!norm) return null;

  // 1. Exact match
  for (const c of candidates) {
    if (normalize(c.name) === norm) return c.id;
  }

  // 2. First-word match (handles "Nome Completo" → "Nome")
  const firstWord = norm.split(" ")[0];
  if (firstWord.length >= 4) {
    for (const c of candidates) {
      const cFirst = normalize(c.name).split(" ")[0];
      if (cFirst === firstWord) return c.id;
    }
  }

  // 3. Substring: one name fully contained in the other (min 4 chars)
  for (const c of candidates) {
    const cn = normalize(c.name);
    if (cn.length >= 4 && norm.length >= 4) {
      if (cn.includes(norm) || norm.includes(cn)) return c.id;
    }
  }

  // 4. Levenshtein: distance ≤ 3 AND similar length
  let best: { id: string; dist: number } | null = null;
  for (const c of candidates) {
    const cn = normalize(c.name);
    if (Math.abs(cn.length - norm.length) > 5) continue;
    const dist = levenshtein(norm, cn);
    if (dist <= 3 && (!best || dist < best.dist)) {
      best = { id: c.id, dist };
    }
  }

  return best?.id ?? null;
}

/**
 * Normaliza o nome de um instituto para comparação com o banco.
 * Trata variações conhecidas (ex.: "AtlasIntel" → "Atlas Intel").
 */
export function normalizeInstituteName(raw: string): string {
  const KNOWN_ALIASES: Record<string, string> = {
    "atlasintel":          "Atlas Intel",
    "atlas intel":         "Atlas Intel",
    "altasintel":          "Atlas Intel",  // typo comum no Wikipedia
    "atlas/bloomberg":     "Atlas Intel",
    "poderdata":           "PoderData",
    "poder data":          "PoderData",
    "parana pesquisas":    "Paraná Pesquisas",
    "genial quaest":       "Genial/Quaest",
    "genial/quaest":       "Genial/Quaest",
    "mda cnt":             "MDA/CNT",
    "mda/cnt":             "MDA/CNT",
    "real time big data":  "Real Time Big Data",
    "real time":           "Real Time Big Data",
    "futura inteligencia": "Futura Inteligência",
    "fsb pesquisa":        "FSB Pesquisa",
    "instituto verita":    "Instituto Veritá",
    "verita":              "Instituto Veritá",
    "nexus":               "Nexus",
    "nexus btg":           "Nexus",
    "nexus/btg":           "Nexus",
    "nexus btg pactual":   "Nexus",
    "vox brasil pesquisas": "Vox Brasil",
    "vox brasil":           "Vox Brasil",
    "100 cidades":          "Futura Inteligência",
    "100 cidades futura":   "Futura Inteligência",
  };

  const key = raw
    .replace(/\[\s*\d+\s*\]/g, "")   // remove [1], [ 1 ], [22], etc.
    .replace(/\*/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return KNOWN_ALIASES[key] ?? raw.replace(/\[\d+\]/g, "").replace(/\*/g, "").trim();
}
