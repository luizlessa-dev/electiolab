import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { CandidatesIndex, type InitialFilters } from "./candidates-index";

export const dynamic = "force-dynamic"; // depende de searchParams

export const metadata: Metadata = {
  title: "Todos os Candidatos 2026 — Perfis Completos",
  description:
    "Lista completa dos candidatos a Presidente, Governador e Senador nas eleições 2026. Bio, partido, pesquisas, votações e patrimônio declarado.",
  alternates: { canonical: "https://electiolab.com/candidatos" },
  openGraph: {
    title: "Candidatos 2026 — ElectioLab",
    description:
      "Perfis completos de todos os candidatos nas eleições brasileiras de 2026.",
    url: "https://electiolab.com/candidatos",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

type CandidateRow = {
  id: string;
  slug: string;
  name: string;
  party: string | null;
  color: string | null;
  current_position: string | null;
  bio: string | null;
  photo_url: string | null;
  tse_last_situation: string | null;
  birth_date: string | null;
  weighted_average: number | null;
  election: { type: string; state: string | null; year: number; name: string } | null;
};

async function getAll(): Promise<CandidateRow[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb
    .from("candidates")
    .select(
      `id, slug, name, party, color, current_position, bio, photo_url, tse_last_situation, birth_date,
       election:elections!inner(type, state, year, name),
       averages:weighted_averages(weighted_average, calculated_at, scenario_label)`
    )
    .eq("is_active", true)
    .eq("election.year", 2026)
    .order("name");

  // Achata a média mais recente por candidato
  return ((data ?? []) as unknown as Array<
    CandidateRow & { averages?: Array<{ weighted_average: number; calculated_at: string; scenario_label: string | null }> }
  >)
    .filter((c) => c.slug && c.election?.type !== undefined)
    .map((c) => {
      // Filtra apenas 1T (scenario_label = null). 2T tem 1 linha por cenário
      // (par de candidatos) e não tem número único interpretável aqui — pra
      // ver 2T detalhado, ir pra página dedicada do candidato/eleição.
      const latest = (c.averages ?? [])
        .filter((a) => a.scenario_label === null)
        .slice()
        .sort((a, b) => (b.calculated_at ?? "").localeCompare(a.calculated_at ?? ""))[0];
      return {
        ...c,
        weighted_average: latest?.weighted_average ?? null,
      };
    });
}

export default async function CandidatosIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pickStr = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

  const initial: InitialFilters = {
    query: pickStr(sp.q) ?? "",
    type: (pickStr(sp.type) as InitialFilters["type"]) ?? "all",
    uf: pickStr(sp.uf) ?? "all",
    party: pickStr(sp.partido) ?? "all",
    tse: (pickStr(sp.tse) as InitialFilters["tse"]) ?? "all",
    hasBio: pickStr(sp.bio) === "1",
    hasPhoto: pickStr(sp.foto) === "1",
    sortKey: (pickStr(sp.sort) as InitialFilters["sortKey"]) ?? "name",
    sortDir: (pickStr(sp.dir) as InitialFilters["sortDir"]) ?? "asc",
    page: Math.max(1, parseInt(pickStr(sp.page) ?? "1", 10) || 1),
  };

  const all = await getAll();

  // Estatísticas pra header
  const stats = {
    total: all.length,
    presidentes: all.filter((c) => c.election?.type === "presidente").length,
    governadores: all.filter((c) => c.election?.type === "governador").length,
    senadores: all.filter((c) => c.election?.type === "senador").length,
    com_bio: all.filter((c) => c.bio).length,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: "Candidatos eleições 2026",
        description: "Lista completa de candidatos brasileiros a Presidente, Governador e Senador.",
        numberOfItems: stats.total,
        itemListElement: all.slice(0, 50).map((c, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          item: {
            "@type": "Person",
            name: c.name,
            url: `https://electiolab.com/candidato/${c.slug}`,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: "https://electiolab.com/" },
          { "@type": "ListItem", position: 2, name: "Candidatos", item: "https://electiolab.com/candidatos" },
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
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <section>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Candidatos · Eleições 2026</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Todos os candidatos 2026
          </h1>
          <p className="text-base text-muted-foreground max-w-prose">
            {stats.total} perfis ativos: {stats.presidentes} presidenciáveis,{" "}
            {stats.governadores} governadores estaduais, {stats.senadores} senadores.
            Cada perfil reúne dados oficiais TSE, votações no Senado/Câmara, patrimônio
            declarado, foto oficial e {stats.com_bio} têm biografia completa.
          </p>
        </section>

        {/* Lista interativa (filtros + grid) */}
        <CandidatesIndex candidates={all} initial={initial} />
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab — Inteligência Eleitoral · Dados: TSE · CNJ · Câmara · Senado · Bacen
        </div>
      </footer>
    </div>
  );
}
