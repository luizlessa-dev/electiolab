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

/**
 * O refresh de sessão só tem o que fazer se existe cookie do Supabase. Visitante
 * anônimo e crawler nunca têm — e são a maioria esmagadora do tráfego: o
 * sitemap expõe ~19,4k URLs de candidato, todas públicas. Sem esse atalho, cada
 * uma dessas requests montava um client e entrava no fluxo de auth à toa.
 */
function temSessaoSupabase(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

/**
 * Modo manutenção: site fora do ar para reformulação. Quando true, toda request
 * coberta pelo matcher vai para /em-reconstrucao (API responde 503). Para voltar,
 * troque para false e publique de novo.
 */
const MAINTENANCE = true;

function manutencaoResp(request: NextRequest): NextResponse | null {
  if (!MAINTENANCE) return null;

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Serviço em reformulação. Volte em breve." },
      { status: 503, headers: { "Retry-After": "86400" } }
    );
  }
  if (pathname === "/em-reconstrucao") return null;

  return NextResponse.rewrite(new URL("/em-reconstrucao", request.url));
}

export async function proxy(request: NextRequest) {
  const manutencao = manutencaoResp(request);
  if (manutencao) return manutencao;

  const authResp = basicAuthGate(request);
  if (authResp) return authResp;

  if (!temSessaoSupabase(request)) return NextResponse.next({ request });

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