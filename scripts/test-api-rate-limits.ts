#!/usr/bin/env npx tsx
/**
 * Script de teste para validar rate limiting de API (anonymous + autenticado)
 *
 * Testa:
 * 1. Anonymous rate limit (60 req/dia)
 * 2. Pro API key (1.000 req/mês)
 * 3. Business API key (10.000 req/mês)
 * 4. Headers X-RateLimit-*
 *
 * Uso:
 *   npx tsx scripts/test-api-rate-limits.ts [BASE_URL] [PRO_KEY] [BUSINESS_KEY]
 *
 * Exemplo:
 *   npx tsx scripts/test-api-rate-limits.ts http://localhost:3000 el_pro_xyz el_business_abc
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const PRO_KEY = process.argv[3];
const BUSINESS_KEY = process.argv[4];

const TEST_ENDPOINT = `${BASE_URL}/api/v1/elections`;

interface TestResult {
  name: string;
  passed: boolean;
  details: string[];
  error?: string;
}

const results: TestResult[] = [];

async function testAnonymous(): Promise<void> {
  console.log("\n🧪 TESTE 1: Anonymous Rate Limit (60/dia)\n");

  const result: TestResult = {
    name: "Anonymous Rate Limit",
    passed: true,
    details: [],
  };

  // Fazer requisições até atingir o limite
  let rateLimitReached = false;
  let requestsUntilLimit = 0;

  for (let i = 1; i <= 65; i++) {
    try {
      const res = await fetch(TEST_ENDPOINT, {
        headers: { "X-Forwarded-For": "192.168.1.100" },
      });

      const remaining = res.headers.get("X-RateLimit-Remaining");
      const limit = res.headers.get("X-RateLimit-Limit");
      const reset = res.headers.get("X-RateLimit-Reset");

      result.details.push(
        `  Request ${i.toString().padStart(2)}: ${res.status} | Remaining: ${remaining ?? "N/A"} | Limit: ${limit ?? "N/A"}`
      );

      if (res.status === 429) {
        rateLimitReached = true;
        requestsUntilLimit = i;
        result.details.push(
          `  ✅ Rate limit atingido no request ${i} (esperado: ~61)`
        );

        const body = await res.json();
        result.details.push(
          `     Reset: ${reset ?? body.reset_at ?? "N/A"}`
        );
        break;
      }
    } catch (e) {
      result.error = String(e);
      result.passed = false;
      break;
    }
  }

  if (!rateLimitReached) {
    result.passed = false;
    result.error =
      "Rate limit não foi atingido após 65 requisições (esperado em ~61)";
  }

  results.push(result);
  console.log(result.details.join("\n"));
}

async function testApiKey(
  tier: "pro" | "business",
  key: string | undefined
): Promise<void> {
  if (!key) {
    console.log(`\n⏭️  TESTE (${tier.toUpperCase()}): Pulado (key não fornecida)\n`);
    return;
  }

  const limit = tier === "pro" ? 1000 : 10000;
  console.log(`\n🧪 TESTE 2/${tier === "business" ? "3" : "2"}: ${tier.toUpperCase()} Rate Limit (${limit}/mês)\n`);

  const result: TestResult = {
    name: `${tier.toUpperCase()} API Key`,
    passed: true,
    details: [],
  };

  // Fazer 5 requisições e verificar que remaining decresce
  const remainingBefore: number[] = [];

  for (let i = 1; i <= 5; i++) {
    try {
      const res = await fetch(TEST_ENDPOINT, {
        headers: { Authorization: `Bearer ${key}` },
      });

      const remaining = parseInt(res.headers.get("X-RateLimit-Remaining") ?? "0");
      const tier_header = res.headers.get("X-API-Tier");

      remainingBefore.push(remaining);

      result.details.push(
        `  Request ${i}: ${res.status} | Remaining: ${remaining} | Tier: ${tier_header ?? "N/A"}`
      );

      if (res.status !== 200 && res.status !== 429) {
        result.error = `Unexpected status ${res.status}`;
        result.passed = false;
      }
    } catch (e) {
      result.error = String(e);
      result.passed = false;
      break;
    }
  }

  // Verificar que remaining está diminuindo
  if (remainingBefore.length === 5) {
    const isDecreasing = remainingBefore.every(
      (val, i) => i === 0 || val <= remainingBefore[i - 1]
    );

    if (isDecreasing) {
      result.details.push(`  ✅ Remaining está decrementando corretamente`);
    } else {
      result.passed = false;
      result.error = "Remaining não está decrementando";
    }
  }

  results.push(result);
  console.log(result.details.join("\n"));
}

async function printSummary(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMO DOS TESTES\n");

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const status = r.passed ? "✅ PASSOU" : "❌ FALHOU";
    console.log(`${status} | ${r.name}`);
    if (r.error) {
      console.log(`       └─ ${r.error}`);
    }
    if (r.passed) passed++;
    else failed++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${passed} passou, ${failed} falhou\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log("🚀 ElectioLab API Rate Limit Test Suite");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Pro Key: ${PRO_KEY ? "✓ fornecida" : "✗ não fornecida"}`);
  console.log(`🔑 Business Key: ${BUSINESS_KEY ? "✓ fornecida" : "✗ não fornecida"}`);

  await testAnonymous();
  await testApiKey("pro", PRO_KEY);
  await testApiKey("business", BUSINESS_KEY);

  await printSummary();
}

main().catch((e) => {
  console.error("❌ Erro fatal:", e);
  process.exit(1);
});
