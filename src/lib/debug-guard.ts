import { NextRequest, NextResponse } from "next/server";

/**
 * Portão das rotas /api/debug/*.
 *
 * Todas elas instanciam o client com SUPABASE_SERVICE_ROLE_KEY, que ignora RLS.
 * CRÍTICO: Nunca expor essas rotas em produção sem autenticação forte.
 *
 * Estratégia:
 * - Em produção: BLOQUEADO sempre (retorna 404, não 401 para não revelar existência)
 * - Em desenvolvimento: Requer DEBUG_TOKEN ou CRON_SECRET
 *
 * Responde 404 (não 401) quando barra: um 401 confirmaria que a rota existe.
 */
export function debugBloqueado(req: NextRequest): NextResponse | null {
  // Em produção: SEMPRE BLOQUEADO
  if (process.env.NODE_ENV === "production") {
    // Log silencioso para monitoramento
    const token = req.headers.get("authorization")?.slice(0, 20);
    console.warn("[debug-guard] Tentativa de acesso em produção com token:", token);
    return new NextResponse("Not Found", { status: 404 });
  }

  // Em desenvolvimento: Requer DEBUG_TOKEN ou CRON_SECRET
  const esperado = process.env.DEBUG_TOKEN ?? process.env.CRON_SECRET;
  const token = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!esperado) {
    console.warn("[debug-guard] DEBUG_TOKEN e CRON_SECRET não configurados");
    return new NextResponse("Debug endpoints require DEBUG_TOKEN or CRON_SECRET", {
      status: 503,
    });
  }

  if (token === esperado) return null;

  return new NextResponse("Unauthorized", { status: 401 });
}
