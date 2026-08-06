/**
 * API: GET|POST /api/tse/sync/resultados
 * Sincroniza resultados de votação em tempo real para tse_apuracao
 *
 * GET Query params:
 * - cargo: 'presidente' | 'governador'
 * - estado: UF (obrigatório para governador)
 * - turno: 1 | 2 (padrão: 1)
 * - ano: número do ano (padrão: 2026)
 * - election_id: uuid (para salvar no banco)
 *
 * POST Body:
 * {
 *   "ano": 2026,
 *   "turno": 1,
 *   "election_id": "uuid"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { tseResultadosClient } from '../../../lib/tse/tse-resultados-client';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cargo = searchParams.get('cargo') || 'presidente';
    const estado = searchParams.get('estado');
    const turno = (parseInt(searchParams.get('turno') || '1') as 1 | 2) || 1;
    const ano = parseInt(searchParams.get('ano') || '2026') || 2026;
    const election_id = searchParams.get('election_id');

    if (!['presidente', 'governador'].includes(cargo)) {
      return NextResponse.json(
        { error: "cargo deve ser 'presidente' ou 'governador'" },
        { status: 400 }
      );
    }

    if (cargo === 'governador' && !estado) {
      return NextResponse.json(
        { error: 'estado é obrigatório para cargo governador' },
        { status: 400 }
      );
    }

    let resultado;

    if (cargo === 'presidente') {
      resultado = await tseResultadosClient.buscarResultadosPresidencial(
        turno,
        ano
      );
    } else {
      resultado = await tseResultadosClient.buscarResultadosGovernador(
        estado!,
        turno,
        ano
      );
    }

    // Se election_id fornecido, salvar no banco
    if (election_id) {
      const { data: apuracaoData, error: apuracaoError } = await sb
        .from('tse_apuracao')
        .insert({
          election_id,
          cargo,
          estado,
          turno,
          data_apuracao: resultado.dataApuracao,
          percentual_apuracao: resultado.percentualApuração,
          secoes_apuradas: resultado.seçõesApuradas,
          secoes_totais: resultado.seçõesTotais,
        })
        .select();

      if (apuracaoError) {
        console.error('Erro ao inserir apuração:', apuracaoError);
      } else if (apuracaoData && apuracaoData.length > 0) {
        const apuracaoId = apuracaoData[0].id;

        // Inserir candidatos
        const candidatosData = resultado.candidatos.map((c) => ({
          apuracao_id: apuracaoId,
          numero_candidato: c.numeroCandidata,
          nome_candidato: c.nomeCandidata,
          sigla_partido: c.siglaPartido,
          votos_nominais: c.votosNominais,
          percentual: c.percentual,
        }));

        const { error: candidatosError } = await sb
          .from('tse_apuracao_candidatos')
          .insert(candidatosData);

        if (candidatosError) {
          console.error('Erro ao inserir candidatos:', candidatosError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: resultado,
      salvo: election_id ? true : false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao buscar resultados:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ano = 2026, turno = 1, election_id } = body;

    if (!election_id) {
      return NextResponse.json(
        { error: 'election_id é obrigatório' },
        { status: 400 }
      );
    }

    const estados = [
      'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
      'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
    ];

    const resultados = [];
    let totalInseridos = 0;
    let totalErros = 0;
    const erros: string[] = [];

    // Presidente
    try {
      const resultado = await tseResultadosClient.buscarResultadosPresidencial(
        turno as 1 | 2,
        ano
      );

      const { data: apuracaoData } = await sb
        .from('tse_apuracao')
        .insert({
          election_id,
          cargo: 'presidente',
          turno,
          data_apuracao: resultado.dataApuracao,
          percentual_apuracao: resultado.percentualApuração,
          secoes_apuradas: resultado.seçõesApuradas,
          secoes_totais: resultado.seçõesTotais,
        })
        .select();

      if (apuracaoData && apuracaoData.length > 0) {
        const candidatosData = resultado.candidatos.map((c) => ({
          apuracao_id: apuracaoData[0].id,
          numero_candidato: c.numeroCandidata,
          nome_candidato: c.nomeCandidata,
          sigla_partido: c.siglaPartido,
          votos_nominais: c.votosNominais,
          percentual: c.percentual,
        }));

        await sb.from('tse_apuracao_candidatos').insert(candidatosData);
        totalInseridos++;
      }

      resultados.push({
        cargo: 'presidente',
        candidatos: resultado.candidatos.length,
        apuração: resultado.percentualApuração,
      });
    } catch (error) {
      const msg = `Erro ao sincronizar presidente: ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.error(msg);
      erros.push(msg);
      totalErros++;
    }

    // Governadores
    for (const uf of estados) {
      try {
        const resultado = await tseResultadosClient.buscarResultadosGovernador(
          uf,
          turno as 1 | 2,
          ano
        );

        const { data: apuracaoData } = await sb
          .from('tse_apuracao')
          .insert({
            election_id,
            cargo: 'governador',
            estado: uf,
            turno,
            data_apuracao: resultado.dataApuracao,
            percentual_apuracao: resultado.percentualApuração,
            secoes_apuradas: resultado.seçõesApuradas,
            secoes_totais: resultado.seçõesTotais,
          })
          .select();

        if (apuracaoData && apuracaoData.length > 0) {
          const candidatosData = resultado.candidatos.map((c) => ({
            apuracao_id: apuracaoData[0].id,
            numero_candidato: c.numeroCandidata,
            nome_candidato: c.nomeCandidata,
            sigla_partido: c.siglaPartido,
            votos_nominais: c.votosNominais,
            percentual: c.percentual,
          }));

          await sb.from('tse_apuracao_candidatos').insert(candidatosData);
          totalInseridos++;
        }

        resultados.push({
          estado: uf,
          candidatos: resultado.candidatos.length,
          apuração: resultado.percentualApuração,
        });
      } catch (error) {
        const msg = `Erro ao buscar resultados de ${uf}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        console.error(msg);
        erros.push(msg);
        totalErros++;
      }
    }

    return NextResponse.json({
      success: true,
      resumo: {
        ano,
        turno,
        election_id,
        totalInseridos,
        totalErros,
        erros: erros.length > 0 ? erros : undefined,
      },
      resultados,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
