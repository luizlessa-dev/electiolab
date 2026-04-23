import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador MG 2026 — Cleitinho vs Pacheco | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de Minas Gerais 2026. Cleitinho 32,7%, Rodrigo Pacheco 28,6% — Atlas Intel mar/2026. Atualizado semanalmente.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-mg-2026" },
  openGraph: {
    title: "Pesquisas Governador MG 2026 — Cleitinho vs Pacheco | ElectioLab",
    description:
      "Média agregada das pesquisas para governador de Minas Gerais 2026. Cleitinho 32,7%, Rodrigo Pacheco 28,6% — Atlas Intel mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-mg-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Cleitinho",       party: "Republicanos", pct: 32.7 },
  { name: "Rodrigo Pacheco", party: "PSB",          pct: 28.6 },
  { name: "Alexandre Kalil", party: "PDT",          pct: 11.7 },
  { name: "Carlos Viana",    party: "Podemos",      pct:  7.5 },
  { name: "Mateus Simões",   party: "PSD",          pct:  6.2 },
  { name: "Gabriel Azevedo", party: "MDB",          pct:  4.0 },
  { name: "Ben Mendes",      party: "Missão",       pct:  3.7 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Minas Gerais em 2026?",
    answer:
      "Cleitinho (Republicanos) lidera as pesquisas para governador de Minas Gerais 2026 com 32,7% na sondagem da Atlas Intel de março de 2026 (2.195 entrevistas online, margem de erro ±2 pp). Rodrigo Pacheco (PSB) aparece em segundo com 28,6%. A diferença de 4,1 pontos percentuais indica uma corrida competitiva, dentro da margem de erro, o que torna o quadro de MG 2026 um dos mais disputados do Brasil.",
  },
  {
    question: "Quais candidatos disputam o governo de Minas Gerais em 2026?",
    answer:
      "As pesquisas de intenção de voto para governador MG 2026 testam Cleitinho (Republicanos, atual governador), Rodrigo Pacheco (PSB, presidente do Senado), Alexandre Kalil (PDT, ex-prefeito de BH), Carlos Viana (Podemos), Mateus Simões (PSD, vice-governador atual), Gabriel Azevedo (MDB) e Ben Mendes (Missão), entre outros. O ElectioLab monitora todos os candidatos com registro de pesquisa no TSE.",
  },
  {
    question: "Cleitinho disputa a reeleição ao governo de Minas Gerais?",
    answer:
      "Cleitinho (Carlos Bernardo Viana de Melo, Republicanos) foi eleito governador de Minas Gerais em 2022 com 56,18% no segundo turno. Em 2026, pode disputar a reeleição — e as pesquisas o colocam como favorito. Contudo, Minas Gerais tem tradição de viradas eleitorais tardias, e candidatos fortes como Rodrigo Pacheco tornam o cenário incerto. O ElectioLab atualiza a tendência agregada assim que novas pesquisas são publicadas.",
  },
  {
    question: "Como é a metodologia das pesquisas eleitorais para MG 2026?",
    answer:
      "A pesquisa de referência atual é da Atlas Intel (mar/2026), que usa metodologia online com painel proprietário — 2.195 entrevistas, margem de erro ±2 pp, nível de confiança 95%. A Atlas Intel teve uma das menores taxas de erro médio absoluto nas eleições de 2022. O ElectioLab pondera cada pesquisa pelo histórico de acurácia do instituto, além de recência e tamanho da amostra, para gerar a média agregada.",
  },
  {
    question: "Quando é a eleição para governador de Minas Gerais em 2026?",
    answer:
      "As eleições estaduais de 2026, incluindo o governo de Minas Gerais, ocorrem em 4 de outubro de 2026 (1º turno) e, se necessário, 25 de outubro de 2026 (2º turno). Minas Gerais é o segundo maior colégio eleitoral do Brasil, com mais de 16 milhões de eleitores, e tem forte influência no resultado nacional. O ElectioLab monitora SP, MG e RJ como os três estados com maior impacto sobre o cenário presidencial 2026.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function GovernadorMG2026Page() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">

        {/* Hero */}
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">
            Governador Minas Gerais · Eleições 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Pesquisas Governador MG 2026 — Cleitinho vs Pacheco
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            O ElectioLab agrega todas as pesquisas eleitorais para governador de Minas Gerais 2026.
            A mais recente — Atlas Intel, 25–30 mar/2026, 2.195 entrevistas online, ±2 pp —
            aponta Cleitinho com 32,7% e Rodrigo Pacheco com 28,6% no cenário estimulado de 1º turno.
            Corrida dentro da margem de erro.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Ver média ao vivo →
          </Link>
        </div>

        {/* Snapshot */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Última pesquisa — Atlas Intel · Mar/2026
          </h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">2.195 entrevistas · ±2,0 pp · online</span>
              <span className="text-xs font-mono text-muted-foreground">25–30 mar/2026</span>
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
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(c.pct / 35) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">
                      {c.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Fonte: Atlas Intel · Cenário estimulado, 1º turno
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-4" id="faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="border border-border rounded-sm bg-card overflow-hidden group"
              >
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-3">
                  {item.question}
                  <span className="text-muted-foreground text-xs shrink-0 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Links relacionados */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Outras eleições 2026
          </h2>
          <div className="grid sm:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { label: "Presidente 2026",    href: "/pesquisas-presidenciais-2026" },
              { label: "Governador SP 2026", href: "/eleicoes-governador-sp-2026" },
              { label: "Governador RJ 2026", href: "/eleicoes-governador-rj-2026" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-card px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-between"
              >
                {l.label} <span className="text-primary">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border border-border rounded-sm bg-card px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Dados ao vivo no Dashboard</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Acompanhe a média ponderada atualizada, tendência histórica e ranking de acurácia dos
              institutos em tempo real.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir dashboard
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            ElectioLab — Terminal de Inteligência Eleitoral
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/metodologia" className="hover:text-foreground transition-colors">
              Metodologia
            </Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
