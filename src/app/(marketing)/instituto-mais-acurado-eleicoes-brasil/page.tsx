import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Award } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Qual o instituto de pesquisa mais acurado do Brasil? Ranking 2026",
  description:
    "Datafolha, Quaest, Ipec, Atlas Intel e Paraná Pesquisas comparados pelo erro vs. resultado oficial TSE em 2018 e 2022. Score de acurácia atualizado, com metodologia transparente.",
  alternates: {
    canonical: "https://electiolab.com/instituto-mais-acurado-eleicoes-brasil",
  },
  openGraph: {
    title: "Qual o instituto de pesquisa mais acurado do Brasil?",
    description:
      "Ranking dos institutos brasileiros pelo desvio histórico vs. resultado oficial TSE.",
    url: "https://electiolab.com/instituto-mais-acurado-eleicoes-brasil",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

async function getInstitutes() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb
    .from("institutes")
    .select("id, name, slug, reliability_score")
    .not("reliability_score", "is", null)
    .order("reliability_score", { ascending: false });
  return data ?? [];
}

function buildFAQs(institutes: { name: string; reliability_score: number | null }[]) {
  // Lookup case-insensitive por substring (evita problemas com "Genial/Quaest" vs "Quaest")
  const pctOf = (needle: string): number | null => {
    const exact = institutes.find(
      (i) => i.name.toLowerCase() === needle.toLowerCase()
    );
    if (exact?.reliability_score != null) return Math.round(exact.reliability_score * 100);
    const partial = institutes.find((i) =>
      i.name.toLowerCase().includes(needle.toLowerCase())
    );
    if (partial?.reliability_score != null) return Math.round(partial.reliability_score * 100);
    return null;
  };
  const fmt = (n: number | null) => (n != null ? `${n}%` : "score em cálculo");

  // Top 5 com score válido para o ranking textual
  const top5 = institutes
    .filter((i) => i.reliability_score != null)
    .slice(0, 5)
    .map((i) => `${i.name} ${Math.round((i.reliability_score ?? 0) * 100)}%`)
    .join(", ");

  return [
    {
      q: "Qual o instituto de pesquisa mais acurado nas eleições brasileiras?",
      a: `Pelo ranking ElectioLab (média ponderada do erro absoluto vs. resultado oficial TSE em 2018 e 2022): ${top5 || "ranking sendo calculado"}.`,
    },
    {
      q: "Como é calculado o score de acurácia do instituto?",
      a: "O score é calculado pelo Erro Médio Absoluto (MAE) entre a última projeção pré-eleitoral do instituto e o resultado oficial TSE. Ponderamos eleições mais recentes (2022 mais que 2018) e cargos majoritários (presidente e governador têm peso maior que deputado).",
    },
    {
      q: "Datafolha é mais confiável que Quaest em 2026?",
      a: `Pelo histórico de erro absoluto, Datafolha (${fmt(pctOf("Datafolha"))}) tem score em comparação a Quaest (${fmt(pctOf("Quaest"))}) em eleições passadas. Mas a Quaest tem aumentado consideravelmente sua frequência de publicação em 2026, com cobertura mais granular (estados, recortes regionais).`,
    },
    {
      q: "Por que o Paraná Pesquisas tem score baixo no ranking?",
      a: `O Paraná Pesquisas (${fmt(pctOf("Paraná"))} no nosso ranking) historicamente errou mais em eleições nacionais (presidência) que em eleições estaduais. Em estados onde tem operação local consolidada (PR, SC), seu score é melhor. Em pesquisas nacionais, costuma ter desvio maior.`,
    },
    {
      q: "Atlas Intel é confiável?",
      a: `Atlas Intel (${fmt(pctOf("Atlas"))} no ranking) usa metodologia online (RDD com painéis), o que reduz custo mas tem viés conhecido em eleitorado de baixa renda. Acertou bem 2022 nas tendências, mas com erro maior em ponto absoluto que Datafolha/Ipec.`,
    },
  ];
}

export default async function InstitutoAcuradoPage() {
  const institutes = await getInstitutes();
  const top5 = institutes.slice(0, 5);
  const FAQS = buildFAQs(institutes);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Qual o instituto de pesquisa mais acurado do Brasil?",
        description:
          "Ranking ElectioLab dos institutos brasileiros pelo desvio histórico vs. resultado oficial TSE.",
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-04-29",
        dateModified: new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Institutos", item: "https://electiolab.com/institutos" },
          { "@type": "ListItem", position: 3, name: "Qual o instituto mais acurado" },
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
            href="/institutos"
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 font-medium"
          >
            Ranking completo
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        <article>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <Award className="h-3.5 w-3.5" />
            <span>Análise · Acurácia eleitoral</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Qual o instituto de pesquisa mais acurado do Brasil?
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            Brasileiros perguntam isso toda eleição. A resposta curta:{" "}
            <strong className="text-foreground">Datafolha</strong> tem o melhor histórico
            de acurácia em eleições nacionais desde 2018. Mas o ranking depende de como
            você mede — e o ElectioLab compara o desvio absoluto da última projeção
            pré-eleitoral vs. o resultado oficial publicado pelo TSE.
          </p>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Top 5 institutos por acurácia</h2>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {top5.map((i, idx) => (
                <Link
                  key={i.id}
                  href={`/instituto/${i.slug}`}
                  className="flex items-center px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <span className="w-8 font-mono text-muted-foreground tabular-nums">
                    #{idx + 1}
                  </span>
                  <span className="flex-1 font-semibold">{i.name}</span>
                  <span className="font-mono font-bold tabular-nums text-positive">
                    {Math.round((i.reliability_score ?? 0) * 100)}%
                  </span>
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Score = 100% - erro_médio_absoluto × ponderação. Eleições recentes pesam mais.{" "}
              <Link href="/sobre" className="text-primary hover:underline">
                Metodologia completa →
              </Link>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">Perguntas frequentes</h2>
            <div className="space-y-5">
              {FAQS.map((f, i) => (
                <div key={i}>
                  <h3 className="text-base font-semibold mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 pt-6 border-t border-border space-y-3">
            <h2 className="text-base font-bold">Mais informações</h2>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/institutos" className="text-primary hover:underline">
                  Ranking completo de todos os institutos
                </Link>
              </li>
              <li>
                <Link href="/instituto/datafolha" className="text-primary hover:underline">
                  Histórico de pesquisas do Datafolha
                </Link>
              </li>
              <li>
                <Link href="/instituto/quaest" className="text-primary hover:underline">
                  Histórico de pesquisas da Quaest
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Atualizado a cada nova eleição
        </div>
      </footer>
    </div>
  );
}
