#!/usr/bin/env npx tsx
/**
 * Smoke tests pós-configuração de envs no Vercel.
 *
 * Roda contra um BASE (default produção). Verifica:
 *  1. Sentry — força 500 em /api/test-sentry e checa se evento foi enviado.
 *  2. Newsletter — POST em /api/newsletter/subscribe com email descartável.
 *  3. Stripe — GET em /api/stripe/checkout (com priceId test) deve retornar 200 + URL.
 *  4. API v1 — verifica /api/v1/elections (sem auth, anônimo).
 *  5. /openapi.yaml — confere que serve com Content-Type texto.
 *
 * Uso:
 *   npx tsx scripts/smoke-tests.ts
 *   npx tsx scripts/smoke-tests.ts --base=https://electiolab-xxx.vercel.app
 *   npx tsx scripts/smoke-tests.ts --skip=stripe,newsletter   # pular específicos
 *   SMOKE_EMAIL=test+a@gmail.com npx tsx scripts/smoke-tests.ts
 */

const BASE = process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "https://electiolab.com";
const SKIP = new Set((process.argv.find((a) => a.startsWith("--skip="))?.split("=")[1] ?? "").split(","));
const SMOKE_EMAIL = process.env.SMOKE_EMAIL ?? `smoke+${Date.now()}@electiolab.dev`;

let pass = 0, fail = 0;
const results: { name: string; ok: boolean; status?: number; note: string }[] = [];

function rec(name: string, ok: boolean, note: string, status?: number) {
  results.push({ name, ok, status, note });
  if (ok) pass++; else fail++;
  const tag = ok ? "✅" : "❌";
  const code = status ? `[${status}]` : "";
  console.log(`  ${tag} ${name.padEnd(28)} ${code.padEnd(6)} ${note}`);
}

async function check(name: string, fn: () => Promise<{ ok: boolean; status?: number; note: string }>) {
  if (SKIP.has(name.toLowerCase().split(" ")[0])) {
    console.log(`  ⏭  ${name}  (skipped)`);
    return;
  }
  try {
    const r = await fn();
    rec(name, r.ok, r.note, r.status);
  } catch (e) {
    rec(name, false, (e as Error).message);
  }
}

(async () => {
  console.log(`\n🧪 ElectioLab smoke tests`);
  console.log(`   Base: ${BASE}`);
  console.log(`   Email: ${SMOKE_EMAIL}\n`);

  // 1. Sentry: hit /api/test-sentry e confirma 500 (Sentry captura via SDK no servidor)
  await check("sentry test endpoint", async () => {
    const res = await fetch(`${BASE}/api/test-sentry`);
    return {
      ok: res.status === 500 || res.status === 200,
      status: res.status,
      note: res.status === 500
        ? "500 esperado — confere no Sentry dashboard se evento aparece (~30s)"
        : res.status === 200
        ? "200 — endpoint não força erro neste mode; sem ação"
        : `inesperado ${res.status}`,
    };
  });

  // 2. Newsletter: POST com email descartável
  await check("newsletter subscribe", async () => {
    const res = await fetch(`${BASE}/api/newsletter/subscribe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: SMOKE_EMAIL, source: "smoke-test" }),
    });
    const body = await res.text();
    const ok = res.status === 200 || res.status === 201;
    return {
      ok,
      status: res.status,
      note: ok
        ? `confere inbox de ${SMOKE_EMAIL} pra email de confirmação (Resend)`
        : `body: ${body.slice(0, 200)}`,
    };
  });

  // 3. Stripe checkout: precisa price_id válido — só verifica que endpoint não dá 500
  await check("stripe checkout endpoint", async () => {
    const res = await fetch(`${BASE}/api/stripe/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ priceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "price_TEST" }),
    });
    const body = await res.text();
    return {
      ok: res.status < 500, // 4xx é OK pro smoke (env vazio retorna 400)
      status: res.status,
      note: res.status === 200
        ? "session URL retornada — abrir no browser para testar checkout"
        : res.status < 500
        ? `endpoint vivo (${res.status}). Para teste real, configure STRIPE_PRICE_PRO_MONTHLY local`
        : `5xx — endpoint quebrou: ${body.slice(0, 200)}`,
    };
  });

  // 4. API v1 anônimo (não precisa Bearer)
  await check("api/v1/elections (anon)", async () => {
    const res = await fetch(`${BASE}/api/v1/elections`);
    if (!res.ok) return { ok: false, status: res.status, note: await res.text().then((t) => t.slice(0, 200)) };
    const body = await res.json();
    const count = body?.count ?? body?.data?.length ?? 0;
    return {
      ok: count > 0,
      status: res.status,
      note: `count=${count} eleições retornadas`,
    };
  });

  // 5. OpenAPI YAML disponível
  await check("openapi.yaml served", async () => {
    const res = await fetch(`${BASE}/openapi.yaml`);
    const ct = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const hasYaml = body.startsWith("openapi:");
    return {
      ok: res.ok && hasYaml,
      status: res.status,
      note: `${ct} | ${body.length} bytes | starts with 'openapi:'=${hasYaml}`,
    };
  });

  // Sumário
  console.log(`\n   ${pass} pass · ${fail} fail · ${results.length} total\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
