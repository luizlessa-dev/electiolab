import { NextRequest, NextResponse } from 'next/server';
import { getStateResult2022 } from '@/lib/geography/state-results-2022';

// Dados de população por estado (referência)
const STATE_POPULATION: Record<string, number> = {
  'SP': 46224079,
  'MG': 21168791,
  'RJ': 17463349,
  'BA': 14873064,
  'PR': 11780561,
  'RS': 11460767,
  'PE': 9758185,
  'CE': 9240580,
  'PA': 8690745,
  'GO': 7206589,
  'MA': 7114598,
  'PB': 4039277,
  'ES': 4108508,
  'PI': 3280174,
  'RN': 3534265,
  'AL': 3127511,
  'DF': 3094325,
  'MT': 3658649,
  'MS': 2839188,
  'SC': 7252502,
  'AC': 906876,
  'RO': 1815278,
  'AM': 4269795,
  'RR': 605761,
  'AP': 861773,
  'TO': 1606348,
  'SE': 2318822,
};

// Dados simulados de 2022 por estado (fallback se Supabase falhar)
const STATE_DATA_2022: Record<string, any> = {
  'SP': {
    sigla: 'SP',
    nome: 'São Paulo',
    regiao: 'Sudeste',
    populacao: 46224079,
    total_votos: 32456789,
    top_partido: 'PT',
    top_partido_pct: 48.2,
    color: '#ef4444',
    polls_count: 247,
  },
  'MG': {
    sigla: 'MG',
    nome: 'Minas Gerais',
    regiao: 'Sudeste',
    populacao: 21168791,
    total_votos: 14567890,
    top_partido: 'PSDB',
    top_partido_pct: 52.1,
    color: '#3b82f6',
    polls_count: 189,
  },
  'RJ': {
    sigla: 'RJ',
    nome: 'Rio de Janeiro',
    regiao: 'Sudeste',
    populacao: 17463349,
    total_votos: 11234567,
    top_partido: 'PT',
    top_partido_pct: 45.3,
    color: '#ef4444',
    polls_count: 156,
  },
  'BA': {
    sigla: 'BA',
    nome: 'Bahia',
    regiao: 'Nordeste',
    populacao: 14873064,
    total_votos: 9876543,
    top_partido: 'PT',
    top_partido_pct: 51.2,
    color: '#ef4444',
    polls_count: 134,
  },
  'PR': {
    sigla: 'PR',
    nome: 'Paraná',
    regiao: 'Sul',
    populacao: 11780561,
    total_votos: 8234567,
    top_partido: 'PL',
    top_partido_pct: 48.7,
    color: '#10b981',
    polls_count: 124,
  },
  'RS': {
    sigla: 'RS',
    nome: 'Rio Grande do Sul',
    regiao: 'Sul',
    populacao: 11460767,
    total_votos: 7654321,
    top_partido: 'PT',
    top_partido_pct: 47.2,
    color: '#ef4444',
    polls_count: 115,
  },
  'PE': {
    sigla: 'PE',
    nome: 'Pernambuco',
    regiao: 'Nordeste',
    populacao: 9758185,
    total_votos: 6543210,
    top_partido: 'PT',
    top_partido_pct: 50.1,
    color: '#ef4444',
    polls_count: 98,
  },
  'CE': {
    sigla: 'CE',
    nome: 'Ceará',
    regiao: 'Nordeste',
    populacao: 9240580,
    total_votos: 5987654,
    top_partido: 'PT',
    top_partido_pct: 52.3,
    color: '#ef4444',
    polls_count: 89,
  },
  'PA': {
    sigla: 'PA',
    nome: 'Pará',
    regiao: 'Norte',
    populacao: 8690745,
    total_votos: 5234567,
    top_partido: 'PL',
    top_partido_pct: 46.8,
    color: '#10b981',
    polls_count: 76,
  },
  'GO': {
    sigla: 'GO',
    nome: 'Goiás',
    regiao: 'Centro-Oeste',
    populacao: 7206589,
    total_votos: 4567890,
    top_partido: 'PL',
    top_partido_pct: 49.2,
    color: '#10b981',
    polls_count: 67,
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uf: string }> }
) {
  const { uf } = await params;
  const normalizedUf = (uf as string).toUpperCase();

  // Validar UF
  if (!/^[A-Z]{2}$/.test(normalizedUf)) {
    return NextResponse.json({ error: 'UF inválida' }, { status: 400 });
  }

  try {
    // Tentar buscar dados reais do Supabase
    const realData = await getStateResult2022(normalizedUf);

    if (realData) {
      // Enriquecer com dados complementares
      const response = {
        sigla: normalizedUf,
        nome: getStateName(normalizedUf),
        regiao: getStateRegion(normalizedUf),
        populacao: STATE_POPULATION[normalizedUf] || 0,
        total_votos: realData.totalVotes,
        top_partido: realData.topParty,
        top_partido_pct: realData.topPartyPercentage,
        color: realData.topPartyColor,
        polls_count: 0, // Será preenchido depois com histórico de pesquisas
        fonte: 'Supabase 2022',
      };

      // Cache: 1 hora
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch (error) {
    console.error(`Erro ao buscar dados do Supabase para ${normalizedUf}:`, error);
    // Fall back para dados simulados
  }

  // Fallback: dados simulados
  const data = STATE_DATA_2022[normalizedUf];

  if (!data) {
    return NextResponse.json({ error: 'Estado não encontrado' }, { status: 404 });
  }

  // Cache: 1 hora
  return NextResponse.json({ ...data, fonte: 'Simulado' }, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// Helpers
function getStateName(uf: string): string {
  const names: Record<string, string> = {
    'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
    'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
    'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
    'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
    'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
    'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
    'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins',
  };
  return names[uf] || uf;
}

function getStateRegion(uf: string): string {
  const regions: Record<string, string> = {
    'AC': 'Norte', 'AM': 'Norte', 'AP': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
    'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
    'DF': 'Centro-Oeste', 'GO': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'MT': 'Centro-Oeste',
    'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
    'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul',
  };
  return regions[uf] || 'Desconhecido';
}
