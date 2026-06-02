import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

import { getLatestStateGovPoll, getStateRunoffScenarios, toRunoffTabs } from "@/lib/marketing-data";
import { StateRunoffTabs } from "@/components/state-runoff-tabs";
import { StatePollSnapshotCard } from "@/components/state-poll-snapshot";
import { buildStateRaceDataset } from "@/lib/governor-dataset";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador RJ 2026 — Eduardo Paes Favorito | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do RJ 2026: Eduardo Paes 49%, Douglas Ruas 16% — Quaest abr/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-rj-2026" },
  openGraph: {
    title: "Pesquisas Governador RJ 2026 — Eduardo Paes Favorito | ElectioLab",
    description:
      "Eduardo Paes lidera com 49% — Genial/Quaest abr/2026. Cláudio Castro (atual gov, PL) decide se disputa reeleição.",
    url: "https://electiolab.com/eleicoes-governador-rj-2026",
  },
};

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Rio de Janeiro em 2026?",
    answer:
      "Eduardo Paes (PSD), atual prefeito da cidade do Rio de Janeiro, lidera com ampla vantagem as pesquisas para governador do Rio de Janeiro 2026, com 49% na Genial/Quaest de abril de 2026. Douglas Ruas (PL) aparece em segundo com 16%. A diferença de 33 pontos percentuais coloca Paes como forte favorito para sair da prefeitura e disputar o governo do estado.",
  },
  {
    question: "Eduardo Paes é o atual governador do Rio de Janeiro?",
    answer:
      "Não. Eduardo Paes é o prefeito da cidade do Rio de Janeiro, eleito em 2020 e reeleito em 2024. O atual governador do estado do Rio de Janeiro é Cláudio Castro (PL), que assumiu em 2020 (após o impeachment de Wilson Witzel) e foi eleito em 2022 com cerca de 58% dos votos no primeiro turno. Em 2026, Paes deixa a prefeitura para disputar o governo estadual e aparece como favorito nas pesquisas.",
  },
  {
    question: "Cláudio Castro disputa a reeleição em 2026?",
    answer:
      "Cláudio Castro (PL), atual governador do RJ, ainda não confirmou candidatura à reeleição em 2026. Castro pode disputar — só cumpriu um mandato eleito (2023-2026), embora tenha assumido o cargo em 2020 substituindo Wilson Witzel. Nas pesquisas atuais, Castro não aparece como candidato testado, e o nome do PL no estado é Douglas Ruas (deputado estadual), com 16% pela Genial/Quaest abr/2026.",
  },
  {
    question: "Quais candidatos aparecem nas pesquisas para governador do RJ 2026?",
    answer:
      "As pesquisas para governador RJ 2026 testam Eduardo Paes (PSD, prefeito do Rio), Douglas Ruas (PL), Ítalo Marsili (independente), Wilson Witzel (ex-governador impedido em 2021), William Siri (PSOL) e Bombeiro Rafa Luz (Missão), entre outros. A candidatura de Witzel ainda enfrenta dúvidas jurídicas pelo processo de impeachment. O ElectioLab inclui todos os nomes testados nos institutos registrados.",
  },
  {
    question: "Quais institutos fazem pesquisas para governador do RJ 2026?",
    answer:
      "Os principais institutos que acompanham o cenário eleitoral do Rio de Janeiro 2026 incluem Real Time Big Data, Datafolha, Quaest, Atlas Intel e PoderData. A Real Time Big Data é especializada em pesquisas estaduais e municipais no Rio de Janeiro e historicamente publica com frequência mensal. O ElectioLab agrega todas as pesquisas publicadas, ponderando por recência, tamanho da amostra e acurácia histórica do instituto.",
  },
  {
    question: "Quando será a eleição para governador do Rio de Janeiro em 2026?",
    answer:
      "As eleições estaduais de 2026 ocorrem em 4 de outubro de 2026 (1º turno) e 25 de outubro de 2026 (2º turno, se necessário). O Rio de Janeiro tem mais de 12 milhões de eleitores aptos e é o terceiro maior colégio eleitoral do país. A eleição estadual do RJ costuma ter forte influência do cenário nacional — a polarização presidencial tende a refletir nas corridas estaduais. O ElectioLab monitora SP, MG e RJ simultaneamente.",
  },
];

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://electiolab.com/eleicoes-governador-rj-2026",
  "url": "https://electiolab.com/eleicoes-governador-rj-2026",
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

export default async function GovernadorRJ2026Page() {
  const snapshot = await getLatestStateGovPoll("RJ");
  const runoffTabs = toRunoffTabs(await getStateRunoffScenarios("RJ"));
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ ...webPageJsonLd, dateModified: snapshot?.publication_date ?? webPageJsonLd.dateModified }) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildStateRaceDataset({ uf: "RJ", race: "governador", url: "https://electiolab.com/eleicoes-governador-rj-2026", snapshot })
          ),
        }}
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
            Governador Rio de Janeiro · Eleições 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Pesquisas Governador RJ 2026 — Eduardo Paes Lidera com Folga
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            O ElectioLab agrega todas as pesquisas eleitorais para governador do Rio de Janeiro 2026.
            A mais recente — Genial/Quaest, abr/2026 — aponta Eduardo Paes (PSD), atual prefeito do
            Rio, com 49% e Douglas Ruas (PL) com 16% no cenário estimulado de 1º turno. Cláudio
            Castro (PL), atual governador, ainda não confirmou candidatura à reeleição.
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
              { label: "Governador MG 2026", href: "/eleicoes-governador-mg-2026" },
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
