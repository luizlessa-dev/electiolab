/**
 * Cross-project helpers para buscar dados do projeto Transparência Federal (TF)
 * a partir do ElectioLab — sem duplicar dados.
 *
 * TF é um Supabase project separado (`redggdtakzmsabwvjzhb`) que indexa:
 *   - parlamentares (Câmara + Senado, com cpf e id_tse_candidato)
 *   - ceaps_brutas (Cota Parlamentar Câmara — 557k+ rows)
 *   - parlamentar_sancoes_cache (sanções aplicadas)
 *   - parlamentar_contratos_cache (contratos com governo)
 *   - parlamentar_financiamento_cache (financiamento de campanha histórico)
 *   - beneficios_parlamentares (auxílio-moradia, ressarcimento, etc.)
 *
 * Match com ElectioLab: por **CPF** ou **id_tse_candidato**.
 */

const TF_URL = process.env.TF_SUPABASE_URL ?? "https://redggdtakzmsabwvjzhb.supabase.co";
const TF_KEY = process.env.TF_SUPABASE_ANON_KEY ?? "";

async function tfFetch<T>(path: string): Promise<T> {
  const url = `${TF_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: TF_KEY,
      Authorization: `Bearer ${TF_KEY}`,
      "Accept-Profile": "public",
    },
    next: { revalidate: 3600 }, // ISR 1h
  });
  if (!res.ok) {
    console.error(`TF fetch failed ${res.status} ${url}`);
    return [] as unknown as T;
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// Lookup parlamentar por CPF
// ─────────────────────────────────────────────────────────────────
type Parlamentar = {
  id: string;
  cpf: string;
  nome: string;
  nome_parlamentar: string | null;
  partido: string | null;
  partido_atual: string | null;
  uf: string | null;
  casa_legislativa: string | null;
  id_camara: number | null;
  id_senado: number | null;
  ativo: boolean | null;
  foto_url: string | null;
};

export async function getParlamentarByCpf(cpf: string): Promise<Parlamentar | null> {
  if (!cpf) return null;
  const clean = cpf.replace(/\D/g, "").padStart(11, "0").slice(-11);
  const data = await tfFetch<Parlamentar[]>(
    `parlamentares?cpf=eq.${clean}&select=id,cpf,nome,nome_parlamentar,partido,partido_atual,uf,casa_legislativa,id_camara,id_senado,ativo,foto_url&limit=1`
  );
  return data[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────
// CEAP — Cota Parlamentar (Câmara apenas)
// ─────────────────────────────────────────────────────────────────
export type CeapExpense = {
  ano: number;
  tipo_despesa: string;
  nome_fornecedor: string | null;
  cnpj_cpf_fornecedor: string | null;
  valor_liquido: number;
  data_documento: string | null;
  url_documento: string | null;
};

export type CeapSummary = {
  total: number;
  totalRecente: number; // últimos 12 meses
  byType: Array<{ tipo: string; total: number; count: number }>;
  topFornecedores: Array<{ fornecedor: string; cnpj: string | null; total: number; count: number }>;
  recent: CeapExpense[];
};

export async function getCeapByCamaraId(idCamara: number | null): Promise<CeapSummary | null> {
  if (!idCamara) return null;
  // Pega últimos 24 meses (carga manageable). Ano atual = 2026.
  const data = await tfFetch<CeapExpense[]>(
    `ceaps_brutas?deputado_id_externo=eq.${idCamara}&select=ano,tipo_despesa,nome_fornecedor,cnpj_cpf_fornecedor,valor_liquido,data_documento,url_documento&order=data_documento.desc&limit=2000`
  );
  if (!data || data.length === 0) return null;

  const total = data.reduce((s, e) => s + Number(e.valor_liquido ?? 0), 0);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const totalRecente = data
    .filter((e) => e.data_documento && new Date(e.data_documento) >= cutoff)
    .reduce((s, e) => s + Number(e.valor_liquido ?? 0), 0);

  // Agregar por tipo
  const byTypeMap = new Map<string, { total: number; count: number }>();
  for (const e of data) {
    const k = e.tipo_despesa || "OUTROS";
    const cur = byTypeMap.get(k) ?? { total: 0, count: 0 };
    cur.total += Number(e.valor_liquido ?? 0);
    cur.count++;
    byTypeMap.set(k, cur);
  }
  const byType = Array.from(byTypeMap.entries())
    .map(([tipo, v]) => ({ tipo, ...v }))
    .sort((a, b) => b.total - a.total);

  // Top fornecedores
  const fornMap = new Map<string, { cnpj: string | null; total: number; count: number }>();
  for (const e of data) {
    const k = (e.nome_fornecedor || "DESCONHECIDO").trim();
    const cur = fornMap.get(k) ?? { cnpj: e.cnpj_cpf_fornecedor, total: 0, count: 0 };
    cur.total += Number(e.valor_liquido ?? 0);
    cur.count++;
    fornMap.set(k, cur);
  }
  const topFornecedores = Array.from(fornMap.entries())
    .map(([fornecedor, v]) => ({ fornecedor, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    total,
    totalRecente,
    byType: byType.slice(0, 10),
    topFornecedores,
    recent: data.slice(0, 20),
  };
}

// ─────────────────────────────────────────────────────────────────
// Sanções
// ─────────────────────────────────────────────────────────────────
export type SancoesCache = {
  parlamentar_id: string;
  sancoes: unknown; // JSON
  updated_at: string;
};

export async function getSancoesByParlamentarId(parlamentarId: string): Promise<SancoesCache | null> {
  if (!parlamentarId) return null;
  const data = await tfFetch<SancoesCache[]>(
    `parlamentar_sancoes_cache?parlamentar_id=eq.${parlamentarId}&select=*&limit=1`
  );
  return data[0] ?? null;
}

/**
 * Cruza fornecedores CEAP com CEIS (sanctioned_entities) do ElectioLab.
 * Retorna lista de fornecedores que estão sancionados.
 */
export type CeapSanctionMatch = {
  fornecedor: string;
  cnpj: string | null;
  totalCeap: number;
  countCeap: number;
  sancao: {
    id: number;
    tipo_sancao: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    orgao_sancionador: string | null;
  };
};

export async function crossCeapWithCeis(
  fornecedores: Array<{ fornecedor: string; cnpj: string | null; total: number; count: number }>,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<CeapSanctionMatch[]> {
  const cnpjs = fornecedores
    .map((f) => f.cnpj?.replace(/\D/g, ""))
    .filter((c): c is string => Boolean(c && c.length >= 11));
  if (cnpjs.length === 0) return [];

  const url = `${supabaseUrl}/rest/v1/sanctioned_entities?cnpj_clean=in.(${cnpjs.join(",")})&select=id,cnpj_clean,tipo_sancao,data_inicio,data_fim,orgao_sancionador&order=data_inicio.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const sanctions = (await res.json()) as Array<{
    id: number;
    cnpj_clean: string;
    tipo_sancao: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    orgao_sancionador: string | null;
  }>;

  // Apenas sanções ativas hoje
  const today = new Date().toISOString().slice(0, 10);
  const active = sanctions.filter((s) => !s.data_fim || s.data_fim >= today);

  const matches: CeapSanctionMatch[] = [];
  for (const f of fornecedores) {
    const clean = f.cnpj?.replace(/\D/g, "");
    if (!clean) continue;
    const sanc = active.find((s) => s.cnpj_clean === clean);
    if (sanc) {
      matches.push({
        fornecedor: f.fornecedor,
        cnpj: f.cnpj,
        totalCeap: f.total,
        countCeap: f.count,
        sancao: sanc,
      });
    }
  }
  return matches;
}

