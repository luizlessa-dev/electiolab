/**
 * Sentry SERVER config — captura erros em route handlers + server components.
 * Ativo apenas se SENTRY_DSN estiver definido (env-gated).
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

// TEMP DEBUG — remover quando Sentry estiver capturando
console.error("[sentry-server-config] LOADED", {
  has_SENTRY_DSN: Boolean(process.env.SENTRY_DSN),
  SENTRY_DSN_length: process.env.SENTRY_DSN?.length ?? 0,
  has_NEXT_PUBLIC: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  resolved_dsn_length: dsn?.length ?? 0,
  NEXT_RUNTIME: process.env.NEXT_RUNTIME,
  VERCEL_ENV: process.env.VERCEL_ENV,
});

if (dsn) {
  console.error("[sentry-server-config] calling Sentry.init");
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0.1,
    debug: true, // ← verbose Sentry SDK logs
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "AbortError",
    ],
  });
  console.error("[sentry-server-config] Sentry.init returned");
} else {
  console.error("[sentry-server-config] SKIPPED — no DSN resolved");
}
