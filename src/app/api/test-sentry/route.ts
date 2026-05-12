import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/test-sentry?confirm=YES
 * Smoke test: valida que pipeline Sentry está capturando erros em produção.
 * Sem ?confirm=YES retorna 400 (evita disparar 500 acidental por bots).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("confirm") !== "YES") {
    return NextResponse.json(
      { error: "Use ?confirm=YES pra disparar evento de teste no Sentry" },
      { status: 400 }
    );
  }

  const err = new Error("ElectioLab Sentry smoke test — " + new Date().toISOString());
  Sentry.captureException(err);
  await Sentry.flush(2000);
  throw err;
}
