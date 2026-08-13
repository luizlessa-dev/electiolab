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

const PAGE_SIZE = 24;
const YEAR = 2026;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Filtro/ordenação/paginação no servidor — antes carregava todos os
 * candidatos ativos numa query só e filtrava no client, o que funcionava
 * com ~580 linhas (só presidente/governador/senador). Com Deputado Federal/
 * Estadual/Distrital, isso passou a ser 16.909 linhas de uma vez; não dá
 * mais pra mandar tudo pro browser em toda visita.
 *
 * Exceção: sortKey="average" não dá pra paginar/ordenar direto no Postgres
 * sem uma view dedicada, porque a "média mais recente" precisa filtrar por
 * scenario_label=null e pegar o calculated_at mais novo por candidato — e só
 * ~300 candidatos (os majoritários com pesquisa) têm weighted_averages, então
 * buscar só esses via inner join e ordenar em memória continua barato.
 */
async function getPage(filters: InitialFilters): Promise<{ rows: CandidateRow[]; total: number }> {
  const client = sb();

  if (filters.sortKey === "average") {
    const { data } = await client
      .from("candidates")
      .select(
        `id, slug, name, party, color, current_position, bio, photo_url, tse_last_situation, birth_date,
         election:elections!inner(type, state, year, name),
         averages:weighted_averages!inner(weighted_average, calculated_at, scenario_label)`
      )
      .eq("is_active", true)
      .eq("election.year", YEAR);

    let rows: CandidateRow[] = ((data ?? []) as unknown as Array<
      CandidateRow & { averages?: Array<{ weighted_average: number; calculated_at: string; scenario_label: string | null }> }
    >).map(({ averages, ...c }) => {
      const latest = (averages ?? [])
        .filter((a) => a.scenario_label === null)
        .slice()
        .sort((a, b) => (b.calculated_at ?? "").localeCompare(a.calculated_at ?? ""))[0];
      return { ...c, weighted_average: latest?.weighted_average ?? null };
    });

    rows = applyFilters(rows, filters);
    rows.sort((a, b) => {
      const dirMul = filters.sortDir === "asc" ? 1 : -1;
      const aHas = a.weighted_average !== null;
      const bHas = b.weighted_average !== null;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (!aHas && !bHas) return a.name.localeCompare(b.name, "pt-BR");
      return ((a.weighted_average ?? 0) - (b.weighted_average ?? 0)) * dirMul;
    });
    const total = rows.length;
    const start = (filters.page - 1) * PAGE_SIZE;
    return { rows: rows.slice(start, start + PAGE_SIZE), total };
  }

  let query = client
    .from("candidates")
    .select(
      `id, slug, name, party, color, current_position, bio, photo_url, tse_last_situation, birth_date,
       election:elections!inner(type, state, year, name)`,
      { count: "exact" }
    )
    .eq("is_active", true)
    .eq("election.year", YEAR);

  if (filters.query) query = query.ilike("name", `%${filters.query}%`);
  if (filters.type !== "all") query = query.eq("election.type", filters.type);
  if (filters.uf !== "all") query = query.eq("election.state", filters.uf);
  if (filters.party !== "all") query = query.eq("party", filters.party);
  if (filters.tse === "apto") query = query.eq("tse_last_situation", "APTO");
  if (filters.tse === "inapto") query = query.eq("tse_last_situation", "INAPTO");
  if (filters.tse === "unknown") query = query.is("tse_last_situation", null);
  if (filters.hasBio) query = query.not("bio", "is", null);
  if (filters.hasPhoto) query = query.not("photo_url", "is", null);

  if (filters.sortKey === "age") {
    // Idade asc = nascimento mais recente primeiro; nulls sempre por último.
    query = query.order("birth_date", { ascending: filters.sortDir === "desc", nullsFirst: false });
  } else {
    query = query.order("name", { ascending: filters.sortDir === "asc" });
  }

  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(start, start + PAGE_SIZE - 1);

  const rows = ((data ?? []) as unknown as CandidateRow[]).map((c) => ({
    ...c,
    weighted_average: null,
  }));
  return { rows, total: count ?? 0 };
}

function applyFilters(rows: CandidateRow[], f: InitialFilters): CandidateRow[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (f.type !== "all" && c.election?.type !== f.type) return false;
    if (f.uf !== "all" && c.election?.state !== f.uf) return false;
    if (f.party !== "all" && c.party !== f.party) return false;
    if (f.tse === "apto" && c.tse_last_situation !== "APTO") return false;
    if (f.tse === "inapto" && c.tse_last_situation !== "INAPTO") return false;
    if (f.tse === "unknown" && c.tse_last_situation) return false;
    if (f.hasBio && !c.bio) return false;
    if (f.hasPhoto && !c.photo_url) return false;
    return true;
  });
}

async function getPartyOptions(): Promise<string[]> {
  const { data } = await sb().rpc("get_active_parties", { p_year: YEAR });
  return ((data ?? []) as Array<{ party: string }>).map((r) => r.party);
}

const TYPE_KEYS = [
  "presidente",
  "governador",
  "senador",
  "deputado_federal",
  "deputado_estadual",
  "deputado_distrital",
] as const;

async function getStats(): Promise<{ total: number; byType: Record<string, number> }> {
  const { data } = await sb().rpc("get_candidate_type_counts", { p_year: YEAR });
  const byType: Record<string, number> = {};
  let total = 0;
  for (const row of (data ?? []) as Array<{ election_type: string; total: number }>) {
    byType[row.election_type] = Number(row.total);
    total += Number(row.total);
  }
  for (const k of TYPE_KEYS) byType[k] ??= 0;
  return { total, byType };
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

  const [{ rows, total: filteredTotal }, typeStats, parties] = await Promise.all([
    getPage(initial),
    getStats(),
    getPartyOptions(),
  ]);

  const stats = {
    total: typeStats.total,
    presidentes: typeStats.byType.presidente,
    governadores: typeStats.byType.governador,
    senadores: typeStats.byType.senador,
    deputados_federais: typeStats.byType.deputado_federal,
    deputados_estaduais: typeStats.byType.deputado_estadual,
    deputados_distritais: typeStats.byType.deputado_distrital,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: "Candidatos eleições 2026",
        description:
          "Lista completa de candidatos brasileiros a Presidente, Governador, Senador, Deputado Federal, Deputado Estadual e Deputado Distrital.",
        numberOfItems: filteredTotal,
        itemListElement: rows.slice(0, 24).map((c, idx) => ({
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
            {stats.total.toLocaleString("pt-BR")} perfis ativos: {stats.presidentes} presidenciáveis,{" "}
            {stats.governadores} governadores, {stats.senadores} senadores,{" "}
            {(stats.deputados_federais + stats.deputados_estaduais + stats.deputados_distritais).toLocaleString(
              "pt-BR"
            )}{" "}
            candidatos a deputado (federal, estadual e distrital). Cada perfil reúne dados oficiais
            TSE, votações no Senado/Câmara, patrimônio declarado e foto oficial.
          </p>
        </section>

        {/* Lista interativa (filtros + grid) */}
        <CandidatesIndex
          candidates={rows}
          initial={initial}
          total={filteredTotal}
          parties={parties}
        />
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab — Inteligência Eleitoral · Dados: TSE · CNJ · Câmara · Senado · Bacen
        </div>
      </footer>
    </div>
  );
}
