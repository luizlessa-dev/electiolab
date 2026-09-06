import type { Metadata } from "next";
import Link from "next/link";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, GitCompare } from "lucide-react";
import { CompareView, type ComparedCandidate } from "./compare-view";
import { getCandidateElections } from "@/lib/queries";

export const dynamic = "force-dynamic";

type ElectionInfo = { type: string; state: string | null; year: number; name: string };
type PlanoResumo = { tema_slug: string; tema_nome: string; texto: string };

/**
 * Síntese aprovada do plano de governo por candidato, agrupada por tema.
 * Mesmo par plano_governo/plano_sintese usado em /planos/[tema] — só entra
 * síntese com status='aprovado' (revisão humana), nunca o texto bruto extraído.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPlanos(
  sb: SupabaseClient<any>,
  candidateIds: string[]
): Promise<Map<string, PlanoResumo[]>> {
  const result = new Map<string, PlanoResumo[]>();
  if (candidateIds.length === 0) return result;

  const { data: planos } = await sb
    .from("plano_governo")
    .select("id, candidato_id")
    .in("candidato_id", candidateIds);
  if (!planos?.length) return result;

  const planoToCandidato = new Map(planos.map((p) => [p.id as string, p.candidato_id as string]));
  const { data: sinteses } = await sb
    .from("plano_sintese")
    .select("plano_id, texto, tema:tema(slug, nome)")
    .in("plano_id", planos.map((p) => p.id))
    .eq("status", "aprovado");

  for (const s of sinteses ?? []) {
    const candidatoId = planoToCandidato.get(s.plano_id as string);
    const tema = Array.isArray(s.tema) ? s.tema[0] : s.tema;
    if (!candidatoId || !tema) continue;
    const lista = result.get(candidatoId) ?? [];
    lista.push({ tema_slug: tema.slug, tema_nome: tema.nome, texto: s.texto as string });
    result.set(candidatoId, lista);
  }
  return result;
}

async function fetchCandidates(slugs: string[]): Promise<ComparedCandidate[]> {
  if (slugs.length === 0) return [];
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  // Resolve cada slug pro candidate_id canônico (mesmo desempate de
  // /candidato/<slug> — sem isso, alguém com 1º e 2º turno ativos ao mesmo
  // tempo (Lula, Zema, Flávio Bolsonaro...) podia trazer 2 linhas por slug
  // aqui, e a última da resposta do Supabase "vencia" por acidente).
  const electionsBySlug = await Promise.all(slugs.map((s) => getCandidateElections(s)));
  const candidateIds = electionsBySlug
    .map((opts) => opts.find((o) => o.isPrimary)?.candidateId ?? opts[0]?.candidateId ?? null)
    .filter((id): id is string => id !== null);

  const { data } = candidateIds.length
    ? await sb
        .from("candidates")
        .select(
          `id, slug, name, full_name, party, color, current_position, photo_url,
           birth_date, profession, education, net_worth, bio, tse_last_situation,
           election:elections(type, state, year, name),
           averages:weighted_averages(weighted_average, calculated_at, polls_included, scenario_label),
           polls:poll_results(percentage, poll:polls(publication_date, institute:institutes(name)))`
        )
        .in("id", candidateIds)
        .is("polls.excluded_reason", null)
    : { data: [] as never[] };

  // plano_governo pode ter sido gravado na linha de 1º OU 2º turno da mesma
  // pessoa, dependendo de qual estava com tse_id no momento da ingestão (ver
  // migration 20260822190000_create_plano_governo) — por isso a busca usa
  // TODAS as linhas-irmãs (electionsBySlug), não só o candidate_id canônico
  // que aparece na tela.
  const allSiblingIds = electionsBySlug.flatMap((opts) => opts.map((o) => o.candidateId));
  const planosByAnyId = await fetchPlanos(sb, allSiblingIds);
  const planosBySlug = new Map(
    slugs.map((s, i) => [
      s,
      electionsBySlug[i].map((o) => planosByAnyId.get(o.candidateId)).find((p) => p) ?? [],
    ])
  );

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
      planos: planosBySlug.get(raw.slug) ?? [],
    });
  }

  return slugs.map((s) => map.get(s)).filter((x): x is ComparedCandidate => Boolean(x));
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
    // Canonical SEMPRE limpo: páginas parametrizadas (?a=&b=) consolidam
    // autoridade na URL base, evitando fragmentação por combinação de candidatos.
    alternates: {
      canonical: "https://electiolab.com/comparar",
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
  const candidates = await fetchCandidates(slugs);

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

        <CompareView initialCandidates={candidates} />
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Dados: TSE · CNJ · Câmara · Senado · Bacen · Wikipedia
        </div>
      </footer>
    </div>
  );
}
