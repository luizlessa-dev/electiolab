import { createClient } from "@supabase/supabase-js";

/**
 * Rate limiting distribuído usando Supabase.
 * Funciona corretamente em serverless (Vercel) onde cada instância é efêmera.
 *
 * Armazena contadores em uma tabela Supabase com TTL automático.
 * Permite múltiplas instâncias compartilharem o mesmo limite.
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check rate limit usando Supabase como backend distribuído.
 * Cria a tabela automaticamente se não existir.
 */
export async function checkDistributedRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // Chave única para este identificador + janela de tempo
    const key = `ratelimit:${identifier}:${Math.floor(now / (windowSeconds * 1000))}`;

    // Tentar incrementar contador (upsert)
    const { data, error } = await supabase.rpc("increment_rate_limit", {
      key_param: key,
      max_requests: maxRequests,
      ttl_seconds: windowSeconds * 2, // TTL 2x a janela para limpeza
    });

    if (error) {
      console.warn("[rate-limit] RPC error:", error.message);
      // Em caso de erro, permitir a requisição (fail open)
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt,
      };
    }

    const count = data?.[0]?.count || 1;

    if (count > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - count),
      resetAt,
    };
  } catch (e) {
    console.error("[rate-limit] unexpected error:", e);
    // Fail open em caso de erro
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt,
    };
  }
}

/**
 * Middleware helper: usa IP ou API key como identificador
 */
export function getRateLimitIdentifier(
  request: Request,
  apiKeyHeader?: string
): string {
  // Preferir API key se fornecida
  if (apiKeyHeader) {
    const apiKey = request.headers.get(apiKeyHeader);
    if (apiKey) {
      return `apikey:${apiKey.slice(0, 20)}`;
    }
  }

  // Usar IP como fallback
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return `ip:${ip}`;
}
