/**
 * GET /api/health
 *
 * Health check real e barato: conectividade do Supabase + frescor dos dados
 * que o site mostra (weighted_averages) + último resultado real de cada
 * agente (agent_runs). Substitui o mock anterior (status "healthy" e
 * last_run fabricados pra todo agente, sempre — um monitor apontado pra lá
 * dava verde mesmo com o pipeline parado). Ver P0-6 em
 * docs/auditoria-pre-eleicao-2026-09.md.
 *
 * Retorna 503 se o banco falhar ou se `weighted_averages` (recalculada a
 * cada 6h via cron) estiver com mais de 12h sem atualização — dois ciclos
 * perdidos é sinal real de problema, não ruído de cadência.
 *
 * `polls` não entra no gate: institutos publicam em cadência irregular
 * (às vezes dias entre uma pesquisa e outra), então um limiar fixo geraria
 * falso positivo fora de época de pesquisa. A idade ainda é reportada, só
 * não derruba o health check.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface HealthResponse {
  ok: boolean;
  timestamp: string;
  agents: {
    [key: string]: {
      status: "healthy" | "down" | "unknown";
      last_run?: string;
      last_success?: boolean;
    };
  };
  dependencies: {
    supabase: "ok" | "error";
    tse_cdn: "unknown"; // não checado — ver P2 no doc de auditoria
  };
  checks: {
    database: boolean;
    weighted_averages_age_hours: number | null;
    weighted_averages_stale: boolean;
    polls_age_hours: number | null;
  };
}

const AGENT_NAMES = ["agent-1-tse", "agent-2-institutos", "agent-3-validacao"];
const STALE_THRESHOLD_HOURS = 12; // 2 ciclos do cron de 6h

function ageHours(iso: string | null): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();
  const response: HealthResponse = {
    ok: true,
    timestamp,
    agents: {},
    dependencies: { supabase: "ok", tse_cdn: "unknown" },
    checks: {
      database: false,
      weighted_averages_age_hours: null,
      weighted_averages_stale: false,
      polls_age_hours: null,
    },
  };

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 1. Conectividade — tabela pequena, index scan.
    const { error: connError } = await supabase
      .from("pesqele_registry")
      .select("protocolo", { head: true, count: "exact" })
      .limit(1);

    if (connError) {
      response.dependencies.supabase = "error";
      response.checks.database = false;
      response.ok = false;
      return NextResponse.json(response, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    response.checks.database = true;

    // 2. Frescor real (substitui o mock).
    const [avgRes, pollRes, agentRes] = await Promise.all([
      supabase
        .from("weighted_averages")
        .select("calculated_at")
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("polls")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("agent_runs")
        .select("agent_name, success, run_at")
        .in("agent_name", AGENT_NAMES)
        .order("run_at", { ascending: false }),
    ]);

    if (avgRes.error) throw avgRes.error;
    if (pollRes.error) throw pollRes.error;
    if (agentRes.error) throw agentRes.error;

    const avgAge = ageHours(avgRes.data?.calculated_at ?? null);
    const pollAge = ageHours(pollRes.data?.created_at ?? null);
    const stale = avgAge === null || avgAge > STALE_THRESHOLD_HOURS;

    response.checks.weighted_averages_age_hours = avgAge !== null ? Math.round(avgAge * 10) / 10 : null;
    response.checks.weighted_averages_stale = stale;
    response.checks.polls_age_hours = pollAge !== null ? Math.round(pollAge * 10) / 10 : null;

    // 3. Última execução real de cada agente (não fabricada).
    for (const name of AGENT_NAMES) {
      const last = agentRes.data?.find((r) => r.agent_name === name);
      response.agents[name] = last
        ? { status: last.success ? "healthy" : "down", last_run: last.run_at, last_success: last.success }
        : { status: "unknown" };
    }

    response.ok = !stale;

    return NextResponse.json(response, {
      status: response.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Check-Time": `${Date.now()}ms`,
      },
    });
  } catch (e) {
    console.error("[health] error:", e);
    return NextResponse.json(
      {
        ok: false,
        timestamp,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
