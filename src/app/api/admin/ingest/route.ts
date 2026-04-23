/**
 * POST /api/admin/ingest
 * Ingere uma ou mais pesquisas eleitorais no banco.
 *
 * Body: PollIngestionPayload | PollIngestionPayload[]
 *
 * Autenticação: Bearer token via INGEST_SECRET_KEY (env var)
 *
 * Uso típico (curl):
 *   curl -X POST https://electiolab.vercel.app/api/admin/ingest \
 *     -H "Authorization: Bearer $INGEST_SECRET_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "institute_name": "Quaest", ... }'
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestPoll } from "@/lib/ingestion/ingest-poll";
import type { PollIngestionPayload, IngestionReport } from "@/lib/ingestion/types";

export async function POST(req: NextRequest) {
  // Autenticação por secret key
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  const secret = process.env.INGEST_SECRET_KEY;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PollIngestionPayload | PollIngestionPayload[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payloads = Array.isArray(body) ? body : [body];
  const report: IngestionReport = {
    checked_at: new Date().toISOString(),
    polls_found: payloads.length,
    polls_inserted: 0,
    polls_skipped: 0,
    errors: [],
    details: [],
  };

  for (const payload of payloads) {
    const result = await ingestPoll(payload);
    report.details.push(result);

    if (!result.success) {
      report.errors.push(result.error ?? "Erro desconhecido");
    } else if (result.skipped) {
      report.polls_skipped++;
    } else {
      report.polls_inserted++;
    }
  }

  const status = report.errors.length > 0 && report.polls_inserted === 0 ? 422 : 200;
  return NextResponse.json(report, { status });
}

// GET /api/admin/ingest — retorna status do banco (última pesquisa por eleição)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  const secret = process.env.INGEST_SECRET_KEY;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  let rpcData = null;
  try { ({ data: rpcData } = await supabase.rpc("get_ingestion_status")); } catch { /* fallback below */ }

  // Fallback: query direta
  const { data: elections } = await supabase
    .from("elections")
    .select(`
      id, name, year, is_active,
      polls (publication_date)
    `)
    .order("year", { ascending: false });

  const status = (elections ?? []).map((e: any) => {
    const dates = (e.polls ?? []).map((p: any) => p.publication_date).sort().reverse();
    const lastDate = dates[0] ?? null;
    const gapDays = lastDate
      ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
      : null;
    return {
      election: e.name,
      is_active: e.is_active,
      total_polls: e.polls?.length ?? 0,
      last_poll: lastDate,
      gap_days: gapDays,
      needs_update: gapDays !== null ? gapDays > 14 : true,
    };
  });

  return NextResponse.json({
    checked_at: new Date().toISOString(),
    elections: status,
  });
}
