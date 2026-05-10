import { test, expect } from "@playwright/test";

/**
 * Smoke tests para páginas públicas críticas.
 *
 * Valida:
 *  - Status 200 (não 401, não 5xx).
 *  - <title> presente e não vazio.
 *  - Pelo menos um <h1> visível.
 *  - Canonical link presente.
 *  - JSON-LD válido nas páginas que prometem schema.
 *
 * Independente de envs Stripe/Beehiiv/Sentry. Pode rodar contra preview
 * Vercel limpo (sem secrets configurados).
 */

const PUBLIC_PAGES = [
  { path: "/", h1Match: /eleic|polít|brasil/i, schema: false },
  { path: "/sancoes", h1Match: /sanç|ceis/i, schema: true },
  { path: "/cota-parlamentar", h1Match: /cota/i, schema: false },
  { path: "/eleicao-2018", h1Match: /elei.*2018/i, schema: true },
  { path: "/eleicao-2022", h1Match: /elei.*2022/i, schema: true },
  { path: "/eleicao-2018/sp", h1Match: /são paulo/i, schema: true },
  { path: "/eleicao-2022/mg", h1Match: /minas gerais/i, schema: true },
  { path: "/api", h1Match: /infraestrutura|dados|api/i, schema: false },
  { path: "/eleicoes-governador-sp-2026", h1Match: /governador/i, schema: false },
  { path: "/pesquisas-presidenciais-2026", h1Match: /presid/i, schema: false },
];

for (const page of PUBLIC_PAGES) {
  test(`public page ${page.path} renders correctly`, async ({ page: p, request }) => {
    // 1. Status check via direct fetch (faster, less flaky)
    const res = await request.get(page.path);
    expect(res.status(), `${page.path} should not 401/5xx`).toBeLessThan(400);

    // 2. Render check via browser
    await p.goto(page.path);
    await expect(p).toHaveTitle(/.+/); // não vazio

    // 3. <h1> visível e match
    const h1 = p.locator("h1").first();
    await expect(h1).toBeVisible();
    const h1Text = (await h1.textContent()) ?? "";
    expect(h1Text, `${page.path} h1`).toMatch(page.h1Match);

    // 4. Canonical
    const canonical = await p.locator('link[rel="canonical"]').first().getAttribute("href");
    expect(canonical, `${page.path} canonical`).toContain(page.path === "/" ? "electiolab.com" : page.path);

    // 5. JSON-LD presente (quando aplicável)
    if (page.schema) {
      const ld = await p.locator('script[type="application/ld+json"]').first().textContent();
      expect(ld, `${page.path} jsonld presente`).toBeTruthy();
      // Valida JSON parseável
      expect(() => JSON.parse(ld!), `${page.path} jsonld parseável`).not.toThrow();
    }
  });
}

test("openapi.yaml served", async ({ request }) => {
  const res = await request.get("/openapi.yaml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body.startsWith("openapi:")).toBe(true);
  expect(body.length).toBeGreaterThan(1000);
});

test("api/v1/elections (anonymous tier) returns data", async ({ request }) => {
  const res = await request.get("/api/v1/elections");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.count).toBeGreaterThan(0);
});

test("sitemap.xml served and contains key URLs", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain("<urlset");
  expect(xml).toContain("/eleicao-2018");
  expect(xml).toContain("/eleicao-2022");
  expect(xml).toContain("/sancoes");
  expect(xml).toContain("/api");
});

test("robots.txt allows public crawl", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const txt = await res.text();
  expect(txt).toContain("User-agent");
  // Não deve ter Disallow: / (bloqueio total)
  expect(txt).not.toMatch(/Disallow:\s*\/\s*$/m);
});
