/**
 * POST /api/agents/run-agent-2
 *
 * Agente 2 (Institutos Scraping) foi aposentado do fluxo automático em
 * 2026-08-17: testado ao vivo contra as 4 URLs configuradas, 0/4
 * institutos retornariam pesquisa (2 domínios sem DNS, 2 sem dado na
 * HTML). Ver docs/ELECTIOLAB-AUDIT-2026-08.md (achado C1/achado 4).
 *
 * Descoberta e curadoria de pesquisa hoje passam por pesqele_registry
 * (TSE) + curadoria manual — ver docs/prompt-verificacao-cobertura-pesqele-tse.md.
 * A classe `InstitutusScrapeAgent` continua em src/agents/agent-2-institutos.ts
 * caso os endpoints reais dos institutos sejam mapeados no futuro; esta
 * rota só não a executa mais automaticamente nem por chamada manual.
 */

import { NextRequest, NextResponse } from "next/server";

function isAuthorized(req: NextRequest): boolean {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && token === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      ok: false,
      retired: true,
      message:
        "Agente 2 aposentado em 2026-08-17 — scraper confirmado inoperante contra os sites reais dos institutos. Ver docs/ELECTIOLAB-AUDIT-2026-08.md.",
    },
    { status: 410 }
  );
}
