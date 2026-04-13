import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PollTable } from "@/components/dashboard/poll-table";
import { getElections, getCandidates, getPolls } from "@/lib/queries";

export default async function PesquisasPage() {
  const elections = await getElections();
  const election = elections.find(
    (e: any) => e.year === 2022 && e.round === 1
  ) ?? elections[0];

  if (!election) return <p>Nenhuma eleicao.</p>;

  const [candidates, polls] = await Promise.all([
    getCandidates(election.id),
    getPolls(election.id),
  ]);

  const pollTableData = (polls as any[]).map((p) => ({
    id: p.id,
    publication_date: p.publication_date,
    institute_name: p.institute?.name ?? "—",
    methodology: p.methodology,
    sample_size: p.sample_size,
    margin_of_error: p.margin_of_error,
    results: (p.results ?? []).map((r: any) => {
      const cand = candidates.find((c: any) => c.id === r.candidate_id);
      return {
        candidate_name: cand?.name ?? "—",
        percentage: r.percentage,
        color: cand?.color ?? "#6b7280",
      };
    }),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pesquisas Eleitorais</h1>
        <p className="text-sm text-muted-foreground">
          {polls.length} pesquisas de {new Set((polls as any[]).map((p) => p.institute?.name)).size} institutos
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <PollTable polls={pollTableData} />
        </CardContent>
      </Card>
    </div>
  );
}
