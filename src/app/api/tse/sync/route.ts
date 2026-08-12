/**
 * POST /api/tse/sync
 *
 * Synchronizes candidate registry with TSE official database.
 * Triggers validation, logs discrepancies, and enriches poll data.
 *
 * Query parameters:
 * - position: governador|senador (default: governador)
 * - state: UF code (default: all states)
 * - detailed: true|false (include full discrepancy details)
 */

import { NextRequest, NextResponse } from 'next/server';
import { tseSyncService } from '@/lib/tse/tse-sync-service';
import { tseValidator } from '@/lib/tse/tse-validator';

export const maxDuration = 300; // 5 minutes for sync operations

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const position = (searchParams.get('position') || 'governador') as 'governador' | 'senador';
    const state = searchParams.get('state')?.toUpperCase() || null;
    const detailed = searchParams.get('detailed') === 'true';

    console.log(`[TSE Sync API] Starting sync for ${position}s${state ? ` in ${state}` : ' in all states'}...`);

    const startTime = Date.now();

    // Handle single state sync
    if (state) {
      console.log(`[TSE Sync API] Single state mode: ${state}`);

      const elections = await tseSyncService.fetchElectionsWithCache();
      const election2026 = elections.find((e) => e.ano === 2026 && e.tipo === position);

      if (!election2026) {
        return NextResponse.json(
          { error: `No ${position} election found for 2026` },
          { status: 404 }
        );
      }

      const result = await tseSyncService.syncStatePosition(election2026.id, state, position);

      // Also run TSE validation
      const { getRealCandidatesByStateAndPosition } = await import(
        '@/lib/candidates/real-candidates-2026'
      );
      const candidates = getRealCandidatesByStateAndPosition(state, position);

      const validationResult = await tseValidator.validateStateAgainstTSE(
        candidates,
        state,
        position
      );

      const elapsed = Date.now() - startTime;

      const response = {
        syncedAt: new Date().toISOString(),
        elapsedMs: elapsed,
        position,
        state,
        syncResult: result,
        validationResult: detailed ? validationResult : {
          summary: validationResult.summary,
          state: validationResult.state,
          position: validationResult.position,
        },
      };

      // Log results
      tseSyncService.logDiscrepancies([result]);
      tseValidator.logValidationResults(validationResult);

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Sync-Time': `${elapsed}ms`,
        },
      });
    }

    // Handle full sync for all states
    console.log(`[TSE Sync API] Full sync mode for all states`);

    const syncResults = await tseSyncService.syncAllCandidates(position);

    // Also validate all states
    const allValidationResults = [];
    const STATES = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    for (const st of STATES) {
      try {
        const { getRealCandidatesByStateAndPosition } = await import(
          '@/lib/candidates/real-candidates-2026'
        );
        const candidates = getRealCandidatesByStateAndPosition(st, position);
        const validationResult = await tseValidator.validateStateAgainstTSE(
          candidates,
          st,
          position
        );
        allValidationResults.push(validationResult);
      } catch (error) {
        console.warn(`Failed to validate ${st}:`, error);
      }
    }

    const elapsed = Date.now() - startTime;

    // Prepare response
    const response = {
      syncedAt: new Date().toISOString(),
      elapsedMs: elapsed,
      position,
      summary: {
        totalStates: syncResults.length,
        totalValidations: allValidationResults.length,
        discrepancies: syncResults.reduce((sum, r) => sum + r.discrepancies.length, 0),
        totalValidationDiscrepancies: allValidationResults.reduce(
          (sum, r) => sum + r.summary.discrepanciesFound,
          0
        ),
        syncStatus: {
          success: syncResults.filter((r) => r.status === 'success').length,
          partial: syncResults.filter((r) => r.status === 'partial').length,
          failed: syncResults.filter((r) => r.status === 'failed').length,
        },
        validationStatus: {
          valid: allValidationResults.reduce((sum, r) => sum + r.summary.valid, 0),
          partial: allValidationResults.reduce((sum, r) => sum + r.summary.partial, 0),
          invalid: allValidationResults.reduce((sum, r) => sum + r.summary.invalid, 0),
        },
      },
      syncResults: detailed ? syncResults : syncResults.map((r) => ({
        state: r.state,
        status: r.status,
        totalCandidates: r.totalCandidates,
        discrepancyCount: r.discrepancies.length,
      })),
      validationResults: detailed ? allValidationResults : allValidationResults.map((r) => ({
        state: r.state,
        summary: r.summary,
      })),
    };

    // Log results
    tseSyncService.logDiscrepancies(syncResults);
    for (const valResult of allValidationResults) {
      if (valResult.summary.discrepanciesFound > 0) {
        tseValidator.logValidationResults(valResult);
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Sync-Time': `${elapsed}ms`,
        'X-Total-Discrepancies': (
          syncResults.reduce((sum, r) => sum + r.discrepancies.length, 0) +
          allValidationResults.reduce((sum, r) => sum + r.summary.discrepanciesFound, 0)
        ).toString(),
      },
    });
  } catch (error) {
    console.error('[TSE Sync API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync TSE data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tse/sync
 *
 * Get last sync status and cached results
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const position = (searchParams.get('position') || 'governador') as 'governador' | 'senador';
    const state = searchParams.get('state')?.toUpperCase() || null;

    if (state) {
      const syncStatus = tseSyncService.getSyncStatus(state, position);
      if (!syncStatus) {
        return NextResponse.json(
          { message: `No sync data available for ${state} ${position}` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        state,
        position,
        syncStatus,
        lastSyncTime: syncStatus.syncedAt.toISOString(),
      });
    }

    return NextResponse.json(
      { message: 'Provide state parameter to get sync status' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[TSE Sync API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sync status' },
      { status: 500 }
    );
  }
}
