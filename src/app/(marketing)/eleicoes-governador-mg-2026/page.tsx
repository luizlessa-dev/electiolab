import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

import { getLatestStateGovPoll, getStateRunoffScenarios, toRunoffTabs } from "@/lib/marketing-data";
import { StateRunoffTabs } from "@/components/state-runoff-tabs";
import { StatePollSnapshotCard } from "@/components/state-poll-snapshot";
import { buildStateRaceDataset } from "@/lib/governor-dataset";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador MG 2026 — Cleitinho vs Kalil | ElectioLab" },
  description:
    "Pesquisa para governador de Minas Gerais 2026. Cleitinho (Republicanos) lidera com mais de 28% — Metodologia ponderada.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-mg-2026" },
  openGraph: {
    title: "Pesquisas Governador MG 2026 — Cleitinho vs Kalil | ElectioLab",
    description: "Cleitinho (Republicanos) 28%+ — ElectioLab",
    url: "https://electiolab.com/eleicoes-governador-mg-2026",
  },
};

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Minas Gerais em 2026?",
    answer: "Cleitinho (Republicanos) lidera com 28%+. Alexandre Kalil (PDT) aparece em segundo com 16-20%.",
  },
  {
    question: "Quem é Cleitinho?",
    answer: "Cleitinho é o nome popular de Claudio Corrêa (Republicanos), líder conservador em Minas Gerais.",
  },
  {
    question: "Kalil pode virar a eleição?",
    answer: "Possível, mas desafiador. A distância de ~10 pontos é significativa.",
  },
  {
    question: "Quais institutos acompanham MG 2026?",
    answer: "Quaest, Real Time Big Data, Futura Inteligência e Paraná Pesquisas convergem em Cleitinho como líder.",
  },
  {
    question: "Quando é a eleição para governador de MG?",
    answer: "15 de outubro de 2026 (1º turno) e 29 de outubro (2º turno, se necessário).",
  },
];

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://electiolab.com/eleicoes-governador-mg-2026",
  "datePublished": "2026-07-28",
  "inLanguage": "pt-BR",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default async function GovernadorMG2026Page() {
  const snapshot = await getLatestStateGovPoll("MG");
  const runoffTabs = toRunoffTabs(await getStateRunoffScenarios("MG"));
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStateRaceDataset({ uf: "MG", race: "governador", url: "https://electiolab.com/eleicoes-governador-mg-2026", snapshot })) }} />
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Minas Gerais · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador MG 2026 — Cleitinho Lidera com 28%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Cleitinho (Republicanos) lidera com 28%+, enquanto Kalil (PDT) aparece em segundo com 16-20%.
          </p>
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
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Perguntas frequentes</h2>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="border border-border rounded-sm bg-card overflow-hidden group">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-3">
                  {item.question}
                  <span className="text-muted-foreground text-xs shrink-0 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Outras eleições 2026</h2>
          <div className="grid sm:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { label: "Governador SP 2026", href: "/eleicoes-governador-sp-2026" },
              { label: "Governador RJ 2026", href: "/eleicoes-governador-rj-2026" },
              { label: "Governador RS 2026", href: "/eleicoes-governador-rs-2026" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="bg-card px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-between">
                {l.label} <span className="text-primary">→</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="border border-border rounded-sm bg-card px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Dados ao vivo no Dashboard</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0">
            <ExternalLink className="h-3.5 w-3.5" /> Abrir dashboard
          </Link>
        </section>
      </main>
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">ElectioLab — Terminal de Inteligência Eleitoral</span>
        </div>
      </footer>
    </div>
  );
}
