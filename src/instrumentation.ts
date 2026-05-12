/**
 * Next.js instrumentation hook — inicializa Sentry SDK no boot.
 *
 * Por que aqui (em src/) e não na raiz:
 *   Next.js 16 + Sentry SDK 10 + Vercel só executa o hook quando o arquivo
 *   está em `src/instrumentation.ts`. Na raiz é silenciosamente ignorado.
 *
 * Por que init inline:
 *   `await import("./sentry.server.config")` também é ignorado pelo bundler
 *   nesse stack. Init direto aqui é o que efetivamente roda.
 *
 * Env-gated: nada inicializa sem SENTRY_DSN (modo dev / staging fechado).
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? "development",
      tracesSampleRate: 0.1,
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "Non-Error promise rejection captured",
        "AbortError",
      ],
    });
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
