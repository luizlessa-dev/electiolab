/**
 * Acesso ao schema `apuracao` no Supabase do Electiolab.
 *
 * Só o `service_role` escreve aqui (a migration liga RLS e dá `select` público às tabelas
 * de exibição). O schema precisa estar exposto em Settings → API → Exposed schemas.
 *
 * Sobre atomicidade: o PostgREST não expõe transação entre chamadas. Para a regra de
 * retenção ("último snapshot por disputa: upsert + remoção do que saiu"), este módulo
 * usa `totalizacao_id` como marca de versão — faz o upsert das linhas com o
 * `totalizacao_id` novo e depois apaga, na mesma disputa, tudo que não ficou com essa
 * marca. Leitor que filtra pela versão corrente nunca vê mistura. Quando a coleta
 * migrar para a rota da Vercel, o caminho certo é uma função plpgsql
 * (`apuracao.gravar_ea20(jsonb)`) que faz tudo numa transação e numa só ida ao banco.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PortaQuarentena } from "./tse-cliente";
import type { ContadoresTse } from "./tse-cliente";

export type Ambiente = "simulado" | "oficial";

export function clienteApuracao(env: Record<string, string | undefined> = process.env): SupabaseClient {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para escrever em `apuracao`.",
    );
  }
  return createClient(url, chave, {
    auth: { persistSession: false },
    db: { schema: "apuracao" as never },
  });
}

/** Cliente no schema `public` (para ler `elections` e `candidates`). */
export function clientePublico(env: Record<string, string | undefined> = process.env): SupabaseClient {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Credenciais do Supabase ausentes.");
  return createClient(url, chave, { auth: { persistSession: false } });
}

function erro(contexto: string, e: { message: string; code?: string } | null): void {
  if (e) throw new Error(`${contexto}: ${e.message}${e.code ? ` (${e.code})` : ""}`);
}

// ---------------------------------------------------------------------------

export interface EstadoArquivo {
  idg: string | null;
  etag: string | null;
  lastModified: string | null;
  /** `pct_secoes_totalizadas` da última versão — base do marco de ~10% (proporcionais). */
  pctSecoes?: number | null;
}

export interface LinhaEleicao {
  ambiente: Ambiente;
  codigo_eleicao: number;
  codigo_eleicao_2t: number | null;
  codigo_pleito: number;
  sqele: string | null;
  ciclo: string | null;
  turno: number;
  tipo: number | null;
  descricao: string | null;
  data_pleito: string | null;
  bruto: unknown;
}

export interface LinhaCargo {
  eleicao_id: number;
  codigo: number;
  nome: string;
  tipo_disputa: "majoritario" | "proporcional";
}

export interface LinhaMunicipio {
  eleicao_id: number;
  uf: string;
  codigo_tse: string;
  codigo_ibge: string | null;
  nome: string;
  capital: boolean;
}

export interface LinhaArquivoBruto {
  url: string;
  tipo: "EA10" | "EA11" | "EA12" | "EA14" | "EA15" | "EA20";
  idg: string;
  etag: string | null;
  last_modified: string | null;
  retencao: "completa" | "marco" | "final" | "ultima";
  pct_secoes_totalizadas: number | null;
  conteudo: unknown;
}

export class RepositorioApuracao {
  constructor(
    private readonly sb: SupabaseClient = clienteApuracao(),
    private readonly pub: SupabaseClient = clientePublico(),
  ) {}

  // --- quarentena de 404 -------------------------------------------------

  quarentena(): PortaQuarentena {
    const sb = this.sb;
    return {
      async carregar() {
        const agora = new Date().toISOString();
        const { data, error } = await sb
          .from("url_quarentena")
          .select("url, liberada_em")
          .or(`liberada_em.is.null,liberada_em.gt.${agora}`);
        erro("lendo url_quarentena", error);
        return new Set<string>((data ?? []).map((l: { url: string }) => l.url));
      },
      async registrar(url: string, statusHttp: number) {
        const agora = new Date().toISOString();
        const { data } = await sb
          .from("url_quarentena")
          .select("tentativas")
          .eq("url", url)
          .maybeSingle();
        const tentativas = ((data?.tentativas as number | undefined) ?? 0) + 1;
        const { error } = await sb.from("url_quarentena").upsert(
          {
            url,
            status_http: statusHttp,
            ultima_vez: agora,
            tentativas,
            ...(data ? {} : { primeira_vez: agora }),
          },
          { onConflict: "url" },
        );
        erro("gravando url_quarentena", error);
      },
    };
  }

