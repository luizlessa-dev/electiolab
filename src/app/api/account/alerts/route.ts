import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET  /api/account/alerts        — lista alertas do user
 * POST /api/account/alerts        — cria novo alerta
 * DELETE /api/account/alerts?id=  — remove alerta
 *
 * Auth: sessão Supabase (RLS na tabela user_alerts já filtra por auth.uid()).
 */

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await sb
    .from("user_alerts")
    .select(
      `id, alert_type, threshold_pp, is_active, last_value, last_checked_at, last_triggered_at, created_at,
       candidate:candidates(id, name, slug, party, color),
       election:elections(id, name, type, state)`
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: {
    alert_type: "new_poll" | "movement" | "tse_change";
    candidate_id?: string;
    election_id?: string;
    threshold_pp?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!["new_poll", "movement", "tse_change"].includes(body.alert_type)) {
    return NextResponse.json({ error: "alert_type inválido" }, { status: 400 });
  }
  if (!body.candidate_id && !body.election_id) {
    return NextResponse.json(
      { error: "Pelo menos candidate_id OU election_id deve ser informado" },
      { status: 400 }
    );
  }
  if ((body.alert_type === "movement" || body.alert_type === "tse_change") && !body.candidate_id) {
    return NextResponse.json(
      { error: "alert_type 'movement' e 'tse_change' exigem candidate_id" },
      { status: 400 }
    );
  }

  const { data, error } = await sb
    .from("user_alerts")
    .insert({
      user_id: user.id,
      alert_type: body.alert_type,
      candidate_id: body.candidate_id ?? null,
      election_id: body.election_id ?? null,
      threshold_pp: body.threshold_pp ?? 5,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await sb.from("user_alerts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
