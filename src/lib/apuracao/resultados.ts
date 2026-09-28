/**
 * Coleta e normalização dos EA20 (resultado unificado por cargo/abrangência).
 *
 * Sequência por alvo:
 *  1. requisição condicional (ETag/Last-Modified guardados na última `totalizacao`);
 *  2. `304` ⇒ nada a fazer; `404` ⇒ quarentena (regra 3) e segue;
 *  3. `200` com `idg` já gravado ⇒ mesma versão, não normaliza de novo;
 *  4. **identidades aritméticas** (`identidades.ts`). Falha bloqueante ⇒ o bruto é
 *     guardado como prova, o erro vai para `coletor_execucao` e o arquivo **não** é
 *     normalizado;
 *  5. `arquivo_bruto` → `totalizacao` (uma linha por versão) → `votacao_agrupamento`,
 *     `votacao_partido`, `votacao_candidato`, `candidato_vinculado` (último snapshot,
 *     upsert + remoção do que saiu).
 *
 * Regra 1 do `apuracao-2026/CLAUDE.md`: nada é recalculado. `pvapn` e `qe` entram como
 * vieram; percentuais usam sempre a variante de 9 casas.
 */

import { dataHoraUtc, flag, inteiro, percentual, texto } from "./valores";
import { descreverFalha, validarEA20, type FalhaIdentidade } from "./identidades";
import type { ArquivoResultado, CandidatoTse } from "./tipos";
import type { RepositorioApuracao } from "./repositorio";
import type { ClienteTse } from "./tse-cliente";
import type { AlvoEA20 } from "./acompanhamento";

/** Retenção do bruto por tipo de disputa (decisão de 26/09/2026). */
export function retencaoDoBruto(
  tipoDisputa: "majoritario" | "proporcional",
  arquivo: ArquivoResultado,
  pctAnterior: number | null,
): "completa" | "marco" | "final" | "ultima" {
  // Majoritários (Presidente, Governador, Senador) em BR/UF: todas as versões.
  if (tipoDisputa === "majoritario") return "completa";
  // Proporcionais: versão final, marco a cada ~10%, e a mais recente como 'ultima'.
  if (arquivo.and === "f") return "final";
  const pct = percentual(arquivo.s?.pstn) ?? 0;
  const faixaAtual = Math.floor(pct / 10);
  const faixaAnterior = pctAnterior === null ? -1 : Math.floor(pctAnterior / 10);
  return faixaAtual > faixaAnterior ? "marco" : "ultima";
}

/** `vs[].tp` → `candidato_vinculado.papel`. */
function papelVinculado(tp: string): "vice" | "suplente_1" | "suplente_2" | null {
  if (tp === "v") return "vice";
  if (tp === "s1") return "suplente_1";
  if (tp === "s2") return "suplente_2";
  return null;
}

export function linhaTotalizacao(
  disputaId: number,
  arquivo: ArquivoResultado,
  meta: {
    url: string;
    etag: string | null;
    lastModified: string | null;
    arquivoId: number | null;
  },
): Record<string, unknown> {
  const s = arquivo.s;
  const e = arquivo.e;
  const v = arquivo.v;
  return {
    disputa_id: disputaId,
    arquivo_id: meta.arquivoId,
    url_origem: meta.url,
    idg: arquivo.idg,
    etag: meta.etag,
    last_modified: meta.lastModified,
    gerado_em: dataHoraUtc(arquivo.dg, arquivo.hg),
    data_hora_total: dataHoraUtc(arquivo.dt, arquivo.ht),
    coletado_em: new Date().toISOString(),
    andamento: texto(arquivo.and),
    sem_eleito_tse: flag(arquivo.esae),
    mensagens_sem_eleito: arquivo.mnae ?? [],
    secoes_total: inteiro(s.ts),
    secoes_totalizadas: inteiro(s.st),
    secoes_nao_totalizadas: inteiro(s.snt),
    secoes_instaladas: inteiro(s.si),
    secoes_nao_instaladas: inteiro(s.sni),
    secoes_sa: inteiro(s.sa),
    secoes_sna: inteiro(s.sna),
    pct_secoes_totalizadas: percentual(s.pstn),
    eleitorado_total: inteiro(e.te),
    eleitorado_totalizado: inteiro(e.est),
    eleitorado_nao_totalizado: inteiro(e.esnt),
    eleitorado_instalado: inteiro(e.esi),
    eleitorado_nao_instalado: inteiro(e.esni),
    eleitorado_sa: inteiro(e.esa),
    eleitorado_sna: inteiro(e.esna),
    comparecimento: inteiro(e.c),
    abstencao: inteiro(e.a),
    total_votos: inteiro(v.tv),
    votos_validos_com_anulados: inteiro(v.vvc),
    votos_validos: inteiro(v.vv),
    votos_nominais: inteiro(v.vnom),
    votos_legenda: inteiro(v.vl),
    anulados: inteiro(v.van),
    anulados_sub_judice: inteiro(v.vansj),
    votos_sem_candidato: inteiro(v.vsan),
    brancos: inteiro(v.vb),
    nulos: inteiro(v.tvn),
    nulos_diretos: inteiro(v.vn),
    nulos_tecnicos: inteiro(v.vnt),
    vscv: inteiro(v.vscv),
  };
}

