/**
 * Supabase Sync - Salva dados de polling no banco
 *
 * Recebe polls dos institutos e insere/atualiza em Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { Poll } from './institutes/institute-client-base';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface SyncResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: string[];
}

/**
 * Salvar polls no Supabase
 */
export async function syncPollsToSupabase(
  polls: Poll[],
  instituteId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    inserted: 0,
    updated: 0,
    errors: [],
  };

  if (!polls || polls.length === 0) {
    return result;
  }

  try {
    // Transformar polls para formato Supabase
    const pollsData = polls.map(poll => ({
      institute_id: instituteId,
      publication_date: poll.publishDate,
      fieldwork_start: poll.fieldworkStart,
      fieldwork_end: poll.fieldworkEnd,
      sample_size: poll.sampleSize,
      margin_of_error: poll.marginOfError,
      confidence_level: poll.confidenceLevel,
      methodology: poll.methodology,
      source_url: poll.sourceUrl,
      raw_data: {
        results: poll.results,
        pollId: poll.id,
      },
      tse_registration: null,
      scope: 'national',
      poll_type: 'electoral',
      is_verified: false,
    }));

    // Inserir no Supabase
    const { error } = await supabase.from('polls').insert(pollsData);

    if (error) {
      console.error(`[Sync] Erro ao inserir polls para ${instituteId}:`, error);
      result.success = false;
      result.errors.push(error.message);
      return result;
    }

    result.inserted = pollsData.length;
    console.log(`[Sync] ✅ ${instituteId}: ${result.inserted} polls inseridos`);

    return result;
  } catch (error) {
    console.error(`[Sync] Erro crítico para ${instituteId}:`, error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
}

/**
 * Sincronizar fase inteira (vários institutos)
 */
export async function syncPhaseToSupabase(
  phaseData: Map<string, Poll[]>
): Promise<{
  totalPolls: number;
  totalErrors: number;
  results: Record<string, SyncResult>;
}> {
  const results: Record<string, SyncResult> = {};
  let totalPolls = 0;
  let totalErrors = 0;

  for (const [instituteId, polls] of phaseData.entries()) {
    const syncResult = await syncPollsToSupabase(polls, instituteId);
    results[instituteId] = syncResult;
    totalPolls += syncResult.inserted;
    totalErrors += syncResult.errors.length;
  }

  return {
    totalPolls,
    totalErrors,
    results,
  };
}
