/**
 * Acompanhamento da totalização: EA14 (Brasil) e EA15 (por UF).
 *
 * Os dois arquivos têm o mesmo envelope (`<abr>-e<ELE>-ab.json`); o que muda é a
 * abrangência pedida: `br` traz Brasil + as 27 UFs (+ `zz` na eleição federal), e cada
 * UF traz a própria UF + seus municípios.
 *
 * Papel no ciclo:
 *  1. dizer **quais abrangências existem** em cada eleição — é daí que sai a lista de
 *     EA20 a pedir, sem inventar URL (regra 3 do `apuracao-2026/CLAUDE.md`);
 *  2. guardar o estado atual de cada abrangência (`apuracao.acompanhamento`).
 *
 * **Como se decide o que mudou.** Pelo `ETag`/`idg`, nunca por comparação de datas: o
 * mapa de campos registra que, no simulado, o `ht` de uma abrangência pode ser posterior
 * ao `hg` do arquivo que a contém, então data/hora não ordena versões. Na prática:
 *  - a requisição condicional responde `304` ⇒ o arquivo não mudou, nada a fazer;
 *  - responde `200` com o mesmo `idg` já gravado ⇒ é a mesma versão (CDN sem ETag
 *    estável, por exemplo) e a normalização é dispensada.
 * `dt`/`ht` continuam sendo gravados — servem para exibição ("atualizado às HH:MM"),
 * não para decidir coleta.
 *
 * Um detalhe de gravação: a mesma abrangência de UF aparece no EA14 e no EA15. O
 * `idg`/`etag`/`url_origem` só são gravados na linha que **identifica o arquivo**
 * (`br` para o EA14, `<uf>` para o EA15); as linhas que vêm de carona entram sem essas
 * colunas, para não apagar o ETag de que o outro arquivo depende no ciclo seguinte.
 */

import { dataHoraUtc, inteiro, percentual, texto } from "./valores";
import type { ArquivoAcompanhamento, AbrangenciaAcompanhamento } from "./tipos";
import type { RepositorioApuracao } from "./repositorio";
import type { ClienteTse } from "./tse-cliente";
import type { ConfigApuracao, EleicaoConfig } from "./config";
import { urlAcompanhamento, urlResultado } from "./urls";

export interface AbrangenciaVista {
  abrangencia: string;
  tipoAbrangencia: "br" | "uf" | "mun";
  uf: string | null;
  municipioCodigo: string | null;
  andamento: string | null;
  pctSecoesTotalizadas: number | null;
}

export interface AcompanhamentoEleicao {
  eleicao: EleicaoConfig;
  /** UFs (e `zz`) vistas no EA14 — base da lista de EA20. */
  ufs: string[];
  abrangencias: AbrangenciaVista[];
  /** `true` quando o EA14 respondeu 304 e a lista veio do banco. */
  doCache: boolean;
}

function tipoAbrangencia(tpabr: string): "br" | "uf" | "mun" {
  if (tpabr === "br" || tpabr === "uf" || tpabr === "mun") return tpabr;
  throw new Error(`Tipo de abrangência desconhecido no acompanhamento: ${tpabr}`);
}

/** Uma entrada de `abr[]` → linha de `apuracao.acompanhamento` (sem as colunas de arquivo). */
function linhaAbrangencia(
  eleicaoId: number,
  ufDoArquivo: string | null,
  a: AbrangenciaAcompanhamento,
): Record<string, unknown> {
  const tipo = tipoAbrangencia(a.tpabr);
  // No EA15 as entradas de município trazem só o código de 5 dígitos; a UF vem do arquivo.
  const uf = tipo === "mun" ? ufDoArquivo : tipo === "uf" ? a.cdabr.toLowerCase() : null;
  const municipioCodigo = tipo === "mun" ? a.cdabr : null;
  const abrangencia = tipo === "mun" ? `${uf ?? ""}${a.cdabr}` : a.cdabr.toLowerCase();

  return {
    eleicao_id: eleicaoId,
    abrangencia,
    tipo_abrangencia: tipo,
    uf,
    municipio_codigo: municipioCodigo,
    andamento: texto(a.and),
    data_hora_total: dataHoraUtc(a.dt, a.ht),
    secoes_total: inteiro(a.s?.ts),
    secoes_totalizadas: inteiro(a.s?.st),
    secoes_nao_totalizadas: inteiro(a.s?.snt),
    pct_secoes_totalizadas: percentual(a.s?.pstn),
    municipios_nao_recebidos: inteiro(a.munnr),
    municipios_parciais: inteiro(a.munpt),
    municipios_finais: inteiro(a.munf),
    ufs_nao_recebidas: inteiro(a.ufsnr),
    ufs_parciais: inteiro(a.ufspt),
    ufs_finais: inteiro(a.ufsf),
    coletado_em: new Date().toISOString(),
  };
}