export interface ResumoAlvo {
  alvo: AlvoEA20;
  situacao:
    | "gravado"
    | "sem-mudanca"
    | "mesma-versao"
    | "quarentena"
    | "404"
    | "erro"
    | "identidade";
  idg?: string;
  candidatos?: number;
  removidos?: number;
  falhas?: FalhaIdentidade[];
  mensagem?: string;
}

export interface OpcoesResultados {
  /** `public.elections` por `type|state|round` (ver `repositorio.mapaElections`). */
  elections?: Map<string, string>;
  /** Código do cargo → `elections.type` (tabela `apuracao.cargo_tipo`). */
  tiposDeCargo?: Map<number, string>;
  /** Ano usado na busca em `public.elections`. */
  ano?: number;
  aoRegistrar?: (linha: string) => void;
  /** Ctrl+C: para de pedir arquivos novos e devolve o que já coletou. */
  interromper?: () => boolean;
}

/** Chave de `public.elections`: presidente é nacional (`state` nulo); os demais, por UF. */
function chaveElection(
  tipo: string | undefined,
  uf: string | null,
  turno: number,
): string | null {
  if (!tipo) return null;
  if (tipo === "presidente") return `${tipo}||${turno}`;
  if (!uf || uf === "zz") return null;
  return `${tipo}|${uf.toUpperCase()}|${turno}`;
}

/**
 * Coleta os EA20 da lista de alvos. Nunca lança por um alvo isolado: um arquivo com
 * problema virá como `erro`/`identidade` no resumo e o ciclo continua.
 */
