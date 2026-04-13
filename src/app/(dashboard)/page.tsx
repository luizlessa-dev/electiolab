import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeightedAverageChart } from "@/components/charts/weighted-average-chart";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { InstituteRanking } from "@/components/charts/institute-ranking";
import { PollTable } from "@/components/dashboard/poll-table";
import {
  getElections,
  getCandidates,
  getPolls,
  getInstitutes,
  getElectionResults,
  getEconomicIndicators,
} from "@/lib/queries";
import {
  calculateWeightedAverage,
  type PollInput,
} from "@/lib/weighting/calculate-weighted-average";
import { BarChart3, TrendingUp, Building2, FileSearch } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ election?: string }>;
}) {
  const params = await searchParams;
  const elections = await getElections();

  // Default to active election (2026), fallback to first
  let election: any;
  if (params.election) {
    election = elections.find((e: any) => e.id === params.election);
  }
  if (!election) {
    election = elections.find((e: any) => e.is_active) ?? elections[0];
  }

  if (!election) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhuma eleicao encontrada.</p>
      </div>
    );
  }

  const [candidates, polls, institutes, electionResults, indicators] =
    await Promise.all([
      getCandidates(election.id),
      getPolls(election.id),
      getInstitutes(),
      getElectionResults(election.id),
      getEconomicIndicators("ipca_12m", "2022-06-01", "2022-12-31"),
    ]);

  // Calculate weighted averages for each candidate
  const candidateAverages = candidates.map((c: any) => {
    const pollInputs: PollInput[] = polls
      .filter((p: any) =>
        p.results?.some((r: any) => r.candidate_id === c.id)
      )
      .map((p: any) => ({
        id: p.id,
        fieldworkEnd: new Date(p.fieldwork_end),
        sampleSize: Number(p.sample_size),
        methodology: p.methodology,
        instituteReliability: Number(p.institute?.reliability_score ?? 0.7),
        percentage: Number(
          p.results.find((r: any) => r.candidate_id === c.id)?.percentage ?? 0
        ),
      }));

    const result = calculateWeightedAverage(pollInputs, {
      referenceDate: new Date("2022-10-02"),
    });

    return {
      name: c.name,
      party: c.party ?? "",
      average: result.average,
      confidenceLow: result.confidenceLow,
      confidenceHigh: result.confidenceHigh,
      color: c.color ?? "#6b7280",
      pollCount: result.pollCount,
    };
  });

  // Build trend data (polls grouped by date)
  const trendMap = new Map<string, Record<string, number | string>>();
  for (const poll of polls as any[]) {
    const date = poll.publication_date;
    if (!trendMap.has(date)) trendMap.set(date, { date } as any);
    const row = trendMap.get(date)!;
    for (const result of poll.results ?? []) {
      const cand = candidates.find((c: any) => c.id === result.candidate_id);
      if (cand) {
        // Average if multiple polls on same day for same candidate
        const key = cand.name;
        const pct = Number(result.percentage);
        if (row[key]) {
          row[key] = Math.round(((row[key] as number) + pct) / 2 * 10) / 10;
        } else {
          row[key] = pct;
        }
      }
    }
  }
  const trendData = Array.from(trendMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
  const trendCandidates = candidates
    .filter((c: any) => candidateAverages.find((ca) => ca.name === c.name && ca.average > 3))
    .map((c: any) => ({ name: c.name, color: c.color ?? "#6b7280" }));

  // Build poll table data
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

  // Official results for comparison
  const officialResults = (electionResults as any[]).map((r) => ({
    name: r.candidate?.name ?? "—",
    percentage: Number(r.percentage),
    color: r.candidate?.color ?? "#6b7280",
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{election.name}</h1>
          <p className="text-sm text-muted-foreground">
            {election.election_date
              ? new Date(election.election_date).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : ""}{" "}
            · {polls.length} pesquisas · {candidates.length} candidatos
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {elections.map((e: any) => (
            <a
              key={e.id}
              href={`/?election=${e.id}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                e.id === election.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:text-foreground border-border"
              }`}
            >
              {e.name.replace("Presidencial ", "").replace(" - ", " ")}
            </a>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Visao Geral
          </TabsTrigger>
          <TabsTrigger value="trend" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Tendencia
          </TabsTrigger>
          <TabsTrigger value="polls" className="gap-1.5">
            <FileSearch className="h-3.5 w-3.5" />
            Pesquisas
          </TabsTrigger>
          <TabsTrigger value="institutes" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Institutos
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Media Ponderada ElectioLab
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Peso por recencia, amostra, metodologia e confiabilidade do
                  instituto
                </p>
              </CardHeader>
              <CardContent>
                <WeightedAverageChart data={candidateAverages} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resultado Oficial</CardTitle>
                <p className="text-xs text-muted-foreground">
                  TSE — Resultado final apurado
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {officialResults.map((r) => (
                    <div key={r.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: r.color }}
                        />
                        <span className="font-medium text-sm">{r.name}</span>
                      </div>
                      <span className="font-bold font-mono" style={{ color: r.color }}>
                        {r.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  Compare a media ElectioLab com o resultado real para avaliar a
                  precisao do modelo.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Pesquisas</p>
                <p className="text-2xl font-bold">{polls.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Institutos</p>
                <p className="text-2xl font-bold">
                  {new Set((polls as any[]).map((p) => p.institute?.name)).size}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Amostra total</p>
                <p className="text-2xl font-bold">
                  {(polls as any[])
                    .reduce((sum, p) => sum + (p.sample_size ?? 0), 0)
                    .toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">IPCA 12m</p>
                <p className="text-2xl font-bold">
                  {indicators.length > 0
                    ? `${Number(indicators[indicators.length - 1]?.value).toFixed(1)}%`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trend Tab */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendencia Temporal</CardTitle>
              <p className="text-xs text-muted-foreground">
                Evolucao das pesquisas ao longo do tempo — cada ponto e uma pesquisa
              </p>
            </CardHeader>
            <CardContent>
              <TrendLineChart data={trendData} candidates={trendCandidates} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Polls Tab */}
        <TabsContent value="polls">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Todas as Pesquisas ({polls.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Base de dados exploravel — pesquisas registradas no TSE
              </p>
            </CardHeader>
            <CardContent>
              <PollTable polls={pollTableData} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Institutes Tab */}
        <TabsContent value="institutes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Ranking de Institutos
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Confiabilidade baseada em historico de acerto — quem erra mais, quem acerta mais
              </p>
            </CardHeader>
            <CardContent>
              <InstituteRanking data={institutes as any[]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
