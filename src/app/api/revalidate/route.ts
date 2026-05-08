/**
 * On-demand revalidation webhook.
 *
 * Permite forçar regeneração de páginas SEO imediatamente após ingestão de dados,
 * sem esperar o ciclo de revalidate=3600.
 *
 * Auth: Bearer token via header `Authorization` ou query `?token=...`.
 *       Token vem de env `REVALIDATE_TOKEN` (configurar no Vercel + .env.local).
 *
 * Endpoints:
 *   POST /api/revalidate?path=/pesquisas-presidenciais-2026     # revalida 1 path
 *   POST /api/revalidate?path=ALL                                # revalida lista canônica de páginas SEO
 *
 * Examples:
 *   curl -X POST "https://electiolab.com/api/revalidate?path=/&token=XXX"
 *   curl -X POST "https://electiolab.com/api/revalidate?path=ALL&token=XXX"
 *
 * Use case típico: após `npx tsx scripts/ingest-tse-extended.ts --apply`,
 *   chama este webhook pra atualizar /patrimonio, /fefc, /redes-sociais,
 *   /candidato/[slug] sem esperar 1h.
 */
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Lista de paths que beneficiam de revalidação em batch
const ALL_PATHS = [
  "/",
  "/sobre",
  "/imprensa",
  "/pesquisas-presidenciais-2026",
  "/quem-vence-no-segundo-turno-presidencia-2026",
  "/instituto-mais-acurado-eleicoes-brasil",
  "/quanto-custa-campanha-eleitoral-google-ads-meta",
  "/relatorio/semana-17-2026",
  "/patrimonio",
  "/fefc",
  "/redes-sociais",
  "/institutos",
  "/candidatos",
  "/eleicao-2018",
  "/eleicao-2022",
  // Pages dinâmicas governador (27 UFs)
  ...["ac","al","am","ap","ba","ce","df","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to"]
    .map((uf) => `/eleicoes-governador-${uf}-2026`),
];

function unauthorized(reason: string) {
  return NextResponse.json({ ok: false, error: "unauthorized", reason }, { status: 401 });
}

async function handle(req: NextRequest) {
  const expected = process.env.REVALIDATE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_TOKEN não configurado no servidor" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get("token");
  const tokenFromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = tokenFromHeader ?? tokenFromQuery;

  if (!token || token !== expected) {
    return unauthorized("token inválido ou ausente");
  }

  const path = url.searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { ok: false, error: "Forneça ?path=/algum/caminho ou ?path=ALL" },
      { status: 400 }
    );
  }

  const revalidated: string[] = [];

  if (path === "ALL") {
    for (const p of ALL_PATHS) {
      revalidatePath(p);
      revalidated.push(p);
    }
  } else {
    revalidatePath(path);
    revalidated.push(path);
  }

  return NextResponse.json({
    ok: true,
    revalidated,
    count: revalidated.length,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// GET é útil para teste manual no browser (sem CSRF concern, requer token)
export async function GET(req: NextRequest) {
  return handle(req);
}
