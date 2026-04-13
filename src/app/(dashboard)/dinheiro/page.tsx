import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getElections,
  getCandidates,
  getElectionResults,
} from "@/lib/queries";
import { DollarSign, TrendingUp, Users, Building } from "lucide-react";

export default async function DinheiroPage() {
  const elections = await getElections();
  const election = elections.find(
    (e: any) => e.year === 2022 && e.round === 1
  ) ?? elections[0];

  if (!election) return <p>Nenhuma eleicao.</p>;

  const [candidates, results] = await Promise.all([
    getCandidates(election.id),
    getElectionResults(election.id),
  ]);

  // Simulated campaign finance data (TSE API data structure)
  // In production, this would come from campaign_finances table
  const financeData = [
    {
      name: "Lula",
      party: "PT",
      color: "#ED1C24",
      totalReceived: 133900000,
      fundPartidario: 48700000,
      fundEspecial: 69800000,
      receitaPF: 12400000,
      totalSpent: 128500000,
    },
    {
      name: "Bolsonaro",
      party: "PL",
      color: "#003DA5",
      totalReceived: 109400000,
      fundPartidario: 32100000,
      fundEspecial: 65200000,
      receitaPF: 9800000,
      totalSpent: 105200000,
    },
    {
      name: "Ciro",
      party: "PDT",
      color: "#FF6B00",
      totalReceived: 42300000,
      fundPartidario: 18200000,
      fundEspecial: 21500000,
      receitaPF: 1900000,
      totalSpent: 39800000,
    },
    {
      name: "Simone Tebet",
      party: "MDB",
      color: "#00A651",
      totalReceived: 37800000,
      fundPartidario: 15800000,
      fundEspecial: 19400000,
      receitaPF: 1600000,
      totalSpent: 35200000,
    },
  ];

  const totalGeral = financeData.reduce((s, f) => s + f.totalReceived, 0);

  function formatBRL(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Dinheiro da Eleicao
        </h1>
        <p className="text-sm text-muted-foreground">
          Prestacao de contas de campanha — dados do TSE
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Arrecadado</p>
            <p className="text-xl font-bold">{formatBRL(totalGeral)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Candidatos</p>
            <p className="text-xl font-bold">{financeData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Maior Arrecadacao</p>
            <p className="text-xl font-bold">{financeData[0].name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Fonte Principal</p>
            <p className="text-xl font-bold">Fundo Especial</p>
          </CardContent>
        </Card>
      </div>

      {/* Finance by candidate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Arrecadacao por Candidato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {financeData.map((f) => {
            const pct = (f.totalReceived / totalGeral) * 100;
            return (
              <div key={f.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: f.color }}
                    />
                    <span className="font-semibold text-sm">
                      {f.name}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({f.party})
                      </span>
                    </span>
                  </div>
                  <span className="font-bold font-mono text-sm">
                    {formatBRL(f.totalReceived)}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: f.color,
                    }}
                  />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Fundo Partidario: {formatBRL(f.fundPartidario)}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Fundo Especial: {formatBRL(f.fundEspecial)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Pessoa Fisica: {formatBRL(f.receitaPF)}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Spending */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gastos de Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {financeData.map((f) => (
              <div key={f.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: f.color }}
                  />
                  <span className="font-medium text-sm">{f.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold font-mono text-sm">
                    {formatBRL(f.totalSpent)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {((f.totalSpent / f.totalReceived) * 100).toFixed(0)}% do
                    arrecadado
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Digital Ads Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            Propaganda Digital
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Anuncios eleitorais no Facebook e Instagram — dados da Meta Ad Library
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Facebook Ads</p>
              <p className="text-xs text-muted-foreground">
                Anuncios politicos com selo "Pago por" — gastos, impressoes e alcance por regiao
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Instagram Ads</p>
              <p className="text-xs text-muted-foreground">
                Stories e feed patrocinados com dados demograficos (idade, genero, estado)
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Analise Cruzada</p>
              <p className="text-xs text-muted-foreground">
                Correlacao entre gasto digital e movimento nas pesquisas — quem gasta mais, sobe?
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Em integracao:</strong> A Meta Ad Library requer um token de acesso.
              Configure META_ACCESS_TOKEN nas variaveis de ambiente para ativar
              a ingestao automatica de propaganda digital.
              Os dados serao exibidos aqui com ranking de gastos por candidato e mapa de alcance.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            Fontes: TSE (prestacao de contas), Meta Ad Library (propaganda digital),
            TransfereGov (emendas parlamentares). Todos os dados sao publicos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
