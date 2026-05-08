/**
 * GET /api/admin/recalc-status
 *
 * Retorna o estado das execuções automáticas do cron `recalculate-averages-every-6h`:
 *   - últimas 10 execuções (cron.job_run_details)
 *   - últimas 10 respostas HTTP do pg_net
 *   - contagens agregadas (eleições, candidatos, weighted_averages)
 *
 * Auth: Bearer INGEST_SECRET_KEY (mesma do /admin/ingest).
 *
 * Curl:
 *   curl https://electiolab.com/api/admin/recalc-status \
 *     -H "Authorization: Bearer $INGEST_SECRET_KEY"
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

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const secret = process.env.INGEST_SECRET_KEY;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = admin();

  const [jobRes, historyRes, ...counts] = await Promise.all([
    sb.rpc("admin_recalc_cron_status"),
    sb.rpc("admin_recalc_run_history"),
    sb.from("elections").select("id", { count: "exact", head: true }),
    sb.from("polls").select("id", { count: "exact", head: true }),
    sb.from("weighted_averages").select("id", { count: "exact", head: true }),
    sb.from("candidates").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  // 5 polls mais recentes (criadas)
  const { data: recentPolls } = await sb
    .from("polls")
    .select(
      "id, publication_date, sample_size, methodology, institute:institutes(name), election:elections(name)"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    cron_job: jobRes.data ?? null,
    counts: {
      elections: counts[0].count ?? 0,
      polls: counts[1].count ?? 0,
      weighted_averages: counts[2].count ?? 0,
      candidates_active: counts[3].count ?? 0,
    },
    recent_polls: recentPolls,
    run_history: historyRes.data ?? null,
    timestamp: new Date().toISOString(),
  });
}
