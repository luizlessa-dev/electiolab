/**
 * Sentry EDGE config — captura erros no middleware e em rotas edge.
 * Ativo apenas se SENTRY_DSN (ou NEXT_PUBLIC_SENTRY_DSN) estiver definido, para
 * que erros de desenvolvimento local não poluam o projeto de produção.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0.05,
    enableLogs: true,
  });
}
