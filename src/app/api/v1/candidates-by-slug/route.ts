import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";

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

  const { data, error } = await sb
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