export async function coletarResultados(
  cliente: ClienteTse,
  repo: RepositorioApuracao,
  alvos: AlvoEA20[],
  opcoes: OpcoesResultados = {},
): Promise<ResumoAlvo[]> {
  const registrar = opcoes.aoRegistrar ?? (() => {});
  const resumos: ResumoAlvo[] = [];

  // Disputas primeiro: precisamos do id para ler o ETag da última totalização.
  const disputaPorAlvo = new Map<AlvoEA20, number>();
  for (const alvo of alvos) {
    const tipo = opcoes.tiposDeCargo?.get(alvo.cargo.codigo);
    const chave = chaveElection(tipo, alvo.uf, alvo.eleicao.turno);
    const electionId = chave ? (opcoes.elections?.get(chave) ?? null) : null;
    const id = await repo.upsertDisputa({
      eleicao_id: alvo.eleicao.id,
      cargo_id: alvo.cargo.id,
      abrangencia: alvo.abrangencia,
      tipo_abrangencia: alvo.tipoAbrangencia,
      uf: alvo.uf,
      municipio_codigo: null,
      // `vagas` e `quociente_eleitoral` vêm do próprio EA20; ficam nulos até a 1ª coleta.
      vagas: null,
      quociente_eleitoral: null,
      election_id: electionId,
    });
    disputaPorAlvo.set(alvo, id);
  }

  const estados = await repo.estadosTotalizacao([...disputaPorAlvo.values()]);

  const interrompido = opcoes.interromper ?? (() => false);

  for (const alvo of alvos) {
    if (interrompido()) break;
    const disputaId = disputaPorAlvo.get(alvo)!;
    const estado = estados.get(disputaId) ?? { idg: null, etag: null, lastModified: null };

    const resposta = await cliente.buscar(alvo.url, {
      etag: estado.etag,
      lastModified: estado.lastModified,
    });

    if (resposta.resultado === "304") {
      resumos.push({ alvo, situacao: "sem-mudanca" });
      continue;
    }
    if (resposta.resultado === "quarentena") {
      resumos.push({ alvo, situacao: "quarentena" });
      continue;
    }
    if (resposta.resultado === "404") {
      resumos.push({ alvo, situacao: "404" });
      continue;
    }
    if (resposta.resultado === "erro") {
      resumos.push({ alvo, situacao: "erro", mensagem: resposta.mensagem });
      continue;
    }

    const arquivo = resposta.corpo as ArquivoResultado;

    if (estado.idg && estado.idg === arquivo.idg) {
      resumos.push({ alvo, situacao: "mesma-versao", idg: arquivo.idg });
      continue;
    }

    // --- validação de esquema ---
    const validacao = validarEA20(arquivo, alvo.cargo.tipoDisputa);
    const pctAtual = percentual(arquivo.s?.pstn);
    const retencao = retencaoDoBruto(alvo.cargo.tipoDisputa, arquivo, estado.pctSecoes ?? null);

    if (!validacao.ok) {
      // Guarda o bruto como prova e não normaliza (o arquivo pode ter mudado de leiaute).
      await repo
        .salvarArquivoBruto({
          url: alvo.url,
          tipo: "EA20",
          idg: arquivo.idg,
          etag: resposta.etag,
          last_modified: resposta.lastModified,
          retencao,
          pct_secoes_totalizadas: pctAtual,
          conteudo: arquivo,
        })
        .catch(() => undefined);
      for (const f of validacao.bloqueantes) {
        registrar(`IDENTIDADE ${alvo.url} — ${descreverFalha(f)}`);
      }
      resumos.push({
        alvo,
        situacao: "identidade",
        idg: arquivo.idg,
        falhas: validacao.bloqueantes,
      });
      continue;
    }

    for (const f of validacao.falhas) {
      registrar(`aviso ${alvo.url} — ${descreverFalha(f)}`);
    }

    // --- gravação ---
    try {
      const arquivoId = await repo.salvarArquivoBruto({
        url: alvo.url,
        tipo: "EA20",
        idg: arquivo.idg,
        etag: resposta.etag,
        last_modified: resposta.lastModified,
        retencao,
        pct_secoes_totalizadas: pctAtual,
        conteudo: arquivo,
      });

      const cargoTse = arquivo.carg[0];
      // `nv` e `qe` são do arquivo: atualiza a disputa agora que temos o EA20.
      const tipoElection = opcoes.tiposDeCargo?.get(alvo.cargo.codigo);
      const chave = chaveElection(tipoElection, alvo.uf, alvo.eleicao.turno);
      await repo.upsertDisputa({
        eleicao_id: alvo.eleicao.id,
        cargo_id: alvo.cargo.id,
        abrangencia: alvo.abrangencia,
        tipo_abrangencia: alvo.tipoAbrangencia,
        uf: alvo.uf,
        municipio_codigo: null,
        vagas: inteiro(cargoTse.nv),
        quociente_eleitoral: inteiro(cargoTse.qe),
        election_id: chave ? (opcoes.elections?.get(chave) ?? null) : null,
      });

      const totalizacaoId = await repo.salvarTotalizacao(
        linhaTotalizacao(disputaId, arquivo, {
          url: alvo.url,
          etag: resposta.etag,
          lastModified: resposta.lastModified,
          arquivoId,
        }),
      );

      const { agrupamentos, partidos, candidatos, vinculados } = normalizarHierarquia(
        arquivo,
        disputaId,
        totalizacaoId,
      );

      const gravado = await repo.substituirVotacao(
        disputaId,
        totalizacaoId,
        agrupamentos,
        partidos,
        candidatos,
        vinculados,
      );

      resumos.push({
        alvo,
        situacao: "gravado",
        idg: arquivo.idg,
        candidatos: gravado.candidatos,
        removidos: gravado.removidos,
      });
      registrar(
        `gravado ${alvo.abrangencia}/c${alvo.cargo.codigo} idg=${arquivo.idg} ` +
          `${gravado.candidatos} candidatos (${retencao})`,
      );
    } catch (e) {
      resumos.push({ alvo, situacao: "erro", mensagem: (e as Error).message });
      registrar(`ERRO ao gravar ${alvo.url} — ${(e as Error).message}`);
    }
  }

  return resumos;
}

