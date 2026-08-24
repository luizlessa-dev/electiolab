import { Card, CardContent } from "@/components/ui/card";
import { PollTable } from "@/components/dashboard/poll-table";
import { getElections, getCandidates, getPolls } from "@/lib/queries";
import type { Database } from "@/types/database.types";

type ElectionRow = Database["public"]["Tables"]["elections"]["Row"];
type CandidateRow = Database["public"]["Tables"]["candidates"]["Row"];
type PollWithRelations = Database["public"]["Tables"]["polls"]["Row"] & {
  institute: Pick<
    Database["public"]["Tables"]["institutes"]["Row"],
    "id" | "name" | "reliability_score" | "methodology_default"
  > | null;
  results: Pick<
    Database["public"]["Tables"]["poll_results"]["Row"],
    "id" | "candidate_id" | "percentage"
  >[];
};

export default async function PesquisasPage() {
  const elections = (await getElections()) as ElectionRow[];
  const election = elections.find((e) => e.is_active) ?? elections[0];
  if (!election) return <p className="text-muted-foreground font-mono text-xs">NO DATA</p>;

  const [candidatesRaw, pollsRaw] = await Promise.all([
    getCandidates(election.id),
    getPolls(election.id),
  ]);
  const candidates = candidatesRaw as CandidateRow[];
  const polls = pollsRaw as PollWithRelations[];

  const instituteCount = new Set(polls.map((p) => p.institute?.name)).size;
  const totalSample = polls.reduce((s, p) => s + (p.sample_size ?? 0), 0);

  const pollTableData = polls.map((p) => ({
    id: p.id,
    publication_date: p.publication_date,
    institute_name: p.institute?.name ?? "—",
    methodology: p.methodology ?? "",
    sample_size: p.sample_size,
    margin_of_error: p.margin_of_error,
    results: (p.results ?? [])
      .map((r) => ({ cand: candidates.find((c) => c.id === r.candidate_id), r }))
      .filter(({ cand }) => cand != null)
      .map(({ cand, r }) => ({
        candidate_name: cand!.name,
        percentage: Number(r.percentage),
        color: cand!.color ?? "#6b7280",
      })),
  }));

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pesquisas Eleitorais</h1>
        <p className="text-xs font-mono text-muted-foreground">
          {polls.length} pesquisas · {instituteCount} institutos · {totalSample.toLocaleString("pt-BR")} entrevistados
        </p>
      </div>
      <Card className="border-border">
        <CardContent className="p-0">
          <PollTable polls={pollTableData} />
        </CardContent>
      </Card>
    </div>
  );
}
