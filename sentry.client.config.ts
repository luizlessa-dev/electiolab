/**
 * Sentry CLIENT config — captura erros em browser.
 * Ativo apenas se NEXT_PUBLIC_SENTRY_DSN estiver definido.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0, // não grava sessões normais (custo)
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "Failed to fetch", // network noise
    ],
  });
}
