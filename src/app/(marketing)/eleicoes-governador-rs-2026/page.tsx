import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, HelpCircle, TrendingUp } from "lucide-react";
import { getLatestStateGovPoll, getStateRunoffScenarios, toRunoffTabs } from "@/lib/marketing-data";
import { StateRunoffTabs } from "@/components/state-runoff-tabs";
import { StatePollSnapshotCard } from "@/components/state-poll-snapshot";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador RS 2026 — Zucco vs Brizola | ElectioLab" },
  description: "Pesquisa para governador do Rio Grande do Sul 2026. Disputa aberta entre Zucco e Brizola.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-rs-2026" },
  openGraph: {
    title: "Pesquisas Governador RS 2026 — Zucco vs Brizola | ElectioLab",
    description: "Disputa aberta em RS",
    url: "https://electiolab.com/eleicoes-governador-rs-2026",
  },
};

const FAQ_ITEMS = [
  { question: "Quem lidera em RS 2026?", answer: "Luciano Zucco (PL) lidera com 34,2%, mas Juliana Brizola (PDT) está empatada tecnicamente." },
  { question: "Qual a margem entre eles?", answer: "Apenas 2-3 pontos, tornando a disputa muito competitiva." },
  { question: "Por que tantos indecisos em RS?", answer: "A sucessão de Leite deixa espaço aberto para múltiplos candidatos." },
];

export default async function GovernadorRS2026Page() {
  const snapshot = await getLatestStateGovPoll("RS");
  const runoffTabs = toRunoffTabs(await getStateRunoffScenarios("RS"));
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><span className="font-bold text-sm">ElectioLab</span></Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> Voltar</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Rio Grande do Sul · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador RS 2026 — Disputa Aberta</h1>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa indexada</h2>
          <StatePollSnapshotCard snapshot={snapshot} />
          {runoffTabs.length > 0 && <StateRunoffTabs scenarios={runoffTabs} />}
        </section>
        <section className="space-y-4" id="faq">
          <div className="flex items-center gap-2"><HelpCircle className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Perguntas frequentes</h2></div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="border border-border rounded-sm bg-card overflow-hidden group">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-3">{item.question}<span className="text-muted-foreground text-xs group-open:rotate-180">▾</span></summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
