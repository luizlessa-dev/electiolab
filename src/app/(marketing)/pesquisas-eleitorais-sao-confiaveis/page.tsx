import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, ArrowRight, CheckCircle2, BookOpen } from "lucide-react";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const metadata: Metadata = {
  title: {
    absolute: "Pesquisas eleitorais são confiáveis no Brasil? | ElectioLab",
  },
  description:
    "Pesquisas eleitorais são confiáveis quando lidas em conjunto: uma isolada erra ±2–3pp, mas a média de vários institutos é muito mais precisa. O que a história mostra e como ler sem ser enganado.",
  alternates: {
    canonical: "https://electiolab.com/pesquisas-eleitorais-sao-confiaveis",
  },
  openGraph: {
    title: "Pesquisas eleitorais são confiáveis no Brasil?",
    description:
      "Uma pesquisa isolada tem margem de erro; a média de várias é muito mais confiável. O que a história mostra e como interpretar.",
    url: "https://electiolab.com/pesquisas-eleitorais-sao-confiaveis",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const FAQ = [
  {
    q: "Pesquisas eleitorais são confiáveis no Brasil?",
    a: "Sim, com uma ressalva importante: uma pesquisa isolada tem margem de erro de ±2 a ±3 pontos percentuais e pode ser um outlier. A média ponderada de vários institutos é significativamente mais confiável do que qualquer pesquisa individual, porque cancela os erros aleatórios de cada uma. É o método usado pelo FiveThirtyEight nos EUA e pelo ElectioLab no Brasil.",
  },
  {
    q: "Por que uma pesquisa pode errar mesmo bem feita?",
    a: "Toda pesquisa entrevista uma amostra (ex.: 2.000 pessoas) para estimar a opinião de milhões. Essa amostragem carrega uma incerteza estatística — a margem de erro. Com 95% de confiança e ±3pp, um candidato medido em 40% pode estar, na verdade, entre 37% e 43%. Isso é matemática, não incompetência do instituto.",
  },
  {
    q: "A média de pesquisas é mais confiável do que uma só?",
    a: "Sim. Ao combinar várias pesquisas, os erros aleatórios de cada uma tendem a se cancelar, e o sinal real da opinião pública se destaca do ruído. O ElectioLab pondera cada pesquisa por recência, tamanho de amostra, metodologia de coleta e acurácia histórica do instituto, produzindo uma estimativa mais estável.",
  },
  {
    q: "As pesquisas acertaram a eleição de 2022?",
    a: "Em parte. No 1º turno de 2022, a maioria das pesquisas subestimou o desempenho de Jair Bolsonaro e da direita; no 2º turno, acertaram o vencedor (Lula), embora superestimando sua margem. A leitura agregada ficou mais próxima do resultado do que pesquisas isoladas. Análise por instituto em /instituto-mais-acurado-eleicoes-brasil.",
  },
  {
    q: "Como saber se uma pesquisa é séria?",
    a: "Verifique: (1) registro no TSE (PesqEle) — obrigatório por lei; (2) tamanho e tipo de amostra; (3) metodologia de coleta (presencial, telefônica, online); (4) margem de erro e nível de confiança declarados; (5) quem contratou. Pesquisas sem registro TSE ou divulgadas só em contextos polêmicos merecem desconfiança.",
  },
  {
    q: "Pesquisa eleitoral é previsão do resultado?",
    a: "Não. Pesquisa é uma fotografia do momento, não uma previsão. Ela mede a intenção de voto na data do campo — e a opinião muda até a eleição. Por isso a recência importa: o ElectioLab dá peso decrescente a pesquisas mais antigas (meia-vida de 10 dias).",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/pesquisas-eleitorais-sao-confiaveis#article",
      headline: "Pesquisas eleitorais são confiáveis no Brasil?",
      description:
        "Por que uma pesquisa isolada erra, por que a média de várias é mais confiável, e como ler pesquisas eleitorais sem ser enganado.",
      url: "https://electiolab.com/pesquisas-eleitorais-sao-confiaveis",
      mainEntityOfPage: "https://electiolab.com/pesquisas-eleitorais-sao-confiaveis",
      author: { "@id": "https://electiolab.com/sobre#founder" },
      publisher: { "@id": "https://electiolab.com/#organization" },
      datePublished: "2026-06-01",
      dateModified: new Date().toISOString().slice(0, 10),
      inLanguage: "pt-BR",
      keywords: [
        "pesquisas eleitorais são confiáveis",
        "pesquisa eleitoral confiável",
        "margem de erro pesquisa",
        "média de pesquisas",
        "pesquisas acertaram 2022",
      ],
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
        { "@type": "ListItem", position: 2, name: "Glossário", item: "https://electiolab.com/glossario-pesquisa-eleitoral" },
        { "@type": "ListItem", position: 3, name: "Pesquisas eleitorais são confiáveis?" },
      ],
    },
  ],
};

