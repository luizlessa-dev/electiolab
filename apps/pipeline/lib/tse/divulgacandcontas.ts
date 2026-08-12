/**
 * Client para API DivulgaCandContas do TSE
 * Rate limiting + retry automático
 */

import type { DivulgaCandContasResponse } from './types';

const BASE_URL = 'https://divulgacandcontas.tse.jus.br';

interface RateLimitConfig {
  delayMs: number;
  maxRetries: number;
  requestTimeoutMs: number;
}

export class DivulgaCandContasClient {
  private lastRequestTime = 0;
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      delayMs: 1500,
      maxRetries: 3,
      requestTimeoutMs: 10000,
      ...config,
    };
  }

  private async enforceRateLimit(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.config.delayMs) {
      await new Promise(resolve =>
        setTimeout(resolve, this.config.delayMs - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  private async fetchWithRetry(url: string, attempt = 1): Promise<Response> {
    await this.enforceRateLimit();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.requestTimeoutMs
      );

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ElectioLab/1.0 (+https://electiolab.com)',
        },
      });

      clearTimeout(timeoutId);

      if (response.status === 429 && attempt < this.config.maxRetries) {
        const waitTime = Math.pow(2, attempt) * this.config.delayMs;
        console.warn(`Rate limit. Aguardando ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.fetchWithRetry(url, attempt + 1);
      }

      return response;
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  }

  async buscarCandidatos(
    ano: number,
    uf: string,
    cargo: 'presidente' | 'governador' | 'senador' | 'deputado_federal' | 'deputado_estadual',
    eleicaoId = 1
  ): Promise<DivulgaCandContasResponse> {
    const cargoMap: Record<string, string> = {
      presidente: 'PRES',
      governador: 'GOVF',
      senador: 'SEN',
      deputado_federal: 'DEP',
      deputado_estadual: 'DEPE',
    };

    const cargoTSE = cargoMap[cargo];
    if (!cargoTSE) {
      return {
        success: false,
        error: `Cargo inválido: ${cargo}`,
        timestamp: new Date().toISOString(),
        statusCode: 400,
      };
    }

    try {
      const url = `${BASE_URL}/candidatura/listar/${ano}/${uf}/${eleicaoId}/${cargoTSE}/candidatos`;
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
          statusCode: response.status,
        };
      }

      const data = await response.json();
      const candidatos = Array.isArray(data) ? data : data.candidatos || [];

      return {
        success: true,
        data: candidatos.map((cand: any) => ({
          id: cand.sequencialCandidato || cand.id,
          nome: cand.nomeUrna || cand.nome,
          estado: uf,
          cargo,
          partido: cand.nomePartido,
          numero: cand.numero,
        })),
        timestamp: new Date().toISOString(),
        statusCode: 200,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        statusCode: 500,
      };
    }
  }
}

export const divulgaCandContasClient = new DivulgaCandContasClient();
