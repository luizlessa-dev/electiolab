/**
 * Votações de plenário de um parlamentar: tipos, rótulos e regras de cálculo da
 * ficha. Sem I/O, para ser testável. As linhas vêm do TF (src/lib/tf-data.ts);
 * as regras estão em docs/BASTIDORES-POS-ELEICAO.md §8.1.
 */

export type VotoNormalizado =
  | "sim"
  | "nao"
  | "abstencao"
  | "obstrucao"
  | "artigo_17"
  | "presente_sem_voto"
  | "ausencia_justificada"
  | "ausencia_nao_justificada"
  | "nao_classificado";

export const VOTO_LABEL: Record<VotoNormalizado, string> = {
  sim: "Sim",
  nao: "Não",
  abstencao: "Abstenção",
  obstrucao: "Obstrução",
  artigo_17: "Presidiu a sessão",
  presente_sem_voto: "Presente, sem voto",
  ausencia_justificada: "Ausência justificada",
  ausencia_nao_justificada: "Não compareceu",
  nao_classificado: "Outro",
};

export type VotoTom = "positive" | "negative" | "neutral";

export const VOTO_TOM: Record<VotoNormalizado, VotoTom> = {
  sim: "positive",
  nao: "negative",
  abstencao: "neutral",
  obstrucao: "neutral",
  artigo_17: "neutral",
  presente_sem_voto: "neutral",
  ausencia_justificada: "neutral",
  ausencia_nao_justificada: "neutral",
  nao_classificado: "neutral",
};

/** O Senado grava o resultado como "A"/"R"; a Câmara já vem como "aprovada"/"rejeitada". */
export function rotuloResultado(r: string | null | undefined): string | null {
  const t = (r ?? "").trim().toLowerCase();
  if (!t) return null;
  if (t === "a" || t.startsWith("aprovad")) return "aprovada";
  if (t === "r" || t.startsWith("rejeitad")) return "rejeitada";
  return t;
}

const VOTOS_CONHECIDOS = new Set<string>(Object.keys(VOTO_LABEL));

/** Código vindo do banco → valor conhecido; qualquer coisa nova vira "nao_classificado" em vez de quebrar a tela. */
export function normalizarVoto(v: string | null | undefined): VotoNormalizado {
  return v && VOTOS_CONHECIDOS.has(v) ? (v as VotoNormalizado) : "nao_classificado";
}

export type VotoRecente = {
  votacaoId: string;
  /** YYYY-MM-DD */
  data: string;
  descricao: string | null;
  materia: string | null;
  resultado: string | null;
  voto: VotoNormalizado;
};

export type CasaLegislativa = "camara" | "senado";

export type ResumoVotacoes = {
  casa: CasaLegislativa;
  /** Base do cálculo. Câmara sem janela de exercício: só as votações em que o parlamentar votou. */
  votacoesNominais: number;
  votosSim: number;
  votosNao: number;
  votosAbstencao: number;
  votosObstrucao: number;
  /** null quando não é confiável (ver `presencaNaoCalculada`). */
  pctPresenca: number | null;
  pctPresenca12m: number | null;
  /** Só Senado: a fonte separa ausência justificada de não justificada. */
  pctFaltasNaoJustificadas: number | null;
  ausenciasJustificadas: number | null;
  votacoesSecretas: number | null;
  /** Só Câmara. */
  concordanciaPartido: number | null;
  /** Só Senado: alinhamento com a orientação do partido, só em votações em que ele orientou Sim ou Não. */
  pctAlinhamento: number | null;
  votacoesComOrientacao: number | null;
  /** Por que a presença não foi calculada, para o aviso na tela. */
  presencaNaoCalculada: string | null;
  legislatura: number | null;
  /** Só Senado. */
  primeiraSessao: string | null;
  ultimaSessao: string | null;
};

export type VotacoesParlamentar = {
  resumo: ResumoVotacoes;
  recentes: VotoRecente[];
};

const num = (x: unknown): number => {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};
const numOuNull = (x: unknown): number | null => {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};

