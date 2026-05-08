/**
 * Next.js instrumentation hook — registra Sentry server/edge configs no boot.
 * Só funciona se SENTRY_DSN estiver definido (configs são env-gated).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
