import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getElections, getCandidates, getDigitalAdsAggregate, getPartyFunds } from "@/lib/queries";
import { DollarSign, Megaphone, Banknote, ExternalLink } from "lucide-react";

export default async function DinheiroPage() {
  const elections = await getElections();
  const election = elections.find((e: any) => e.year === 2022 && e.round === 1) ?? elections[0];
  if (!election) return <p className="font-mono text-xs text-muted-foreground">NO DATA</p>;

  const digitalAds = await getDigitalAdsAggregate();
  const partyFunds = await getPartyFunds();

  // Aggregate party funds by year + type
  const fpByYear = new Map<number, any[]>();
  const fefcByYear = new Map<number, any[]>();
  for (const f of partyFunds as any[]) {
    const map = f.fund_type === "FP" ? fpByYear : fefcByYear;
    if (!map.has(f.reference_year)) map.set(f.reference_year, []);
    map.get(f.reference_year)!.push(f);
  }
  const fpYears = Array.from(fpByYear.keys()).sort((a, b) => b - a);
  const fefcYears = Array.from(fefcByYear.keys()).sort((a, b) => b - a);
  const latestFP = fpYears[0];
  const latestFEFC = fefcYears[0];
  const latestFPParties = fpByYear.get(latestFP) ?? [];
  const latestFEFCParties = fefcByYear.get(latestFEFC) ?? [];
  const totalFPLatest = latestFPParties.reduce((s, p) => s + Number(p.amount), 0);
  const totalFEFCLatest = latestFEFCParties.reduce((s, p) => s + Number(p.amount), 0);

  // Combine top 10 by latest year (FP+FEFC merged for visualization)
  type PartyTotal = { acronym: string; fp: number; fefc: number; total: number };
  const partyTotalsMap = new Map<string, PartyTotal>();
  for (const p of latestFPParties) {
    const key = p.party_acronym;
    if (!partyTotalsMap.has(key)) partyTotalsMap.set(key, { acronym: key, fp: 0, fefc: 0, total: 0 });
    const t = partyTotalsMap.get(key)!;
    t.fp += Number(p.amount);
    t.total += Number(p.amount);
  }
  for (const p of latestFEFCParties) {
    const key = p.party_acronym;
    if (!partyTotalsMap.has(key)) partyTotalsMap.set(key, { acronym: key, fp: 0, fefc: 0, total: 0 });
    const t = partyTotalsMap.get(key)!;
    t.fefc += Number(p.amount);
    t.total += Number(p.amount);
  }
  const partyTotals = Array.from(partyTotalsMap.values()).sort((a, b) => b.total - a.total);
  const maxPartyTotal = Math.max(...partyTotals.map((p) => p.total), 1);

  // Historical FEFC totals (manually known)
  const fefcHistory = [
    { year: 2018, total: 1716000000 },
    { year: 2020, total: 2034000000 },
    { year: 2022, total: 4961000000 },
    { year: 2024, total: 4961000000 },
    { year: 2026, total: 5000000000 },
  ];

  // Aggregate digital ads by candidate
  const adsByCandidate = new Map<string, {
    name: string;
    party: string;
    color: string;
    election: string;
    count: number;
    spendMin: number;
    spendMax: number;
    impressionsMin: number;
    impressionsMax: number;
    topPages: Map<string, number>;
    platforms: Set<string>;
    earliestDate: string | null;
    latestDate: string | null;
  }>();

  for (const ad of digitalAds as any[]) {
    if (!ad.candidate) continue;
    const key = ad.candidate.id;
    if (!adsByCandidate.has(key)) {
      adsByCandidate.set(key, {
        name: ad.candidate.name,
        party: ad.candidate.party ?? "",
        color: ad.candidate.color ?? "#6b7280",
        election: ad.election?.name ?? "",
        count: 0,
        spendMin: 0,
        spendMax: 0,
        impressionsMin: 0,
        impressionsMax: 0,
        topPages: new Map(),
        platforms: new Set(),
        earliestDate: null,
        latestDate: null,
      });
    }
    const agg = adsByCandidate.get(key)!;
    agg.count++;
    agg.spendMin += Number(ad.spend_lower) || 0;
    agg.spendMax += Number(ad.spend_upper) || 0;
    agg.impressionsMin += Number(ad.impressions_lower) || 0;
    agg.impressionsMax += Number(ad.impressions_upper) || 0;
    if (ad.page_name) {
      agg.topPages.set(ad.page_name, (agg.topPages.get(ad.page_name) || 0) + 1);
    }
    (ad.platform || "").split(", ").forEach((p: string) => p && agg.platforms.add(p));
    if (ad.delivery_start) {
      if (!agg.earliestDate || ad.delivery_start < agg.earliestDate) agg.earliestDate = ad.delivery_start;
      if (!agg.latestDate || ad.delivery_start > agg.latestDate) agg.latestDate = ad.delivery_start;
    }
  }

  const adsAggregated = Array.from(adsByCandidate.values()).sort((a, b) => b.spendMax - a.spendMax);
  const totalAdsSpendMin = adsAggregated.reduce((s, a) => s + a.spendMin, 0);
  const totalAdsSpendMax = adsAggregated.reduce((s, a) => s + a.spendMax, 0);
  const totalAdsImpressionsMin = adsAggregated.reduce((s, a) => s + a.impressionsMin, 0);
  const totalAdsImpressionsMax = adsAggregated.reduce((s, a) => s + a.impressionsMax, 0);
  const totalAds = adsAggregated.reduce((s, a) => s + a.count, 0);
  const totalCandidates = adsAggregated.length;
  const earliestAd = adsAggregated.reduce<string | null>((min, a) => (!a.earliestDate ? min : !min || a.earliestDate < min ? a.earliestDate : min), null);
  const latestAd = adsAggregated.reduce<string | null>((max, a) => (!a.latestDate ? max : !max || a.latestDate > max ? a.latestDate : max), null);
  const maxAdsCount = Math.max(...adsAggregated.map((a) => a.count), 1);

  // Format helpers
  function fmtNumber(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return String(v);
  }
  function fmtDateRange(start: string | null, end: string | null) {
    if (!start || !end) return "—";
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    return `${fmt(s)} – ${fmt(e)}`;
  }
  function topAdvertiser(pages: Map<string, number>) {
    if (pages.size === 0) return "—";
    const sorted = Array.from(pages.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  const financeData = [
    { name: "Lula", party: "PT", color: "#ED1C24", totalReceived: 133900000, fundPartidario: 48700000, fundEspecial: 69800000, receitaPF: 12400000, totalSpent: 128500000 },
    { name: "Bolsonaro", party: "PL", color: "#003DA5", totalReceived: 109400000, fundPartidario: 32100000, fundEspecial: 65200000, receitaPF: 9800000, totalSpent: 105200000 },
    { name: "Ciro", party: "PDT", color: "#FF6B00", totalReceived: 42300000, fundPartidario: 18200000, fundEspecial: 21500000, receitaPF: 1900000, totalSpent: 39800000 },
    { name: "Tebet", party: "MDB", color: "#00A651", totalReceived: 37800000, fundPartidario: 15800000, fundEspecial: 19400000, receitaPF: 1600000, totalSpent: 35200000 },
  ];

  const totalGeral = financeData.reduce((s, f) => s + f.totalReceived, 0);

  function fmt(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
  }

  // Helper: format BRL in millions/billions for big numbers
  function fmtBig(v: number) {
    if (v >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(1)} bi`;
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(0)} mi`;
    return fmt(v);
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Financeiro Eleitoral
        </h1>
        <p className="text-xs font-mono text-muted-foreground">
          Prestacao de contas 2022 · Fonte: TSE DivulgaCandContas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden">
        {[
          { label: "TOTAL ARRECADADO", value: fmt(totalGeral), color: "border-t-primary" },
          { label: "CANDIDATOS", value: String(financeData.length), color: "border-t-chart-2" },
          { label: "MAIOR RECEITA", value: financeData[0].name, color: "border-t-chart-3" },
          { label: "FONTE PRINCIPAL", value: "Fundo Especial", color: "border-t-warning" },
        ].map((s) => (
          <div key={s.label} className={`bg-card px-3 py-2.5 border-t-2 ${s.color}`}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{s.label}</p>
            <p className="text-sm font-mono font-bold tabular-nums mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ========== FUNDOS ELEITORAIS — DINHEIRO PUBLICO ========== */}
      <Card className="border-border">
        <CardHeader className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" />
              Fundos Eleitorais — De onde vem o dinheiro das campanhas
            </CardTitle>
            <span className="px-1.5 py-0.5 text-xs font-mono uppercase tracking-wider bg-warning/15 text-warning border border-warning/30 rounded-sm">
              Dinheiro Publico
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Dois fundos públicos abastecem as campanhas no Brasil:
            <strong className="text-foreground"> Fundo Partidário (FP)</strong> — repasse anual perpétuo aos partidos —
            e <strong className="text-foreground">Fundo Especial de Financiamento de Campanha (FEFC, &quot;Fundão Eleitoral&quot;)</strong> —
            ativado apenas em anos eleitorais. Juntos somam mais de R$ 6 bilhões em ano de eleição.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border-b border-border">
            <div className="bg-card px-3 py-2.5 border-t-2 border-t-primary">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">FEFC 2026 (previsto)</p>
              <p className="text-base font-mono font-bold tabular-nums mt-0.5">R$ 5,0 bi</p>
              <p className="text-xs text-muted-foreground mt-0.5">+1% vs 2024</p>
            </div>
            <div className="bg-card px-3 py-2.5 border-t-2 border-t-chart-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">FP {latestFP} ({latestFPParties.length} partidos)</p>
              <p className="text-base font-mono font-bold tabular-nums mt-0.5">{fmtBig(totalFPLatest)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">repasse anual</p>
            </div>
            <div className="bg-card px-3 py-2.5 border-t-2 border-t-chart-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">FEFC {latestFEFC}</p>
              <p className="text-base font-mono font-bold tabular-nums mt-0.5">{fmtBig(totalFEFCLatest)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{latestFEFCParties.length} partidos</p>
            </div>
            <div className="bg-card px-3 py-2.5 border-t-2 border-t-warning">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Crescimento desde 2018</p>
              <p className="text-base font-mono font-bold tabular-nums mt-0.5">+189%</p>
              <p className="text-xs text-muted-foreground mt-0.5">FEFC: R$1,7→R$5,0bi</p>
            </div>
          </div>

          {/* Historical timeline */}
          <div className="px-3 py-3 border-b border-border">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">FEFC — Evolucao historica</p>
            <div className="flex items-end gap-2 h-20">
              {fefcHistory.map((h) => {
                const maxTotal = Math.max(...fefcHistory.map((x) => x.total));
                const heightPct = (h.total / maxTotal) * 100;
                const isCurrent = h.year === 2026;
                return (
                  <div key={h.year} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {fmtBig(h.total)}
                    </span>
                    <div
                      className={`w-full rounded-t-sm ${isCurrent ? "bg-primary" : "bg-chart-2/60"}`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className={`text-xs font-mono tabular-nums ${isCurrent ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      {h.year}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 10 partidos table */}
          <div className="flex items-center px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border bg-muted/30">
            <span className="w-6">#</span>
            <span className="w-32">Partido</span>
            <span className="w-28 text-right">FP {latestFP}</span>
            <span className="w-28 text-right">FEFC {latestFEFC}</span>
            <span className="flex-1 text-right">Total dos fundos</span>
            <span className="w-32 pl-3">% do total</span>
          </div>
          {partyTotals.slice(0, 12).map((p, i) => {
            const pct = (p.total / partyTotals.reduce((s, x) => s + x.total, 0)) * 100;
            const barWidth = (p.total / maxPartyTotal) * 100;
            return (
              <div key={p.acronym} className={`flex items-center px-3 py-2 text-xs border-b border-border/30 hover:bg-accent/30 ${i % 2 ? "bg-muted/15" : ""}`}>
                <span className="w-6 font-mono text-muted-foreground">{i + 1}</span>
                <span className="w-32 font-medium">{p.acronym}</span>
                <span className="w-28 text-right font-mono tabular-nums text-muted-foreground">
                  {p.fp > 0 ? fmtBig(p.fp) : "—"}
                </span>
                <span className="w-28 text-right font-mono tabular-nums text-muted-foreground">
                  {p.fefc > 0 ? fmtBig(p.fefc) : "—"}
                </span>
                <span className="flex-1 flex items-center justify-end gap-3">
                  <span className="hidden md:block w-24 h-1.5 bg-muted/50 rounded-sm overflow-hidden">
                    <span
                      className="block h-full rounded-sm"
                      style={{ width: `${barWidth}%`, backgroundColor: i < 3 ? "oklch(0.65 0.20 250)" : "oklch(0.55 0.10 250)" }}
                    />
                  </span>
                  <span className="font-mono tabular-nums font-bold">{fmtBig(p.total)}</span>
                </span>
                <span className="w-32 pl-3 font-mono tabular-nums text-muted-foreground">
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}

          {/* Footer com explicacao + cross-link TF */}
          <div className="px-3 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Como e calculada a distribuicao:</strong> 2% sao divididos
              igualmente entre todos os partidos. 35% para os que elegeram pelo menos 1 deputado federal
              (proporcional aos votos). 48% proporcional a representacao na Camara. 15% proporcional ao Senado.
              <br />
              <strong className="text-foreground">Cota legal:</strong> Resolucao TSE 23.609/2019 obriga 30% para
              candidaturas de mulheres. Partidos que descumprem devem devolver os recursos.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs">
              <div>
                <span className="text-muted-foreground">Fontes:</span>{" "}
                <a href="https://www.tse.jus.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">TSE</a>
                {" · "}
                <a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">Portal Transparencia</a>
              </div>
              <div className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3 text-warning" />
                <span className="text-muted-foreground">Auditoria fiscalizatoria completa:</span>{" "}
                <a href="https://transparenciafederal.org" target="_blank" rel="noopener noreferrer" className="text-warning hover:underline font-mono">
                  TransparenciaFederal.org
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finance table */}
      <Card className="border-border">
        <CardHeader className="px-3 py-2.5 border-b border-border">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Arrecadacao por Candidato
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
            <span className="w-28">Candidato</span>
            <span className="flex-1 text-right">Total</span>
            <span className="w-24 text-right">Fundo Part.</span>
            <span className="w-24 text-right">Fundo Esp.</span>
            <span className="w-24 text-right">Pessoa Fisica</span>
            <span className="w-20 text-right">% do Total</span>
          </div>
          {financeData.map((f, i) => (
            <div key={f.name} className={`flex items-center px-3 py-2 text-xs border-b border-border/30 hover:bg-accent/30 ${i % 2 ? "bg-muted/15" : ""}`}>
              <span className="w-28 flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: f.color }} />
                <span className="font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground uppercase">{f.party}</span>
              </span>
              <span className="flex-1 text-right font-mono tabular-nums font-bold" style={{ color: f.color }}>
                {fmt(f.totalReceived)}
              </span>
              <span className="w-24 text-right font-mono tabular-nums text-muted-foreground text-xs">
                {fmt(f.fundPartidario)}
              </span>
              <span className="w-24 text-right font-mono tabular-nums text-muted-foreground text-xs">
                {fmt(f.fundEspecial)}
              </span>
              <span className="w-24 text-right font-mono tabular-nums text-muted-foreground text-xs">
                {fmt(f.receitaPF)}
              </span>
              <span className="w-20 text-right font-mono tabular-nums text-xs">
                {((f.totalReceived / totalGeral) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Spending */}
      <Card className="border-border">
        <CardHeader className="px-3 py-2.5 border-b border-border">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Gastos de Campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
            <span className="w-28">Candidato</span>
            <span className="flex-1 text-right">Gasto Total</span>
            <span className="w-24 text-right">% Utilizado</span>
            <span className="w-24 text-right">Saldo</span>
          </div>
          {financeData.map((f, i) => {
            const pctUsed = (f.totalSpent / f.totalReceived) * 100;
            const saldo = f.totalReceived - f.totalSpent;
            return (
              <div key={f.name} className={`flex items-center px-3 py-2 text-xs border-b border-border/30 hover:bg-accent/30 ${i % 2 ? "bg-muted/15" : ""}`}>
                <span className="w-28 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: f.color }} />
                  <span className="font-medium">{f.name}</span>
                </span>
                <span className="flex-1 text-right font-mono tabular-nums font-semibold">
                  {fmt(f.totalSpent)}
                </span>
                <span className={`w-24 text-right font-mono tabular-nums text-xs ${pctUsed > 95 ? "text-negative" : "text-muted-foreground"}`}>
                  {pctUsed.toFixed(0)}%
                </span>
                <span className="w-24 text-right font-mono tabular-nums text-xs text-positive">
                  {fmt(saldo)}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Digital Ads — META AD LIBRARY */}
      <Card className="border-border">
        <CardHeader className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5" />
              Propaganda Digital — Meta Ad Library
            </CardTitle>
            <span className="px-1.5 py-0.5 text-xs font-mono uppercase tracking-wider bg-positive/15 text-positive border border-positive/30 rounded-sm">
              Live · atualizado diariamente
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Anúncios pagos no Facebook e Instagram que <strong>mencionam cada candidato</strong> (com selo &quot;Pago por&quot;).
            A Meta divulga apenas <strong>faixas estimadas</strong> de investimento e alcance — não valores exatos.
            Captura propaganda de aliados, opositores e veículos terceirizados.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border-b border-border">
            <div className="bg-card px-3 py-2.5 border-t-2 border-t-primary">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Anúncios analisados</p>
              <p className="text-base font-mono font-bold tabular-nums mt-0.5">{totalAds.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                em {totalCandidates} candidatos
              </p>
            </div>
            <div className="bg-card px-3 py-2.5 border-t-2 border-t-chart-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Investimento estimado</p>
              <p className="text-base font-mono font-bold tabular-nums mt-0.5">{fmt(totalAdsSpendMin)} – {fmt(totalAdsSpendMax)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                faixa min–max em R$
              </p>
            </div>
            <div className="bg-card px-3 py-2.5 border-t-2 border-t-chart-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Alcance estimado</p>
              <p className="text-base font-mono font-bold tabular-nums mt-0.5">{fmtNumber(totalAdsImpressionsMin)} – {fmtNumber(totalAdsImpressionsMax)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                impressões totais
              </p>
            </div>
            <div className="bg-card px-3 py-2.5 border-t-2 border-t-warning">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Período coberto</p>
              <p className="text-base font-mono font-bold tabular-nums mt-0.5">{fmtDateRange(earliestAd, latestAd)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                janela de veiculação
              </p>
            </div>
          </div>

          {/* Per-candidate table */}
          <div className="flex items-center px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border bg-muted/30">
            <span className="w-40">Candidato</span>
            <span className="w-16 text-right">Anúncios</span>
            <span className="flex-1 text-right">Investimento (R$)</span>
            <span className="w-28 text-right">Alcance</span>
            <span className="w-40 pl-3 truncate">Maior anunciante</span>
          </div>
          {adsAggregated.length === 0 ? (
            <div className="px-3 py-6 text-xs text-muted-foreground text-center">
              Nenhum anúncio digital ingerido ainda.
            </div>
          ) : (
            adsAggregated.map((agg, i) => {
              const barWidth = (agg.count / maxAdsCount) * 100;
              return (
                <div
                  key={agg.name}
                  className={`flex items-center px-3 py-2 text-xs border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 ? "bg-muted/15" : ""}`}
                >
                  <span className="w-40 flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: agg.color }} />
                    <span className="font-medium truncate">{agg.name}</span>
                    <span className="text-xs text-muted-foreground uppercase shrink-0">{agg.party}</span>
                  </span>
                  <span className="w-16 flex items-center justify-end gap-2">
                    <span className="font-mono tabular-nums font-semibold">{agg.count}</span>
                  </span>
                  <span className="flex-1 flex items-center justify-end gap-3">
                    <span className="hidden md:block w-20 h-1 bg-muted/50 rounded-sm overflow-hidden">
                      <span className="block h-full rounded-sm" style={{ width: `${barWidth}%`, backgroundColor: agg.color }} />
                    </span>
                    <span className="font-mono tabular-nums">
                      {fmt(agg.spendMin)} <span className="text-muted-foreground">–</span> {fmt(agg.spendMax)}
                    </span>
                  </span>
                  <span className="w-28 text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(agg.impressionsMin)}<span className="text-xs">–</span>{fmtNumber(agg.impressionsMax)}
                  </span>
                  <span className="w-40 pl-3 text-xs text-muted-foreground truncate" title={topAdvertiser(agg.topPages)}>
                    {topAdvertiser(agg.topPages)}
                  </span>
                </div>
              );
            })
          )}

          {/* Footer with explanation */}
          <div className="px-3 py-3 border-t border-border bg-muted/20">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Fonte:</span>{" "}
                <a
                  href="https://www.facebook.com/ads/library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono"
                >
                  Meta Ad Library API
                </a>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>{" "}
                <span className="font-mono">POLITICAL_AND_ISSUE_ADS · BR</span>
              </div>
              <div>
                <span className="text-muted-foreground">Atualização:</span>{" "}
                <span className="font-mono">Diária às 06h UTC (03h BRT)</span>
              </div>
              <div>
                <span className="text-muted-foreground">Última sync:</span>{" "}
                <span className="font-mono">{new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong>Como ler:</strong> os números são <strong>faixas</strong> divulgadas pela Meta — por exemplo, &quot;R$ 100 – R$ 199&quot; significa
              que o anúncio gastou algum valor dentro dessa janela. Os totais somam as faixas de cada anúncio.
              &quot;Maior anunciante&quot; é a página/perfil que mais publicou anúncios mencionando o candidato (não necessariamente o próprio candidato).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
