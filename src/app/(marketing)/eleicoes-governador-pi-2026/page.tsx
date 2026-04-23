import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador PI 2026 — Rafael Fonteles Lidera com 57% | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Piauí 2026. Rafael Fonteles (PT) 57,7%, Margarete Coelho (PP) 14% — AtlasIntel mar/2026. Favorito à reeleição.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-pi-2026" },
  openGraph: {
    title: "Pesquisas Governador PI 2026 — Rafael Fonteles Lidera com 57% | ElectioLab",
    description: "Rafael Fonteles (PT) 57,7%, Margarete Coelho (PP) 14% — AtlasIntel mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-pi-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Rafael Fonteles",     party: "PT", pct: 57.7 },
  { name: "Margarete Coelho",    party: "PP", pct: 14.0 },
  { name: "Toni Rodrigues",      party: "PL", pct:  7.9 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Piauí em 2026?",
    answer: "Rafael Fonteles (PT), atual governador do Piauí, lidera com 57,7% das intenções de voto no cenário estimulado da AtlasIntel (mar/2026). Margarete Coelho (PP) aparece em segundo com 14% e Toni Rodrigues (PL) com 7,9%. O Instituto Credibilidade (9–10 abr/2026, 402 entrevistados) apontou Fonteles com 74,9% — um dos resultados mais dominantes entre todos os governadores brasileiros.",
  },
  {
    question: "Rafael Fonteles pode ser reeleito governador do Piauí?",
    answer: "Rafael Fonteles (PT) está no 1º mandato (2023–2026) e é constitucionalmente elegível para a reeleição em 2026. Com mais de 57% nas pesquisas, lidera com folga e está na posição mais confortável entre os governadores que concorrem à reeleição no Brasil. A herança política do ex-governador Wellington Dias (PT, agora senador) e o apoio do governo Lula sustentam Fonteles no estado. Uma vitória no 1º turno é possível.",
  },
  {
    question: "Qual a tradição política do Piauí e o papel do PT?",
    answer: "O Piauí é um dos estados mais fiéis ao campo petista no Brasil. Wellington Dias governou o estado por três mandatos não consecutivos (1995–2002 e 2011–2022) e foi sucedido por Fonteles, seu secretário de fazenda. A combinação de transferências federais, programas sociais e máquina partidária consolidou o PT piauiense como um dos mais fortes da região Nordeste. Em 2022, Lula obteve 76% no estado no 2º turno.",
  },
  {
    question: "Quais institutos publicaram pesquisas para governador do Piauí 2026?",
    answer: "Os institutos com pesquisas publicadas para PI 2026 incluem: AtlasIntel (mar/2026, online), Instituto Credibilidade (abr/2026, presencial, 402 entrevistados) e pesquisas regionais. Os resultados são consistentes entre os institutos — Fonteles lidera em todos os cenários, com variações entre 57% e 74% dependendo da metodologia. O ElectioLab agrega e pondera todas as pesquisas pelo histórico de acurácia.",
  },
  {
    question: "Quando é a eleição para governador do Piauí em 2026?",
    answer: "A eleição para governador do Piauí ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O Piauí tem aproximadamente 2,5 milhões de eleitores. O estado é o 3º com menor PIB per capita do Brasil e depende fortemente de transferências federais — o que amplifica o impacto das políticas do governo federal na popularidade do governador estadual.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function GovernadorPI2026Page() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Piauí · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador PI 2026 — Fonteles 57,7% Favorito à Reeleição</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            AtlasIntel (mar/2026): Rafael Fonteles (PT) 57,7%, Margarete Coelho (PP) 14%,
            Toni Rodrigues (PL) 7,9%. Credibilidade (abr/2026) aponta 74,9% — governador
            no 1º mandato é o mais dominante entre os candidatos à reeleição no Brasil.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — AtlasIntel · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Online · ±3,0 pp</span>
              <span className="text-xs font-mono text-muted-foreground">Mar/2026</span>
            </div>
            <div className="divide-y divide-border">
              {POLL_SNAPSHOT.map((c, i) => (
                <div key={c.name} className="px-4 py-3 flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.party}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 hidden sm:block">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 65) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: AtlasIntel · Cenário estimulado, 1º turno</p>
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
              { label: "Presidente 2026",    href: "/pesquisas-presidenciais-2026" },
              { label: "Governador CE 2026", href: "/eleicoes-governador-ce-2026" },
              { label: "Governador MA 2026", href: "/eleicoes-governador-ma-2026" },
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
