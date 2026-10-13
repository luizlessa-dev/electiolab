/**
 * Core do pipeline de ingestão de pesquisas eleitorais.
 * Recebe um PollIngestionPayload, valida, deduplica e persiste no Supabase.
 */

import { createClient } from "@/lib/supabase/server";
import type { PollIngestionPayload, IngestionResult } from "./types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type CandidateResolution =
  | { ok: true; resolved: Array<{ candidate_id: string; percentage: number }> }
  | { ok: false; error: string };

/**
 * Resolve todos os candidatos de uma vez (uma query), antes de qualquer
 * persistência. Rejeita nome não encontrado e nome ambíguo (match com mais
 * de um candidato na mesma eleição) em vez de escolher um arbitrariamente —
 * ver memória "candidatos-duplicados-mesma-eleicao" (mesma pessoa, 2 linhas,
 * nomes iguais/CPF diferente, quebra ingestão silenciosamente).
 */
async function resolveCandidates(
  supabase: SupabaseClient,
  electionId: string,
  results: PollIngestionPayload["results"]
): Promise<CandidateResolution> {
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("id, name")
    .eq("election_id", electionId)
    .eq("is_active", true);

  if (error) {
    return { ok: false, error: `Erro ao consultar candidatos: ${error.message}` };
  }

  const resolved: Array<{ candidate_id: string; percentage: number }> = [];
  const problems: string[] = [];

  for (const result of results) {
    const target = result.candidate_name.trim().toLowerCase();
    const matches = (candidates ?? []).filter(
      (c) => c.name.trim().toLowerCase() === target
    );

    if (matches.length === 0) {
      problems.push(`Candidato não encontrado: "${result.candidate_name}"`);
    } else if (matches.length > 1) {
      problems.push(
        `Candidato ambíguo: "${result.candidate_name}" corresponde a ${matches.length} candidatos (ids: ${matches
          .map((m) => m.id)
          .join(", ")})`
      );
    } else {
      resolved.push({ candidate_id: matches[0].id, percentage: result.percentage });
    }
  }

  if (problems.length > 0) {
    return { ok: false, error: problems.join("; ") };
  }

  return { ok: true, resolved };
}

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

  // 4. Resolver TODOS os candidatos antes de criar qualquer registro —
  // interrompe aqui (sem tocar em `polls`) se algum nome não for encontrado
  // ou for ambíguo.
  const resolution = await resolveCandidates(supabase, election.id, payload.results);

  if (!resolution.ok) {
    return { success: false, error: resolution.error };
  }

  // 5. Inserir poll
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

  // 6. Inserir poll_results em UM único insert — uma instrução SQL com
  // múltiplas linhas é atômica no Postgres (tudo ou nada), ao contrário do
  // loop anterior que inseria linha a linha e podia persistir parte dos
  // resultados se uma falhasse no meio.
  //
  // Limitação conhecida: o Supabase JS client não expõe transação entre
  // tabelas (polls + poll_results são duas chamadas HTTP separadas ao
  // PostgREST), e não há função/RPC no projeto que faça esse insert
  // combinado. Se o insert de poll_results falhar, fazemos um delete de
  // compensação no poll recém-criado — não é uma garantia transacional real
  // (existe uma janela entre as duas chamadas, e se o delete de compensação
  // também falhar, o poll órfão fica registrado no erro para limpeza
  // manual). Não inventamos uma garantia que o projeto não tem.
  if (resolution.resolved.length > 0) {
    const { error: resultsError } = await supabase.from("poll_results").insert(
      resolution.resolved.map((r) => ({
        poll_id: poll.id,
        candidate_id: r.candidate_id,
        percentage: r.percentage,
      }))
    );

    if (resultsError) {
      const { error: rollbackError } = await supabase.from("polls").delete().eq("id", poll.id);

      if (rollbackError) {
        return {
          success: false,
          error: `Erro ao inserir poll_results: ${resultsError.message}. Rollback do poll ${poll.id} também falhou (${rollbackError.message}) — requer limpeza manual.`,
        };
      }

      return {
        success: false,
        error: `Erro ao inserir poll_results: ${resultsError.message}`,
      };
    }
  }

  return {
    success: true,
    skipped: false,
    poll_id: poll.id,
  };
}
