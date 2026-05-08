import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";

/**
 * GET /api/v1/drift?candidate_id=<uuid>&days=120
 * Retorna histórico de % nas pesquisas individuais ao longo do tempo.
 * Usa RPC public.get_candidate_drift que filtra round=1.
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const candidateId = url.searchParams.get("candidate_id");
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "120", 10) || 120, 365);

  if (!candidateId || !/^[a-f0-9-]{36}$/.test(candidateId)) {
    return NextResponse.json({ error: "candidate_id inválido" }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await sb.rpc("get_candidate_drift", {
    p_candidate_id: candidateId,
    p_days: days,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return applyRateLimitHeaders(
    NextResponse.json({ data, count: (data as unknown[])?.length ?? 0 }),
    auth
  );
}
