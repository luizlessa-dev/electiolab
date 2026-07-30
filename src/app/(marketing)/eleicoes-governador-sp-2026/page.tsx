import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

import { getLatestStateGovPoll, getStateRunoffScenarios, toRunoffTabs } from "@/lib/marketing-data";
import { StateRunoffTabs } from "@/components/state-runoff-tabs";
import { StatePollSnapshotCard } from "@/components/state-poll-snapshot";
import { buildStateRaceDataset } from "@/lib/governor-dataset";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador SP 2026 — Tarcísio vs Haddad | ElectioLab" },
  description:
    "Pesquisa Datafolha para governador de São Paulo 2026. Tarcísio de Freitas (Republicanos) 46%, Fernando Haddad (PT) 30% — Metodologia ponderada por acurácia.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-sp-2026" },
  openGraph: {
    title: "Pesquisas Governador SP 2026 — Tarcísio vs Haddad | ElectioLab",
    description: "Tarcísio (Republicanos) 46%, Haddad (PT) 30% — Datafolha jul/2026.",
    url: "https://electiolab.com/eleicoes-governador-sp-2026",
  },
};

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de São Paulo em 2026?",
    answer: "Tarcísio de Freitas (Republicanos) lidera as pesquisas para governador de São Paulo 2026 com 46% no levantamento Datafolha (1–3 jul/2026, 1.608 entrevistas, ±2 pp). O ex-ministro Fernando Haddad (PT) aparece em segundo com 30%. A diferença de 16 pontos coloca Tarcísio como favorito à reeleição, com margem robusta mesmo em cenários de segundo turno.",
  },
  {
    question: "Quem é Tarcísio de Freitas e por que lidera em SP?",
    answer: "Tarcísio de Freitas é o governador em exercício de São Paulo desde 2022 e ex-Ministro da Infraestrutura do governo Bolsonaro. Engenheiro de formação, sua gestão enfatizou segurança pública e concessões de infraestrutura. Sua liderança nas pesquisas reflete consolidação da base de direita/centro-direita em SP, aliada à economia em alta e redução do desemprego. O eleitorado paulista tende a castigar mudanças abruptas de governo, favorecendo a continuidade.",
  },
  {
    question: "Fernando Haddad pode virar a eleição em SP?",
    answer: "Possível, mas desafiador. Haddad, ex-prefeito de SP (2013–2017) e ex-ministro da Fazenda, conta com o apoio do presidente Lula e da máquina federal. Porém, enfrenta rejeição alta (47% diz que não votaria nele sob nenhuma circunstância). A estratégia de Haddad passa por recuperar voto do interior paulista e consolidar apoio urbano progressista, mas a diferença de 16 pontos atual é significativa.",
  },
  {
    question: "Quais institutos acompanham a eleição em SP 2026?",
    answer: "Os institutos que publicaram pesquisas para governador de SP 2026 incluem: Datafolha (jul/2026), Quaest (ago/2025), Atlas, Paraná Pesquisas e Real Time Big Data. Todos apontam Tarcísio na liderança, com variações de 1–3 pontos entre institutos. O ElectioLab pondera cada pesquisa pelo histórico de acurácia — Datafolha historicamente erra menos em SP, recebendo maior peso na média agregada.",
  },
  {
    question: "Quando é a eleição para governador de SP em 2026?",
    answer: "A eleição para governador de São Paulo ocorre em 15 de outubro de 2026 (1º turno) e 29 de outubro (2º turno, se necessário). SP é o maior colégio eleitoral do Brasil, com mais de 35 milhões de eleitores. O resultado paulista tem impacto direto no desempenho nacional de qualquer candidato à presidência em 2026.",
  },
];

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://electiolab.com/eleicoes-governador-sp-2026",
  "url": "https://electiolab.com/eleicoes-governador-sp-2026",
  "datePublished": "2026-07-28",
  "dateModified": "2026-07-28",
  "inLanguage": "pt-BR",
  "isPartOf": { "@id": "https://electiolab.com/#website" },
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

export default async function GovernadorSP2026Page() {
  const snapshot = await getLatestStateGovPoll("SP");
  const runoffTabs = toRunoffTabs(await getStateRunoffScenarios("SP"));
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ ...webPageJsonLd, dateModified: snapshot?.publication_date ?? webPageJsonLd.dateModified }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStateRaceDataset({ uf: "SP", race: "governador", url: "https://electiolab.com/eleicoes-governador-sp-2026", snapshot })) }} />
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador São Paulo · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador SP 2026 — Tarcísio Lidera com 46%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            O ElectioLab agrega todas as pesquisas para governador de São Paulo 2026. Datafolha (1–3 jul/2026, 1.608 entrevistas, ±2 pp) aponta
            Tarcísio de Freitas (Republicanos) com 46% e Fernando Haddad (PT) com 30%. Reeleição fortalecida para o governador em exercício.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        {/* Snapshot — fetch ao vivo do banco */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Última pesquisa indexada
          </h2>
          <StatePollSnapshotCard snapshot={snapshot} />
          {runoffTabs.length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                2º turno — cenários testados
              </h3>
              <StateRunoffTabs scenarios={runoffTabs} />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Cada aba é um confronto direto simulado pelos institutos. As percentuais não somam
                100% — o restante são indecisos, brancos e nulos, mostrado em cada aba. Cenários de
                2º turno para governador ainda têm poucas pesquisas; a atribuição (instituto e data)
                aparece em cada confronto.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground font-mono">
            Fonte: pesquisa mais recente indexada no ElectioLab · Atualiza a cada 1h
          </p>
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
              { label: "Presidente 2026", href: "/pesquisas-presidenciais-2026" },
              { label: "Governador RJ 2026", href: "/eleicoes-governador-rj-2026" },
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
            <p className="text-xs text-muted-foreground max-w-sm">Média ponderada atualizada, tendência histórica e ranking de acurácia dos institutos.</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0">
            <ExternalLink className="h-3.5 w-3.5" /> Abrir dashboard
          </Link>
        </section>
      </main>
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">ElectioLab — Terminal de Inteligência Eleitoral</span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/metodologia" className="hover:text-foreground transition-colors">Metodologia</Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
