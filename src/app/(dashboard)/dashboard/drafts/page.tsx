import { createClient } from "@supabase/supabase-js";
import { DraftsClient } from "./drafts-client";

export const dynamic = "force-dynamic";

type DraftRow = {
  id: string;
  election_id: string;
  institute_name: string;
  fieldwork_end: string;
  publication_date: string | null;
  sample_size: number | null;
  margin_of_error: number | null;
  scope: string | null;
  round: number;
  tse_protocolo: string | null;
  results: Array<{ name: string; pct: number }>;
  source_url: string;
  source_kind: string;
  status: "pending" | "approved" | "rejected" | "imported";
  promoted_poll_id: string | null;
  imported_at: string;
  notes: string | null;
  election: { name: string; type: string; state: string | null; year: number; round: number } | null;
};

type SummaryRow = {
  election_name: string;
  cargo: string;
  state: string | null;
  pending: number;
  approved: number;
  rejected: number;
  imported: number;
  with_tse_match: number;
  last_fieldwork_end: string;
};

async function getDrafts(): Promise<{ drafts: DraftRow[]; summary: SummaryRow[] }> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: drafts } = await sb
    .from("poll_drafts")
    .select(
      `id, election_id, institute_name, fieldwork_end, publication_date, sample_size,
       margin_of_error, scope, round, tse_protocolo, results, source_url, source_kind,
       status, promoted_poll_id, imported_at, notes,
       election:elections(name, type, state, year, round)`
    )
    .order("status", { ascending: true })
    .order("fieldwork_end", { ascending: false })
    .limit(200);
  const { data: summary } = await sb.from("poll_drafts_summary").select("*").limit(50);
  return {
    drafts: ((drafts as unknown) as DraftRow[]) ?? [],
    summary: ((summary as unknown) as SummaryRow[]) ?? [],
  };
}

export default async function PollDraftsPage() {
  const { drafts, summary } = await getDrafts();
  return <DraftsClient drafts={drafts} summary={summary} />;
}
