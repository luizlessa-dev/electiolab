import { NextRequest, NextResponse } from 'next/server';

// Dados simulados de 2022 por estado (para MVP)
// TODO: Substituir por queries reais do Supabase
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

  // Buscar dados
  const data = STATE_DATA_2022[normalizedUf];

  if (!data) {
    return NextResponse.json({ error: 'Estado não encontrado' }, { status: 404 });
  }

  // Cache: 1 hora
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