export function vistaDaAbrangencia(
  linha: Record<string, unknown>,
): AbrangenciaVista {
  return {
    abrangencia: linha.abrangencia as string,
    tipoAbrangencia: linha.tipo_abrangencia as "br" | "uf" | "mun",
    uf: (linha.uf as string | null) ?? null,
    municipioCodigo: (linha.municipio_codigo as string | null) ?? null,
    andamento: (linha.andamento as string | null) ?? null,
    pctSecoesTotalizadas: (linha.pct_secoes_totalizadas as number | null) ?? null,
  };
}

/**
 * Separa as linhas em "a que identifica o arquivo" (leva idg/etag/url) e as demais.
 * `escopo` é `br` no EA14 e a UF no EA15.
 */
function separarPorEscopo(
  linhas: Record<string, unknown>[],
  escopo: string,
  arquivo: { idg: string; url: string; etag: string | null; arquivoId: number | null },
): { doArquivo: Record<string, unknown>[]; deCarona: Record<string, unknown>[] } {
  const doArquivo: Record<string, unknown>[] = [];
  const deCarona: Record<string, unknown>[] = [];
  for (const l of linhas) {
    if (l.abrangencia === escopo) {
      doArquivo.push({
        ...l,
        idg: arquivo.idg,
        url_origem: arquivo.url,
        etag: arquivo.etag,
        arquivo_id: arquivo.arquivoId,
      });
    } else {
      deCarona.push(l);
    }
  }
  return { doArquivo, deCarona };
}

export interface OpcoesAcompanhamento {
  /** Baixar EA15 (1 arquivo por UF por eleição). */
  ea15?: boolean;
  /** Guardar o bruto do EA14/EA15 em `arquivo_bruto`. */
  guardarBruto?: boolean;
  aoRegistrar?: (linha: string) => void;
}

/**
 * Coleta o EA14 de cada eleição no escopo e, se pedido, o EA15 de cada UF.
 * Devolve as abrangências por eleição — entrada de `resultados.ts`.
 */
export async function coletarAcompanhamento(
  cliente: ClienteTse,
  repo: RepositorioApuracao,
  config: ConfigApuracao,
  opcoes: OpcoesAcompanhamento = {},
): Promise<AcompanhamentoEleicao[]> {
  const guardarBruto = opcoes.guardarBruto ?? true;
  const registrar = opcoes.aoRegistrar ?? (() => {});
  const saida: AcompanhamentoEleicao[] = [];

  for (const eleicao of config.eleicoes) {
    const estados = await repo.estadosAcompanhamento(eleicao.id);

    // --- EA14 (Brasil) ---
    const urlBr = urlAcompanhamento(
      config.base,
      config.templates,
      eleicao.ciclo,
      eleicao.codigoEleicao,
      "br",
    );
    const resposta = await cliente.buscar(urlBr, estados.get("br") ?? {});

    let abrangencias: AbrangenciaVista[];
    let doCache = false;

    if (resposta.resultado === "200") {
      const arquivo = resposta.corpo as ArquivoAcompanhamento;
      let arquivoId: number | null = null;
      if (guardarBruto) {
        arquivoId = await repo.salvarArquivoBruto({
          url: urlBr,
          tipo: "EA14",
          idg: arquivo.idg,
          etag: resposta.etag,
          last_modified: resposta.lastModified,
          retencao: "completa",
          pct_secoes_totalizadas: null,
          conteudo: arquivo,
        });
      }
      const linhas = (arquivo.abr ?? []).map((a) => linhaAbrangencia(eleicao.id, null, a));
      const { doArquivo, deCarona } = separarPorEscopo(linhas, "br", {
        idg: arquivo.idg,
        url: urlBr,
        etag: resposta.etag,
        arquivoId,
      });
      await repo.upsertAcompanhamento(doArquivo);
      await repo.upsertAcompanhamento(deCarona);
      abrangencias = linhas.map(vistaDaAbrangencia);
      registrar(
        `EA14 ${eleicao.codigoEleicao}: ${linhas.length} abrangências (idg ${arquivo.idg})`,
      );
    } else if (resposta.resultado === "304") {
      const conhecidas = await repo.abrangenciasConhecidas(eleicao.id);
      abrangencias = conhecidas.map(vistaDaAbrangencia);
      doCache = true;
      registrar(`EA14 ${eleicao.codigoEleicao}: 304 (${abrangencias.length} do banco)`);
    } else {
      throw new Error(
        `EA14 da eleição ${eleicao.codigoEleicao} falhou (${resposta.resultado}${
          resposta.resultado === "erro" ? `: ${resposta.mensagem}` : ""
        }). Sem a lista de abrangências não há EA20 a pedir.`,
      );
    }

    const ufs = abrangencias
      .filter((a) => a.tipoAbrangencia === "uf")
      .map((a) => a.abrangencia)
      .sort();

    // --- EA15 (por UF) ---
    if (opcoes.ea15) {
      for (const uf of ufs) {
        const url = urlAcompanhamento(
          config.base,
          config.templates,
          eleicao.ciclo,
          eleicao.codigoEleicao,
          uf,
        );
        const r = await cliente.buscar(url, estados.get(uf) ?? {});
        if (r.resultado !== "200") continue;

        const arquivo = r.corpo as ArquivoAcompanhamento;
        let arquivoId: number | null = null;
        if (guardarBruto) {
          arquivoId = await repo.salvarArquivoBruto({
            url,
            tipo: "EA15",
            idg: arquivo.idg,
            etag: r.etag,
            last_modified: r.lastModified,
            retencao: "completa",
            pct_secoes_totalizadas: null,
            conteudo: arquivo,
          });
        }
        const linhas = (arquivo.abr ?? []).map((a) => linhaAbrangencia(eleicao.id, uf, a));
        const { doArquivo, deCarona } = separarPorEscopo(linhas, uf, {
          idg: arquivo.idg,
          url,
          etag: r.etag,
          arquivoId,
        });
        await repo.upsertAcompanhamento(doArquivo);
        await repo.upsertAcompanhamento(deCarona);
      }
    }

    saida.push({ eleicao, ufs, abrangencias, doCache });
  }

  return saida;
}