// ─────────────────────────────────────────────────────────────────
// Top CEAP gastadores — para página /cota-parlamentar
// ─────────────────────────────────────────────────────────────────
export type CeapTopRow = {
  deputado_id_externo: string;
  ano: number;
  total_liquido: number;
  parlamentar?: Parlamentar;
};

export async function getTopCeapSpenders(ano = 2025, limit = 50): Promise<CeapTopRow[]> {
  // PostgREST não tem aggregate fácil, mas podemos usar RPC. Fallback: pega tudo do ano e agrega no client.
  // Pra manageable, limitamos a 5000 rows do ano (top spenders se concentram).
  const all = await tfFetch<Array<{ deputado_id_externo: string; ano: number; valor_liquido: number }>>(
    `ceaps_brutas?ano=eq.${ano}&select=deputado_id_externo,ano,valor_liquido&limit=5000&order=valor_liquido.desc`
  );
  const map = new Map<string, { ano: number; total: number }>();
  for (const r of all) {
    const cur = map.get(r.deputado_id_externo) ?? { ano: r.ano, total: 0 };
    cur.total += Number(r.valor_liquido ?? 0);
    map.set(r.deputado_id_externo, cur);
  }
  const sorted = Array.from(map.entries())
    .map(([id, v]) => ({ deputado_id_externo: id, ano: v.ano, total_liquido: v.total }))
    .sort((a, b) => b.total_liquido - a.total_liquido)
    .slice(0, limit);

  // Resolve parlamentares em batch
  const ids = sorted.map((r) => r.deputado_id_externo).join(",");
  if (!ids) return sorted;
  const parlamentares = await tfFetch<Parlamentar[]>(
    `parlamentares?id_camara=in.(${ids})&select=id,cpf,nome,nome_parlamentar,partido,partido_atual,uf,casa_legislativa,id_camara,id_senado,ativo,foto_url&limit=200`
  );
  const byCamId = new Map(parlamentares.map((p) => [String(p.id_camara), p]));

  return sorted.map((r) => ({
    ...r,
    parlamentar: byCamId.get(r.deputado_id_externo),
  }));
}
