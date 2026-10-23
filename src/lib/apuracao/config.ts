/**
 * Configuração da apuração a partir do `ele-c.json` (EA11) e da config de municípios
 * (EA12). É a **única** origem de códigos de eleição, cargo e município: nenhuma URL é
 * montada sem passar por aqui (regra 3 do `apuracao-2026/CLAUDE.md`).
 */

import { dataIso, flag, inteiro, texto } from "./valores";
import type {
  ArqTemplate,
  ArquivoEleC,
  ArquivoMunCm,
  CargoConfigTse,
  EleicaoConfigTse,
} from "./tipos";
import type { RepositorioApuracao } from "./repositorio";
import type { ClienteTse } from "./tse-cliente";
import {
  baseDoAmbiente,
  urlEleC,
  urlMunicipios,
  type Ambiente,
  type BaseTse,
  type VariaveisAmbiente,
} from "./urls";

export interface CargoConfig {
  /** `cargo.id` no banco. */
  id: number;
  codigo: number;
  nome: string;
  tipoDisputa: "majoritario" | "proporcional";
}

export interface EleicaoConfig {
  /** `eleicao.id` no banco. */
  id: number;
  codigoEleicao: number;
  codigoEleicao2t: number | null;
  codigoPleito: number;
  ciclo: string;
  turno: number;
  /** 8 federal · 1 estadual · 3 municipal. */
  tipo: number | null;
  descricao: string | null;
  cargos: CargoConfig[];
}

export interface ConfigApuracao {
  base: BaseTse;
  templates: ArqTemplate[];
  /** `ele-c.json` → `idg`. */
  idg: string;
  eleicoes: EleicaoConfig[];
}

/** `cp.tp`: 1 majoritário, 2 proporcional. */
function tipoDisputa(cp: CargoConfigTse): "majoritario" | "proporcional" {
  if (cp.tp === "1") return "majoritario";
  if (cp.tp === "2") return "proporcional";
  throw new Error(`Tipo de cargo desconhecido em ele-c.json: cargo ${cp.cd}, tp=${cp.tp}`);
}

/**
 * Cargos de uma eleição. O `ele-c.json` do simulado traz só a abrangência `br`; se
 * aparecerem outras, os cargos são unificados por código (o cargo é o mesmo).
 */
function cargosDaEleicao(e: EleicaoConfigTse): CargoConfigTse[] {
  const porCodigo = new Map<string, CargoConfigTse>();
  for (const abr of e.abr ?? []) {
    for (const cp of abr.cp ?? []) porCodigo.set(cp.cd, cp);
  }
  return [...porCodigo.values()].sort((a, b) => Number(a.cd) - Number(b.cd));
}

export interface OpcoesConfig {
  ambiente: Ambiente;
  /** Códigos de eleição no escopo. Vazio/ausente = todas as do `ele-c.json`. */
  eleicoesNoEscopo?: number[];
  /** Ciclo a processar (ex.: `ele2026`). O `ele-c.json` oficial traz também 2024 e outros. */
  ciclo?: string;
  /** Códigos de cargo fora do escopo (ex.: 25, Conselheiro Distrital). */
  cargosForaDoEscopo?: number[];
  env?: VariaveisAmbiente;
}

/**
 * Baixa o `ele-c.json`, grava `apuracao.eleicao` e `apuracao.cargo` e devolve a config
 * usada pelo resto do coletor. O arquivo é guardado em `arquivo_bruto` (retenção
 * `completa`), que também é a fonte do ETag para a requisição condicional do próximo ciclo.
 */
