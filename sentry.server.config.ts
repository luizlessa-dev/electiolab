/**
 * Sentry SERVER config — captura erros em server components, rotas de API e crons.
 * Ativo apenas se SENTRY_DSN (ou NEXT_PUBLIC_SENTRY_DSN) estiver definido, para
 * que erros de desenvolvimento local não poluam o projeto de produção.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    // Mesma taxa do client: os crons de ingestão do TSE rodam todo dia e
    // amostrar 100% das requisições só queimava cota sem revelar nada novo.
    tracesSampleRate: 0.05,
    enableLogs: true,
  });
}
