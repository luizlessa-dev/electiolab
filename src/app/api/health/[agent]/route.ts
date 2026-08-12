/**
 * GET /api/health/[agent]
 *
 * Individual agent health — last run, uptime, error rate
 * Agents: agent-1-tse, agent-2-institutos, agent-3-validacao
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface AgentHealthResponse {
  ok: boolean;
  agent: string;
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  metrics: {
    last_run_at?: string;
    last_success_at?: string;
    last_error_at?: string;
    last_error_message?: string;
    run_count_24h?: number;
    success_rate_pct?: number;
    avg_duration_ms?: number;
  };
  recommendations?: string[];
}

const VALID_AGENTS = ["agent-1-tse", "agent-2-institutos", "agent-3-validacao"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
): Promise<NextResponse> {
  const { agent } = await params;
  const timestamp = new Date().toISOString();

  // Validate agent name
  if (!VALID_AGENTS.includes(agent)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown agent. Valid: ${VALID_AGENTS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const response: AgentHealthResponse = {
    ok: true,
    agent,
    status: "healthy",
    timestamp,
    metrics: {},
    recommendations: [],
  };

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // Query agent_runs table (create if doesn't exist)
    const { data: runs, error } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("agent_name", agent)
      .order("run_at", { ascending: false })
      .limit(100);

    if (error && error.code !== "PGRST116") {
      // PGRST116 = table does not exist
      console.error(`[health:${agent}] query error:`, error);
      response.status = "degraded";
      response.ok = false;
    }

    if (runs && runs.length > 0) {
      const lastRun = runs[0];
      const last24h = runs.filter(
        (r) => new Date(r.run_at).getTime() > Date.now() - 86400000
      );

      response.metrics.last_run_at = lastRun.run_at;
      response.metrics.last_success_at = runs.find((r) => r.success)?.run_at;
      response.metrics.last_error_at = runs.find((r) => !r.success)?.run_at;
      response.metrics.last_error_message = runs.find((r) => !r.success)?.error;

      response.metrics.run_count_24h = last24h.length;
      const successCount = last24h.filter((r) => r.success).length;
      response.metrics.success_rate_pct =
        last24h.length > 0 ? Math.round((successCount / last24h.length) * 100) : 0;

      const avgDuration =
        last24h.length > 0
          ? last24h.reduce((sum, r) => sum + (r.duration_ms || 0), 0) /
            last24h.length
          : 0;
      response.metrics.avg_duration_ms = Math.round(avgDuration);

      // Health status based on success rate
      if (response.metrics.success_rate_pct! >= 90) {
        response.status = "healthy";
      } else if (response.metrics.success_rate_pct! >= 50) {
        response.status = "degraded";
        response.recommendations = [
          `Success rate is ${response.metrics.success_rate_pct}%. Investigate last failures.`,
        ];
      } else {
        response.status = "down";
        response.recommendations = [
          `Critical: Success rate is ${response.metrics.success_rate_pct}%. Agent is failing most runs.`,
        ];
      }

      // Check if too long since last successful run
      if (response.metrics.last_success_at) {
        const lastSuccessMins =
          (Date.now() - new Date(response.metrics.last_success_at).getTime()) /
          60000;
        if (lastSuccessMins > 120) {
          response.recommendations = response.recommendations || [];
          response.recommendations.push(
            `No successful run in ${Math.round(lastSuccessMins)} minutes.`
          );
          response.status = "degraded";
        }
      }
    } else {
      response.status = "degraded";
      response.recommendations = ["No run history found. Agent may be new or inactive."];
    }

    return NextResponse.json(response, {
      status: response.ok ? 200 : 503,
      headers: {
        "Cache-Control": "max-age=30",
        "X-Agent": agent,
      },
    });
  } catch (e) {
    console.error(`[health:${agent}] error:`, e);
    return NextResponse.json(
      {
        ok: false,
        agent,
        status: "down",
        timestamp,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 503 }
    );
  }
}
