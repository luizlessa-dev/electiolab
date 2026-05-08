import { createClient } from "@/lib/supabase/server";

export async function getActiveElection() {
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data } = await supabase
    .from("elections")
    .select("*")
    .order("year", { ascending: false });
  return data ?? [];
}

export async function getElectionById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("elections")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function getCandidates(electionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select("*")
    .eq("election_id", electionId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getPolls(electionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("polls")
    .select(`
      *,
      institute:institutes(id, name, reliability_score, methodology_default),
      results:poll_results(id, candidate_id, percentage)
    `)
    .eq("election_id", electionId)
    .order("publication_date", { ascending: false });
  return data ?? [];
}

export async function getInstitutes() {
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaign_finances")
    .select("*, candidate:candidates(id, name, party, color)")
    .eq("election_id", electionId)
    .order("total_received", { ascending: false });
  return data ?? [];
}

export async function getCandidateBySlug(slug: string) {
  const supabase = await createClient();
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
    .eq("slug", slug)
    .eq("is_active", true)
    .order("publication_date", { foreignTable: "poll_results.poll", ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getCandidatesWithBio() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select("id, name, slug, party, color, current_position, election:elections(state, type, year)")
    .not("bio", "is", null)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getPartyFunds() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("party_fund_transfers")
    .select("*")
    .order("reference_year", { ascending: false })
    .order("amount", { ascending: false });
  return data ?? [];
}

export async function getDigitalAdsAggregate() {
  const supabase = await createClient();
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