/** `agr[] → par[] → cand[]` → linhas das tabelas de snapshot. */
export function normalizarHierarquia(
  arquivo: ArquivoResultado,
  disputaId: number,
  totalizacaoId: number,
): {
  agrupamentos: Record<string, unknown>[];
  partidos: Record<string, unknown>[];
  candidatos: Record<string, unknown>[];
  vinculados: Map<string, Record<string, unknown>[]>;
} {
  const cargo = arquivo.carg[0];
  const agora = new Date().toISOString();
  const agrupamentos: Record<string, unknown>[] = [];
  const partidos: Record<string, unknown>[] = [];
  const candidatos: Record<string, unknown>[] = [];
  const vinculados = new Map<string, Record<string, unknown>[]>();

  for (const agr of cargo.agr ?? []) {
    agrupamentos.push({
      disputa_id: disputaId,
      totalizacao_id: totalizacaoId,
      numero: agr.n,
      tipo: agr.tp,
      nome: texto(agr.nm),
      composicao: texto(agr.com),
      vagas_obtidas: inteiro(agr.vag),
      votos_nominais_validos: inteiro(agr.tvtn),
      votos_apurados_nominais: inteiro(agr.tvan),
      votos_legenda_total: inteiro(agr.tvtl),
      votos_legenda_pura: inteiro(agr.tval),
      atualizado_em: agora,
    });

    for (const par of agr.par ?? []) {
      partidos.push({
        disputa_id: disputaId,
        totalizacao_id: totalizacaoId,
        numero: inteiro(par.n),
        sigla: par.sg,
        nome: texto(par.nm),
        agrupamento_numero: agr.n,
        agrupamento_tipo: agr.tp,
        federacao_numero: texto(par.nfed),
        destinacao: texto(par.dvt),
        votos_nominais_validos: inteiro(par.tvtn),
        votos_apurados_nominais: inteiro(par.tvan),
        votos_legenda_total: inteiro(par.tvtl),
        votos_legenda_pura: inteiro(par.tval),
        atualizado_em: agora,
      });

      for (const cand of par.cand ?? []) {
        candidatos.push({
          disputa_id: disputaId,
          totalizacao_id: totalizacaoId,
          sqcand: cand.sqcand,
          numero: inteiro(cand.n),
          nome: texto(cand.nm),
          nome_urna: cand.nmu,
          partido_numero: inteiro(par.n),
          partido_sigla: par.sg,
          agrupamento_numero: agr.n,
          agrupamento_tipo: agr.tp,
          posicao: inteiro(cand.seq),
          votos_apurados: inteiro(cand.vap),
          pct_tse: percentual(cand.pvapn),
          destinacao: texto(cand.dvt),
          situacao: texto(cand.st),
          eleito: flag(cand.e),
          substituidos: cand.subs && cand.subs.length > 0 ? cand.subs : null,
          atualizado_em: agora,
        });

        const lista = linhasVinculadas(cand);
        if (lista.length > 0) vinculados.set(cand.sqcand, lista);
      }
    }
  }

  return { agrupamentos, partidos, candidatos, vinculados };
}

function linhasVinculadas(cand: CandidatoTse): Record<string, unknown>[] {
  const linhas: Record<string, unknown>[] = [];
  for (const v of cand.vs ?? []) {
    const papel = papelVinculado(v.tp);
    if (!papel) continue;
    linhas.push({
      papel,
      sqcand: texto(v.sqcand),
      nome: texto(v.nm),
      nome_urna: texto(v.nmu),
      partido_sigla: texto(v.sgp),
    });
  }
  return linhas;
}
