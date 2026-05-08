import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/test-sentry?confirm=YES
 * Endpoint só pra validar que Sentry está capturando errors em produção.
 * Captura manual via Sentry.captureException + throw (auto-capture do withSentryConfig).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const confirm = url.searchParams.get("confirm");
  if (confirm !== "YES") {
    return NextResponse.json(
      { error: "Use ?confirm=YES pra disparar evento de teste no Sentry" },
      { status: 400 }
    );
  }

  const err = new Error("ElectioLab Sentry smoke test — " + new Date().toISOString());
  // Captura manual (garante envio mesmo se auto-capture falhar)
  Sentry.captureException(err);
  await Sentry.flush(2000); // garante envio antes do throw quebrar a request

  throw err;
}
