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
