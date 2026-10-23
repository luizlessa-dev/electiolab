/**
 * Dados do 2º turno 2026 (25/10): presidente e os 7 governos estaduais em disputa.
 *
 * - Resultado oficial do 1º turno vem do schema `apuracao` (coletor TSE), com
 *   fallback estático: o 1º turno está fechado (100% das seções), então o
 *   fallback é fiel e a página nunca fica vazia se o schema falhar.
 * - Pesquisas vêm das elections `round=2` (presidente e as 7 UFs). Enquanto não
 *   houver pesquisa real pós-1º turno, mostramos o confronto hipotético anterior
 *   e dizemos isso explicitamente (`hipoteticas: true`).
 * - 1º e 2º turno são elections separadas; nada aqui funde turnos.
 */
import { createClient } from "@supabase/supabase-js";
import { PROVENIENCIA_PUBLICA } from "./poll-provenance";
import { getStateRunoffScenarios } from "./marketing-data";

export const DATA_2T = "2026-10-25";
export const DATA_1T = "2026-10-04";
/** Hipotéticas mais antigas que isso não são mostradas como referência. */
const HIPOTETICA_DESDE = "2026-08-01";
const PRES_2T_ID = "cd7032c5-06ed-4eb9-8702-ddd6c75d83de";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

function apuracaoDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, db: { schema: "apuracao" } },
  );
}

export const UF_NOME: Record<string, string> = {
  ac: "Acre", al: "Alagoas", am: "Amazonas", ap: "Amapá", ba: "Bahia", ce: "Ceará",
  df: "Distrito Federal", es: "Espírito Santo", go: "Goiás", ma: "Maranhão",
  mg: "Minas Gerais", ms: "Mato Grosso do Sul", mt: "Mato Grosso", pa: "Pará",
  pb: "Paraíba", pe: "Pernambuco", pi: "Piauí", pr: "Paraná", rj: "Rio de Janeiro",
  rn: "Rio Grande do Norte", ro: "Rondônia", rr: "Roraima", rs: "Rio Grande do Sul",
  sc: "Santa Catarina", se: "Sergipe", sp: "São Paulo", to: "Tocantins",
};

/** UFs com 2º turno de governador (apuração oficial de 04/10/2026). */
export const UFS_SEGUNDO_TURNO = ["ac", "am", "df", "es", "rj", "rn", "to"] as const;
export type UfSegundoTurno = (typeof UFS_SEGUNDO_TURNO)[number];

export function isUfSegundoTurno(uf: string): uf is UfSegundoTurno {
  return (UFS_SEGUNDO_TURNO as readonly string[]).includes(uf);
}

