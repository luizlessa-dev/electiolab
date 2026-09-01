import { NextRequest, NextResponse } from "next/server";

/**
 * Portão das rotas /api/debug/*.
 *
 * Todas elas instanciam o client com SUPABASE_SERVICE_ROLE_KEY, que ignora RLS.
 * Estavam respondendo 200 para qualquer visitante em produção — leitura
 * arbitrária de schema, contagem de linhas e amostras de dados sem nenhuma
 * credencial.
 *
 * Responde 404 (não 401) quando barra: um 401 confirma que a rota existe.
 */
export function debugBloqueado(req: NextRequest): NextResponse | null {
  // Fora de produção são o que dizem ser: ferramentas de inspeção local.
  if (process.env.NODE_ENV !== "production") return null;

  const esperado = process.env.DEBUG_TOKEN ?? process.env.CRON_SECRET;
  const token = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (esperado && token === esperado) return null;

  return new NextResponse("Not Found", { status: 404 });
}
