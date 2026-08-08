/**
 * TSE API Client - Brazilian Electoral Court
 *
 * Endpoints:
 * - Eleições: GET /eleicoes
 * - Candidatos: GET /eleicoes/{eleicaoId}/candidatos
 * - Pesquisas: GET /pesquisas (future: official poll registry)
 *
 * Base: https://dadosabertos.tse.jus.br/api/v1
 */

export interface TSECandidato {
  id: string;
  nome: string;
  nomeUrna: string;
  numero: number;
  partido: {
    sigla: string;
    nome: string;
  };
  uf: string;
  cargo: string;
}

export interface TSEEleicao {
  id: string;
  ano: number;
  tipo: 'presidencial' | 'governador' | 'senador' | 'deputado' | 'vereador';
  dataEleicao: string;
}

const TSE_BASE = 'https://dadosabertos.tse.jus.br/api/v1';

/**
 * Fetch eleições disponíveis
 */
export async function fetchTSEEleicoes(): Promise<TSEEleicao[]> {
  try {
    const res = await fetch(`${TSE_BASE}/eleicoes`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ElectioLab/1.0',
      },
      next: { revalidate: 86400 }, // Cache 24h
    });

    if (!res.ok) {
      console.error(`TSE API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('[TSE] Fetch eleições failed:', error);
    return [];
  }
}

/**
 * Fetch candidatos para uma eleição
 */
export async function fetchTSECandidatos(
  eleicaoId: string,
  uf?: string
): Promise<TSECandidato[]> {
  try {
    let url = `${TSE_BASE}/eleicoes/${eleicaoId}/candidatos`;
    if (uf) url += `?uf=${uf}`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ElectioLab/1.0',
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      console.error(`TSE API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('[TSE] Fetch candidatos failed:', error);
    return [];
  }
}

/**
 * Get 2026 presidential election ID
 * (Cached, since TSE IDs don't change)
 */
export async function getTSE2026ElectionId(): Promise<string | null> {
  const eleicoes = await fetchTSEEleicoes();
  const eleicao2026 = eleicoes.find(
    (e) => e.ano === 2026 && e.tipo === 'presidencial'
  );
  return eleicao2026?.id || null;
}

/**
 * Map TSE candidate to poll result format
 */
export function tseToPollingFormat(
  candidato: TSECandidato
): {
  candidateId: string;
  candidateName: string;
} {
  return {
    candidateId: candidato.id,
    candidateName: candidato.nomeUrna || candidato.nome,
  };
}

/**
 * Validate candidate exists in TSE registry
 */
export async function validateCandidateInTSE(
  candidateName: string,
  eleicaoId: string,
  uf?: string
): Promise<TSECandidato | null> {
  const candidatos = await fetchTSECandidatos(eleicaoId, uf);

  return (
    candidatos.find(
      (c) =>
        c.nomeUrna.toLowerCase() === candidateName.toLowerCase() ||
        c.nome.toLowerCase() === candidateName.toLowerCase()
    ) || null
  );
}
