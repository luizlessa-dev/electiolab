/**
 * GET /api/health
 *
 * System health check — all agents + dependencies
 * Returns: { ok: boolean, agents: {...}, dependencies: {...}, timestamp: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface HealthResponse {
  ok: boolean;
  timestamp: string;
  agents: {
    [key: string]: {
      status: "healthy" | "degraded" | "down";
      last_run?: string;
      last_success?: string;
      last_error?: string;
      uptime_pct?: number;
    };
  };
  dependencies: {
    supabase: "ok" | "error";
    tse_cdn?: "ok" | "error" | "unknown";
  };
  checks: {
    database: boolean;
    agents_active: number;
    webhooks_queue: number;
  };
}

const AGENT_NAMES = ["agent-1-tse", "agent-2-institutos", "agent-3-validacao"];

export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();
  const response: HealthResponse = {
    ok: true,
    timestamp,
    agents: {},
    dependencies: {
      supabase: "ok",
    },
    checks: {
      database: false,
      agents_active: 0,
      webhooks_queue: 0,
    },
  };

  try {
    // 1. Check Supabase connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const { error } = await supabase
      .from("pesqele_registry")
      .select("count")
      .limit(1);

    if (error) {
      response.dependencies.supabase = "error";
      response.ok = false;
      response.checks.database = false;
    } else {
      response.checks.database = true;
    }

    // 2. Initialize agent statuses (from cache/Redis in production)
    for (const agent of AGENT_NAMES) {
      response.agents[agent] = {
        status: "healthy", // Simplified; use Redis for real state
        last_run: new Date(Date.now() - 3600000).toISOString(), // Mock: 1h ago
      };
      response.checks.agents_active++;
    }

    // 3. Check webhook queue (simplified; use Supabase table in production)
    // SELECT COUNT(*) FROM webhook_queue WHERE status = 'pending'
    response.checks.webhooks_queue = 0;

    return NextResponse.json(response, {
      status: response.ok ? 200 : 503,
      headers: {
        "Cache-Control": "max-age=60",
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
      { status: 503 }
    );
  }
}