export function diasParaSegundoTurno(now = new Date()): number {
  const hoje = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${DATA_2T}T00:00:00`);
  return Math.max(0, Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000));
}

// ─── Resultado oficial do 1º turno (governador) ───────────────────────

export type Finalista = { nome: string; partido: string; pct: number; slug?: string };

export type ResultadoGovernador1T = {
  uf: string;
  situacao: "segundo_turno" | "eleito" | "em_apuracao" | "sem_eleito";
  top: Finalista[]; // 1º e 2º colocados
};

/** Fallback fiel ao resultado final do 1º turno (apuração a 100%). */
const FALLBACK_1T: Record<string, ResultadoGovernador1T> = {
  ac: { uf: "ac", situacao: "segundo_turno", top: [{ nome: "Mailza Assis", partido: "PP", pct: 49.76 }, { nome: "Alan Rick", partido: "Republicanos", pct: 32.27 }] },
  am: { uf: "am", situacao: "segundo_turno", top: [{ nome: "Omar Aziz", partido: "PSD", pct: 40.63 }, { nome: "Professora Maria do Carmo", partido: "PL", pct: 24.49 }] },
  df: { uf: "df", situacao: "segundo_turno", top: [{ nome: "Celina Leão", partido: "PP", pct: 49.93 }, { nome: "Leandro Grass", partido: "PT", pct: 34.47 }] },
  es: { uf: "es", situacao: "segundo_turno", top: [{ nome: "Lorenzo Pazolini", partido: "Republicanos", pct: 49.65 }, { nome: "Ricardo Ferraço", partido: "MDB", pct: 34.06 }] },
  rj: { uf: "rj", situacao: "segundo_turno", top: [{ nome: "Douglas Ruas", partido: "PL", pct: 49.27 }, { nome: "Eduardo Paes", partido: "PSD", pct: 42.76 }] },
  rn: { uf: "rn", situacao: "segundo_turno", top: [{ nome: "Allyson", partido: "União", pct: 36.94 }, { nome: "Cadu de Lula", partido: "PT", pct: 36.16 }] },
  to: { uf: "to", situacao: "segundo_turno", top: [{ nome: "Professora Dorinha", partido: "União", pct: 45.52 }, { nome: "Vicentinho Júnior", partido: "PSDB", pct: 43.94 }] },
};

/**
 * Resultado do 1º turno de governador por UF (minúsculas). Lê o schema
 * `apuracao` (ambiente oficial); em qualquer falha devolve só o fallback dos 7.
 */
export async function getResultadosGovernador1T(): Promise<Record<string, ResultadoGovernador1T>> {
  try {
    const db = apuracaoDb();

    const cargo = await cargoId(db, 3);
    if (!cargo) return { ...FALLBACK_1T };

    const { data: disputas } = await db
      .from("disputa").select("id, uf").eq("cargo_id", cargo.id);
    if (!disputas?.length) return { ...FALLBACK_1T };

    const ids = disputas.map((d) => d.id);
    const { data: sit } = await db
      .from("v_disputa_situacao")
      .select("disputa_id, totalizacao_id, situacao_tse_derivada")
      .in("disputa_id", ids);
    if (!sit?.length) return { ...FALLBACK_1T };

    const { data: cands } = await db
      .from("votacao_candidato")
      .select("disputa_id, totalizacao_id, posicao, nome_urna, partido_sigla, pct_tse")
      .in("disputa_id", ids)
      .lte("posicao", 2);

    const out: Record<string, ResultadoGovernador1T> = {};
    for (const d of disputas) {
      const s = sit.find((x) => x.disputa_id === d.id);
      if (!s || !d.uf) continue;
      const top = (cands ?? [])
        .filter((c) => c.disputa_id === d.id && c.totalizacao_id === s.totalizacao_id)
        .sort((a, b) => a.posicao - b.posicao)
        .map((c) => ({ nome: titulo(c.nome_urna), partido: sigla(c.partido_sigla), pct: Number(c.pct_tse) }));
      const situacao = s.situacao_tse_derivada as ResultadoGovernador1T["situacao"];
      out[String(d.uf).toLowerCase()] = { uf: String(d.uf).toLowerCase(), situacao, top };
    }
    // Segurança: os 7 do 2º turno nunca ficam sem dado.
    for (const uf of UFS_SEGUNDO_TURNO) if (!out[uf]?.top.length) out[uf] = FALLBACK_1T[uf];
    return out;
  } catch {
    return { ...FALLBACK_1T };
  }
}

/** O 1º turno oficial 2026 tem mais de uma linha em `eleicao`; o cargo é achado em qualquer uma. */
async function cargoId(db: ReturnType<typeof apuracaoDb>, codigo: number): Promise<{ id: number } | null> {
  const { data: eleicoes } = await db
    .from("eleicao").select("id")
    .eq("ambiente", "oficial").eq("ciclo", "ele2026").eq("turno", 1);
  if (!eleicoes?.length) return null;
  const { data: cargos } = await db
    .from("cargo").select("id")
    .in("eleicao_id", eleicoes.map((e) => (e as { id: number }).id)).eq("codigo", codigo).limit(1);
  const c = cargos?.[0] as { id: number } | undefined;
  return c ?? null;
}

/** Siglas longas vêm em caixa alta ("REPUBLICANOS"); as curtas (PT, PSD) ficam como estão. */
function sigla(s: string): string {
  return s.length > 6 ? s.charAt(0) + s.slice(1).toLowerCase() : s;
}

/** "MAILZA ASSIS" → "Mailza Assis" (nome de urna vem em caixa alta do TSE). */
function titulo(s: string): string {
  const minus = new Set(["de", "da", "do", "dos", "das", "e"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      if (i > 0 && minus.has(w)) return w;
      if (!/[aeiouáéíóúâêôãõ]/.test(w)) return w.toUpperCase(); // JHC, sigla sem vogal
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

// ─── Pesquisas de 2º turno por estado ─────────────────────────────────

export type PesquisaLinha = {
  instituto: string;
  data: string; // publication_date
  amostra: number | null;
  margem: number | null;
  pcts: { slug: string; nome: string; pct: number }[];
};

export type Candidato2T = { slug: string; nome: string; partido: string | null; cor: string | null };

export type EstadoSegundoTurno = {
  uf: UfSegundoTurno;
  nome: string;
  electionId: string | null;
  candidatos: Candidato2T[]; // 2
  primeiroTurno: Finalista[]; // top 2 do 1º turno
  pesquisas: PesquisaLinha[]; // reais, 2º turno, mais recentes primeiro
  media: { slug: string; nome: string; cor: string | null; pct: number }[] | null;
  hipoteticas: { polls: number; ultima: string; pcts: { slug: string; nome: string; pct: number }[] } | null;
};

type One<T> = T | T[] | null | undefined;
const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** Última pesquisa de cada instituto, média simples (padrão do site para governador). */
function mediaUltimaPorInstituto(linhas: PesquisaLinha[]) {
  const vistos = new Set<string>();
  const ultimas = linhas.filter((l) => (vistos.has(l.instituto) ? false : vistos.add(l.instituto)));
  const soma = new Map<string, { nome: string; sum: number; n: number }>();
  for (const l of ultimas)
    for (const p of l.pcts) {
      const cur = soma.get(p.slug) ?? { nome: p.nome, sum: 0, n: 0 };
      cur.sum += p.pct; cur.n += 1;
      soma.set(p.slug, cur);
    }
  return [...soma.entries()].map(([slug, v]) => ({ slug, nome: v.nome, pct: v.sum / v.n }));
}

export async function getEstadoSegundoTurno(
  uf: UfSegundoTurno,
  resultadosPre?: Record<string, ResultadoGovernador1T>,
): Promise<EstadoSegundoTurno> {
  const db = sb();
  const UF = uf.toUpperCase();
  const resultados = resultadosPre ?? (await getResultadosGovernador1T());

  const base: EstadoSegundoTurno = {
    uf, nome: UF_NOME[uf], electionId: null, candidatos: [],
    primeiroTurno: resultados[uf]?.top ?? [], pesquisas: [], media: null, hipoteticas: null,
  };

  const { data: election } = await db
    .from("elections").select("id")
    .eq("type", "governador").eq("state", UF).eq("year", 2026).eq("round", 2).maybeSingle();
  if (!election) return base;
  base.electionId = election.id;

  const { data: cands } = await db
    .from("candidates").select("slug, name, party, color").eq("election_id", election.id);
  base.candidatos = (cands ?? []).map((c) => ({ slug: c.slug, nome: c.name, partido: c.party, cor: c.color }));

  const { data: polls } = await db
    .from("polls")
    .select(`publication_date, sample_size, margin_of_error,
             institute:institutes(name),
             results:poll_results!inner(percentage, candidate:candidates(name, slug))`)
    .eq("election_id", election.id)
    .is("results.excluded_reason", null)
    .or(PROVENIENCIA_PUBLICA)
    .order("publication_date", { ascending: false });

  type P = {
    publication_date: string; sample_size: number | null; margin_of_error: number | null;
    institute: One<{ name: string }>;
    results: { percentage: number; candidate: One<{ name: string; slug: string }> }[];
  };
  base.pesquisas = ((polls ?? []) as unknown as P[])
    .map((p) => ({
      instituto: one(p.institute)?.name ?? "?",
      data: p.publication_date,
      amostra: p.sample_size,
      margem: p.margin_of_error,
      pcts: p.results
        .map((r) => { const c = one(r.candidate); return c ? { slug: c.slug, nome: c.name, pct: Number(r.percentage) } : null; })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    }))
    .filter((l) => l.pcts.length === 2);

  if (base.pesquisas.length > 0) {
    const cor = new Map(base.candidatos.map((c) => [c.slug, c.cor]));
    base.media = mediaUltimaPorInstituto(base.pesquisas)
      .map((m) => ({ ...m, cor: cor.get(m.slug) ?? null }))
      .sort((a, b) => b.pct - a.pct);
    return base;
  }

  // Sem pesquisa real de 2º turno: confronto hipotético anterior ao 1º turno,
  // restrito ao par que de fato foi pro 2º turno.
  const slugs = new Set(base.candidatos.map((c) => c.slug));
  const cenarios = await getStateRunoffScenarios(UF);
  const par = cenarios.find((s) => s.candidates.length === 2 && s.candidates.every((c) => slugs.has(c.slug)));
  // Confronto de meses atrás (ex.: abril) não descreve a disputa pós-1º turno: omite.
  if (par && par.latest >= HIPOTETICA_DESDE) {
    base.hipoteticas = {
      polls: par.polls,
      ultima: par.latest,
      pcts: par.candidates.map((c) => ({ slug: c.slug, nome: c.name, pct: c.pct })),
    };
  }
  return base;
}

// ─── Presidente ───────────────────────────────────────────────────────

export type PresidenteSegundoTurno = {
  lula: { pct: number; ic: [number, number] } | null;
  flavio: { pct: number; ic: [number, number] } | null;
  pollsNaMedia: number;
  atualizadoEm: string | null;
  novasPosPrimeiroTurno: number; // pesquisas publicadas depois do 1º turno
  ultimaPesquisa: string | null;
  primeiroTurno: { lula: number; flavio: number } | null; // % válidos BR
};

export async function getPresidenteSegundoTurno(): Promise<PresidenteSegundoTurno> {
  const db = sb();

  const { data: avgs } = await db
    .from("weighted_averages")
    .select(`weighted_average, confidence_interval_low, confidence_interval_high,
             polls_included, calculated_at, candidate:candidates(slug)`)
    .eq("election_id", PRES_2T_ID)
    .eq("scenario_label", "flavio-bolsonaro-vs-lula");

  type A = {
    weighted_average: number; confidence_interval_low: number; confidence_interval_high: number;
    polls_included: number; calculated_at: string; candidate: One<{ slug: string }>;
  };
  const rows = (avgs ?? []) as unknown as A[];
  const pick = (slug: string) => {
    const r = rows.find((x) => one(x.candidate)?.slug === slug);
    return r
      ? { pct: Number(r.weighted_average), ic: [Number(r.confidence_interval_low), Number(r.confidence_interval_high)] as [number, number] }
      : null;
  };

  const { count } = await db
    .from("polls").select("id", { count: "exact", head: true })
    .eq("election_id", PRES_2T_ID).gt("publication_date", DATA_1T);

  const { data: ult } = await db
    .from("polls").select("publication_date")
    .eq("election_id", PRES_2T_ID).order("publication_date", { ascending: false }).limit(1);

  const res = await getResultadosPresidenteBR();

  return {
    lula: pick("lula"),
    flavio: pick("flavio-bolsonaro"),
    pollsNaMedia: rows[0]?.polls_included ?? 0,
    atualizadoEm: rows[0]?.calculated_at ?? null,
    novasPosPrimeiroTurno: count ?? 0,
    ultimaPesquisa: ult?.[0]?.publication_date ?? null,
    primeiroTurno: res,
  };
}

/** % de Lula e Flávio no total Brasil do 1º turno (zz = exterior fica de fora; "BR" é o consolidado). */
async function getResultadosPresidenteBR(): Promise<{ lula: number; flavio: number } | null> {
  try {
    const db = apuracaoDb();
    const cargo = await cargoId(db, 1);
    if (!cargo) return FALLBACK_PRES;
    const { data: disputa } = await db
      .from("disputa").select("id").eq("cargo_id", cargo.id).eq("abrangencia", "br").limit(1).maybeSingle();
    if (!disputa) return FALLBACK_PRES;
    const { data: sit } = await db
      .from("v_disputa_situacao").select("totalizacao_id").eq("disputa_id", disputa.id).maybeSingle();
    if (!sit) return FALLBACK_PRES;
    const { data: c } = await db
      .from("votacao_candidato").select("nome_urna, pct_tse")
      .eq("disputa_id", disputa.id).eq("totalizacao_id", sit.totalizacao_id).lte("posicao", 2);
    const lula = c?.find((x) => /lula/i.test(x.nome_urna));
    const flavio = c?.find((x) => /fl[aá]vio/i.test(x.nome_urna));
    return lula && flavio ? { lula: Number(lula.pct_tse), flavio: Number(flavio.pct_tse) } : FALLBACK_PRES;
  } catch {
    return FALLBACK_PRES;
  }
}

const FALLBACK_PRES = { lula: 45.16, flavio: 47.03 };
