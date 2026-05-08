import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/v1/me
 *
 * Retorna informações da API key (tier, rate_limit, requests_used, etc.).
 * Útil pra o cliente saber quando vai bater no limit e o reset.
 *
 * Bearer obrigatório (anonymous → 401).
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  if (!auth.authenticated) {
    return NextResponse.json(
      {
        error:
          "Endpoint /me requer autenticação. Envie Authorization: Bearer el_<tier>_<hex>.",
      },
      { status: 401 }
    );
  }

  return applyRateLimitHeaders(
    NextResponse.json({
      authenticated: true,
      tier: auth.tier,
      rate_limit: auth.rateLimit,
      requests_used: auth.used,
      requests_remaining: auth.remaining,
      period_resets_at: auth.resetsAt,
    }),
    auth
  );
}
