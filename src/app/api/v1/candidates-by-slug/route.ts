import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";
import { getCandidateElections } from "@/lib/queries";

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

/**
 * GET /api/v1/candidates-by-slug?slug=lula&slug=tarcisio
 * Retorna até 3 candidatos com dados consolidados (média ponderada + última pesquisa).
 * Usado pela página /comparar pra refetch quando o usuário troca um slot.
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const slugs = url.searchParams.getAll("slug").filter(Boolean).slice(0, 3);

  if (slugs.length === 0) {
    return NextResponse.json({ data: [], count: 0 });
  }

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
  const candidateIdsFromSlugs = electionsBySlug
    .map((opts) => opts.find((o) => o.isPrimary)?.candidateId ?? opts[0]?.candidateId ?? null)
    .filter((id): id is string => id !== null);

  const { data, error } = candidateIdsFromSlugs.length
    ? await sb
        .from("candidates")
        .select(
          `id, slug, name, full_name, party, color, current_position, photo_url,
           birth_date, profession, education, net_worth, bio, tse_last_situation,
           election:elections(type, state, year, name),
           averages:weighted_averages(weighted_average, calculated_at, polls_included, scenario_label),
           polls:poll_results(percentage, poll:polls(publication_date, institute:institutes(name)))`
        )
        .in("id", candidateIdsFromSlugs)
        .is("polls.excluded_reason", null)
    : { data: [] as never[], error: null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // plano_governo pode ter sido gravado na linha de 1º OU 2º turno da mesma
  // pessoa, dependendo de qual estava com tse_id no momento da ingestão (ver
  // migration 20260822190000_create_plano_governo) — por isso a busca usa
  // TODAS as linhas-irmãs (electionsBySlug), não só o candidate_id canônico.
  const allSiblingIds = electionsBySlug.flatMap((opts) => opts.map((o) => o.candidateId));
  const planosByAnyId = await fetchPlanos(sb, allSiblingIds);
  const planosBySlug = new Map(
    slugs.map((s, i) => [
      s,
      electionsBySlug[i].map((o) => planosByAnyId.get(o.candidateId)).find((p) => p) ?? [],
    ])
  );

  const flat = (data ?? []).map((raw: Record<string, unknown>) => {
    const averages = (raw.averages ?? []) as Array<{
      weighted_average: number;
      calculated_at: string;
      polls_included: number;
      scenario_label: string | null;
    }>;
    const polls = (raw.polls ?? []) as Array<{
      percentage: number;
      poll: { publication_date: string; institute: { name: string } | null } | null;
    }>;
    // Filtra apenas 1T (scenario_label = null). 2T precisa endpoint dedicado
    // por cenário — não dá pra reduzir N cenários a número único aqui.
    const latestAvg = averages
      .filter((a) => a.scenario_label === null)
      .slice()
      .sort((a, b) => (b.calculated_at ?? "").localeCompare(a.calculated_at ?? ""))[0];
    const latestPoll = polls
      .slice()
      .sort((a, b) =>
        (b.poll?.publication_date ?? "").localeCompare(a.poll?.publication_date ?? "")
      )[0];

    return {
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
      election: raw.election,
      weighted_average: latestAvg?.weighted_average ?? null,
      polls_included: latestAvg?.polls_included ?? 0,
      latest_poll: latestPoll
        ? {
            percentage: latestPoll.percentage,
            date: latestPoll.poll?.publication_date ?? null,
            institute: latestPoll.poll?.institute?.name ?? null,
          }
        : null,
      planos: planosBySlug.get(raw.slug as string) ?? [],
    };
  });

  // Preserva ordem dos slugs no input
  const map = new Map(flat.map((c) => [c.slug as string, c]));
  const ordered = slugs.map((s) => map.get(s)).filter(Boolean);

  return applyRateLimitHeaders(
    NextResponse.json({ data: ordered, count: ordered.length }),
    auth
  );
}
