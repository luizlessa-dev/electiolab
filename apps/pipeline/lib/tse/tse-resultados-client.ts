/**
 * Cliente para TSE Resultados (Apuração em Tempo Real)
 * Busca resultados de votação com atualização progressiva
 *
 * Fonte: https://resultados.tse.jus.br/
 * Formato: JSON estruturado por seção/município/estado
 * Atualização: Em tempo real durante apuração
 */

export interface ResultadoSeção {
  codigoMunicipio: string;
  nomeMunicipio: string;
  estado: string;
  numeroSeção: string;
  dataApuracao: string;
  candidatos: Array<{
    numeroCandidata: string;
    nomeCandidata: string;
    siglaPartido: string;
    votosNominais: number;
    votosLegenda: number;
  }>;
  metadata: {
    totalVotosApurados: number;
    votosEmBranco: number;
    votosNulos: number;
    seçõesApuradas: number;
    seçõesTotais: number;
    percentualApuração: number;
  };
}

export interface ResultadoTSE {
  cargo: string;
  turno: 1 | 2;
  ano: number;
  estado?: string;
  municipio?: string;
  dataApuracao: string;
  percentualApuração: number;
  seçõesApuradas: number;
  seçõesTotais: number;
  candidatos: Array<{
    numeroCandidata: string;
    nomeCandidata: string;
    siglaPartido: string;
    votosNominais: number;
    percentual: number;
  }>;
}

const BASE_URL = 'https://resultados.tse.jus.br';

export class TSEResultadosClient {
  async buscarResultadosPresidencial(
    turno: 1 | 2 = 1,
    ano: number = 2026
  ): Promise<ResultadoTSE> {
    const url = `${BASE_URL}/tse/resultados/${ano}/presidente/${turno}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`TSE API error: ${response.status}`);
      }

      const data = await response.json();
      return this.formatarResultado(data, 'presidente', turno, ano);
    } catch (error) {
      console.error('Erro ao buscar resultados presidenciais:', error);
      throw error;
    }
  }

  async buscarResultadosGovernador(
    estado: string,
    turno: 1 | 2 = 1,
    ano: number = 2026
  ): Promise<ResultadoTSE> {
    const url = `${BASE_URL}/tse/resultados/${ano}/governador/${estado}/${turno}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`TSE API error: ${response.status}`);
      }

      const data = await response.json();
      return this.formatarResultado(
        data,
        'governador',
        turno,
        ano,
        estado
      );
    } catch (error) {
      console.error(
        `Erro ao buscar resultados de governador (${estado}):`,
        error
      );
      throw error;
    }
  }

  async buscarStatusApuracao(ano: number = 2026): Promise<{
    dataAtualização: string;
    percentualApuraçãoNacional: number;
    seçõesApuradas: number;
    seçõesTotais: number;
    eleiçõesEmApuração: string[];
  }> {
    const url = `${BASE_URL}/tse/apuracao/${ano}/status`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`TSE API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar status de apuração:', error);
      throw error;
    }
  }

  private formatarResultado(
    data: any,
    cargo: string,
    turno: 1 | 2,
    ano: number,
    estado?: string
  ): ResultadoTSE {
    return {
      cargo,
      turno,
      ano,
      estado,
      dataApuracao: data.dataApuracao || new Date().toISOString(),
      percentualApuração: data.percentualApuracao || 0,
      seçõesApuradas: data.secoesApuradas || 0,
      seçõesTotais: data.secoesTotais || 0,
      candidatos: (data.candidatos || []).map((c: any) => ({
        numeroCandidata: c.numero,
        nomeCandidata: c.nome,
        siglaPartido: c.sigla,
        votosNominais: c.votos || 0,
        percentual: c.percentual || 0,
      })),
    };
  }
}

export const tseResultadosClient = new TSEResultadosClient();