// ---------------------------------------------------------------------------
// Alvos EA20
// ---------------------------------------------------------------------------

export interface AlvoEA20 {
  eleicao: EleicaoConfig;
  cargo: EleicaoConfig["cargos"][number];
  /** `br`, UF minúscula (`mg`, `zz`) — a abrangência do arquivo. */
  abrangencia: string;
  tipoAbrangencia: "br" | "uf";
  uf: string | null;
  url: string;
}

export interface OpcoesAlvos {
  /** Códigos de cargo a coletar (onda 1: `[1, 3, 5]`). */
  cargos: number[];
  /** Cargos cujo EA20 também existe na abrangência `br` (Presidente). */
  cargosComBrasil?: number[];
}

/**
 * Monta a lista de EA20 a pedir: cargos no escopo × abrangências vistas no EA14.
 * Nenhuma URL é montada para abrangência que o TSE não listou.
 */
export function alvosEA20(
  config: ConfigApuracao,
  acompanhamentos: AcompanhamentoEleicao[],
  opcoes: OpcoesAlvos,
): AlvoEA20[] {
  const cargos = new Set(opcoes.cargos);
  const comBrasil = new Set(opcoes.cargosComBrasil ?? [1]);
  const alvos: AlvoEA20[] = [];

  for (const { eleicao, abrangencias } of acompanhamentos) {
    for (const cargo of eleicao.cargos) {
      if (!cargos.has(cargo.codigo)) continue;

      const escopos: { abrangencia: string; tipo: "br" | "uf"; uf: string | null }[] = [];
      if (comBrasil.has(cargo.codigo) && abrangencias.some((a) => a.tipoAbrangencia === "br")) {
        escopos.push({ abrangencia: "br", tipo: "br", uf: null });
      }
      for (const a of abrangencias) {
        if (a.tipoAbrangencia !== "uf") continue;
        escopos.push({ abrangencia: a.abrangencia, tipo: "uf", uf: a.abrangencia });
      }

      for (const escopo of escopos) {
        alvos.push({
          eleicao,
          cargo,
          abrangencia: escopo.abrangencia,
          tipoAbrangencia: escopo.tipo,
          uf: escopo.uf,
          url: urlResultadoDoAlvo(config, eleicao, cargo.codigo, escopo.abrangencia),
        });
      }
    }
  }

  return alvos;
}

function urlResultadoDoAlvo(
  config: ConfigApuracao,
  eleicao: EleicaoConfig,
  codigoCargo: number,
  abrangencia: string,
): string {
  return urlResultado(
    config.base,
    config.templates,
    eleicao.ciclo,
    eleicao.codigoEleicao,
    abrangencia,
    codigoCargo,
  );
}
