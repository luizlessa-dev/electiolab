/**
 * Core do pipeline de ingestão de pesquisas eleitorais.
 * Recebe um PollIngestionPayload, valida, deduplica e persiste no Supabase.
 */

import { createClient } from "@/lib/supabase/server";
import type { PollIngestionPayload, IngestionResult } from "./types";

export async function ingestPoll(payload: PollIngestionPayload): Promise<IngestionResult> {
  const supabase = await createClient();

  // 1. Resolver election_id
  const { data: election } = await supabase
    .from("elections")
    .select("id")
    .eq("name", payload.election_name)
    .single();

  if (!election) {
    return { success: false, error: `Eleição não encontrada: "${payload.election_name}"` };
  }

  // 2. Resolver institute_id
  const { data: institute } = await supabase
    .from("institutes")
    .select("id")
    .eq("name", payload.institute_name)
    .single();

  if (!institute) {
    return { success: false, error: `Instituto não encontrado: "${payload.institute_name}"` };
  }

  // 3. Deduplicação — mesma pesquisa já existe?
  const { data: existing } = await supabase
    .from("polls")
    .select("id")
    .eq("election_id", election.id)
    .eq("institute_id", institute.id)
    .eq("fieldwork_end", payload.fieldwork_end)
    .limit(1)
    .single();

  if (existing) {
    return {
      success: true,
      skipped: true,
      poll_id: existing.id,
      reason: `Pesquisa já existe (fieldwork_end: ${payload.fieldwork_end})`,
    };
  }

  // 4. Inserir poll
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      election_id: election.id,
      institute_id: institute.id,
      publication_date: payload.publication_date,
      fieldwork_start: payload.fieldwork_start ?? null,
      fieldwork_end: payload.fieldwork_end,
      sample_size: payload.sample_size,
      margin_of_error: payload.margin_of_error ?? null,
      confidence_level: payload.confidence_level ?? 95,
      methodology: payload.methodology,
      scope: payload.scope ?? "nacional",
      poll_type: payload.poll_type ?? "estimulada",
      source_url: payload.source_url ?? null,
      tse_registration: payload.tse_registration ?? null,
      is_verified: true,
    })
    .select("id")
    .single();

  if (pollError || !poll) {
    return { success: false, error: pollError?.message ?? "Erro ao inserir poll" };
  }

  // 5. Resolver candidatos e inserir resultados
  const errors: string[] = [];

  for (const result of payload.results) {
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("election_id", election.id)
      .ilike("name", result.candidate_name)
      .limit(1)
      .single();

    if (!candidate) {
      errors.push(`Candidato não encontrado: "${result.candidate_name}" — resultado ignorado`);
      continue;
    }

    await supabase.from("poll_results").insert({
      poll_id: poll.id,
      candidate_id: candidate.id,
      percentage: result.percentage,
    });
  }

  return {
    success: true,
    skipped: false,
    poll_id: poll.id,
    ...(errors.length > 0 && { reason: errors.join("; ") }),
  };
}
