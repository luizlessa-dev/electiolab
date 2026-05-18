import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, GitCompare, X, Plus } from "lucide-react";
import { CompareView, type ComparedCandidate } from "./compare-view";

export const dynamic = "force-dynamic";

type ElectionInfo = { type: string; state: string | null; year: number; name: string };

async function fetchCandidates(slugs: string[]): Promise<ComparedCandidate[]> {
  if (slugs.length === 0) return [];
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb
    .from("candidates")
    .select(
      `id, slug, name, full_name, party, color, current_position, photo_url,
       birth_date, profession, education, net_worth, bio, tse_last_situation,
       election:elections(type, state, year, name),
       averages:weighted_averages(weighted_average, calculated_at, polls_included, scenario_label),
       polls:poll_results(percentage, poll:polls(publication_date, institute:institutes(name)))`
    )
    .in("slug", slugs)
    .eq("is_active", true);

  // Normaliza + ordena pela ordem dos slugs no input
  type RawRow = {
    id: string;
    slug: string;
    name: string;
    full_name: string | null;
    party: string | null;
    color: string | null;
    current_position: string | null;
    photo_url: string | null;
    birth_date: string | null;
    profession: string | null;
    education: string | null;
    net_worth: number | null;
    bio: string | null;
    tse_last_situation: string | null;
    election: ElectionInfo | ElectionInfo[] | null;
    averages?: Array<{ weighted_average: number; calculated_at: string; polls_included: number; scenario_label: string | null }>;
    polls?: Array<{
      percentage: number;
      poll: { publication_date: string; institute: { name: string } | null } | null;
    }>;
  };
  const map = new Map<string, ComparedCandidate>();
  for (const raw of (data ?? []) as unknown as RawRow[]) {
    const elec = Array.isArray(raw.election) ? raw.election[0] : raw.election;
    // Filtra apenas 1T (scenario_label = null). 2T tem N linhas por cenário,
    // não dá pra reduzir a número único aqui.
    const latestAvg = (raw.averages ?? [])
      .filter((a) => a.scenario_label === null)
      .slice()
      .sort((a, b) => (b.calculated_at ?? "").localeCompare(a.calculated_at ?? ""))[0];
    const latestPoll = (raw.polls ?? [])
      .slice()
      .sort((a, b) =>
        (b.poll?.publication_date ?? "").localeCompare(a.poll?.publication_date ?? "")
      )[0];

    map.set(raw.slug, {
      id: raw.id,
      slug: raw.slug,
      name: raw.name,
      full_name: raw.full_name,
      party: raw.party,
      color: raw.color,
      current_position: raw.current_position,
      photo_url: raw.photo_url,
      birth_date: raw.birth_date,
      profession: raw.profession,
      education: raw.education,
      net_worth: raw.net_worth,
      bio: raw.bio,
      tse_last_situation: raw.tse_last_situation,
      election: elec ?? null,
      weighted_average: latestAvg?.weighted_average ?? null,
      polls_included: latestAvg?.polls_included ?? 0,
      latest_poll: latestPoll
        ? {
            percentage: latestPoll.percentage,
            date: latestPoll.poll?.publication_date ?? null,
            institute: latestPoll.poll?.institute?.name ?? null,
          }
        : null,
    });
  }

  return slugs.map((s) => map.get(s)).filter((x): x is ComparedCandidate => Boolean(x));
}

async function fetchAllSlugs(): Promise<Array<{ slug: string; name: string; party: string | null; election_type: string; election_state: string | null }>> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb
    .from("candidates")
    .select("slug, name, party, election:elections!inner(type, state, year)")
    .eq("is_active", true)
    .eq("election.year", 2026)
    .order("name");
  type OptionRow = {
    slug: string;
    name: string;
    party: string | null;
    election: { type: string; state: string | null; year: number } | { type: string; state: string | null; year: number }[] | null;
  };
  return ((data ?? []) as unknown as OptionRow[])
    .filter((c) => c.slug)
    .map((c) => {
      const elec = Array.isArray(c.election) ? c.election[0] : c.election;
      return {
        slug: c.slug,
        name: c.name,
        party: c.party,
        election_type: elec?.type ?? "",
        election_state: elec?.state ?? null,
      };
    });
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; c?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const slugs = [sp.a, sp.b, sp.c].filter((s): s is string => Boolean(s));
  const candidates = await fetchCandidates(slugs);
  const names = candidates.map((c) => c.name).join(" vs ");
  // template global em layout.tsx adiciona " — ElectioLab"
  const title = names ? `${names} — Comparativo` : "Comparar candidatos";
  const description = names
    ? `Comparativo lado a lado de ${names}: pesquisas, partidos, idade, patrimônio, situação TSE.`
    : "Compare candidatos brasileiros 2026 lado a lado: pesquisas, partidos, patrimônio, votações e Ficha Limpa.";
  return {
    title,
    description,
    alternates: {
      canonical:
        "https://electiolab.com/comparar" +
        (slugs.length ? `?${slugs.map((s, i) => `${"abc"[i]}=${s}`).join("&")}` : ""),
    },
    openGraph: {
      title,
      description,
      url: "https://electiolab.com/comparar",
      images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; c?: string }>;
}) {
  const sp = await searchParams;
  const slugs = [sp.a, sp.b, sp.c].filter((s): s is string => Boolean(s));
  const [candidates, allOptions] = await Promise.all([
    fetchCandidates(slugs),
    fetchAllSlugs(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
          <Link
            href="/candidatos"
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 font-medium"
          >
            Ver todos os candidatos
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <GitCompare className="h-3.5 w-3.5" />
            <span>Comparar candidatos</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            {candidates.length === 0
              ? "Comparativo lado a lado"
              : candidates.map((c) => c.name).join(" × ")}
          </h1>
          <p className="text-base text-muted-foreground max-w-prose">
            Compare até 3 candidatos lado a lado: pesquisas, partido, mandato atual,
            patrimônio declarado, escolaridade e situação no TSE. URL é compartilhável e
            preserva a seleção ao voltar pelo navegador.
          </p>
        </section>

        <CompareView initialCandidates={candidates} options={allOptions} />
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Dados: TSE · CNJ · Câmara · Senado · Bacen · Wikipedia
        </div>
      </footer>
    </div>
  );
}
