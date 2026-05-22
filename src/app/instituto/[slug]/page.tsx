import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Building2,
  Award,
  TrendingUp,
  ExternalLink,
  Globe,
} from "lucide-react";

export const revalidate = 3600;

type Institute = {
  id: string;
  name: string;
  slug: string;
  reliability_score: number | null;
  methodology_default: string | null;
  website: string | null;
  description: string | null;
};

type Poll = {
  id: string;
  publication_date: string;
  fieldwork_start: string | null;
  fieldwork_end: string | null;
  sample_size: number | null;
  margin_of_error: number | null;
  methodology: string | null;
  scope: string | null;
  poll_type: string | null;
  tse_registration: string | null;
  source_url: string | null;
  round: number;
  scenario_label: string | null;
  election: { name: string; type: string; state: string | null } | null;
};

async function getInstitute(slug: string): Promise<{ institute: Institute; polls: Poll[] } | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: inst } = await sb
    .from("institutes")
    .select("id, name, slug, reliability_score, methodology_default, website, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!inst) return null;

  const { data: polls } = await sb
    .from("polls")
    .select(
      `id, publication_date, fieldwork_start, fieldwork_end, sample_size, margin_of_error,
       methodology, scope, poll_type, tse_registration, source_url, round, scenario_label,
       election:elections(name, type, state)`
    )
    .eq("institute_id", inst.id)
    .order("publication_date", { ascending: false })
    .limit(50);

  return {
    institute: inst as Institute,
    polls: ((polls ?? []) as unknown as Poll[]).map((p) => ({
      ...p,
      election: Array.isArray(p.election) ? p.election[0] : p.election,
    })),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = await getInstitute(slug);
  if (!r) return { title: "Instituto não encontrado" };
  const { institute, polls } = r;
  const pct = institute.reliability_score
    ? Math.round(institute.reliability_score * 100)
    : null;
  // template global em layout.tsx adiciona " — ElectioLab" automaticamente
  const title = `${institute.name} — Pesquisas Eleitorais 2026`;
  const description = `Histórico completo de pesquisas eleitorais do ${institute.name}${
    pct ? `. Score de acurácia ElectioLab: ${pct}%` : ""
  }. ${polls.length} pesquisas indexadas até hoje.`;
  return {
    title,
    description,
    alternates: { canonical: `https://electiolab.com/instituto/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://electiolab.com/instituto/${slug}`,
      images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function InstitutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await getInstitute(slug);
  if (!r) notFound();
  const { institute, polls } = r;

  const reliabilityPct = institute.reliability_score
    ? Math.round(institute.reliability_score * 100)
    : null;

  // FAQs dinâmicas — geradas a partir do nome do instituto + dados disponíveis.
  // Atinge queries long-tail tipo "Quaest é confiável?", "Quem é o Datafolha?".
  const lastPoll = polls[0];
  const lastPollDate = lastPoll?.publication_date
    ? new Date(lastPoll.publication_date).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : null;

  const FAQS: { q: string; a: string }[] = [
    {
      q: `O ${institute.name} é confiável?`,
      a: reliabilityPct
        ? `O ${institute.name} tem score de acurácia ElectioLab de ${reliabilityPct}%, calculado pelo desvio histórico entre suas projeções pré-eleitorais e o resultado oficial publicado pelo TSE. Quanto mais próximo de 100%, menor a diferença média entre o número final da pesquisa e o resultado real da urna.`
        : `O score de acurácia do ${institute.name} ainda não foi calculado pelo ElectioLab — depende de o instituto ter histórico de pesquisas comparáveis a resultados oficiais TSE em eleições anteriores.`,
    },
    {
      q: `Quantas pesquisas o ${institute.name} já publicou?`,
      a: `${polls.length} ${polls.length === 1 ? "pesquisa indexada" : "pesquisas indexadas"} no ElectioLab até hoje${
        lastPollDate ? `, sendo a mais recente publicada em ${lastPollDate}` : ""
      }. Todas as pesquisas listadas aqui possuem registro no PesqEle, sistema oficial do TSE.`,
    },
    ...(institute.methodology_default
      ? [
          {
            q: `Qual a metodologia padrão usada pelo ${institute.name}?`,
            a: `O ${institute.name} costuma usar pesquisa ${institute.methodology_default}. Metodologias diferentes carregam vieses diferentes — pesquisas presenciais alcançam camadas socioeconômicas que pesquisas online não alcançam, enquanto pesquisas telefônicas tendem a sub-representar jovens. O ElectioLab pondera cada pesquisa por metodologia ao calcular a média agregada.`,
          },
        ]
      : []),
    {
      q: `Como o ElectioLab pondera as pesquisas do ${institute.name}?`,
      a: `Cada pesquisa do ${institute.name} entra na média ponderada do ElectioLab com peso baseado em quatro fatores: (1) recência (meia-vida de 10 dias), (2) tamanho da amostra (raiz quadrada do n), (3) metodologia, e (4) histórico de acurácia do instituto. O score de acurácia funciona como multiplicador final — institutos com menor erro vs resultado oficial ganham mais peso.`,
    },
  ];

  const orgUrl = institute.website ?? `https://electiolab.com/instituto/${slug}`;

  // JSON-LD: Article (wrapping) + Organization (com aggregateRating quando disponível)
  //          + FAQPage + BreadcrumbList
  // aggregateRating usa reliability_score normalizado pra escala 0-100 (ratingValue)
  // com bestRating=100/worstRating=0, refletindo histórico vs TSE.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `https://electiolab.com/instituto/${slug}#article`,
        headline: `${institute.name} — Histórico de Pesquisas Eleitorais`,
        description:
          institute.description ??
          `Histórico completo de pesquisas do ${institute.name}, score de acurácia ElectioLab e metodologia.`,
        url: `https://electiolab.com/instituto/${slug}`,
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        mainEntityOfPage: `https://electiolab.com/instituto/${slug}`,
        about: { "@id": `https://electiolab.com/instituto/${slug}#org` },
        dateModified: lastPoll?.publication_date ?? new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
      },
      {
        "@type": "Organization",
        "@id": `https://electiolab.com/instituto/${slug}#org`,
        name: institute.name,
        description:
          institute.description ?? `Instituto de pesquisa eleitoral brasileiro`,
        url: orgUrl,
        ...(institute.website ? { sameAs: [institute.website] } : {}),
        nationality: { "@type": "Country", name: "Brasil" },
        ...(reliabilityPct !== null
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: reliabilityPct,
                bestRating: 100,
                worstRating: 0,
                ratingCount: polls.length,
                reviewCount: polls.length,
                description: `Score de acurácia ElectioLab calculado por desvio histórico vs. resultado oficial TSE em ${polls.length} pesquisas.`,
              },
            }
          : {}),
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
          { "@type": "ListItem", position: 3, name: institute.name },
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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
          <Link
            href="/institutos"
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 font-medium"
          >
            Todos os institutos
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <section>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <Building2 className="h-3.5 w-3.5" />
            <span>Instituto de Pesquisa</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{institute.name}</h1>
          {institute.description && (
            <p className="text-base text-muted-foreground max-w-prose leading-relaxed">
              {institute.description}
            </p>
          )}

          {/* Stats card */}
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {reliabilityPct !== null && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  <Award className="h-3.5 w-3.5" /> Score de acurácia
                </div>
                <p className="text-3xl font-mono font-bold tabular-nums">{reliabilityPct}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Calculado por desvio histórico vs. resultado oficial TSE
                </p>
              </div>
            )}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                <TrendingUp className="h-3.5 w-3.5" /> Pesquisas indexadas
              </div>
              <p className="text-3xl font-mono font-bold tabular-nums">{polls.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total no ElectioLab</p>
            </div>
            {institute.methodology_default && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  Metodologia padrão
                </div>
                <p className="text-base font-semibold capitalize">
                  {institute.methodology_default}
                </p>
                {institute.website && (
                  <a
                    href={institute.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                  >
                    <Globe className="h-3 w-3" />
                    Site oficial
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Histórico de pesquisas */}
        {polls.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Histórico de pesquisas
            </h2>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="hidden md:flex items-center px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                <span className="w-24">Data</span>
                <span className="flex-1">Eleição</span>
                <span className="w-20 text-right">Amostra</span>
                <span className="w-16 text-right">Margem</span>
                <span className="w-24 text-right">TSE</span>
              </div>
              {polls.slice(0, 30).map((p, i) => (
                <div
                  key={p.id}
                  className={`flex flex-col md:flex-row md:items-center px-3 py-2.5 text-sm border-b border-border/30 last:border-0 ${
                    i % 2 ? "bg-muted/15" : ""
                  }`}
                >
                  <span className="md:w-24 font-mono tabular-nums text-xs text-muted-foreground">
                    {p.publication_date
                      ? new Date(p.publication_date).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                  <span className="flex-1 mt-1 md:mt-0">
                    {p.election?.name ?? "—"}
                    {p.round === 2 && p.scenario_label && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono uppercase">
                        2T · {p.scenario_label}
                      </span>
                    )}
                  </span>
                  <span className="md:w-20 md:text-right font-mono tabular-nums text-xs text-muted-foreground">
                    {p.sample_size?.toLocaleString("pt-BR") ?? "—"}
                  </span>
                  <span className="md:w-16 md:text-right font-mono tabular-nums text-xs text-muted-foreground">
                    {p.margin_of_error ? `±${p.margin_of_error}pp` : "—"}
                  </span>
                  <span className="md:w-24 md:text-right font-mono tabular-nums text-[10px] text-muted-foreground">
                    {p.tse_registration ?? "—"}
                  </span>
                </div>
              ))}
            </div>
            {polls.length > 30 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Exibindo 30 de {polls.length} pesquisas. API completa em{" "}
                <Link href="/precos" className="text-primary hover:underline">
                  electiolab.com/api
                </Link>
                .
              </p>
            )}
          </section>
        )}

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Perguntas frequentes
          </h2>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <details
                key={i}
                className="border border-border rounded-lg bg-card overflow-hidden group"
              >
                <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium hover:text-primary transition-colors list-none flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-muted-foreground text-xs shrink-0 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Footer com links cruzados */}
        <section className="rounded-lg border border-border bg-muted/20 p-6">
          <h3 className="text-base font-bold mb-2">Sobre o score de acurácia ElectioLab</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Calculamos o score de cada instituto comparando suas projeções pré-eleitorais com
            o resultado oficial publicado pelo TSE. Ponderamos por recência das eleições, tamanho
            da amostra e cargo (presidência tem mais peso). O score vai de 0 a 1 (multiplicado por 100
            na exibição).
          </p>
          <Link
            href="/sobre#metodologia"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Ver metodologia completa <ExternalLink className="h-3 w-3" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Dados: TSE · Bacen · IBGE · Câmara · Senado
        </div>
      </footer>
    </div>
  );
}
