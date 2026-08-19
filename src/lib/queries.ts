import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { PROVENIENCIA_PUBLICA } from "./poll-provenance";

// Client sem cookies — todas as queries deste arquivo são de dado público
// (eleições, candidatos, pesquisas), sem contexto de sessão. Usar o client
// baseado em cookies (@/lib/supabase/server) aqui força renderização dinâmica
// em qualquer rota que importe este arquivo, mesmo com `revalidate` declarado
// (cookies()/headers() opta a rota inteira fora do ISR no App Router) — era
// a causa raiz do cache quebrado em /candidato/[slug]. Generic <Database>
// preserva a tipagem que o client de cookies tinha.
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function getActiveElection() {
  const { data } = await supabase
    .from("elections")
    .select("*")
    .eq("is_active", true)
    .order("year", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getElections() {
  const { data } = await supabase
    .from("elections")
    .select("*")
    .order("year", { ascending: false });
  return data ?? [];
}

export async function getElectionById(id: string) {
  const { data } = await supabase
    .from("elections")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function getCandidates(electionId: string) {
  const { data } = await supabase
    .from("candidates")
    .select("*")
    .eq("election_id", electionId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getPolls(electionId: string) {
  const { data } = await supabase
    .from("polls")
    .select(`
      *,
      institute:institutes(id, name, reliability_score, methodology_default),
      results:poll_results(id, candidate_id, percentage)
    `)
    .eq("election_id", electionId)
    .or(PROVENIENCIA_PUBLICA)
    .order("publication_date", { ascending: false });
  return data ?? [];
}

export async function getInstitutes() {
  const { data } = await supabase
    .from("institutes")
    .select(`
      *,
      accuracy:institute_accuracy(election_id, mean_absolute_error)
    `)
    .order("reliability_score", { ascending: false });
  return data ?? [];
}

export async function getElectionResults(electionId: string) {
  const { data } = await supabase
    .from("election_results")
    .select("*, candidate:candidates(id, name, party, color, number)")
    .eq("election_id", electionId)
    .order("percentage", { ascending: false });
  return data ?? [];
}

export async function getEconomicIndicators(
  type?: string,
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from("economic_indicators")
    .select("*")
    .order("reference_date", { ascending: true });

  if (type) query = query.eq("indicator_type", type);
  if (startDate) query = query.gte("reference_date", startDate);
  if (endDate) query = query.lte("reference_date", endDate);

  const { data } = await query;
  return data ?? [];
}

export async function getCampaignFinances(electionId: string) {
  const { data } = await supabase
    .from("campaign_finances")
    .select("*, candidate:candidates(id, name, party, color)")
    .eq("election_id", electionId)
    .order("total_received", { ascending: false });
  return data ?? [];
}

export async function getCandidateBySlug(slug: string) {

  // Resolver primeiro o registro mais recente (eleição mais nova) para o slug.
  // Slugs podem ser duplicados em múltiplas eleições (ex.: Lula 2022 1T, 2022 2T,
  // 2026 1T, 2026 2T). Sem ordenação aqui, .limit(1) pegava registro aleatório
  // e a rota /candidato/lula servia dados de 2022 em vez de 2026.
  // Filtra primeiro is_active=true (caso Tarcísio: governador active vs presidente inactive)
  // Se nenhum active, faz fallback pegando o mais recente histórico.
  let { data: latest } = await supabase
    .from("candidates")
    .select("id, election:elections(year, round, type)")
    .eq("slug", slug)
    .eq("is_active", true);

  if (!latest?.length) {
    // fallback: histórico (ex.: Bolsonaro pai inativo em 2026 mas registros 2022 ativos)
    const fb = await supabase
      .from("candidates")
      .select("id, election:elections(year, round, type)")
      .eq("slug", slug);
    latest = fb.data;
    if (!latest?.length) return null;
  }

  // Tiebreaker quando slug aparece em múltiplas eleições (caso Roberto Claudio,
  // Rogério Marinho — concorrendo a governador E senador no mesmo ciclo):
  //   1) year DESC (mais recente)
  //   2) round DESC (2T > 1T pra mesma eleição)
  //   3) type priority: presidente > governador > senador > deputado_federal > ...
  //   4) id ASC (estável)
  const TYPE_PRIORITY: Record<string, number> = {
    presidente: 5, governador: 4, senador: 3,
    deputado_federal: 2, deputado_estadual: 1, deputado_distrital: 1,
  };
  const byRecency = latest
    .map((c) => {
      const e = Array.isArray(c.election) ? c.election[0] : c.election;
      return {
        id: c.id as string,
        year: e?.year ?? 0,
        round: e?.round ?? 0,
        prio: TYPE_PRIORITY[e?.type ?? ""] ?? 0,
      };
    })
    .sort((a, b) =>
      (b.year - a.year) ||
      (b.round - a.round) ||
      (b.prio - a.prio) ||
      a.id.localeCompare(b.id)
    );

  const candidateId = byRecency[0].id;

  const { data } = await supabase
    .from("candidates")
    .select(`
      *,
      election:elections(id, name, type, state, year, round, election_date),
      poll_results(percentage, poll:polls(id, publication_date, sample_size, methodology, institute:institutes(name, slug))),
      election_results(total_votes, percentage, is_elected, result_description),
      campaign_finances(total_received, total_spent, fund_partidario, fund_especial, receita_pf, receita_pj),
      digital_ads(id, platform, page_name, spend_lower, spend_upper, impressions_lower, impressions_upper, delivery_start, creative_text),
      legislative_votes(id, vote_date, bill_title, vote, topic, importance),
      judicial_proceedings(id, process_number, court, process_class, process_subject, current_status, is_relevant, source_url),
      candidate_assets(id, election_year, asset_type_name, description, value_brl),
      candidate_social_media(id, election_year, platform, url, handle),
      candidate_fefc(id, election_year, amount_received, amount_spent, party_acronym),
      prior_election_results(id, year, round, election_type, state, city, party, total_votes, result_status)
    `)
    .eq("id", candidateId)
    .order("publication_date", { foreignTable: "poll_results.poll", ascending: false })
    .maybeSingle();
  return data;
}

export async function getCandidatesWithBio() {
  const { data } = await supabase
    .from("candidates")
    .select("id, name, slug, party, color, current_position, election:elections(state, type, year)")
    .not("bio", "is", null)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getPartyFunds() {
  const { data } = await supabase
    .from("party_fund_transfers")
    .select("*")
    .order("reference_year", { ascending: false })
    .order("amount", { ascending: false });
  return data ?? [];
}

export async function getDigitalAdsAggregate() {
  const { data } = await supabase
    .from("digital_ads")
    .select(`
      id,
      page_name,
      platform,
      spend_lower,
      spend_upper,
      impressions_lower,
      impressions_upper,
      delivery_start,
      candidate:candidates(id, name, party, color),
      election:elections(id, name, type, state)
    `)
    .order("spend_upper", { ascending: false, nullsFirst: false });
  return data ?? [];
}
