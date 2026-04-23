/**
 * GET /api/cron/check-polls
 *
 * Vercel Cron Job — roda toda segunda-feira às 09:07 BRT.
 * Vercel injeta automaticamente: Authorization: Bearer $CRON_SECRET
 *
 * Verifica lacunas de pesquisas por eleição ativa e retorna um relatório.
 * Se alguma eleição tiver gap > 7 dias, loga um alerta para o operador.
 *
 * Para forçar manualmente:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     https://electiolab.vercel.app/api/cron/check-polls
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALERT_THRESHOLD_DAYS = 7;

export async function GET(req: NextRequest) {
  // Vercel Cron injects Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  const secret = process.env.CRON_SECRET ?? process.env.INGEST_SECRET_KEY;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const checkedAt = new Date().toISOString();

  // Busca eleições ativas com polls ordenados por data
  const { data: elections, error } = await supabase
    .from("elections")
    .select(`
      id, name, year, is_active,
      polls ( publication_date, fieldwork_end )
    `)
    .eq("is_active", true)
    .order("year", { ascending: false });

  if (error) {
    console.error("[cron/check-polls] DB error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const report = (elections ?? []).map((e: any) => {
    const dates = (e.polls ?? [])
      .map((p: any) => p.publication_date)
      .sort()
      .reverse();
    const lastDate = dates[0] ?? null;
    const gapDays = lastDate
      ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
      : null;
    const needsUpdate = gapDays === null || gapDays > ALERT_THRESHOLD_DAYS;

    return {
      election: e.name,
      year: e.year,
      total_polls: e.polls?.length ?? 0,
      last_poll: lastDate,
      gap_days: gapDays,
      needs_update: needsUpdate,
    };
  });

  const alertingElections = report.filter((r) => r.needs_update);

  if (alertingElections.length > 0) {
    // Log estruturado — aparece no Vercel Functions log
    console.warn(
      "[cron/check-polls] ⚠️  ATUALIZAÇÃO NECESSÁRIA:\n" +
        alertingElections
          .map(
            (r) =>
              `  • ${r.election}: última pesquisa ${r.last_poll ?? "—"} (${r.gap_days ?? "∞"}d atrás)`
          )
          .join("\n")
    );
  } else {
    console.log(
      `[cron/check-polls] ✅ Todas as eleições ativas estão atualizadas (checked ${checkedAt})`
    );
  }

  return NextResponse.json({
    checked_at: checkedAt,
    elections: report,
    alerts: alertingElections.length,
    summary:
      alertingElections.length > 0
        ? `${alertingElections.length} eleição(ões) precisam de novas pesquisas: ${alertingElections.map((r) => r.election).join(", ")}`
        : "Tudo atualizado ✅",
  });
}
