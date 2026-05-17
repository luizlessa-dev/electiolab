/**
 * PATCH  /api/admin/poll-drafts/[id]
 *   action=approve      → cria poll + poll_results, marca draft 'imported'
 *   action=reject       → marca draft 'rejected'
 *   action=update_notes → atualiza notes
 *
 * DELETE /api/admin/poll-drafts/[id] → apaga draft
 *
 * Auth: Bearer INGEST_SECRET_KEY.
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

function normalize(s: string): string {
  return s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

async function approve(draftId: string) {
  const sb = admin();
  const { data: d, error: e1 } = await sb
    .from("poll_drafts")
    .select("*")
    .eq("id", draftId)
    .single();
  if (e1 || !d) return { error: e1?.message ?? "Draft não encontrado", status: 404 };
  if (d.status === "imported") return { error: "Draft já importado", status: 409 };
  if (!d.election_id) return { error: "Draft sem election_id", status: 400 };

  // 1. Resolver institute_id por fuzzy match em institutes.name
  let instituteId: string | null = d.institute_id;
  if (!instituteId) {
    const target = normalize(d.institute_name);
    const { data: insts } = await sb.from("institutes").select("id, name");
    for (const inst of insts ?? []) {
      const ni = normalize(inst.name);
      // Substring qualquer direção
      if (ni.includes(target) || target.includes(ni)) {
        instituteId = inst.id;
        break;
      }
      // Match por token chave
      const ta = new Set(target.split(" ").filter((t) => t.length > 3));
      const tb = new Set(ni.split(" ").filter((t) => t.length > 3));
      for (const t of ta) if (tb.has(t)) { instituteId = inst.id; break; }
      if (instituteId) break;
    }
  }
  if (!instituteId) {
    return { error: `Instituto "${d.institute_name}" não encontrado em institutes. Crie antes ou ajuste o nome.`, status: 422 };
  }

  // 2. Resolver candidate_id por nome para cada resultado
  const { data: cands } = await sb
    .from("candidates")
    .select("id, name, full_name")
    .eq("election_id", d.election_id)
    .eq("is_active", true);

  const resolved: Array<{ candidate_id: string; percentage: number; raw_name: string }> = [];
  const missing: string[] = [];
  for (const r of (d.results as Array<{ name: string; pct: number }>) ?? []) {
    const target = normalize(r.name);
    let matched: string | null = null;
    for (const c of cands ?? []) {
      const cn = normalize(c.name);
      const cf = normalize(c.full_name ?? "");
      if (cn.includes(target) || target.includes(cn) || cf.includes(target)) {
        matched = c.id;
        break;
      }
    }
    if (matched) resolved.push({ candidate_id: matched, percentage: r.pct, raw_name: r.name });
    else missing.push(r.name);
  }
  if (resolved.length === 0) {
    return { error: `Nenhum candidato dos ${(d.results as unknown[])?.length ?? 0} resultados foi encontrado em candidates. Faltam: ${missing.join(", ")}`, status: 422 };
  }

  // 3. Criar poll
  const { data: poll, error: e2 } = await sb
    .from("polls")
    .insert({
      election_id: d.election_id,
      institute_id: instituteId,
      tse_registration: d.tse_protocolo, // se houver match TSE
      fieldwork_start: d.fieldwork_start,
      fieldwork_end: d.fieldwork_end,
      publication_date: d.publication_date,
      sample_size: d.sample_size,
      margin_of_error: d.margin_of_error,
      methodology: d.methodology, // NULL permitido quando draft não informa (migration 20260517020237)
      scope: d.scope,
      round: d.round,
      source_url: d.source_url,
      is_verified: false,
    })
    .select("id")
    .single();
  if (e2 || !poll) return { error: `Falha ao criar poll: ${e2?.message}`, status: 500 };

  // 4. Criar poll_results
  const resultRows = resolved.map((r) => ({
    poll_id: poll.id,
    candidate_id: r.candidate_id,
    percentage: r.percentage,
  }));
  const { error: e3 } = await sb.from("poll_results").insert(resultRows);
  if (e3) {
    await sb.from("polls").delete().eq("id", poll.id); // rollback
    return { error: `Falha ao criar poll_results: ${e3.message}`, status: 500 };
  }

  // 5. Marcar draft imported
  await sb.from("poll_drafts").update({
    status: "imported",
    promoted_poll_id: poll.id,
    institute_id: instituteId,
    reviewed_at: new Date().toISOString(),
  }).eq("id", draftId);

  return {
    success: true,
    poll_id: poll.id,
    results_created: resultRows.length,
    candidates_missing: missing,
  };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = authorize(req); if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  const sb = admin();
  if (action === "approve") {
    const r = await approve(id);
    return NextResponse.json(r, { status: r.error ? r.status ?? 500 : 200 });
  }
  if (action === "reject") {
    const { error } = await sb.from("poll_drafts").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      notes: body.notes ?? null,
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  if (action === "update_notes") {
    const { error } = await sb.from("poll_drafts").update({ notes: body.notes ?? null }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = authorize(req); if (denied) return denied;
  const { id } = await ctx.params;
  const sb = admin();
  const { error } = await sb.from("poll_drafts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
