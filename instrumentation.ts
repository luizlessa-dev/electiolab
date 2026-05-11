/**
 * Next.js instrumentation hook — registra Sentry server/edge configs no boot.
 * Só funciona se SENTRY_DSN estiver definido (configs são env-gated).
 */
export async function register() {
  console.error("[instrumentation] register() called, NEXT_RUNTIME =", process.env.NEXT_RUNTIME);
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.error("[instrumentation] importing sentry.server.config");
    await import("./sentry.server.config");
    console.error("[instrumentation] sentry.server.config imported");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    console.error("[instrumentation] importing sentry.edge.config");
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
