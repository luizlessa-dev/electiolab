/**
 * Cliente: AtlasIntel
 * Instituto de pesquisa independente
 *
 * Dados: Pesquisas eleitorais, tendências políticas
 * Atualização: 2 vezes por semana (típico)
 * Credibilidade: ⭐⭐⭐⭐ (7/10)
 */

export interface AtlasIntelSondagem {
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
  metodologia?: string;
  candidatos: Array<{
    numero: string;
    nome: string;
    partido: string;
    intencao_voto: number;
    variacao?: number; // comparado com semana anterior
  }>;
  brancos_nulos: number;
  nao_respondeu: number;
  fonte_publicacao?: string; // URL ou canal
}

const BASE_URL = 'https://api.atlasinteligencia.com.br/v1';
const CACHE_TTL = 48 * 60 * 60 * 1000; // 48 horas (menos frequente que Datafolha/Quaest)
const cache = new Map<string, { data: any; timestamp: number }>();

export class AtlasIntelClient {
  async buscarSondagensPresidente(ano: number = 2026): Promise<AtlasIntelSondagem[]> {
    const cacheKey = `atlasitel-presidente-${ano}`;
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
        throw new Error(`AtlasIntel API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Erro ao buscar dados AtlasIntel:', error);
      throw error;
    }
  }

  async buscarSondagensGovernador(
    estado: string,
    ano: number = 2026
  ): Promise<AtlasIntelSondagem[]> {
    const cacheKey = `atlasitel-governador-${estado}-${ano}`;
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
        throw new Error(`AtlasIntel API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Erro ao buscar dados AtlasIntel (${estado}):`, error);
      throw error;
    }
  }

  async buscarTendencia(cargo: string, estado?: string): Promise<{
    tendencia: 'crescimento' | 'queda' | 'estavel';
    variacao: number; // percentual
    descricao: string;
  } | null> {
    try {
      const url = estado
        ? `${BASE_URL}/tendencia/${cargo}/${estado.toUpperCase()}`
        : `${BASE_URL}/tendencia/${cargo}`;

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
      console.error('Erro ao buscar tendência AtlasIntel:', error);
      return null;
    }
  }

  clearCache() {
    cache.clear();
  }
}

export const atlasIntelClient = new AtlasIntelClient();
