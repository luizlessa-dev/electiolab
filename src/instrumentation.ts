/**
 * Next.js instrumentation hook.
 * Init Sentry inline (sem dynamic import) pra eliminar variabilidade.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  console.error("[instrumentation] register() called, NEXT_RUNTIME =", process.env.NEXT_RUNTIME);

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.error("[instrumentation] NO DSN — skipping Sentry init");
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    console.error("[instrumentation] calling Sentry.init inline, dsn length:", dsn.length);
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? "development",
      tracesSampleRate: 0.1,
      debug: true,
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "Non-Error promise rejection captured",
        "AbortError",
      ],
    });
    console.error("[instrumentation] Sentry.init returned, client active =", Boolean(Sentry.getClient()));
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
