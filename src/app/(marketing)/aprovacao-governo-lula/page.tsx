import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, BookOpen } from "lucide-react";
import { getApprovalAggregate } from "@/lib/approval-data";
import { ApprovalSnapshot } from "@/components/approval-snapshot";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const revalidate = 3600;

const PAGE_URL = "https://electiolab.com/aprovacao-governo-lula";

export const metadata: Metadata = {
  title: {
    absolute: "Aprovação do governo Lula 2026 — Média das pesquisas | ElectioLab",
  },
  description:
    "Média ponderada das pesquisas de avaliação do governo Lula em 2026: aprova/desaprova e ótimo/bom/regular/ruim/péssimo, agregadas por recência, amostra e acurácia do instituto.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Aprovação do governo Lula 2026 — Média das pesquisas",
    description:
      "Aprova/desaprova e avaliação ótimo→péssimo do governo Lula, na média ponderada do ElectioLab.",
    url: PAGE_URL,
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default async function AprovacaoLulaPage() {
  const agg = await getApprovalAggregate("lula");

  const dateBR = agg?.latestDate
    ? new Date(agg.latestDate).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  // Answer-first (citável por IA) — usa dado real quando disponível.
  const answerFirst =
    agg?.binary != null
      ? `Pela média ponderada do ElectioLab${dateBR ? ` (mais recente: ${dateBR})` : ""}, o governo Lula tem ${agg.binary.aprova.value.toFixed(1)}% de aprovação e ${agg.binary.desaprova.value.toFixed(1)}% de desaprovação, com base em ${agg.pollCount} pesquisa(s) de ${agg.institutes.length} instituto(s).`
      : agg?.rating != null && agg.ratingPositive != null
        ? `Pela média ponderada do ElectioLab${dateBR ? ` (mais recente: ${dateBR})` : ""}, ${agg.ratingPositive.toFixed(1)}% avaliam o governo Lula como ótimo ou bom e ${agg.ratingNegative?.toFixed(1)}% como ruim ou péssimo.`
        : "O ElectioLab agrega as pesquisas de avaliação do governo Lula assim que são publicadas pelos institutos e registradas no TSE. Os números ponderados aparecem nesta página automaticamente — sem estimativas ou simulações.";

  const FAQ = [
    {
      q: "Qual a aprovação do governo Lula em 2026?",
      a:
        agg?.binary != null
          ? `Na média ponderada do ElectioLab, o governo Lula tem ${agg.binary.aprova.value.toFixed(1)}% de aprovação e ${agg.binary.desaprova.value.toFixed(1)}% de desaprovação${dateBR ? ` (pesquisa mais recente: ${dateBR})` : ""}. A média combina vários institutos, ponderando por recência, amostra, metodologia e acurácia histórica.`
          : "Assim que houver pesquisas de aprovação publicadas e indexadas, a média ponderada do ElectioLab aparece no topo desta página. Não publicamos números estimados.",
    },
    {
      q: "Qual a diferença entre 'aprova/desaprova' e a avaliação 'ótimo/bom/regular/ruim/péssimo'?",
      a: "São duas perguntas diferentes que institutos usam para medir avaliação de governo. 'Aprova/desaprova' é binária. A escala 'ótimo/bom/regular/ruim/péssimo' é mais granular — a aprovação positiva costuma ser lida como 'ótimo + bom'. O ElectioLab agrega cada métrica no seu próprio grupo, sem misturar as duas, e mostra as duas lado a lado.",
    },
    {
      q: "Como o ElectioLab calcula a média de aprovação?",
      a: "Com o mesmo motor da intenção de voto: cada pesquisa recebe um peso pela recência (meia-vida de 10 dias), tamanho da amostra (√n), metodologia de coleta (presencial > telefônica > online) e acurácia histórica do instituto. A média ponderada é mais estável que qualquer pesquisa isolada. Detalhes em /metodologia.",
    },
    {
      q: "Aprovação de governo é a mesma coisa que intenção de voto?",
      a: "Não. Aprovação mede a avaliação da gestão atual; intenção de voto mede em quem a pessoa votaria numa eleição. Um governo pode ter aprovação alta e, ainda assim, o titular ter intenção de voto diferente — ou nem ser candidato. As pesquisas presidenciais 2026 estão em /pesquisas-presidenciais-2026.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${PAGE_URL}#article`,
        headline: "Aprovação do governo Lula 2026 — Média das pesquisas",
        description:
          "Média ponderada das pesquisas de avaliação do governo Lula em 2026: aprova/desaprova e ótimo→péssimo.",
        url: PAGE_URL,
        mainEntityOfPage: PAGE_URL,
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-06-01",
        dateModified: agg?.latestDate ?? new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
        keywords: [
          "aprovação Lula",
          "aprovação do governo Lula 2026",
          "avaliação do governo Lula",
          "desaprovação Lula",
          "pesquisa aprovação governo",
        ],
      },
      {
        "@type": "Dataset",
        name: "Aprovação do governo Lula 2026 (média ponderada)",
        description:
          "Média ponderada das pesquisas de avaliação do governo Lula em 2026, agregadas pelo ElectioLab a partir de pesquisas registradas no TSE.",
        url: PAGE_URL,
        isAccessibleForFree: true,
        inLanguage: "pt-BR",
        creator: { "@id": "https://electiolab.com/#organization" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        license: "https://creativecommons.org/licenses/by/4.0/",
        temporalCoverage: "2026",
        variableMeasured: "Aprovação de governo (%)",
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            contentUrl: "https://electiolab.com/api/v1/approval?subject=lula",
          },
        ],
        ...(agg?.latestDate ? { dateModified: agg.latestDate } : {}),
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
          { "@type": "ListItem", position: 2, name: "Aprovação do governo Lula 2026" },
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
            Avaliação de governo · 2026
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Aprovação do governo Lula em 2026
          </h1>
          <div className="border-l-2 border-primary pl-4 py-1">
            <p className="text-base text-foreground leading-relaxed">{answerFirst}</p>
          </div>
        </section>

        {/* Snapshot */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Média ponderada · avaliação do governo
          </h2>
          <ApprovalSnapshot
            aggregate={agg}
            emptyMessage="Ainda não há pesquisas de aprovação do governo Lula indexadas para 2026. Esta página exibe a média ponderada automaticamente assim que institutos publicarem e as pesquisas forem registradas no TSE — sem números estimados."
          />
        </section>

        {/* Contexto */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Como ler a aprovação de governo</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Institutos medem a avaliação de governo de duas formas: a binária{" "}
            <strong className="text-foreground">aprova/desaprova</strong> e a escala{" "}
            <strong className="text-foreground">ótimo/bom/regular/ruim/péssimo</strong>. A leitura
            mais comum de &quot;aprovação&quot; na escala é a soma de ótimo + bom. O ElectioLab
            agrega cada métrica no seu próprio grupo comparável — nunca mistura as duas — e aplica a
            mesma ponderação da intenção de voto: recência, amostra, metodologia e acurácia do
            instituto.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Aprovação não é intenção de voto: um governo pode ter aprovação alta e o titular ter
            desempenho eleitoral diferente. Veja a corrida presidencial em{" "}
            <Link href="/pesquisas-presidenciais-2026" className="text-primary hover:underline">
              pesquisas presidenciais 2026
            </Link>{" "}
            e a metodologia em{" "}
            <Link href="/metodologia" className="text-primary hover:underline">/metodologia</Link>.
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
          <LeiaTabem current="/aprovacao-governo-lula" />
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
              { href: "/metodologia", label: "Metodologia" },
              { href: "/rejeicao-candidatos-presidente-2026", label: "Rejeição" },
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
