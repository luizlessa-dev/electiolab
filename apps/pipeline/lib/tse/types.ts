/** Types para integração com APIs oficiais do TSE */

export interface CandidatoTSE {
  id: string;
  nome: string;
  nomeCompleto?: string;
  nomeUrna?: string;
  cargo?: string;
  partido?: string;
  siglaPartido?: string;
  coligacao?: string;
  estado: string;
  municipio?: string;
  numero?: string;
  sequencial?: string;
  condicao?: 'APTO' | 'INAPTO' | 'CASSADO' | 'RENUNCIACAO';
  situacao?: string;
  bens?: number;
  votosRecebidos?: number;
  eleito?: boolean;
}

export interface ResultadoTSE {
  cargo: string;
  estado: string;
  municipio?: string;
  zona?: string;
  secao?: string;
  candidato: string;
  votos: number;
  percentual?: number;
  apuracao?: {
    percentualApurado: number;
    secoesTotais: number;
    secoesApuradas: number;
  };
}

export interface DivulgaCandContasResponse {
  success: boolean;
  data?: CandidatoTSE[];
  error?: string;
  timestamp: string;
  statusCode: number;
}

export interface SyncLog {
  timestamp: string;
  totalProcessado: number;
  totalInserido: number;
  totalAtualizado: number;
  erros: Array<{
    candidato: string;
    erro: string;
  }>;
  duracao_ms: number;
}
