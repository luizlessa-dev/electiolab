/**
 * Utilities para slugs/normalização de partidos políticos brasileiros.
 *
 * O banco tem `candidates.party` em formato livre — pode vir como "PL",
 * "União Brasil", "PSDB", "Sem partido", etc. Precisamos normalizar
 * para URL slug (kebab, lowercase, sem acento).
 */

const ACRONYMS_NORMAL = new Map<string, string>([
  // slug → label canônico
  ["pl", "PL"],
  ["pt", "PT"],
  ["psd", "PSD"],
  ["mdb", "MDB"],
  ["psdb", "PSDB"],
  ["pdt", "PDT"],
  ["pp", "PP"],
  ["psb", "PSB"],
  ["psol", "PSOL"],
  ["pcdob", "PCdoB"],
  ["novo", "NOVO"],
  ["uniao-brasil", "União Brasil"],
  ["republicanos", "Republicanos"],
  ["podemos", "Podemos"],
  ["solidariedade", "Solidariedade"],
  ["pstu", "PSTU"],
  ["pcb", "PCB"],
  ["pco", "PCO"],
  ["agir", "AGIR"],
  ["avante", "Avante"],
  ["cidadania", "Cidadania"],
  ["dc", "DC"],
  ["mobiliza", "Mobiliza"],
  ["missao", "Missão"],
  ["pmb", "PMB"],
  ["pmn", "PMN"],
  ["prd", "PRD"],
  ["pros", "Pros"],
  ["ptb", "PTB"],
  ["pv", "PV"],
  ["rede", "Rede"],
  ["up", "UP"],
  ["uniao-progressista", "União Progressista"],
]);

export function partyToSlug(party: string | null | undefined): string | null {
  if (!party) return null;
  const t = party.trim();
  if (!t || t === "Sem partido" || t === "Indep." || t === "Independente") return null;
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugToParty(slug: string): string | null {
  const exact = ACRONYMS_NORMAL.get(slug.toLowerCase());
  if (exact) return exact;
  // Fallback: capitaliza palavras (uniao-brasil → "Uniao Brasil")
  const fallback = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return fallback;
}

export function partyMatchesSlug(party: string | null | undefined, slug: string): boolean {
  return partyToSlug(party) === slug.toLowerCase();
}

/**
 * Returns party-specific brand colors. Used for accents in /partido/[slug].
 */
export const PARTY_COLORS: Record<string, string> = {
  pt: "#ED1C24",
  pl: "#1E3A5F",
  psd: "#FF8C00",
  mdb: "#00A651",
  psdb: "#0080C0",
  pdt: "#FF6B00",
  pp: "#00A2E8",
  novo: "#FF4500",
  republicanos: "#003DA5",
  "uniao-brasil": "#FFD700",
  psb: "#FFA500",
  pcdob: "#B22222",
  psol: "#C00000",
  podemos: "#1F75FE",
  cidadania: "#E60026",
  pdt2: "#E60026",
};

export function partyColor(slug: string): string {
  return PARTY_COLORS[slug.toLowerCase()] ?? "#666666";
}
