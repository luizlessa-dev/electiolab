import { NextRequest, NextResponse } from "next/server";

/**
 * Global middleware para proteção de segurança.
 * Roda em TODAS as requisições (exceto assets).
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Proteção contra clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Proteção contra MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Proteção contra XSS
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Política de referrer segura
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Desabilitar features perigosas
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  return response;
}

// Aplicar middleware a todas as rotas exceto assets estáticos
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
