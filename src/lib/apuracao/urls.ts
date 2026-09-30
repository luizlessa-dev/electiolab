/**
 * Construção de URLs do TSE — **só a partir da configuração**.
 *
 * Regra 3 do `apuracao-2026/CLAUDE.md`: não existe listagem de diretório e muitos 404
 * bloqueiam o IP. Toda URL sai dos templates de `ele-c.json` (`arq[].dir`) e dos códigos
 * que vêm da própria config; nada é "chutado" aqui.
 *
 * `ele-c.json` é a única exceção: é o ponto de entrada, e seu caminho
 * (`comum/config/ele-c.json`) está na documentação de download do TSE.
 */

import type { ArqTemplate } from "./tipos";

export type Ambiente = "simulado" | "oficial";

/** Só o que é lido de `process.env` — deixa os testes passarem um objeto mínimo. */
export type VariaveisAmbiente = Record<string, string | undefined>;

export interface BaseTse {
  ambiente: Ambiente;
  /** `<base>`: ex. `https://resultados-sim.tse.jus.br/simulado` (de `TSE_BASE_*`). */
  base: string;
  /** `<ambiente>`: ex. `simulado2026` (de `TSE_AMB_*`). */
  nomeAmbiente: string;
}

/** Lê a base do ambiente a partir do `process.env` (nada de URL fixa no código). */
export function baseDoAmbiente(ambiente: Ambiente, env: VariaveisAmbiente = process.env): BaseTse {
  const sufixo = ambiente === "oficial" ? "OFICIAL" : "SIMULADO";
  const base = env[`TSE_BASE_${sufixo}`];
  const nomeAmbiente = env[`TSE_AMB_${sufixo}`];
  if (!base || !nomeAmbiente) {
    throw new Error(
      `TSE_BASE_${sufixo} e TSE_AMB_${sufixo} precisam estar definidos no ambiente.`,
    );
  }
  return { ambiente, base: base.replace(/\/+$/, ""), nomeAmbiente };
}

/** URL do `ele-c.json` (EA11) — ponto de entrada da configuração. */
export function urlEleC(b: BaseTse): string {
  return `${b.base}/${b.nomeAmbiente}/comum/config/ele-c.json`;
}

/**
 * Código da eleição como aparece no **nome dos arquivos**: `e` + código com zeros à
 * esquerda até 6 dígitos (`21270` → `e021270`; `6257` → `e006257`).
 */
export function sufixoEleicao(codigoEleicao: number | string): string {
  return `e${String(codigoEleicao).padStart(6, "0")}`;
}

/** Código do cargo como aparece no nome dos arquivos: `c` + 4 dígitos (`3` → `c0003`). */
export function sufixoCargo(codigoCargo: number | string): string {
  return `c${String(codigoCargo).padStart(4, "0")}`;
}

interface ContextoDiretorio {
  codigoEleicao: number | string;
  /** `br`, UF minúscula (`mg`, `zz`) — o `<uf>` do template. */
  uf: string;
  codigoPleito?: number | string;
  municipio?: string;
  zona?: string;
  secao?: string;
}

/**
 * Expande o template de `arq[].dir` do `ele-c.json`. Falha se sobrar algum
 * placeholder — é a garantia de que nenhuma URL sai daqui pela metade.
 */
export function diretorio(
  b: BaseTse,
  templates: ArqTemplate[],
  tipo: string,
  ctx: ContextoDiretorio,
): string {
  const t = templates.find((a) => a.tp === tipo);
  if (!t) {
    throw new Error(`ele-c.json não traz template de diretório para o tipo "${tipo}".`);
  }

  const substituicoes: Record<string, string | undefined> = {
    "<base>": b.base,
    "<ambiente>": b.nomeAmbiente,
    "<ciclo>": undefined, // preenchido pelo chamador via `ciclo` (ver expandirDir)
    "<cd_eleicao>": String(ctx.codigoEleicao),
    "<uf>": ctx.uf,
    "<cd_pleito>": ctx.codigoPleito === undefined ? undefined : String(ctx.codigoPleito),
    "<municipio>": ctx.municipio,
    "<zona>": ctx.zona,
    "<secao>": ctx.secao,
  };

  let dir = t.dir;
  for (const [ph, valor] of Object.entries(substituicoes)) {
    if (valor === undefined) continue;
    dir = dir.split(ph).join(valor);
  }
  return dir;
}

/** Diretório + ciclo resolvido. O ciclo (`ele2026`) vem de `pl[].c`. */
export function expandirDir(
  b: BaseTse,
  templates: ArqTemplate[],
  tipo: string,
  ciclo: string,
  ctx: ContextoDiretorio,
): string {
  const dir = diretorio(b, templates, tipo, ctx).split("<ciclo>").join(ciclo);
  const restante = /<[a-z_]+>/.exec(dir);
  if (restante) {
    throw new Error(
      `Template de diretório "${tipo}" ficou com placeholder não resolvido (${restante[0]}): ${dir}`,
    );
  }
  return dir.replace(/\/+$/, "");
}

/** EA12 — config de municípios: `<dir cm>/mun-e<ELE>-cm.json`. */
export function urlMunicipios(
  b: BaseTse,
  templates: ArqTemplate[],
  ciclo: string,
  codigoEleicao: number | string,
): string {
  const dir = expandirDir(b, templates, "cm", ciclo, { codigoEleicao, uf: "" });
  return `${dir}/mun-${sufixoEleicao(codigoEleicao)}-cm.json`;
}

/**
 * EA14/EA15 — acompanhamento: `<dir ab>/<abr>-e<ELE>-ab.json`.
 * `abr` = `br` (EA14) ou UF minúscula (EA15).
 */
export function urlAcompanhamento(
  b: BaseTse,
  templates: ArqTemplate[],
  ciclo: string,
  codigoEleicao: number | string,
  abr: string,
): string {
  const dir = expandirDir(b, templates, "ab", ciclo, { codigoEleicao, uf: abr });
  return `${dir}/${abr}-${sufixoEleicao(codigoEleicao)}-ab.json`;
}

/**
 * EA20 — resultado unificado: `<dir u>/<abr>-c<CARGO>-e<ELE>-u.json`.
 *
 * `abr` é `br`, a UF minúscula, ou UF + código TSE de município com 5 dígitos
 * (`ac01120`) para o resultado municipal.
 */
export function urlResultado(
  b: BaseTse,
  templates: ArqTemplate[],
  ciclo: string,
  codigoEleicao: number | string,
  abr: string,
  codigoCargo: number | string,
): string {
  const uf = abr.slice(0, 2);
  const dir = expandirDir(b, templates, "u", ciclo, { codigoEleicao, uf });
  return `${dir}/${abr}-${sufixoCargo(codigoCargo)}-${sufixoEleicao(codigoEleicao)}-u.json`;
}

/** Abrangência de município: UF + código TSE de 5 dígitos (`ac` + `01120`). */
export function abrangenciaMunicipio(uf: string, codigoTse: string): string {
  if (!/^\d{5}$/.test(codigoTse)) {
    throw new Error(`Código de município precisa ter 5 dígitos: ${JSON.stringify(codigoTse)}`);
  }
  return `${uf.toLowerCase()}${codigoTse}`;
}
