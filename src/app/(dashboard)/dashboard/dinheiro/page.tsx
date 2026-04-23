import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getElections, getCandidates } from "@/lib/queries";
import { DollarSign } from "lucide-react";

export default async function DinheiroPage() {
  const elections = await getElections();
  const election = elections.find((e: any) => e.year === 2022 && e.round === 1) ?? elections[0];
  if (!election) return <p className="font-mono text-xs text-muted-foreground">NO DATA</p>;

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

      {/* Digital Ads */}
      <Card className="border-border">
        <CardHeader className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Propaganda Digital — Meta Ad Library
            </CardTitle>
            <span className="px-1.5 py-0.5 text-xs font-mono uppercase tracking-wider bg-warning/15 text-warning border border-warning/30 rounded-sm">
              Integracao Pendente
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-3 py-3">
          <div className="grid md:grid-cols-3 gap-2">
            {[
              { title: "Facebook Ads", desc: "Gastos, impressoes e alcance por regiao" },
              { title: "Instagram Ads", desc: "Dados demograficos: idade, genero, estado" },
              { title: "Analise Cruzada", desc: "Correlacao gasto digital vs pesquisas" },
            ].map((item) => (
              <div key={item.title} className="px-3 py-2 rounded-sm border border-border bg-muted/20">
                <p className="text-xs font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-2">
            Configure META_ACCESS_TOKEN para ativar ingestao automatica.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
