/**
 * Geography: State Results 2022
 * Busca dados eleitorais por estado para o mapa político
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface StateResult2022 {
  state: string;
  totalVotes: number;
  topParty: string;
  topPartyPercentage: number;
  topPartyColor: string;
  candidateName?: string;
}

// Cores por partido (padrão político brasileiro)
const PARTY_COLORS: Record<string, string> = {
  'PT': '#ef4444',     // Vermelho
  'PL': '#10b981',     // Verde
  'PSDB': '#3b82f6',   // Azul
  'PSD': '#f59e0b',    // Âmbar
  'MDB': '#8b5cf6',    // Roxo
  'PP': '#ec4899',     // Rosa
  'PDT': '#06b6d4',    // Ciano
  'Solidariedade': '#14b8a6', // Teal
  'Podemos': '#f97316', // Laranja
  'PSB': '#6366f1',    // Indigo
  'PSOL': '#ef4444',   // Vermelho
  'PV': '#22c55e',     // Verde claro
  'Cidadania': '#84cc16', // Lima
  'PCdoB': '#dc2626',  // Vermelho escuro
  'Avante': '#fb923c', // Laranja claro
};

/**
 * Busca o resultado eleitoral 2022 (governador) por estado
 */
export async function getStateResult2022(uf: string): Promise<StateResult2022 | null> {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Query simplificada: buscar candidatos 2022 por estado
    // Seleciona o candidato com mais votos por estado
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        id,
        party,
        number,
        elections (
          state,
          year,
          type
        )
      `)
      .eq('elections.state', uf.toUpperCase())
      .eq('elections.year', 2022)
      .eq('elections.type', 'governador')
      .order('id', { ascending: true })
      .limit(1);

    if (error) {
      console.error(`Erro Supabase para ${uf}:`, error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`Sem dados para ${uf} em 2022`);
      return null;
    }

    const candidate = data[0];
    const party = candidate.party || 'Desconhecido';

    return {
      state: uf.toUpperCase(),
      totalVotes: 0,
      topParty: party,
      topPartyPercentage: 0, // Será atualizado depois com agregação real
      topPartyColor: PARTY_COLORS[party] || '#6b7280',
      candidateName: `Candidato ${candidate.number}`,
    };
  } catch (error) {
    console.error(`Erro ao buscar estado ${uf}:`, error);
    return null;
  }
}

/**
 * Versão em cache: busca todos os estados (para carregamento inicial do mapa)
 */
export async function getAllStateResults2022(): Promise<Record<string, StateResult2022>> {
  const results: Record<string, StateResult2022> = {};

  const states = [
    'SP', 'MG', 'RJ', 'BA', 'PR', 'RS', 'PE', 'CE', 'PA', 'GO',
    'PB', 'MA', 'ES', 'PI', 'RN', 'AL', 'MT', 'DF', 'SC', 'MS',
    'AC', 'RO', 'AM', 'RR', 'AP', 'TO', 'SE'
  ];

  // Executar queries em paralelo
  const promises = states.map(state => getStateResult2022(state));
  const allResults = await Promise.all(promises);

  states.forEach((state, index) => {
    if (allResults[index]) {
      results[state] = allResults[index]!;
    }
  });

  return results;
}
