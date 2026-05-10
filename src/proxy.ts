import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Basic Auth opcional, opt-in via env. Quando BASIC_AUTH_USER + BASIC_AUTH_PASSWORD
 * estão setados, o site exige auth (modo "staging fechado"). Sem essas envs, o site
 * é público — comportamento padrão de produção, indexável pelo Google.
 *
 * Histórico: anteriormente o middleware exigia auth incondicionalmente, bloqueando
 * indexação. Corrigido em 2026-05-09.
 */
function basicAuthGate(request: NextRequest): NextResponse | null {
  const username = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  // Sem credenciais configuradas → site público.
  if (!username || !password) return null;

  const basicAuth = request.headers.get("authorization");
  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [user, pwd] = atob(authValue).split(":");
    if (user === username && pwd === password) return null; // auth ok → segue
  }

  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Área protegida"' },
  });
}

export async function proxy(request: NextRequest) {
  const authResp = basicAuthGate(request);
  if (authResp) return authResp;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api/revalidate|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};