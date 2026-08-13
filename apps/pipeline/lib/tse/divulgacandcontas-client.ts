/**
 * Cliente para API DivulgaCandContas (TSE)
 * Busca candidatos registrados nas eleições 2026
 *
 * ⚠️ Nota: Sem CORS nativo - requer proxy backend
 * Rate limit: IP pode ser bloqueado se muitas requisições
 * Estratégia: Implementar retry com backoff exponencial
 */

export interface DivulgaCandidato {
  id: string;
  nome: string;
  nomeCompleto?: string;
  nomeUrna?: string;
  sequencial?: string;
  numero?: string;
  cargo: string;
  estado: string;
  municipio?: string;
  partido: string;
  siglaPartido: string;
  coligacao?: string;
  situacao?: 'APTO' | 'INAPTO' | 'CASSADO' | 'RENUNCIACAO';
  condicao?: string;
  bens?: number;
}

const BASE_URL = 'https://divulgacandcontas.tse.jus.br';
const CACHE_TTL = 86400 * 1000; // 24 horas
const cache = new Map<string, { data: DivulgaCandidato[]; timestamp: number }>();

export class DivulgaCandContasClient {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // 1s

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, i);
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  async buscarCandidatos(
    ano: number,
    estado: string,
    cargo: 'presidente' | 'governador' | 'senador' | 'deputado'
  ): Promise<DivulgaCandidato[]> {
    const cacheKey = `${ano}-${estado}-${cargo}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Mapeamento de cargos para a API
    const cargoMap: Record<string, string> = {
      presidente: '1',
      governador: '3',
      senador: '5',
      deputado: '6',
    };

    const cargoCode = cargoMap[cargo];
    if (!cargoCode) {
      throw new Error(`Cargo não suportado: ${cargo}`);
    }

    const url = `${BASE_URL}/candidatura/listar/${ano}/${estado}/${cargoCode}/candidatos`;

    const result = await this.withRetry(async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(
          `DivulgaCandContas API error: ${response.status} ${response.statusText}`
        );
      }

      return response.json();
    });

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  async buscarCandidatosPorMunicipio(
    ano: number,
    estado: string,
    municipio: string,
    cargo: string
  ): Promise<DivulgaCandidato[]> {
    const url = `${BASE_URL}/candidatura/listar/${ano}/${municipio}/${cargo}/candidatos`;

    return this.withRetry(async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`DivulgaCandContas API error: ${response.status}`);
      }

      return response.json();
    });
  }

  clearCache() {
    cache.clear();
  }
}

export const divulgaCandContasClient = new DivulgaCandContasClient();
