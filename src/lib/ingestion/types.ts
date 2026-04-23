/**
 * Tipos para o pipeline de ingestão de pesquisas eleitorais.
 */

export interface PollIngestionPayload {
  /** Nome do instituto exatamente como está no banco */
  institute_name: string;
  /** Nome da eleição exatamente como está no banco */
  election_name: string;
  /** Data de publicação (YYYY-MM-DD) */
  publication_date: string;
  /** Início do campo (YYYY-MM-DD) */
  fieldwork_start?: string;
  /** Fim do campo (YYYY-MM-DD) */
  fieldwork_end: string;
  /** Tamanho da amostra */
  sample_size: number;
  /** Margem de erro em pontos percentuais */
  margin_of_error?: number;
  /** Nível de confiança (default 95) */
  confidence_level?: number;
  /** Metodologia */
  methodology: "presencial" | "telefonica" | "online" | "mista";
  /** Âmbito geográfico */
  scope?: string;
  /** Tipo de pesquisa */
  poll_type?: "estimulada" | "espontanea";
  /** URL da fonte original */
  source_url?: string;
  /** Registro no TSE */
  tse_registration?: string;
  /** Resultados por candidato */
  results: {
    candidate_name: string;
    percentage: number;
  }[];
}

export interface IngestionResult {
  success: boolean;
  poll_id?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export interface IngestionReport {
  checked_at: string;
  polls_found: number;
  polls_inserted: number;
  polls_skipped: number;
  errors: string[];
  details: IngestionResult[];
}
