/**
 * Sentry SERVER config — captura erros em route handlers + server components.
 * Ativo apenas se SENTRY_DSN estiver definido (env-gated).
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0.1, // 10% de traces em produção
    // Filtra erros conhecidos / não-úteis
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "AbortError",
    ],
  });
}
