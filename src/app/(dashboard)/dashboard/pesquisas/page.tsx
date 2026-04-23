import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PollTable } from "@/components/dashboard/poll-table";
import { getElections, getCandidates, getPolls } from "@/lib/queries";

export default async function PesquisasPage() {
  const elections = await getElections();
  const election = elections.find((e: any) => e.is_active) ?? elections[0];
  if (!election) return <p className="text-muted-foreground font-mono text-xs">NO DATA</p>;

  const [candidates, polls] = await Promise.all([
    getCandidates(election.id),
    getPolls(election.id),
  ]);

  const instituteCount = new Set((polls as any[]).map((p) => p.institute?.name)).size;
  const totalSample = (polls as any[]).reduce((s, p) => s + (p.sample_size ?? 0), 0);

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
        percentage: Number(r.percentage),
        color: cand?.color ?? "#6b7280",
      };
    }),
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
