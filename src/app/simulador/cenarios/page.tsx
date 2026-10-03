import type { Metadata } from "next";
import Link from "next/link";
import { carregarProjecaoPesquisas, type BancadaProjecao } from "@/lib/simulador/pesquisas-projecao";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Cenários — Pesquisas de intenção de voto",
  description:
    "Projeção Electiolab da bancada da Câmara dos Deputados para cada cenário de pesquisa de intenção de voto.",
};

const fmtNum = (n: number) => n.toLocaleString("pt-BR");
const fmtPct = (vagas: number, total: number) => (total === 0 ? "—" : `${((vagas / total) * 100).toFixed(1)}%`);
const fmtData = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
};

function labelTipo(tipo: "i" | "c" | "f"): string {
  if (tipo === "f") return "Federação";
  if (tipo === "c") return "Coligação";
  return "Partido";
}

function BancadaRow({ bancada, totalVagas, maiorBancada }: { bancada: BancadaProjecao; totalVagas: number; maiorBancada: number }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center px-4 py-3 text-sm border-b border-border/30 last:border-0">
      <span className="flex-1 font-semibold">{bancada.nome}</span>
      <span className="md:w-24 text-xs text-muted-foreground">{labelTipo(bancada.tipo)}</span>
      <span className="md:w-16 md:text-right font-mono tabular-nums font-semibold">{bancada.vagas}</span>
      <span className="md:w-20 md:text-right font-mono tabular-nums text-xs text-muted-foreground">
        {fmtPct(bancada.vagas, totalVagas)}
      </span>
      <span className="md:w-32 flex items-center">
        <span
          className="h-1.5 rounded-full bg-primary/70"
          style={{ width: `${Math.max(4, (bancada.vagas / maiorBancada) * 100)}%` }}
        />
      </span>
    </div>
  );
}

function PesquisaCard({ pesquisa }: { pesquisa: Awaited<ReturnType<typeof carregarProjecaoPesquisas>>[number] }) {
  const maiorBancada = pesquisa.bancadas[0]?.vagas ?? 1;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-semibold text-sm">{pesquisa.instituto}</span>
          <span className="text-xs text-muted-foreground font-mono">{fmtData(pesquisa.data)}</span>
          {pesquisa.cenario && (
            <span className="text-xs bg-muted px-2 py-1 rounded">{pesquisa.cenario}</span>
          )}
          <span className="text-xs text-muted-foreground">Turno {pesquisa.turno}</span>
          <span className="text-xs text-muted-foreground">n={fmtNum(pesquisa.tamanhoAmostra)}</span>
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          {fmtNum(pesquisa.vagasDistribuidas)} de {fmtNum(pesquisa.totalVagas)} vagas projetadas
        </div>

        <div className="border-t border-border/30 -mx-4 px-4 mt-3 pt-3">
          <div className="hidden md:flex items-center py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-border/30 mb-2">
            <span className="flex-1">Partido / federação</span>
            <span className="md:w-24">Tipo</span>
            <span className="md:w-20 text-right">Vagas</span>
            <span className="md:w-20 text-right">% Câmara</span>
            <span className="md:w-32">&nbsp;</span>
          </div>
          {pesquisa.bancadas.map((b) => (
            <BancadaRow key={b.nome} bancada={b} totalVagas={pesquisa.totalVagas} maiorBancada={maiorBancada} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function CenariosPage() {
  const pesquisas = await carregarProjecaoPesquisas();

  if (pesquisas.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/simulador" className="text-sm font-semibold">
              ElectioLab
            </Link>
            <span className="text-xs text-muted-foreground font-mono">
              Simulador 2026
            </span>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold tracking-tight mb-4">Cenários Electiolab — Pesquisas</h1>
          <p className="text-muted-foreground">Sem pesquisas cadastradas ainda.</p>
        </main>
      </div>
    );
  }

  const intervalo = `${fmtData(pesquisas[pesquisas.length - 1].data)} a ${fmtData(pesquisas[0].data)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/simulador" className="text-sm font-semibold">
            ElectioLab
          </Link>
          <span className="text-xs text-muted-foreground font-mono">
            Simulador 2026
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Cenários Electiolab — Pesquisas de intenção de voto</h1>
          <p className="text-xs text-muted-foreground font-mono mb-2">
            Cálculo Electiolab em tempo real — projeção da bancada da Câmara dos Deputados (513 vagas)
            para cada cenário de pesquisa, utilizando QE e QP (arts. 106-109 do Código Eleitoral).
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {fmtNum(pesquisas.length)} pesquisa{pesquisas.length !== 1 ? "s" : ""} · {intervalo}
          </p>
        </section>

        <section className="space-y-4">
          {pesquisas.map((pesquisa) => (
            <PesquisaCard key={pesquisa.id} pesquisa={pesquisa} />
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          Projeção Electiolab — cálculo em tempo real, não é dado oficial do TSE
        </div>
      </footer>
    </div>
  );
}
