/**
 * Cross-project helpers para buscar dados do projeto Transparência Federal (TF)
 * a partir do ElectioLab — sem duplicar dados.
 *
 * TF é um Supabase project separado (`redggdtakzmsabwvjzhb`) que indexa:
 *   - parlamentares (Câmara + Senado, com cpf e id_tse_candidato)
 *   - ceaps_brutas (Cota Parlamentar Câmara — 1,4 mi linhas; RLS SEM policy: o anon NÃO lê.
 *     O site usa só os agregados públicos `ceap_resumo_deputado` e `ceaps_ranking`)
 *   - parlamentar_sancoes_cache (sanções aplicadas)
 *   - parlamentar_contratos_cache (contratos com governo)
 *   - parlamentar_financiamento_cache (financiamento de campanha histórico)
 *   - beneficios_parlamentares (auxílio-moradia, ressarcimento, etc.)
 *
 * Match com ElectioLab: por **CPF** ou **id_tse_candidato**.
 */

import {
  normalizarVoto,
  resumoCamara,
  rotuloResultado,
  resumoSenado,
  type AggCamaraRow,
  type AlinhamentoSenadorRow,
  type ResumoSenadorRow,
  type VotacoesParlamentar,
  type VotoRecente,
} from "@/lib/votacoes";

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
export type Parlamentar = {
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
// Lê a view materializada `ceap_resumo_deputado` (TF), já agregada por deputado
// numa janela de 24 meses. Nunca consultar `ceaps_brutas` daqui: a tabela tem RLS
// sem policy para o anon e devolve `[]` sem erro (foi assim que a seção sumiu).
// Migration: supabase/migrations/20260926130000_tf_ceap_resumo_deputado.sql
export type CeapSummary = {
  total: number; // últimos 24 meses
  totalRecente: number; // últimos 12 meses
  byType: Array<{ tipo: string; total: number; count: number }>;
  topFornecedores: Array<{ fornecedor: string; cnpj: string | null; total: number; count: number }>;
};

type CeapResumoRow = {
  total_24m: number | string;
  total_12m: number | string;
  por_tipo: Array<{ tipo: string; total: number | string; count: number }> | null;
  top_fornecedores: Array<{ fornecedor: string; cnpj: string | null; total: number | string; count: number }> | null;
};

export async function getCeapByCamaraId(idCamara: number | null): Promise<CeapSummary | null> {
  if (!idCamara) return null;
  const rows = await tfFetch<CeapResumoRow[]>(
    `ceap_resumo_deputado?deputado_id_externo=eq.${idCamara}&select=total_24m,total_12m,por_tipo,top_fornecedores&limit=1`
  );
  const r = rows[0];
  if (!r) return null;

  return {
    total: Number(r.total_24m ?? 0),
    totalRecente: Number(r.total_12m ?? 0),
    byType: (r.por_tipo ?? []).map((t) => ({ tipo: t.tipo, total: Number(t.total), count: t.count })),
    topFornecedores: (r.top_fornecedores ?? []).map((f) => ({
      fornecedor: f.fornecedor,
      cnpj: f.cnpj,
      total: Number(f.total),
      count: f.count,
    })),
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
  // `ceaps_ranking` já vem agregada por deputado/ano e ordenada (posicao 1 = maior gasto).
  // O total bate com a soma de ceaps_brutas no ano (2025: R$ 256.581.818 / 515 deputados).
  const rows = await tfFetch<Array<{ deputado_id_externo: string; ano: number; total_liquido: number | string }>>(
    `ceaps_ranking?ano=eq.${ano}&select=deputado_id_externo,ano,total_liquido&order=posicao.asc&limit=${limit}`
  );
  const sorted = rows.map((r) => ({
    deputado_id_externo: r.deputado_id_externo,
    ano: r.ano,
    total_liquido: Number(r.total_liquido ?? 0),
  }));

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

// ─────────────────────────────────────────────────────────────────
// Votações de plenário (Câmara e Senado)
// ─────────────────────────────────────────────────────────────────
// Câmara: `plen_votos`/`plen_votacoes` têm RLS sem policy (o anon recebe `[]`),
// então a ficha lê só o agregado público `plen_deputado_agg` e a view
// materializada `mv_votos_recentes_parlamentar`. A presença só é confiável com a
// janela de exercício (`v_cam_janela_exercicio`): ver resumoCamara().
// Senado: `mv_voto_resumo_senador`. Migrations:
//   supabase/migrations/20261003130000_tf_votos_views_parlamentar.sql
// Regras e limites: docs/BASTIDORES-POS-ELEICAO.md §8.

const RECENTES_NA_FICHA = 10;

type RecenteRow = {
  votacao_id: string;
  data: string;
  descricao: string | null;
  materia: string | null;
  resultado: string | null;
  voto: string | null;
};

async function getVotosRecentes(casa: "camara" | "senado", idExterno: number): Promise<VotoRecente[]> {
  const rows = await tfFetch<RecenteRow[]>(
    `mv_votos_recentes_parlamentar?casa=eq.${casa}&id_externo=eq.${idExterno}` +
      `&select=votacao_id,data,descricao,materia,resultado,voto&order=data.desc,votacao_id.desc&limit=${RECENTES_NA_FICHA}`,
  );
  return rows.map((r) => ({
    votacaoId: r.votacao_id,
    data: r.data,
    descricao: r.descricao,
    materia: r.materia,
    resultado: rotuloResultado(r.resultado),
    voto: normalizarVoto(r.voto),
  }));
}

export async function getVotacoesParlamentar(p: Parlamentar): Promise<VotacoesParlamentar | null> {
  if (p.casa_legislativa === "senado" && p.id_senado) {
    const [resumoRows, alinhamentoRows, recentes] = await Promise.all([
      tfFetch<ResumoSenadorRow[]>(`mv_voto_resumo_senador?cod_parlamentar=eq.${p.id_senado}&select=*&limit=1`),
      // Ainda não existe até a migration 20261003150000 ser aplicada; tfFetch devolve [] e o cartão some.
      tfFetch<AlinhamentoSenadorRow[]>(
        `mv_senador_alinhamento?cod_parlamentar=eq.${p.id_senado}&select=votacoes_com_orientacao,pct_alinhamento&limit=1`,
      ),
      getVotosRecentes("senado", p.id_senado),
    ]);
    if (!resumoRows[0]) return null;
    return { resumo: resumoSenado(resumoRows[0], alinhamentoRows[0] ?? null), recentes };
  }

  if (p.casa_legislativa === "camara" && p.id_camara) {
    const [aggRows, janelaRows, recentes] = await Promise.all([
      tfFetch<AggCamaraRow[]>(
        `plen_deputado_agg?deputado_id=eq.${p.id_camara}` +
          `&select=id_legislatura,total_votacoes,presencas,votos_sim,votos_nao,votos_abstencao,votos_obstrucao,pct_presenca,concordancia_partido` +
          `&order=id_legislatura.desc&limit=1`,
      ),
      tfFetch<Array<{ id_legislatura: number }>>(
        `v_cam_janela_exercicio?deputado_id=eq.${p.id_camara}&select=id_legislatura&order=id_legislatura.desc&limit=1`,
      ),
      getVotosRecentes("camara", p.id_camara),
    ]);
    if (!aggRows[0]) return null;
    return {
      resumo: resumoCamara(aggRows[0], janelaRows[0]?.id_legislatura ?? null, p.partido_atual ?? p.partido),
      recentes,
    };
  }

  return null;
}

/**
 * Ids de parlamentares com algo para mostrar na página da pessoa (votações ou CEAP),
 * em 3 consultas em lote. Alimenta o sitemap: página sem dado nenhum não deve ser listada.
 * Como tfFetch devolve [] em erro, uma falha aqui resulta em "ninguém tem dados" e o
 * sitemap simplesmente não adiciona páginas (nunca remove).
 */
export async function getIdsComDadosNoTf(): Promise<{ camara: Set<number>; senado: Set<number> }> {
  const [agg, ceap, sen] = await Promise.all([
    tfFetch<Array<{ deputado_id: number }>>("plen_deputado_agg?select=deputado_id&limit=2000"),
    tfFetch<Array<{ deputado_id_externo: number | string }>>("ceap_resumo_deputado?select=deputado_id_externo&limit=2000"),
    tfFetch<Array<{ cod_parlamentar: number }>>("mv_voto_resumo_senador?select=cod_parlamentar&limit=2000"),
  ]);
  return {
    camara: new Set([...agg.map((r) => Number(r.deputado_id)), ...ceap.map((r) => Number(r.deputado_id_externo))]),
    senado: new Set(sen.map((r) => Number(r.cod_parlamentar))),
  };
}
