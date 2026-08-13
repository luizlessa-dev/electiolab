import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";

/**
 * GET /api/v1/candidates-search?q=silva&limit=50
 *
 * Busca por nome entre candidatos ativos de 2026, pro picker de /comparar.
 * Existe porque, com 16.909 candidatos (Presidente até Deputado Estadual/
 * Distrital), não dá mais pra carregar a lista inteira no client pra filtrar
 * localmente como antes — só as ~580 corridas majoritárias cabiam nesse padrão.
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  let query = sb
    .from("candidates")
    .select("id, slug, name, party, election:elections!inner(type, state, year)")
    .eq("is_active", true)
    .eq("election.year", 2026)
    .order("name")
    .limit(limit);

  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    slug: string;
    name: string;
    party: string | null;
    election: { type: string; state: string | null; year: number } | { type: string; state: string | null; year: number }[] | null;
  };
  // slug não é chave única global (só é único por candidate_id+election_id —
  // ex: um mesmo candidato pode ter linhas de 1º e 2º turno com o mesmo slug),
  // então devolve `id` também pra UI ter uma key React confiável.
  const results = ((data ?? []) as unknown as Row[]).map((c) => {
    const elec = Array.isArray(c.election) ? c.election[0] : c.election;
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      party: c.party,
      election_type: elec?.type ?? "",
      election_state: elec?.state ?? null,
    };
  });

  return applyRateLimitHeaders(NextResponse.json({ data: results }), auth);
}