  /** Libera URLs da quarentena (a config/acompanhamento passou a indicar que existem). */
  async liberarQuarentena(urls: string[]): Promise<void> {
    if (urls.length === 0) return;
    const { error } = await this.sb.from("url_quarentena").delete().in("url", urls);
    erro("liberando url_quarentena", error);
  }

  // --- log de execução ---------------------------------------------------

  async abrirExecucao(ambiente: Ambiente): Promise<number> {
    const { data, error } = await this.sb
      .from("coletor_execucao")
      .insert({ ambiente })
      .select("id")
      .single();
    erro("abrindo coletor_execucao", error);
    return data!.id as number;
  }

  async fecharExecucao(
    id: number,
    contadores: ContadoresTse,
    mensagem: string | null,
  ): Promise<void> {
    const { error } = await this.sb
      .from("coletor_execucao")
      .update({
        finalizado_em: new Date().toISOString(),
        requisicoes: contadores.requisicoes,
        respostas_200: contadores.respostas200,
        respostas_304: contadores.respostas304,
        respostas_404: contadores.respostas404,
        respostas_429: contadores.respostas429,
        respostas_5xx: contadores.respostas5xx,
        erros: contadores.erros,
        mensagem,
      })
      .eq("id", id);
    erro("fechando coletor_execucao", error);
  }

  // --- configuração ------------------------------------------------------

  async salvarEleicao(linha: LinhaEleicao): Promise<number> {
    const { data, error } = await this.sb
      .from("eleicao")
      .upsert({ ...linha, atualizado_em: new Date().toISOString() }, {
        onConflict: "ambiente,codigo_eleicao",
      })
      .select("id")
      .single();
    erro(`salvando eleicao ${linha.codigo_eleicao}`, error);
    return data!.id as number;
  }

  async salvarCargos(linhas: LinhaCargo[]): Promise<Map<number, number>> {
    if (linhas.length === 0) return new Map();
    const { data, error } = await this.sb
      .from("cargo")
      .upsert(linhas, { onConflict: "eleicao_id,codigo" })
      .select("id, codigo");
    erro("salvando cargo", error);
    return new Map((data ?? []).map((c: { id: number; codigo: number }) => [c.codigo, c.id]));
  }

  async salvarMunicipios(linhas: LinhaMunicipio[]): Promise<number> {
    let gravados = 0;
    for (let i = 0; i < linhas.length; i += 1000) {
      const lote = linhas.slice(i, i + 1000);
      const { error } = await this.sb
        .from("municipio")
        .upsert(lote, { onConflict: "eleicao_id,codigo_tse" });
      erro("salvando municipio", error);
      gravados += lote.length;
    }
    return gravados;
  }

  async contarMunicipios(eleicaoId: number): Promise<number> {
    const { count, error } = await this.sb
      .from("municipio")
      .select("id", { count: "exact", head: true })
      .eq("eleicao_id", eleicaoId);
    erro("contando municipio", error);
    return count ?? 0;
  }

  // --- arquivo bruto -----------------------------------------------------

