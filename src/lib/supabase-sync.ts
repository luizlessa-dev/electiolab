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

  console.log(`[Sync] Iniciando sync para ${instituteId} com ${polls.length} polls`);

  if (!polls || polls.length === 0) {
    console.log(`[Sync] ${instituteId}: sem polls para sincronizar`);
    return result;
  }

  try {
    // Verificar credenciais Supabase
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Transformar polls para formato Supabase
    const ELECTION_2026_ID = '21f8e9a3-5ff8-4baf-b0ae-6b00d2614248';

    const pollsData = polls.map(poll => ({
      election_id: ELECTION_2026_ID,
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
      poll_type: 'estimulada',
      is_verified: false,
    }));

    console.log(`[Sync] ${instituteId}: inserindo ${pollsData.length} polls...`);
    console.log(`[Sync] Primeiro poll data:`, JSON.stringify(pollsData[0], null, 2).slice(0, 200));

    // Inserir no Supabase
    const { data, error } = await supabase.from('polls').insert(pollsData);

    if (error) {
      console.error(`[Sync] ❌ ${instituteId} erro Supabase:`, error);
      result.success = false;
      result.errors.push(`${error.code}: ${error.message}`);
      return result;
    }

    result.inserted = pollsData.length;
    console.log(`[Sync] ✅ ${instituteId}: ${result.inserted} polls inseridos com sucesso`);

    return result;
  } catch (error) {
    console.error(`[Sync] ❌ ${instituteId} erro crítico:`, error);
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
