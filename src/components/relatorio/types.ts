/** Uma linha na tabela presidencial de um relatório semanal */
export type CandidateLine = {
  /** Nome curto do candidato */
  name: string;
  /** Sigla do partido */
  party: string;
  /** Percentual na média ponderada */
  pct: number;
  /** Variação em pp vs. semana anterior (+ ou -) */
  delta: number;
  /** Cor de acento (hex) */
  cor: string;
};

/** Uma pesquisa incorporada na semana */
export type PesquisaLine = {
  instituto: string;
  /** Contratante ("Espontânea" se sem patrocinador) */
  cliente: string;
  /** Ex.: "22 mai 2026" */
  publicacao: string;
  /** Ex.: "Telefônica", "Online", "Presencial" */
  metodologia: string;
  /** Tamanho amostral */
  n: number;
  /** Candidato líder nessa pesquisa */
  lider: string;
  pct_lider: number;
  /** Frase de destaque para o relatório */
  destaque: string;
};

/** Snapshot semanal de uma disputa estadual */
export type GovernadorLine = {
  uf: string;
  lider: string;
  pct: number;
  /** Variação vs. semana anterior */
  delta: number;
  partido: string;
};

/**
 * Estrutura de dados de um relatório semanal.
 * Preencher no arquivo `page.tsx` de cada semana.
 */
export type ReportData = {
  /** Número da semana ISO (ex.: 17) */
  semana: number;
  /** Intervalo legível (ex.: "21–27 de abril de 2026") */
  dateRange: string;
  /** Data de publicação ISO (ex.: "2026-04-27") */
  dateISO: string;
  /** Lista presidencial — pelo menos 3 candidatos */
  presidencial: CandidateLine[];
  /** Parágrafos de análise (texto puro) */
  analise: string[];
  /** Citação/frase em destaque no bloco de análise (opcional) */
  destaqueAnalise?: string;
  /** Pesquisas incorporadas na semana */
  pesquisas: PesquisaLine[];
  /** Destaques estaduais */
  governadores: GovernadorLine[];
  /** Métricas acumuladas da base */
  totalPesquisas: number;
  totalInstitutos: number;
  totalEntrevistados: number;
  /** Semana anterior (para link e label de variação) */
  prevSemana?: number;
  /** Semana seguinte (para CTA ao final) */
  nextSemana?: number;
  /** Intervalo legível da semana seguinte */
  nextDateRange?: string;
};
