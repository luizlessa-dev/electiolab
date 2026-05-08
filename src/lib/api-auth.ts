/**
 * Autenticação para endpoints /api/v1/*.
 *
 * Comportamento:
 *   - Sem Authorization → permite (free/anonymous, headers `X-RateLimit-Limit: 60`)
 *   - Authorization Bearer el_<tier>_<hex> → valida via RPC, incrementa uso
 *     atomicamente (com reset mensal), denega se inválida ou over-limit
 *   - Authorization presente mas malformado → 401
 *
 * Uso:
 *   const auth = await authenticate(request);
 *   if (!auth.ok) return auth.response;
 *   const data = await fetch(...);
 *   return applyRateLimitHeaders(NextResponse.json(data), auth);
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type AuthOk =
  | {
      ok: true;
      authenticated: false;
      tier: "anonymous";
      rateLimit: number;
      remaining: null;
      resetsAt: null;
    }
  | {
      ok: true;
      authenticated: true;
      tier: string;
      rateLimit: number;
      used: number;
      remaining: number;
      resetsAt: string;
      userId: string;
    };

export type AuthResult = AuthOk | { ok: false; response: NextResponse };

const ANON: AuthOk = {
  ok: true,
  authenticated: false,
  tier: "anonymous",
  rateLimit: 60,
  remaining: null,
  resetsAt: null,
};

export async function authenticate(request: Request): Promise<AuthResult> {
  const auth = request.headers.get("authorization") ?? "";

  // Sem header → anonymous
  if (!auth) return ANON;

  // Header presente: deve ser Bearer válido
  const m = auth.match(/^Bearer\s+(el_[a-z]+_[a-f0-9]+)$/);
  if (!m) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Authorization malformado. Use: Bearer el_<tier>_<hex> (ou omita pra acesso anônimo limitado).",
        },
        { status: 401 }
      ),
    };
  }

  const token = m[1];
  const keyHash = await sha256(token);

  const { data, error } = await supabaseAdmin.rpc("increment_api_key_usage", {
    p_key_hash: keyHash,
  });

  if (error) {
    console.error("[api-auth] RPC error:", error.message);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Erro ao validar API key" },
        { status: 500 }
      ),
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        is_valid: boolean;
        is_over_limit: boolean;
        tier: string;
        rate_limit: number;
        requests_used: number;
        requests_remaining: number;
        user_id: string;
        period_resets_at: string;
      }
    | undefined;

  if (!row || !row.is_valid) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "API key inválida, expirada ou desativada" },
        { status: 401 }
      ),
    };
  }

  if (row.is_over_limit) {
    const resp = NextResponse.json(
      {
        error: "Rate limit atingido. Aguarde reset ou faça upgrade.",
        rate_limit: row.rate_limit,
        period_resets_at: row.period_resets_at,
      },
      { status: 429 }
    );
    resp.headers.set("X-RateLimit-Limit", String(row.rate_limit));
    resp.headers.set("X-RateLimit-Remaining", "0");
    resp.headers.set("X-RateLimit-Reset", row.period_resets_at);
    return { ok: false, response: resp };
  }

  return {
    ok: true,
    authenticated: true,
    tier: row.tier,
    rateLimit: row.rate_limit,
    used: row.requests_used,
    remaining: row.requests_remaining,
    resetsAt: row.period_resets_at,
    userId: row.user_id,
  };
}

export function applyRateLimitHeaders(
  response: NextResponse,
  auth: AuthOk
): NextResponse {
  if (auth.authenticated) {
    response.headers.set("X-RateLimit-Limit", String(auth.rateLimit));
    response.headers.set("X-RateLimit-Remaining", String(auth.remaining));
    response.headers.set("X-RateLimit-Reset", auth.resetsAt);
    response.headers.set("X-API-Tier", auth.tier);
  } else {
    response.headers.set("X-RateLimit-Limit", String(auth.rateLimit));
    response.headers.set("X-API-Tier", "anonymous");
  }
  return response;
}

/** Compat — redirecionado pro novo authenticate(). */
export async function validateApiKey(request: Request) {
  const r = await authenticate(request);
  if (!r.ok) return r.response;
  if (!r.authenticated) {
    return NextResponse.json(
      { error: "API key requerida (Bearer el_<tier>_<hex>)" },
      { status: 401 }
    );
  }
  return {
    user_id: r.userId,
    tier: r.tier,
    rate_limit: r.rateLimit,
    requests_used: r.used,
  };
}
