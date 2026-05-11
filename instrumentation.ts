/**
 * Next.js instrumentation hook — registra Sentry server/edge configs no boot.
 * Só funciona se SENTRY_DSN estiver definido (configs são env-gated).
 */
export async function register() {
  console.log("[instrumentation] register() called, NEXT_RUNTIME =", process.env.NEXT_RUNTIME);
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[instrumentation] importing sentry.server.config");
    await import("./sentry.server.config");
    console.log("[instrumentation] sentry.server.config imported");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    console.log("[instrumentation] importing sentry.edge.config");
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
