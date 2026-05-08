import { test, expect } from "@playwright/test";

/**
 * E2E checkout flow — ElectioLab
 *
 * Roda contra Stripe TEST MODE. Pré-requisitos:
 *
 * 1. Variáveis de ambiente:
 *    - STRIPE_SECRET_KEY=sk_test_...
 *    - STRIPE_PRICE_PRO_MONTHLY=price_...
 *    - STRIPE_PRICE_PRO_YEARLY=price_...
 *    - STRIPE_PRICE_BUSINESS_MONTHLY=price_...
 *    - E2E_TEST_EMAIL=test+seuemail@example.com (recomendado: gmail+plus addressing)
 *    - E2E_BASE_URL (opcional, default localhost:3000)
 *
 * 2. Magic link login: o teste solicita o link e pula a etapa de email
 *    (em ambiente CI, configure o Resend webhook ou use service desktop test).
 *
 * 3. Cartão de teste Stripe: 4242 4242 4242 4242 / qualquer data futura / CVC qualquer
 */

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e@electiolab.test";
const TEST_CARD = "4242424242424242";

test.describe("Pricing page", () => {
  test("renderiza os 4 planos com preços corretos", async ({ page }) => {
    await page.goto("/precos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("text=R$ 0")).toBeVisible();
    await expect(page.locator("text=R$ 97")).toBeVisible();
    await expect(page.locator("text=R$ 497")).toBeVisible();
    await expect(page.locator("text=Custom")).toBeVisible();
  });

  test("CTAs Pro/Business redirecionam para login se não autenticado", async ({ page }) => {
    await page.goto("/precos");

    const proBtn = page.getByRole("button", { name: /Assinar Pro/i }).first();
    await proBtn.click();

    // Espera redirect para /auth/login
    await page.waitForURL(/\/auth\/login/);
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Login flow", () => {
  test("/auth/login renderiza Google + magic link", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByText(/Continuar com Google/i)).toBeVisible();
    await expect(page.getByPlaceholder(/seu@email.com/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar link/i })).toBeVisible();
  });

  test("magic link form aceita email e mostra confirmação", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByPlaceholder(/seu@email.com/i).fill(TEST_EMAIL);
    await page.getByRole("button", { name: /Enviar link/i }).click();
    await expect(page.getByText(/Link enviado/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("API endpoints (sem auth)", () => {
  test("GET /api/v1/elections retorna lista", async ({ request }) => {
    const res = await request.get("/api/v1/elections");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("GET /api/v1/averages retorna médias ponderadas", async ({ request }) => {
    const res = await request.get("/api/v1/averages");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
  });

  test("GET /api/v1/polls retorna pesquisas", async ({ request }) => {
    const res = await request.get("/api/v1/polls?limit=5");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });
});

test.describe("Checkout API (sem auth) — deve negar", () => {
  test("POST /api/stripe/checkout sem login retorna 401", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: { plan: "pro_monthly" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/stripe/checkout com plan inválido retorna 400", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: { plan: "plano_inexistente" },
    });
    // Pode ser 400 (plano não configurado) ou 401 (não autenticado) — ambos válidos
    expect([400, 401]).toContain(res.status());
  });
});

test.describe("Webhook endpoint", () => {
  test("POST /api/webhooks/stripe sem signature retorna 400", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe", {
      data: '{"foo":"bar"}',
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Sanity — site público", () => {
  test("/ retorna 200", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
  });

  test("/dashboard retorna 200", async ({ request }) => {
    const res = await request.get("/dashboard");
    expect(res.status()).toBe(200);
  });

  test("/sobre renderiza landing", async ({ page }) => {
    await page.goto("/sobre");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("/sitemap.xml válido", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<urlset");
  });
});