export async function carregarConfig(
  cliente: ClienteTse,
  repo: RepositorioApuracao,
  opcoes: OpcoesConfig,
): Promise<ConfigApuracao> {
  const base = baseDoAmbiente(opcoes.ambiente, opcoes.env);
  const url = urlEleC(base);

  const estado = await repo.estadoArquivo(url);
  const resposta = await cliente.buscar(url, estado);

  let arquivo: ArquivoEleC;
  if (resposta.resultado === "200") {
    arquivo = resposta.corpo as ArquivoEleC;
    await repo.salvarArquivoBruto({
      url,
      tipo: "EA11",
      idg: arquivo.idg,
      etag: resposta.etag,
      last_modified: resposta.lastModified,
      retencao: "completa",
      pct_secoes_totalizadas: null,
      conteudo: arquivo,
    });
  } else if (resposta.resultado === "304") {
    // Não mudou: reaproveita o bruto já guardado.
    const salvo = await repo.arquivoBrutoPorUrl(url);
    if (!salvo) {
      throw new Error(
        `ele-c.json respondeu 304 mas não há bruto guardado para ${url}. Apague o ETag (arquivo_bruto) e rode de novo.`,
      );
    }
    arquivo = salvo as ArquivoEleC;
  } else {
    throw new Error(
      `Não foi possível obter ${url} (${resposta.resultado}${
        resposta.resultado === "erro" ? `: ${resposta.mensagem}` : ""
      }). Sem a config não há URL para montar — o ciclo para aqui.`,
    );
  }

  const foraDoEscopo = new Set(opcoes.cargosForaDoEscopo ?? []);
  const noEscopo = new Set(opcoes.eleicoesNoEscopo ?? []);
  const eleicoes: EleicaoConfig[] = [];

  for (const pleito of arquivo.pl ?? []) {
    if (opcoes.ciclo && pleito.c !== opcoes.ciclo) continue;
    for (const e of pleito.e ?? []) {
      const codigoEleicao = inteiro(e.cd);
      if (codigoEleicao === null) continue;
      if (noEscopo.size > 0 && !noEscopo.has(codigoEleicao)) continue;

      const eleicaoId = await repo.salvarEleicao({
        ambiente: opcoes.ambiente,
        codigo_eleicao: codigoEleicao,
        codigo_eleicao_2t: inteiro(e.cdt2),
        codigo_pleito: inteiro(pleito.cd)!,
        sqele: texto(e.sqele),
        ciclo: texto(pleito.c),
        turno: inteiro(e.t) ?? 1,
        tipo: inteiro(e.tp),
        descricao: texto(e.nm),
        data_pleito: dataIso(pleito.dt),
        bruto: e,
      });

      const cps = cargosDaEleicao(e).filter((cp) => !foraDoEscopo.has(Number(cp.cd)));
      const idsPorCodigo = await repo.salvarCargos(
        cps.map((cp) => ({
          eleicao_id: eleicaoId,
          codigo: inteiro(cp.cd)!,
          nome: cp.ds,
          tipo_disputa: tipoDisputa(cp),
        })),
      );

      eleicoes.push({
        id: eleicaoId,
        codigoEleicao,
        codigoEleicao2t: inteiro(e.cdt2),
        codigoPleito: inteiro(pleito.cd)!,
        ciclo: pleito.c,
        turno: inteiro(e.t) ?? 1,
        tipo: inteiro(e.tp),
        descricao: texto(e.nm),
        cargos: cps.map((cp) => ({
          id: idsPorCodigo.get(inteiro(cp.cd)!)!,
          codigo: inteiro(cp.cd)!,
          nome: cp.ds,
          tipoDisputa: tipoDisputa(cp),
        })),
      });
    }
  }

  if (eleicoes.length === 0) {
    throw new Error("ele-c.json não trouxe nenhuma eleição dentro do escopo configurado.");
  }

  return { base, templates: arquivo.arq ?? [], idg: arquivo.idg, eleicoes };
}

/**
 * Config de municípios (EA12) de uma eleição → `apuracao.municipio`.
 * Arquivo grande (~534 KB) e que muda pouco: só é baixado quando a tabela está vazia
 * para a eleição ou quando `forcar` é passado.
 */
export async function carregarMunicipios(
  cliente: ClienteTse,
  repo: RepositorioApuracao,
  config: ConfigApuracao,
  eleicao: EleicaoConfig,
  forcar = false,
): Promise<{ baixado: boolean; municipios: number }> {
  if (!forcar) {
    const jaTem = await repo.contarMunicipios(eleicao.id);
    if (jaTem > 0) return { baixado: false, municipios: jaTem };
  }

  const url = urlMunicipios(config.base, config.templates, eleicao.ciclo, eleicao.codigoEleicao);
  const estado = await repo.estadoArquivo(url);
  const resposta = await cliente.buscar(url, estado);
  if (resposta.resultado !== "200") {
    if (resposta.resultado === "304") {
      return { baixado: false, municipios: await repo.contarMunicipios(eleicao.id) };
    }
    throw new Error(`Não foi possível obter a config de municípios (${url}): ${resposta.resultado}`);
  }

  const arquivo = resposta.corpo as ArquivoMunCm;
  await repo.salvarArquivoBruto({
    url,
    tipo: "EA12",
    idg: arquivo.idg,
    etag: resposta.etag,
    last_modified: resposta.lastModified,
    retencao: "completa",
    pct_secoes_totalizadas: null,
    conteudo: arquivo,
  });

  const linhas = (arquivo.abr ?? []).flatMap((abr) =>
    (abr.mu ?? []).map((m) => ({
      eleicao_id: eleicao.id,
      uf: abr.cd.toLowerCase(),
      codigo_tse: m.cd,
      // O TSE manda '' no Exterior; a coluna exige 7 dígitos ou null.
      codigo_ibge: texto(m.cdi),
      nome: m.nm,
      capital: flag(m.c),
    })),
  );
  const municipios = await repo.salvarMunicipios(linhas);
  return { baixado: true, municipios };
}
