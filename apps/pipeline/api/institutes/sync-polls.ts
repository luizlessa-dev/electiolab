/**
 * API: POST /api/institutes/sync-polls
 * Sincroniza pesquisas de institutos (Datafolha, Quaest, AtlasIntel)
 *
 * Body:
 * {
 *   "instituto": "datafolha|quaest|atlasitel",
 *   "cargo": "presidente|governador",
 *   "estado": "SP", // opcional para presidente
 *   "ano": 2026,
 *   "election_id": "uuid"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { datafolhaClient } from '../../lib/institutes/datafolha-client';
// import { quaestClient } from '../../lib/institutes/quaest-client'; // TODO: implement Quaest
// import { atlasIntelClient } from '../../lib/institutes/atlasitel-client'; // TODO: implement AtlasIntel

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SyncResult {
  success: boolean;
  instituto: string;
  totalInseridos: number;
  totalErros: number;
  erros: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instituto, cargo, estado, ano = 2026, election_id } = body;

    if (!instituto) {
      return NextResponse.json(
        { error: 'instituto é obrigatório (datafolha|quaest|atlasitel)' },
        { status: 400 }
      );
    }

    if (!cargo) {
      return NextResponse.json(
        { error: 'cargo é obrigatório (presidente|governador)' },
        { status: 400 }
      );
    }

    if (!['datafolha', 'quaest', 'atlasitel'].includes(instituto)) {
      return NextResponse.json(
        { error: 'instituto inválido' },
        { status: 400 }
      );
    }

    if (!election_id) {
      return NextResponse.json(
        { error: 'election_id é obrigatório' },
        { status: 400 }
      );
    }

    const result: SyncResult = {
      success: true,
      instituto,
      totalInseridos: 0,
      totalErros: 0,
      erros: [],
    };

    try {
      let sondagens: any[] = [];

      console.log(`[API] Sincronizando ${instituto} - ${cargo}...`);

      // Buscar sondagens do instituto
      if (instituto === 'datafolha') {
        if (cargo === 'presidente') {
          sondagens = await datafolhaClient.searchPresidencial(ano);
        } else if (cargo === 'governador' && estado) {
          sondagens = await datafolhaClient.searchGovernador(estado, ano);
        }
      }
      // TODO: Implement Quaest and AtlasIntel clients
      // else if (instituto === 'quaest') {
      //   if (cargo === 'presidente') {
      //     sondagens = await quaestClient.buscarSondagensPresidente(ano);
      //   } else if (estado) {
      //     sondagens = await quaestClient.buscarSondagensGovernador(estado, ano);
      //   }
      // } else if (instituto === 'atlasitel') {
      //   if (cargo === 'presidente') {
      //     sondagens = await atlasIntelClient.buscarSondagensPresidente(ano);
      //   } else if (estado) {
      //     sondagens = await atlasIntelClient.buscarSondagensGovernador(estado, ano);
      //   }
      // }
      else {
        return NextResponse.json(
          { error: `Instituto ${instituto} não implementado ainda. Disponível: datafolha` },
          { status: 501 }
        );
      }

      if (!sondagens || sondagens.length === 0) {
        console.log(`[API] Nenhuma sondagem encontrada para ${instituto}`);
        return NextResponse.json({
          success: true,
          resumo: result,
          timestamp: new Date().toISOString(),
        });
      }

      // Mapear credibilidade por instituto
      const credibilityMap: Record<string, number> = {
        datafolha: 9,
        quaest: 8,
        atlasitel: 7,
      };

      // Inserir sondagens
      for (const sondagem of sondagens) {
        try {
          const credibilidade = credibilityMap[instituto] || 5;

          // Inserir pesquisa
          const { data: pollData, error: pollError } = await sb
            .from('polls')
            .insert({
              election_id,
              institute_name: instituto,
              institute_id: null, // TODO: mapear para tabela institutes
              publication_date: sondagem.data_publicacao,
              collected_at: sondagem.data_coleta_inicio,
              collected_until: sondagem.data_coleta_fim,
              sample_size: sondagem.amostra,
              margin_error: sondagem.margem_erro,
              source_url: sondagem.fonte_publicacao || null,
              credibility_score: credibilidade,
            })
            .select();

          if (pollError) {
            throw new Error(pollError.message);
          }

          if (pollData && pollData.length > 0) {
            const pollId = pollData[0].id;

            // Inserir dados dos candidatos
            for (const candidato of sondagem.candidatos) {
              await sb.from('poll_data').insert({
                poll_id: pollId,
                candidate_name: candidato.nome,
                candidate_number: candidato.numero,
                party: candidato.partido,
                polling_percentage: candidato.intencao_voto,
              });
            }

            result.totalInseridos++;
            console.log(
              `[API] ✅ Sondagem ${sondagem.titulo} sincronizada`
            );
          }
        } catch (error) {
          const msg = `Erro ao inserir sondagem ${sondagem.titulo}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          console.error(`[API] ❌ ${msg}`);
          result.erros.push(msg);
          result.totalErros++;
        }
      }

      // Registrar no audit
      await sb.from('data_source_audit').insert({
        source_type: `instituto_${instituto}`,
        cargo,
        estado: estado || null,
        ano,
        total_records: sondagens.length,
        inserted_count: result.totalInseridos,
        error_count: result.totalErros,
        credibility_score: credibilityMap[instituto] || 5,
        refresh_interval_hours: 24,
        synced_at: new Date().toISOString(),
      });

      result.success = result.totalErros === 0;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[API] ❌ ${msg}`);
      result.erros.push(msg);
      result.totalErros++;
      result.success = false;
    }

    return NextResponse.json({
      success: result.success,
      resumo: result,
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
