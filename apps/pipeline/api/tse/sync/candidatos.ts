/**
 * API: POST /api/tse/sync/candidatos
 * Sincroniza candidatos registrados do TSE para a tabela candidates
 *
 * Body:
 * {
 *   "ano": 2026,
 *   "estado": "SP", // opcional, sinc todos se omitido
 *   "cargo": "governador", // opcional
 *   "election_id": "uuid" // eleição para vincular candidatos
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { divulgaCandContasClient } from '../../../lib/tse/divulgacandcontas-client';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ano = 2026, estado, cargo = 'governador', election_id } = body;

    if (!ano) {
      return NextResponse.json(
        { error: 'ano é obrigatório' },
        { status: 400 }
      );
    }

    if (!election_id) {
      return NextResponse.json(
        { error: 'election_id é obrigatório' },
        { status: 400 }
      );
    }

    const estados = estado
      ? [estado.toUpperCase()]
      : [
          'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
          'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
          'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
        ];

    let totalInseridos = 0;
    let totalErros = 0;
    const erros: string[] = [];

    for (const uf of estados) {
      try {
        console.log(`[TSE] Sincronizando ${cargo}s de ${uf}...`);

        const candidatos = await divulgaCandContasClient.buscarCandidatos(
          ano,
          uf,
          cargo as 'presidente' | 'governador' | 'senador' | 'deputado'
        );

        if (!candidatos || candidatos.length === 0) {
          console.log(`[TSE] Nenhum candidato encontrado para ${uf}`);
          continue;
        }

        // Preparar dados para inserção
        const candidatosParaInserir = candidatos.map((c) => ({
          name: c.nome,
          full_name: c.nomeCompleto || c.nome,
          party: c.partido,
          number: c.numero ? parseInt(c.numero) : null,
          tse_id: c.sequencial || c.id,
          is_active: c.situacao === 'APTO',
          election_id,
        }));

        // Inserir no Supabase
        const { error: insertError } = await sb
          .from('candidates')
          .insert(candidatosParaInserir)
          .select();

        if (insertError) {
          throw new Error(`Insert error: ${insertError.message}`);
        }

        console.log(`[TSE] ✅ ${candidatosParaInserir.length} candidatos inseridos para ${uf}`);
        totalInseridos += candidatosParaInserir.length;
      } catch (error) {
        const msg = `Erro ao sincronizar ${uf}: ${
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
        cargo,
        election_id,
        estadosSolicitados: estados,
        totalInseridos,
        totalErros,
        erros: erros.length > 0 ? erros : undefined,
      },
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
