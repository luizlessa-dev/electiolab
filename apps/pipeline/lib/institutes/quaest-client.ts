/**
 * Cliente: Quaest Inteligência
 * Instituto de pesquisa de polling
 *
 * Dados: Pesquisas eleitorais, avaliação de governo
 * Atualização: Diária durante campanhas
 * Credibilidade: ⭐⭐⭐⭐ (8/10)
 */

export interface QuaestSondagem {
  id: string;
  titulo: string;
  data_publicacao: string;
  data_coleta_inicio: string;
  data_coleta_fim: string;
  cargo: string;
  estado?: string;
  ano: number;
  amostra: number;
  margem_erro: number;
  intervalo_confianca?: number; // 95%, 99%
  candidatos: Array<{
    numero: string;
    nome: string;
    partido: string;
    intencao_voto: number;
    variacao_semana?: number;
    tendencia?: 'crescendo' | 'caindo' | 'estavel';
  }>;
  brancos_nulos: number;
  nao_respondeu: number;
  fonte_publicacao?: string;
  metodologia?: string;
}

const BASE_URL = 'https://www.quaest.com.br/api/v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas
const cache = new Map<string, { data: any; timestamp: number }>();

export class QuaestClient {
  async buscarSondagensPresidente(ano: number = 2026): Promise<QuaestSondagem[]> {
    const cacheKey = `quaest-presidente-${ano}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await fetch(`${BASE_URL}/presidente/${ano}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Quaest API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Erro ao buscar dados Quaest:', error);
      throw error;
    }
  }

  async buscarSondagensGovernador(
    estado: string,
    ano: number = 2026
  ): Promise<QuaestSondagem[]> {
    const cacheKey = `quaest-governador-${estado}-${ano}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/governador/${estado.toUpperCase()}/${ano}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Quaest API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Erro ao buscar dados Quaest (${estado}):`, error);
      throw error;
    }
  }

  async buscarRejeicao(cargo: string, estado?: string): Promise<{
    candidato_nome: string;
    candidato_numero: string;
    rejeicao: number;
  } | null> {
    try {
      const url = estado
        ? `${BASE_URL}/rejeicao/${cargo}/${estado.toUpperCase()}`
        : `${BASE_URL}/rejeicao/${cargo}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar rejeição Quaest:', error);
      return null;
    }
  }

  clearCache() {
    cache.clear();
  }
}

export const quaestClient = new QuaestClient();
