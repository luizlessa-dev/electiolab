import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/test-sentry?confirm=YES
 * Smoke test pra validar pipeline Sentry. Logs verbose pra diagnóstico.
 */
export async function GET(req: Request) {
  console.error("[test-sentry] ROUTE HANDLER STARTED");
  console.error("[test-sentry] env:", {
    has_SENTRY_DSN: Boolean(process.env.SENTRY_DSN),
    SENTRY_DSN_length: process.env.SENTRY_DSN?.length ?? 0,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
  try {
    const client = Sentry.getClient?.();
    console.error("[test-sentry] Sentry.getClient =", client ? "ACTIVE" : "NONE");
    if (client) {
      const dsnObj = client.getDsn?.();
      console.error("[test-sentry] client.getDsn =", dsnObj);
    }
  } catch (e) {
    console.error("[test-sentry] getClient threw:", String(e));
  }

  const url = new URL(req.url);
  if (url.searchParams.get("confirm") !== "YES") {
    return NextResponse.json(
      { error: "Use ?confirm=YES pra disparar evento de teste no Sentry" },
      { status: 400 }
    );
  }

  const err = new Error("ElectioLab Sentry smoke test — " + new Date().toISOString());
  console.error("[test-sentry] calling captureException");
  const eventId = Sentry.captureException(err);
  console.error("[test-sentry] captureException returned eventId:", eventId);
  console.error("[test-sentry] flushing...");
  const flushed = await Sentry.flush(5000);
  console.error("[test-sentry] flush returned:", flushed);
  throw err;
}