/** "S.PART." / "Sem partido": não há bancada, então "alinhamento com o partido" não tem sentido. */
function semPartido(partido: string | null): boolean {
  const p = (partido ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  return p === "SPART" || p === "SEMPARTIDO";
}

/** Linha de `plen_deputado_agg` (TF). */
export type AggCamaraRow = {
  id_legislatura: number | null;
  total_votacoes: number | string | null;
  presencas: number | string | null;
  votos_sim: number | string | null;
  votos_nao: number | string | null;
  votos_abstencao: number | string | null;
  votos_obstrucao: number | string | null;
  pct_presenca: number | string | null;
  concordancia_partido: number | string | null;
};

/**
 * Câmara. O agregado do TF conta as votações do período de exercício quando a
 * janela é conhecida (`v_cam_janela_exercicio`) e, quando não é, cai para a
 * legislatura inteira: um suplente que assumiu no fim aparece com 7% de presença.
 * Publicar esse número seria afirmar uma falsidade sobre uma pessoa, então sem
 * janela conhecida a presença não é calculada e a base passa a ser só as
 * votações em que o parlamentar votou.
 */
export function resumoCamara(
  agg: AggCamaraRow,
  janelaLegislatura: number | null,
  partido: string | null = null,
): ResumoVotacoes {
  const janelaConhecida =
    janelaLegislatura !== null && agg.id_legislatura !== null && janelaLegislatura === agg.id_legislatura;
  return {
    casa: "camara",
    votacoesNominais: janelaConhecida ? num(agg.total_votacoes) : num(agg.presencas),
    votosSim: num(agg.votos_sim),
    votosNao: num(agg.votos_nao),
    votosAbstencao: num(agg.votos_abstencao),
    votosObstrucao: num(agg.votos_obstrucao),
    pctPresenca: janelaConhecida ? numOuNull(agg.pct_presenca) : null,
    pctPresenca12m: null,
    pctFaltasNaoJustificadas: null,
    ausenciasJustificadas: null,
    votacoesSecretas: null,
    concordanciaPartido: semPartido(partido) ? null : numOuNull(agg.concordancia_partido),
    pctAlinhamento: null,
    votacoesComOrientacao: null,
    presencaNaoCalculada: janelaConhecida
      ? null
      : "O período de exercício deste mandato (suplência ou licença) não está identificado na fonte; por isso a presença não é calculada.",
    legislatura: agg.id_legislatura,
    primeiraSessao: null,
    ultimaSessao: null,
  };
}

/** Linha de `mv_voto_resumo_senador` (TF). */
export type ResumoSenadorRow = {
  votacoes_nominais: number | string | null;
  votos_sim: number | string | null;
  votos_nao: number | string | null;
  votos_abstencao: number | string | null;
  ausencias_justificadas: number | string | null;
  votacoes_secretas: number | string | null;
  pct_presenca: number | string | null;
  pct_faltas_nao_justificadas: number | string | null;
  pct_presenca_12m: number | string | null;
  primeira_sessao: string | null;
  ultima_sessao: string | null;
};

/** Linha de `mv_senador_alinhamento` (TF). Ausente enquanto a orientação não foi ingerida. */
export type AlinhamentoSenadorRow = {
  votacoes_com_orientacao: number | string | null;
  pct_alinhamento: number | string | null;
};

export function resumoSenado(r: ResumoSenadorRow, alinhamento: AlinhamentoSenadorRow | null = null): ResumoVotacoes {
  const nominais = num(r.votacoes_nominais);
  const comOrientacao = alinhamento ? num(alinhamento.votacoes_com_orientacao) : 0;
  return {
    casa: "senado",
    votacoesNominais: nominais,
    votosSim: num(r.votos_sim),
    votosNao: num(r.votos_nao),
    votosAbstencao: num(r.votos_abstencao),
    votosObstrucao: 0,
    pctPresenca: nominais > 0 ? numOuNull(r.pct_presenca) : null,
    pctPresenca12m: numOuNull(r.pct_presenca_12m),
    pctFaltasNaoJustificadas: nominais > 0 ? numOuNull(r.pct_faltas_nao_justificadas) : null,
    ausenciasJustificadas: num(r.ausencias_justificadas),
    votacoesSecretas: num(r.votacoes_secretas),
    concordanciaPartido: null,
    pctAlinhamento: comOrientacao > 0 ? numOuNull(alinhamento?.pct_alinhamento) : null,
    votacoesComOrientacao: comOrientacao > 0 ? comOrientacao : null,
    presencaNaoCalculada: nominais > 0 ? null : "Sem votações nominais registradas no período.",
    legislatura: null,
    primeiraSessao: r.primeira_sessao,
    ultimaSessao: r.ultima_sessao,
  };
}

/** 83.4 → "83,4%"; null → "—". */
export function formatPct(n: number | null | undefined, casas = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

/** Existe algo para mostrar? Sem votos e sem votações recentes, o bloco inteiro some. */
export function temConteudo(v: VotacoesParlamentar | null): v is VotacoesParlamentar {
  return !!v && (v.resumo.votacoesNominais > 0 || v.recentes.length > 0);
}
