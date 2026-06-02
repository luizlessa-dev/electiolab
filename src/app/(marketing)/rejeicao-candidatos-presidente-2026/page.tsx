import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, BookOpen } from "lucide-react";
import { getRejectionRanking } from "@/lib/approval-data";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const revalidate = 3600;

const PAGE_URL = "https://electiolab.com/rejeicao-candidatos-presidente-2026";

export const metadata: Metadata = {
  title: {
    absolute: "Rejeição dos candidatos a presidente 2026 — Média | ElectioLab",
  },
  description:
    "Ranking de rejeição (quem o eleitor não votaria de jeito nenhum) dos candidatos à presidência em 2026, na média ponderada do ElectioLab por recência, amostra e acurácia do instituto.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Rejeição dos candidatos a presidente 2026 — Média",
    description:
      "Quem tem mais rejeição na corrida presidencial de 2026, pela média ponderada do ElectioLab.",
    url: PAGE_URL,
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default async function RejeicaoPresidente2026Page() {
  const ranking = await getRejectionRanking("presidente", "nacional");

  const dateBR = ranking?.latestDate
    ? new Date(ranking.latestDate).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const top = ranking?.entries?.[0];
  const answerFirst = top
    ? `Pela média ponderada do ElectioLab${dateBR ? ` (mais recente: ${dateBR})` : ""}, ${top.subjectLabel} tem a maior rejeição entre os candidatos à presidência em 2026, com ${top.value.toFixed(1)}% dos eleitores afirmando que não votariam nele(a) de jeito nenhum.`
    : "O ElectioLab agrega as pesquisas de rejeição (quem o eleitor não votaria de jeito nenhum) dos candidatos à presidência assim que são publicadas e registradas no TSE. O ranking ponderado aparece nesta página automaticamente — sem números estimados.";

  const FAQ = [
    {
      q: "O que é rejeição em pesquisa eleitoral?",
      a: "Rejeição mede a parcela de eleitores que afirma que NÃO votaria em determinado candidato de jeito nenhum. É diferente da intenção de voto (em quem votaria) e da desaprovação de governo (avaliação da gestão). Rejeição alta limita o teto de crescimento de um candidato, sobretudo no 2º turno.",
    },
    {
      q: "Quem tem a maior rejeição na corrida presidencial de 2026?",
      a: top
        ? `Na média ponderada do ElectioLab, ${top.subjectLabel} aparece com a maior rejeição (${top.value.toFixed(1)}%)${dateBR ? `, segundo as pesquisas até ${dateBR}` : ""}. O ranking completo está no topo desta página e é atualizado a cada nova pesquisa.`
        : "Assim que houver pesquisas de rejeição publicadas e indexadas, o ranking ponderado aparece no topo desta página. Não publicamos números estimados.",
    },
    {
      q: "Por que a rejeição importa no 2º turno?",
      a: "Porque no 2º turno o eleitor escolhe entre dois nomes. Um candidato com rejeição muito alta tem dificuldade de atrair os votos de quem foi eliminado no 1º turno, mesmo liderando antes. Por isso rejeição costuma ser um preditor melhor do desempenho no 2º turno do que a intenção de voto do 1º.",
    },
    {
      q: "Como o ElectioLab calcula a média de rejeição?",
      a: "Com o mesmo motor da intenção de voto: cada pesquisa é ponderada por recência (meia-vida de 10 dias), tamanho da amostra (√n), metodologia de coleta e acurácia histórica do instituto. As pesquisas de rejeição são agregadas separadamente das de aprovação e de intenção de voto. Detalhes em /metodologia.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${PAGE_URL}#article`,
        headline: "Rejeição dos candidatos a presidente 2026 — Média",
        description:
          "Ranking ponderado de rejeição dos candidatos à presidência em 2026, agregado pelo ElectioLab.",
        url: PAGE_URL,
        mainEntityOfPage: PAGE_URL,
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-06-01",
        dateModified: ranking?.latestDate ?? new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
        keywords: [
          "rejeição candidatos 2026",
          "rejeição presidente 2026",
          "quem tem mais rejeição",
          "rejeição Lula Bolsonaro",
        ],
      },
      {
        "@type": "Dataset",
        name: "Rejeição dos candidatos a presidente 2026 (média ponderada)",
        description:
          "Ranking ponderado de rejeição dos candidatos à presidência em 2026, agregado pelo ElectioLab a partir de pesquisas registradas no TSE.",
        url: PAGE_URL,
        isAccessibleForFree: true,
        inLanguage: "pt-BR",
        creator: { "@id": "https://electiolab.com/#organization" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        license: "https://creativecommons.org/licenses/by/4.0/",
        temporalCoverage: "2026",
        variableMeasured: "Rejeição (%)",
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            contentUrl:
              "https://electiolab.com/api/v1/approval?metric=rejection&office=presidente",
          },
        ],
        ...(ranking?.latestDate ? { dateModified: ranking.latestDate } : {}),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Rejeição — presidente 2026" },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
          <Link
            href="/pesquisas-presidenciais-2026"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Intenção de voto →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        {/* Hero — answer-first */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            Rejeição · Presidente · 2026
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Rejeição dos candidatos a presidente em 2026
          </h1>
          <div className="border-l-2 border-primary pl-4 py-1">
            <p className="text-base text-foreground leading-relaxed">{answerFirst}</p>
          </div>
        </section>

        {/* Ranking */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Ranking de rejeição · média ponderada
          </h2>
          {ranking && ranking.entries.length > 0 ? (
            <div className="border border-border rounded-sm bg-card overflow-hidden divide-y divide-border">
              {ranking.entries.map((e, i) => (
                <div key={e.subjectLabel} className="px-4 py-3 flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    {e.subjectSlug ? (
                      <Link
                        href={`/candidato/${e.subjectSlug}`}
                        className="text-sm font-medium hover:text-primary transition-colors"
                      >
                        {e.subjectLabel}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium">{e.subjectLabel}</span>
                    )}
                  </div>
                  <div className="w-32 hidden sm:block">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-destructive"
                        style={{ width: `${Math.min(100, e.value)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">
                    {e.value.toFixed(1)}%
                  </span>
                </div>
              ))}
              <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground font-mono">
                {ranking.pollCount} pesquisa{ranking.pollCount > 1 ? "s" : ""} ·{" "}
                {ranking.institutes.length} instituto{ranking.institutes.length > 1 ? "s" : ""}
                {dateBR ? ` · mais recente ${dateBR}` : ""} · ponderação por recência, amostra,
                método e acurácia
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-sm bg-card p-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ainda não há pesquisas de rejeição presidencial indexadas para 2026. O ranking
                ponderado aparece aqui automaticamente assim que institutos publicarem e as
                pesquisas forem registradas no TSE — sem números estimados ou simulados.
              </p>
            </div>
          )}
        </section>

        {/* Contexto */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Rejeição não é o mesmo que intenção de voto</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Rejeição mede quem o eleitor <strong className="text-foreground">não votaria de jeito
            nenhum</strong> — um teto para o crescimento do candidato. Intenção de voto mede em quem
            votaria; aprovação mede a avaliação de uma gestão. As três coisas são diferentes e o
            ElectioLab agrega cada uma separadamente. Veja a intenção de voto em{" "}
            <Link href="/pesquisas-presidenciais-2026" className="text-primary hover:underline">
              pesquisas presidenciais 2026
            </Link>{" "}
            e a aprovação de governo em{" "}
            <Link href="/aprovacao-governo-lula" className="text-primary hover:underline">
              aprovação do governo Lula
            </Link>.
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Perguntas Frequentes</h2>
          <div className="space-y-5">
            {FAQ.map((item) => (
              <div key={item.q} className="space-y-1">
                <h3 className="text-sm font-semibold">{item.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-4">
          <LeiaTabem current="/rejeicao-candidatos-presidente-2026" />
        </section>
      </main>

      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-2 hover:text-foreground transition-colors">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="font-mono">ElectioLab</span>
          </Link>
          <div className="flex flex-wrap gap-4">
            {[
              { href: "/pesquisas-presidenciais-2026", label: "Presidenciais 2026" },
              { href: "/aprovacao-governo-lula", label: "Aprovação Lula" },
              { href: "/metodologia", label: "Metodologia" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