  /** Último estado conhecido de uma URL (para a requisição condicional). */
  async estadoArquivo(url: string): Promise<EstadoArquivo> {
    const { data, error } = await this.sb
      .from("arquivo_bruto")
      .select("idg, etag, last_modified")
      .eq("url", url)
      .order("coletado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    erro(`lendo arquivo_bruto de ${url}`, error);
    return {
      idg: (data?.idg as string | undefined) ?? null,
      etag: (data?.etag as string | undefined) ?? null,
      lastModified: (data?.last_modified as string | undefined) ?? null,
    };
  }

  /** Conteúdo guardado da última versão de uma URL (usado quando a resposta é 304). */
  async arquivoBrutoPorUrl(url: string): Promise<unknown | null> {
    const { data, error } = await this.sb
      .from("arquivo_bruto")
      .select("conteudo")
      .eq("url", url)
      .order("coletado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    erro(`lendo conteúdo de arquivo_bruto de ${url}`, error);
    return data?.conteudo ?? null;
  }

  async salvarArquivoBruto(linha: LinhaArquivoBruto): Promise<number> {
    const { data, error } = await this.sb
      .from("arquivo_bruto")
      .upsert(linha, { onConflict: "url,idg" })
      .select("id")
      .single();
    erro(`salvando arquivo_bruto de ${linha.url}`, error);
    return data!.id as number;
  }

  // --- acompanhamento ----------------------------------------------------

  /** Estado por abrangência, para a requisição condicional do EA14/EA15. */
  async estadosAcompanhamento(eleicaoId: number): Promise<Map<string, EstadoArquivo>> {
    const { data, error } = await this.sb
      .from("acompanhamento")
      .select("abrangencia, idg, etag, url_origem")
      .eq("eleicao_id", eleicaoId);
    erro("lendo acompanhamento", error);
    const mapa = new Map<string, EstadoArquivo>();
    for (const l of data ?? []) {
      mapa.set(l.abrangencia as string, {
        idg: (l.idg as string | null) ?? null,
        etag: (l.etag as string | null) ?? null,
        lastModified: null,
      });
    }
    return mapa;
  }

  /** Abrangências já gravadas de uma eleição — usada quando o EA14 responde 304. */
  async abrangenciasConhecidas(eleicaoId: number): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.sb
      .from("acompanhamento")
      .select(
        "abrangencia, tipo_abrangencia, uf, municipio_codigo, andamento, pct_secoes_totalizadas",
      )
      .eq("eleicao_id", eleicaoId);
    erro("lendo abrangências de acompanhamento", error);
    return (data ?? []) as Record<string, unknown>[];
  }

  async upsertAcompanhamento(linhas: Record<string, unknown>[]): Promise<void> {
    if (linhas.length === 0) return;
    for (let i = 0; i < linhas.length; i += 500) {
      const { error } = await this.sb
        .from("acompanhamento")
        .upsert(linhas.slice(i, i + 500), { onConflict: "eleicao_id,abrangencia" });
      erro("gravando acompanhamento", error);
    }
  }

  // --- disputa / totalização --------------------------------------------

  async upsertDisputa(linha: {
    eleicao_id: number;
    cargo_id: number;
    abrangencia: string;
    tipo_abrangencia: "br" | "uf" | "mun";
    uf: string | null;
    municipio_codigo: string | null;
    vagas: number | null;
    quociente_eleitoral: number | null;
    election_id: string | null;
  }): Promise<number> {
    const { data, error } = await this.sb
      .from("disputa")
      .upsert(linha, { onConflict: "eleicao_id,cargo_id,abrangencia" })
      .select("id")
      .single();
    erro(`salvando disputa ${linha.abrangencia}`, error);
    return data!.id as number;
  }

  /** Estado da última totalização de cada disputa (fonte do ETag/idg dos EA20). */
  async estadosTotalizacao(disputaIds: number[]): Promise<Map<number, EstadoArquivo>> {
    const mapa = new Map<number, EstadoArquivo>();
    if (disputaIds.length === 0) return mapa;
    for (let i = 0; i < disputaIds.length; i += 200) {
      const { data, error } = await this.sb
        .from("v_totalizacao_atual")
        .select("disputa_id, idg, etag, last_modified, pct_secoes_totalizadas")
        .in("disputa_id", disputaIds.slice(i, i + 200));
      erro("lendo v_totalizacao_atual", error);
      for (const l of data ?? []) {
        mapa.set(l.disputa_id as number, {
          idg: (l.idg as string | null) ?? null,
          etag: (l.etag as string | null) ?? null,
          lastModified: (l.last_modified as string | null) ?? null,
          pctSecoes: (l.pct_secoes_totalizadas as number | null) ?? null,
        });
      }
    }
    return mapa;
  }

  async salvarTotalizacao(linha: Record<string, unknown>): Promise<number> {
    const { data, error } = await this.sb
      .from("totalizacao")
      .upsert(linha, { onConflict: "disputa_id,idg" })
      .select("id")
      .single();
    erro("salvando totalizacao", error);
    return data!.id as number;
  }

  // --- último snapshot de votação ---------------------------------------

  /**
   * Grava o snapshot de uma disputa e remove o que saiu do arquivo novo.
   * A marca de versão é `totalizacao_id`: primeiro entram/atualizam as linhas com a
   * versão nova, depois é apagado tudo que ficou com versão diferente.
   */
  async substituirVotacao(
    disputaId: number,
    totalizacaoId: number,
    agrupamentos: Record<string, unknown>[],
    partidos: Record<string, unknown>[],
    candidatos: Record<string, unknown>[],
    vinculadosPorSqcand: Map<string, Record<string, unknown>[]>,
  ): Promise<{ candidatos: number; removidos: number }> {
    if (agrupamentos.length > 0) {
      const { error } = await this.sb
        .from("votacao_agrupamento")
        .upsert(agrupamentos, { onConflict: "disputa_id,numero" });
      erro("gravando votacao_agrupamento", error);
    }
    if (partidos.length > 0) {
      const { error } = await this.sb
        .from("votacao_partido")
        .upsert(partidos, { onConflict: "disputa_id,numero" });
      erro("gravando votacao_partido", error);
    }

    const idsPorSqcand = new Map<string, number>();
    for (let i = 0; i < candidatos.length; i += 500) {
      const { data, error } = await this.sb
        .from("votacao_candidato")
        .upsert(candidatos.slice(i, i + 500), { onConflict: "disputa_id,sqcand" })
        .select("id, sqcand");
      erro("gravando votacao_candidato", error);
      for (const l of data ?? []) idsPorSqcand.set(l.sqcand as string, l.id as number);
    }

    // Vinculados (vice / suplentes): a chave natural é (votacao_candidato_id, papel).
    const vinculados: Record<string, unknown>[] = [];
    for (const [sqcand, lista] of vinculadosPorSqcand) {
      const id = idsPorSqcand.get(sqcand);
      if (id === undefined) continue;
      for (const v of lista) vinculados.push({ ...v, votacao_candidato_id: id });
    }
    if (vinculados.length > 0) {
      const { error } = await this.sb
        .from("candidato_vinculado")
        .upsert(vinculados, { onConflict: "votacao_candidato_id,papel" });
      erro("gravando candidato_vinculado", error);
    }

    // Remove o que saiu do arquivo novo (ficou com versão anterior ou sem versão).
    let removidos = 0;
    for (const tabela of ["votacao_candidato", "votacao_partido", "votacao_agrupamento"]) {
      const { data, error } = await this.sb
        .from(tabela)
        .delete()
        .eq("disputa_id", disputaId)
        .or(`totalizacao_id.is.null,totalizacao_id.neq.${totalizacaoId}`)
        .select("id");
      erro(`removendo linhas antigas de ${tabela}`, error);
      removidos += (data ?? []).length;
    }

    return { candidatos: idsPorSqcand.size, removidos };
  }

  // --- ligação com o cadastro do Electiolab ------------------------------

  /** `apuracao.cargo_tipo`: código de cargo do TSE → `public.elections.type`. */
  async mapaCargoTipo(): Promise<Map<number, string>> {
    const { data, error } = await this.sb
      .from("cargo_tipo")
      .select("codigo_cargo, elections_type");
    erro("lendo cargo_tipo", error);
    return new Map(
      (data ?? []).map((l: { codigo_cargo: number; elections_type: string }) => [
        l.codigo_cargo,
        l.elections_type,
      ]),
    );
  }

  /** `public.elections` por (type, state, year, round) — vínculo aprovado em 26/09/2026. */
  async mapaElections(ano: number): Promise<Map<string, string>> {
    const { data, error } = await this.pub
      .from("elections")
      .select("id, type, state, round")
      .eq("year", ano);
    erro("lendo public.elections", error);
    const mapa = new Map<string, string>();
    for (const l of data ?? []) {
      const chave = `${l.type}|${(l.state as string | null) ?? ""}|${l.round}`;
      mapa.set(chave, l.id as string);
    }
    return mapa;
  }
}
