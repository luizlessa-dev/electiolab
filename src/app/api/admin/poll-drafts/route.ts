/**
 * GET    /api/admin/poll-drafts                 — lista drafts (filtros: status, election_id)
 * POST   /api/admin/poll-drafts                 — cria draft manual a partir de JSON
 *
 * Auth: Bearer INGEST_SECRET_KEY (mesma de outros admin endpoints).
 *
 * Body do POST:
 *   {
 *     election_id: "uuid",
 *     source_url: "https://...",
 *     drafts: [{ institute, fieldwork_start?, fieldwork_end, sample_size?,
 *                margin_of_error?, results: [{name, pct}] }]
 *   }
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

function authorize(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const secret = process.env.INGEST_SECRET_KEY;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const denied = authorize(req); if (denied) return denied;
  const url = new URL(req.url);
  const source = url.searchParams.get("source");

  const sb = admin();

  // Modo: ?source=missing → retorna pesqele_missing enriquecido com elections candidatas
  if (source === "missing") {
    const { data: missing, error: e1 } = await sb
      .from("pesqele_missing")
      .select("protocolo, ano, uf, cargos, instituto, fieldwork_end, publication_date, sample_size, days_since_fieldwork")
      .limit(100);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    // Para cada missing, encontra elections candidatas (mesmo uf + ano + cargo inferido)
    const enriched = await Promise.all((missing ?? []).map(async (m) => {
      const cargosLower = (m.cargos as string).toLowerCase();
      const inferredTypes: string[] = [];
      if (cargosLower.includes("presidente")) inferredTypes.push("presidente");
      if (cargosLower.includes("governador")) inferredTypes.push("governador");
      if (cargosLower.includes("senador")) inferredTypes.push("senador");
      if (cargosLower.includes("deputado federal")) inferredTypes.push("deputado_federal");
      if (cargosLower.includes("deputado estadual")) inferredTypes.push("deputado_estadual");

      const ufFilter = m.uf === "BR" ? null : m.uf;
      let q = sb
        .from("elections")
        .select("id, name, type, state, year, round")
        .eq("year", m.ano)
        .eq("is_active", true);
      if (inferredTypes.length) q = q.in("type", inferredTypes);
      if (ufFilter) q = q.eq("state", ufFilter);
      const { data: candidates } = await q;

      return { ...m, election_candidates: candidates ?? [] };
    }));

    return NextResponse.json({ data: enriched, count: enriched.length });
  }

  // Modo padrão: lista poll_drafts
  const status = url.searchParams.get("status");
  const electionId = url.searchParams.get("election_id");

  let q = sb
    .from("poll_drafts")
    .select(
      `id, election_id, institute_name, institute_id, fieldwork_start, fieldwork_end,
       publication_date, sample_size, margin_of_error, scope, round, tse_protocolo,
       results, source_url, source_kind, status, promoted_poll_id, imported_at, reviewed_at, notes,
       election:elections(name, type, state, year, round)`
    )
    .order("fieldwork_end", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  if (electionId) q = q.eq("election_id", electionId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Summary
  const { data: summary } = await sb.from("poll_drafts_summary").select("*");

  return NextResponse.json({ data, count: data?.length ?? 0, summary });
}

type DraftInput = {
  institute: string;
  fieldwork_start?: string;
  fieldwork_end: string;
  publication_date?: string;
  sample_size?: number;
  margin_of_error?: number;
  scope?: string;
  round?: number;
  results: Array<{ name: string; pct: number }>;
};

export async function POST(req: Request) {
  const denied = authorize(req); if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body?.election_id || !Array.isArray(body?.drafts) || !body?.source_url) {
    return NextResponse.json(
      { error: "Body deve conter election_id, source_url, drafts: []" },
      { status: 400 }
    );
  }

  const sb = admin();
  const rows = (body.drafts as DraftInput[]).map((d) => ({
    election_id: body.election_id,
    institute_name: d.institute,
    fieldwork_start: d.fieldwork_start ?? null,
    fieldwork_end: d.fieldwork_end,
    publication_date: d.publication_date ?? d.fieldwork_end,
    sample_size: d.sample_size ?? null,
    margin_of_error: d.margin_of_error ?? null,
    scope: d.scope ?? "1t",
    round: d.round ?? 1,
    results: d.results,
    source_url: body.source_url,
    source_kind: body.source_url.includes("wikipedia") ? "wikipedia" : "manual",
    status: "pending",
    raw_row: d,
  }));

  const { data, error } = await sb
    .from("poll_drafts")
    .upsert(rows, {
      onConflict: "election_id,institute_name,fieldwork_end,scope,round",
      ignoreDuplicates: false,
    })
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length ?? 0, ids: data?.map((r) => r.id) ?? [] });
}
