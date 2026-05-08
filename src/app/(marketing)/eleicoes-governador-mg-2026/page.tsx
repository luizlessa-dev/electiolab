import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";
import { getLatestStateGovPoll } from "@/lib/marketing-data";
import { StatePollSnapshotCard } from "@/components/state-poll-snapshot";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador MG 2026 — Cleitinho lidera | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de Minas Gerais 2026. Cleitinho (Rep) 48%, Alexandre Kalil (PDT) 26%, Rodrigo Pacheco (PSB) 23% — Quaest abr/2026. Atualizado semanalmente.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-mg-2026" },
  openGraph: {
    title: "Pesquisas Governador MG 2026 — Cleitinho lidera | ElectioLab",
    description:
      "Cleitinho 48%, Kalil 26%, Pacheco 23% — Quaest abr/2026. Zema (atual governador) é inelegível ao 3º mandato.",
    url: "https://electiolab.com/eleicoes-governador-mg-2026",
  },
};

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Minas Gerais em 2026?",
    answer:
      "Cleitinho (Republicanos) lidera as pesquisas para governador de Minas Gerais 2026 com 48% na Genial/Quaest de abril de 2026. Alexandre Kalil (PDT, ex-prefeito de BH) aparece em segundo com 26%, e Rodrigo Pacheco (PSB, presidente do Senado) em terceiro com 23%. A vantagem de Cleitinho é confortável, mas a corrida pelo segundo lugar — vaga de eventual 2º turno — está dentro da margem de erro entre Kalil e Pacheco.",
  },
  {
    question: "Quais candidatos disputam o governo de Minas Gerais em 2026?",
    answer:
      "As pesquisas de intenção de voto para governador MG 2026 testam Cleitinho (Republicanos, atual senador por MG), Alexandre Kalil (PDT, ex-prefeito de Belo Horizonte), Rodrigo Pacheco (PSB, presidente do Senado), Mateus Simões (PSD, atual vice-governador e candidato da continuidade do governo Zema), Carlos Viana (Podemos), Gabriel Azevedo (MDB), Ben Mendes (Missão), Flávio Roscoe (PL), Maria da Consolação (PSOL), entre outros. O ElectioLab monitora todos os candidatos com registro de pesquisa no TSE.",
  },
  {
    question: "Romeu Zema disputa a reeleição ao governo de Minas Gerais?",
    answer:
      "Não. Romeu Zema (NOVO) cumpriu dois mandatos consecutivos como governador de Minas Gerais — 2019-2022 e 2023-2026 — e a Constituição brasileira veda um terceiro mandato consecutivo no mesmo cargo. Zema está articulado como pré-candidato à Presidência da República em 2026. A continuidade do projeto político do governo MG é representada por seu vice, Mateus Simões (PSD), que aparece com 4% nas pesquisas — bem abaixo de Cleitinho, que rompeu com o grupo de Zema.",
  },
  {
    question: "Como é a metodologia das pesquisas eleitorais para MG 2026?",
    answer:
      "A pesquisa mais recente é da Genial/Quaest (abr/2026), com metodologia presencial em domicílio. A Quaest teve uma das menores taxas de erro médio absoluto nas eleições de 2022 (score ElectioLab: 85%). O ElectioLab pondera cada pesquisa pelo histórico de acurácia do instituto, além de recência e tamanho da amostra, para gerar a média agregada. Pesquisas anteriores incluem Atlas Intel (mar/2026) e Futura Inteligência (mar/2026).",
  },
  {
    question: "Quando é a eleição para governador de Minas Gerais em 2026?",
    answer:
      "As eleições estaduais de 2026, incluindo o governo de Minas Gerais, ocorrem em 4 de outubro de 2026 (1º turno) e, se necessário, 25 de outubro de 2026 (2º turno). Minas Gerais é o segundo maior colégio eleitoral do Brasil, com mais de 16 milhões de eleitores, e tem forte influência no resultado nacional. O ElectioLab monitora SP, MG e RJ como os três estados com maior impacto sobre o cenário presidencial 2026.",
  },
];

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://electiolab.com/eleicoes-governador-mg-2026",
  "url": "https://electiolab.com/eleicoes-governador-mg-2026",
  "datePublished": "2026-04-01",
  "dateModified": "2026-04-23",
  "inLanguage": "pt-BR",
  "isPartOf": { "@id": "https://electiolab.com/#website" },
};

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

export default async function GovernadorMG2026Page() {
  const snapshot = await getLatestStateGovPoll("MG");
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
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
            Pesquisas Governador MG 2026 — Cleitinho lidera com 48%
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            O ElectioLab agrega todas as pesquisas eleitorais para governador de Minas Gerais 2026.
            A mais recente — Genial/Quaest, abr/2026 — aponta Cleitinho (Rep) com 48%, Alexandre Kalil (PDT)
            com 26% e Rodrigo Pacheco (PSB) com 23%. Romeu Zema, atual governador, é inelegível para um
            3º mandato consecutivo e disputa a Presidência da República.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Ver média ao vivo →
          </Link>
        </div>

        {/* Snapshot — fetch ao vivo do banco */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Última pesquisa indexada
          </h2>
          <StatePollSnapshotCard snapshot={snapshot} />
          <p className="text-xs text-muted-foreground font-mono">
            Fonte: pesquisa mais recente indexada no ElectioLab · Atualiza a cada 1h
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