export default function PesquisasSaoConfiaveisPage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/glossario-pesquisa-eleitoral" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>Glossário</span>
          </Link>
          <Link
            href="/pesquisas-presidenciais-2026"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Ver médias →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-14">

        {/* Hero — answer-first */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <Link href="/glossario-pesquisa-eleitoral" className="hover:text-foreground transition-colors">
              Glossário de pesquisa eleitoral
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Pesquisas eleitorais são confiáveis no Brasil?
          </h1>
          <div className="border-l-2 border-primary pl-4 py-1">
            <p className="text-base text-foreground leading-relaxed">
              <strong>Resposta curta: sim, quando lidas em conjunto.</strong> Uma pesquisa isolada
              tem margem de erro de ±2 a ±3 pontos e pode ser um outlier. A média ponderada de
              vários institutos é muito mais confiável — cancela o ruído aleatório e revela a
              tendência real. Pesquisa séria é registrada no TSE e declara amostra, metodologia e
              margem de erro.
            </p>
          </div>
        </section>

        {/* Por que uma erra */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Por que uma pesquisa sozinha pode errar</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nenhuma pesquisa entrevista todos os eleitores. Ela ouve uma amostra — tipicamente
            1.500 a 3.000 pessoas — e estima a opinião de mais de 150 milhões. Essa estimativa
            carrega uma incerteza estatística inevitável, a <strong className="text-foreground">margem de erro</strong>.
            Com 95% de confiança e ±3pp, um candidato medido em 40% pode estar, na realidade, entre
            37% e 43%. Não é falha do instituto: é a matemática da amostragem.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Some a isso diferenças de metodologia (presencial, telefônica ou online), de ponderação
            demográfica e de período de campo, e fica claro por que dois institutos podem divergir
            na mesma semana sem que nenhum esteja &quot;errado&quot;. Detalhamos isso em{" "}
            <Link href="/por-que-institutos-dao-numeros-diferentes" className="text-primary hover:underline">
              por que institutos dão números diferentes
            </Link>.
          </p>
        </section>

        {/* Por que a média é confiável */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Por que a média de várias é confiável</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Quando você combina muitas pesquisas, os erros aleatórios de cada uma tendem a se
            cancelar e o sinal real se destaca do ruído. O ElectioLab não trata todas as pesquisas
            igualmente: pondera cada uma por quatro fatores.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden text-xs text-center">
            {[
              { label: "Recência", note: "Pesquisa recente pesa mais (meia-vida 10 dias)" },
              { label: "Amostra", note: "Mais entrevistados, mais peso (√n)" },
              { label: "Metodologia", note: "Presencial > telefônica > online" },
              { label: "Acurácia", note: "Quem acertou no passado pesa mais" },
            ].map((r) => (
              <div key={r.label} className="bg-card px-3 py-3 space-y-1">
                <p className="font-bold text-foreground font-mono">{r.label}</p>
                <p className="text-muted-foreground leading-snug">{r.note}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Documentação completa em{" "}
            <Link href="/metodologia" className="text-primary hover:underline">/metodologia</Link>.
          </p>
        </section>

        {/* O que 2022 ensinou */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">O que a eleição de 2022 ensinou</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            2022 foi um teste duro. No 1º turno, boa parte das pesquisas subestimou o desempenho de
            Jair Bolsonaro e dos candidatos de direita — um erro reconhecido e estudado pelos
            próprios institutos. No 2º turno, as pesquisas acertaram o vencedor (Lula), embora
            tendessem a superestimar sua margem.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A lição não é &quot;pesquisa não presta&quot;, e sim: <strong className="text-foreground">leia
            a tendência agregada, não o número de uma pesquisa só</strong>, e prefira institutos com
            bom histórico de acerto. É exatamente o que o ranking de{" "}
            <Link href="/instituto-mais-acurado-eleicoes-brasil" className="text-primary hover:underline">
              acurácia histórica
            </Link>{" "}
            e a média ponderada do ElectioLab fazem.
          </p>
        </section>

        {/* Checklist */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold tracking-tight">Como saber se uma pesquisa é séria</h2>
          <div className="space-y-3">
            {[
              "Tem registro no TSE (PesqEle) — obrigatório por lei para divulgação.",
              "Declara o tamanho e o tipo de amostra (presencial, telefônica ou online).",
              "Informa a margem de erro e o nível de confiança (geralmente 95%).",
              "Diz quem contratou e pagou a pesquisa.",
              "Aparece em mais de um veículo, não só num contexto polêmico isolado.",
            ].map((item) => (
              <div key={item} className="flex gap-3 items-start">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
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

        {/* CTA */}
        <section className="text-center space-y-4 pb-2">
          <p className="text-sm text-muted-foreground">
            A forma mais confiável de ler pesquisas é pela média ponderada de todas elas.
          </p>
          <Link
            href="/pesquisas-presidenciais-2026"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Ver médias presidenciais 2026 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-4">
          <LeiaTabem current="/pesquisas-eleitorais-sao-confiaveis" />
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
              { href: "/glossario-pesquisa-eleitoral", label: "Glossário" },
              { href: "/metodologia", label: "Metodologia" },
              { href: "/instituto-mais-acurado-eleicoes-brasil", label: "Acurácia" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
