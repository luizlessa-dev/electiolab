/**
 * Trava de validação da ingestão via imprensa.
 *
 * O TSE publica metadados (protocolo, instituto, amostra, datas de campo) mas
 * nunca os percentuais. Os números saem em fonte primária, e uma extração
 * automática deles é confiável apenas na medida em que possa ser conferida
 * contra algo independente.
 *
 * É isso que esta trava faz: os três campos verificados foram publicados pelo
 * TSE antes de qualquer matéria existir, então uma extração que casa nos três
 * está ancorada numa fonte que o extrator não controla. Divergiu, não entra —
 * vira pendência de revisão manual em vez de dado publicado.
 *
 * Foi a ausência de uma trava assim que aposentou o Agente 2 e que deixou 52
 * pesquisas sem lastro em produção. Ver docs/ELECTIOLAB-AUDIT-2026-08.md §5.1.
 */

/** Fontes que não servem como lastro de resultado, em nenhuma hipótese. */
export const DOMINIOS_BLOQUEADOS = ["wikipedia.org", "wikiwand.com", "dbpedia.org"];

export type Extracao = {
  encontrado: boolean;
  protocolo_citado: string | null;
  source_url: string | null;
  instituto: string | null;
  amostra: number | null;
  campo_inicio: string | null;
  campo_fim: string | null;
  margem_erro: number | null;
  cenario: string | null;
  cargo: string | null;
  resultados: Array<{ nome: string; pct: number }>;
};

export type RegistroTSE = {
  protocolo: string;
  uf: string;
  cargos: string;
  nome_empresa: string;
  dt_inicio: string | null;
  dt_fim: string | null;
  qt_entrevistados: number | null;
};

export type Veredito = { ok: true } | { ok: false; motivo: string };

export const normProtocolo = (s: string | null): string =>
  s ? s.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";

/**
 * Soma plausível dos percentuais. A faixa é larga de propósito: 1º turno com
 * brancos/nulos fica abaixo de 100, e Senado com 2 vagas passa de 100 porque o
 * eleitor escolhe dois nomes. A checagem pega extração truncada ou duplicada,
 * não afere precisão.
 */
const SOMA_MIN = 30;
const SOMA_MAX = 210;

export function validarExtracao(e: Extracao, reg: RegistroTSE): Veredito {
  if (!e.encontrado) return { ok: false, motivo: "resultado não localizado em fonte primária" };
  if (!e.source_url) return { ok: false, motivo: "sem source_url" };

  const url = e.source_url.toLowerCase();
  if (DOMINIOS_BLOQUEADOS.some((d) => url.includes(d))) {
    return { ok: false, motivo: `fonte bloqueada (${e.source_url})` };
  }

  // 1. Protocolo — chave de casamento exata, nunca fuzzy.
  if (normProtocolo(e.protocolo_citado) !== normProtocolo(reg.protocolo)) {
    return {
      ok: false,
      motivo: `protocolo diverge: matéria cita ${e.protocolo_citado ?? "nada"}, TSE registrou ${reg.protocolo}`,
    };
  }

  // 2. Amostra.
  if (reg.qt_entrevistados != null && e.amostra !== reg.qt_entrevistados) {
    return {
      ok: false,
      motivo: `amostra diverge: matéria diz ${e.amostra}, TSE registrou ${reg.qt_entrevistados}`,
    };
  }

  // 3. Datas de campo.
  if (reg.dt_fim && e.campo_fim !== reg.dt_fim) {
    return {
      ok: false,
      motivo: `fim de campo diverge: matéria diz ${e.campo_fim}, TSE registrou ${reg.dt_fim}`,
    };
  }
  if (reg.dt_inicio && e.campo_inicio && e.campo_inicio !== reg.dt_inicio) {
    return {
      ok: false,
      motivo: `início de campo diverge: matéria diz ${e.campo_inicio}, TSE registrou ${reg.dt_inicio}`,
    };
  }

  // Sanidade dos percentuais.
  if (e.resultados.length < 2) return { ok: false, motivo: "menos de 2 candidatos extraídos" };
  if (e.resultados.some((r) => r.pct < 0 || r.pct > 100)) {
    return { ok: false, motivo: "percentual fora de 0–100" };
  }
  const soma = e.resultados.reduce((a, r) => a + r.pct, 0);
  if (soma < SOMA_MIN || soma > SOMA_MAX) {
    return { ok: false, motivo: `soma dos percentuais implausível (${soma.toFixed(1)}%)` };
  }

  return { ok: true };
}
