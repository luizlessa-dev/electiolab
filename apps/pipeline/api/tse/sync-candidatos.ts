/**
 * API Endpoint: POST /api/tse/sync-candidatos
 * Sincroniza candidatos de 2026 via DivulgaCandContas
 *
 * Uso:
 * curl -X POST http://localhost:3000/api/tse/sync-candidatos \
 *   -H "Authorization: Bearer SECRET_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"ano": 2026, "cargo": "presidente"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { divulgaCandContasClient } from '../../lib/tse/divulgacandcontas';
import type { SyncLog } from '../../lib/tse/types';

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PE', 'PI', 'RJ',
  'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

type Cargo = 'presidente' | 'governador' | 'senador' | 'deputado_federal' | 'deputado_estadual';

export async function POST(request: NextRequest) {
  try {
    // Validar token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || token !== process.env.TSE_SYNC_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ano = 2026, cargo = 'presidente', estado }: { ano: number; cargo: Cargo; estado?: string } = body;

    const startTime = Date.now();
    const log: SyncLog = {
      timestamp: new Date().toISOString(),
      totalProcessado: 0,
      totalInserido: 0,
      totalAtualizado: 0,
      erros: [],
      duracao_ms: 0,
    };

    const estadosList = estado ? [estado.toUpperCase()] : ESTADOS;

    console.log(`🔄 Iniciando sincronização de ${cargo} (${ano}) para ${estadosList.length} estado(s)`);

    for (const uf of estadosList) {
      try {
        const response = await divulgaCandContasClient.buscarCandidatos(ano, uf, cargo);

        if (response.success && response.data) {
          log.totalProcessado += response.data.length;
          console.log(`✅ ${uf}: ${response.data.length} candidatos encontrados`);

          // TODO: Inserir no banco (Supabase)
          // await db.candidatos.upsert(response.data);
          log.totalInserido += response.data.length;
        } else {
          log.erros.push({
            candidato: uf,
            erro: response.error || 'Erro desconhecido',
          });
          console.error(`❌ ${uf}: ${response.error}`);
        }
      } catch (error) {
        log.erros.push({
          candidato: uf,
          erro: error instanceof Error ? error.message : String(error),
        });
      }

      // Pequeno delay entre estados
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    log.duracao_ms = Date.now() - startTime;

    console.log(`
📊 Sincronização concluída:
  Total processado: ${log.totalProcessado}
  Total inserido: ${log.totalInserido}
  Erros: ${log.erros.length}
  Tempo: ${log.duracao_ms}ms
    `);

    return NextResponse.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
