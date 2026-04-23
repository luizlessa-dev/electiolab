import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { BarChart3, TrendingUp, Building2, FileSearch, Users, Percent, TrendingDown, Activity } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ election?: string }>;
}) {
  const params = await searchParams;
  const elections = await getElections();

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
        <p className="text-muted-foreground font-mono text-xs">NO DATA</p>
      </div>
    );
  }

  const [candidates, polls, institutes, electionResults, indicators] =
    await Promise.all([
      getCandidates(election.id),
      getPolls(election.id),
      getInstitutes(),
      getElectionResults(election.id),
      getEconomicIndicators("ipca_12m", "2022-06-01", "2026-12-31"),
    ]);

  // Calculate weighted averages
  const candidateAverages = candidates.map((c: any) => {
    const pollInputs: PollInput[] = polls
      .filter((p: any) =>
        p.results?.some((r: any) => r.candidate_id === c.id)
      )
      .map((p: any) => ({
        id: p.id,
        fieldworkEnd: new Date(p.fieldwork_end),
        sampleSize: p.sample_size,
        methodology: p.methodology,
        instituteReliability: p.institute?.reliability_score ?? 0.7,
        percentage:
          p.results.find((r: any) => r.candidate_id === c.id)?.percentage ?? 0,
      }));

    const result = calculateWeightedAverage(pollInputs, {
      referenceDate: election.election_date
        ? new Date(election.election_date)
        : new Date(),
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

  // Trend data
  const trendMap = new Map<string, Record<string, number | string>>();
  for (const poll of polls as any[]) {
    const date = poll.publication_date;
    if (!trendMap.has(date)) trendMap.set(date, { date } as any);
    const row = trendMap.get(date)!;
    for (const result of poll.results ?? []) {
      const cand = candidates.find((c: any) => c.id === result.candidate_id);
      if (cand) {
        const key = cand.name;
        if (row[key]) {
          row[key] = Math.round(((row[key] as number) + result.percentage) / 2 * 10) / 10;
        } else {
          row[key] = result.percentage;
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

  // Poll table data
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

  // Official results
  const officialResults = (electionResults as any[]).map((r) => ({
    name: r.candidate?.name ?? "—",
    percentage: Number(r.percentage),
    color: r.candidate?.color ?? "#6b7280",
  }));

  const totalSample = (polls as any[]).reduce((s, p) => s + (p.sample_size ?? 0), 0);
  const instituteCount = new Set((polls as any[]).map((p) => p.institute?.name)).size;

  const topCandidate = [...candidateAverages].sort((a, b) => b.average - a.average)[0];
  const ipca = indicators.length > 0 ? Number(indicators[indicators.length - 1]?.value).toFixed(1) : null;

  return (
    <div className="space-y-5">
      {/* ── Cabeçalho ────────────────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{election.name}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {polls.length} pesquisas analisadas &middot; {instituteCount} institutos &middot;{" "}
            <span className="text-slate-300">{totalSample.toLocaleString("pt-BR")}</span> entrevistados
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {elections.map((e: any) => (
            <a
              key={e.id}
              href={`/dashboard?election=${e.id}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                e.id === election.id
                  ? "bg-blue-600/20 text-blue-300 border-blue-600/40"
                  : "bg-transparent text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
              }`}
            >
              {e.year} — {e.round}º Turno
            </a>
          ))}
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Pesquisas",
            value: polls.length,
            sub: "na base de dados",
            icon: FileSearch,
            iconColor: "text-blue-400",
            iconBg: "bg-blue-600/10",
          },
          {
            label: "Institutos",
            value: instituteCount,
            sub: "monitorados",
            icon: Building2,
            iconColor: "text-purple-400",
            iconBg: "bg-purple-600/10",
          },
          {
            label: "Entrevistados",
            value: totalSample.toLocaleString("pt-BR"),
            sub: "total acumulado",
            icon: Users,
            iconColor: "text-cyan-400",
            iconBg: "bg-cyan-600/10",
          },
          {
            label: topCandidate ? `Líder: ${topCandidate.name}` : "Líder",
            value: topCandidate ? `${topCandidate.average}%` : "—",
            sub: topCandidate ? `${topCandidate.party} · ±${((topCandidate.confidenceHigh - topCandidate.confidenceLow) / 2).toFixed(1)}pp` : "sem dados",
            icon: TrendingUp,
            iconColor: "text-green-400",
            iconBg: "bg-green-600/10",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${s.iconBg}`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums mt-3">{s.value}</p>
            <p className="text-xs font-semibold text-slate-300 mt-0.5 truncate">{s.label}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div style={{ borderBottom: "1px solid #1e2d47" }}>
          <TabsList className="bg-transparent rounded-none p-0 h-auto gap-0">
            {[
              { value: "overview",   label: "Overview",   icon: BarChart3  },
              { value: "trend",      label: "Tendência",  icon: TrendingUp },
              { value: "polls",      label: "Pesquisas",  icon: FileSearch },
              { value: "institutes", label: "Institutos", icon: Building2  },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2.5 gap-2 transition-colors"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[3fr_2fr]">

            {/* Média ponderada */}
            <div className="rounded-xl border border-slate-800 bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Média Ponderada ElectioLab</h3>
                <span className="ml-auto text-xs text-slate-500">{polls.length} pesquisas</span>
              </div>
              <div className="px-5 py-4">
                <WeightedAverageChart data={candidateAverages} />
              </div>
            </div>

            {/* Cenário / Resultado */}
            <div className="rounded-xl border border-slate-800 bg-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">
                  {officialResults.length > 0 ? "Resultado Oficial TSE" : "Cenário Atual"}
                </h3>
              </div>
              <div className="px-5 py-4">
                {officialResults.length > 0 ? (
                  <div className="space-y-3">
                    {officialResults.map((r) => (
                      <div key={r.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className="text-sm font-medium text-slate-200">{r.name}</span>
                        </div>
                        <span className="text-lg font-bold tabular-nums" style={{ color: r.color }}>
                          {r.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {candidateAverages
                      .sort((a, b) => b.average - a.average)
                      .filter((c) => c.average > 1)
                      .map((c) => (
                        <div key={c.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            <div>
                              <span className="text-sm font-medium text-slate-200">{c.name}</span>
                              <span className="text-xs text-slate-500 ml-2">{c.party}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold tabular-nums" style={{ color: c.color }}>
                              {c.average}%
                            </span>
                            <span className="text-xs text-slate-500 ml-1">
                              ±{((c.confidenceHigh - c.confidenceLow) / 2).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500">
                  Atualizado em {new Date().toLocaleDateString("pt-BR")} · {polls.length} pesquisas
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Trend */}
        <TabsContent value="trend">
          <div className="rounded-xl border border-slate-800 bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <h3 className="text-sm font-semibold text-white">Tendência Temporal</h3>
              </div>
              <div className="flex items-center gap-4">
                {trendCandidates.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <div className="w-3 h-[2px] rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-slate-400">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-2 py-3">
              <TrendLineChart data={trendData} candidates={trendCandidates} />
            </div>
          </div>
        </TabsContent>

        {/* Polls */}
        <TabsContent value="polls">
          <div className="rounded-xl border border-slate-800 bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Base de Pesquisas</h3>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-md">
                {polls.length} registros
              </span>
            </div>
            <PollTable polls={pollTableData} />
          </div>
        </TabsContent>

        {/* Institutes */}
        <TabsContent value="institutes">
          <div className="rounded-xl border border-slate-800 bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Ranking de Institutos</h3>
              </div>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-md">
                {institutes.length} institutos
              </span>
            </div>
            <InstituteRanking data={institutes as any[]} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
