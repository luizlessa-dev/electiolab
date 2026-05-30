import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, ArrowRight } from "lucide-react";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const metadata: Metadata = {
  title: {
    absolute: "Glossário de Pesquisa Eleitoral — Termos Explicados | ElectioLab",
  },
  description:
    "Glossário de termos técnicos de pesquisa eleitoral: margem de erro, intervalo de confiança, empate técnico, pesquisa estimulada vs espontânea, presencial vs online. Explicações claras sem jargão.",
  alternates: { canonical: "https://electiolab.com/glossario-pesquisa-eleitoral" },
  openGraph: {
    title: "Glossário de Pesquisa Eleitoral — Termos Explicados | ElectioLab",
    description:
      "Margem de erro, intervalo de confiança, empate técnico, estimulada vs espontânea, presencial vs online — explicados.",
    url: "https://electiolab.com/glossario-pesquisa-eleitoral",
    images: [
      {
        url: "https://electiolab.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ElectioLab — Glossário de pesquisa eleitoral",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

type Spoke = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  example: string;
};

const SPOKES: Spoke[] = [
  {
    slug: "margem-de-erro-pesquisa-eleitoral",
    title: "Margem de erro em pesquisa eleitoral",
    shortTitle: "Margem de erro",
    description:
      "Por que toda pesquisa tem margem (±2pp, ±3pp), como ler o intervalo de confiança 95% e quando dois candidatos estão tecnicamente empatados.",
    example: "Se Lula tem 39% ±3pp, o número real pode estar entre 36% e 42%.",
  },
  {
    slug: "empate-tecnico-pesquisa-eleitoral",
    title: "Empate técnico em pesquisa eleitoral",
    shortTitle: "Empate técnico",
    description:
      "O que significa quando os candidatos estão em 'empate técnico' — sobreposição de intervalo de confiança e como o ElectioLab classifica cenários.",
    example: "Flávio 45% × Lula 43,7% com IC ±5pp = empate técnico (intervalos se sobrepõem).",
  },
  {
    slug: "pesquisa-estimulada-vs-espontanea",
    title: "Pesquisa estimulada vs espontânea",
    shortTitle: "Estimulada vs espontânea",
    description:
      "Diferença entre pesquisa estimulada (cartão com nomes) e espontânea (entrevistado fala o nome). Por que os números são tão diferentes na mesma pesquisa.",
    example:
      "Em pesquisa espontânea, candidatos pouco conhecidos somem; em estimulada, voto útil distribui melhor.",
  },
  {
    slug: "pesquisa-presencial-vs-online",
    title: "Pesquisa presencial vs telefônica vs online",
    shortTitle: "Presencial vs online",
    description:
      "Como a metodologia de coleta (presencial, telefônica, online ou mista) muda o resultado e quais vieses cada uma carrega.",
    example:
      "Pesquisas online sub-representam idosos; presenciais alcançam melhor camadas socioeconômicas baixas.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://electiolab.com/glossario-pesquisa-eleitoral#article",
      headline: "Glossário de Pesquisa Eleitoral — Termos Explicados",
      description:
        "Glossário com termos técnicos de pesquisa eleitoral: margem de erro, empate técnico, estimulada vs espontânea, presencial vs online.",
      url: "https://electiolab.com/glossario-pesquisa-eleitoral",
      mainEntityOfPage: "https://electiolab.com/glossario-pesquisa-eleitoral",
      author: { "@id": "https://electiolab.com/sobre#founder" },
      publisher: { "@id": "https://electiolab.com/#organization" },
      datePublished: "2026-05-19",
      dateModified: new Date().toISOString().slice(0, 10),
      inLanguage: "pt-BR",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Glossário de pesquisa eleitoral",
          item: "https://electiolab.com/glossario-pesquisa-eleitoral",
        },
      ],
    },
    {
      "@type": "DefinedTermSet",
      "@id": "https://electiolab.com/glossario-pesquisa-eleitoral#glossary",
      name: "Termos de pesquisa eleitoral",
      hasDefinedTerm: SPOKES.map((s) => ({
        "@type": "DefinedTerm",
        name: s.shortTitle,
        description: s.description,
        url: `https://electiolab.com/${s.slug}`,
      })),
    },
  ],
};

export default function GlossarioPage() {
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
            href="/dashboard"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Acessar Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        {/* Hero */}
        <section>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Glossário · Pesquisa Eleitoral</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Glossário de pesquisa eleitoral
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Pesquisas eleitorais usam um vocabulário técnico que confunde o leitor casual e
            esconde informação importante sob jargão de estatística. Aqui explicamos os termos
            essenciais — margem de erro, empate técnico, estimulada vs espontânea, metodologia
            de coleta — sem jargão e com exemplos concretos das pesquisas brasileiras de 2026.
          </p>
        </section>

        {/* Lista de termos */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Termos essenciais
          </h2>
          <div className="space-y-3">
            {SPOKES.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="group block rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-bold group-hover:text-primary transition-colors">
                    {s.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  {s.description}
                </p>
                <p className="text-xs text-muted-foreground/80 font-mono leading-relaxed border-l-2 border-border pl-3">
                  Exemplo: {s.example}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Por que o ElectioLab fez esse glossário */}
        <section className="rounded-lg border border-border bg-muted/20 p-6 space-y-3">
          <h2 className="text-base font-bold">Por que um glossário?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O ElectioLab agrega pesquisas eleitorais com média ponderada por recência, amostra,
            metodologia e acurácia histórica do instituto — mas todos esses pesos só fazem sentido
            se o leitor entender o que está ponderado. Sem essa base, &quot;margem de erro&quot; vira só um
            número decorativo no rodapé do release e &quot;empate técnico&quot; vira sinônimo de empate
            literal — duas leituras erradas que matam a interpretação correta do dado.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este glossário não substitui um livro de estatística — substitui o release de pesquisa
            que você lê na manchete. O suficiente pra interpretar uma pesquisa sozinho sem precisar
            esperar comentarista traduzir.
          </p>
        </section>

        {/* Links cruzados */}
        <section className="space-y-3 pt-6 border-t border-border">
          <h2 className="text-base font-bold">Continue explorando</h2>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link href="/pesquisas-presidenciais-2026" className="text-primary hover:underline">
                Média ponderada das pesquisas presidenciais 2026
              </Link>
            </li>
            <li>
              <Link href="/quem-vence-no-segundo-turno-presidencia-2026" className="text-primary hover:underline">
                Quem vence no 2º turno? — cenários simulados
              </Link>
            </li>
            <li>
              <Link href="/institutos" className="text-primary hover:underline">
                Ranking de acurácia dos institutos brasileiros
              </Link>
            </li>
            <li>
              <Link href="/sobre" className="text-primary hover:underline">
                Como funciona a média ponderada do ElectioLab
              </Link>
            </li>
          </ul>
        </section>
      <LeiaTabem current="/glossario-pesquisa-eleitoral" />
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab — Inteligência Eleitoral · Dados: TSE · Bacen · IBGE
        </div>
      </footer>
    </div>
  );
}
