#!/usr/bin/env node

/**
 * Test Rate Limiting on Public APIs
 *
 * Usage:
 *   npx tsx scripts/test-rate-limit.ts [--endpoint=polls|averages|candidates-search] [--limit=50]
 *
 * Example:
 *   npx tsx scripts/test-rate-limit.ts --endpoint=polls --limit=50
 *   npx tsx scripts/test-rate-limit.ts --endpoint=candidates-search --limit=100
 */

import * as path from "path";
import * as fs from "fs";

interface TestConfig {
  endpoint: "polls" | "averages" | "candidates-search";
  limit: number;
  baseUrl: string;
  requestsToMake: number;
}

const endpoints = {
  polls: { limit: 50, url: "http://localhost:3000/api/v1/polls?limit=1" },
  averages: { limit: 50, url: "http://localhost:3000/api/v1/averages?election_id=invalid" },
  "candidates-search": { limit: 100, url: "http://localhost:3000/api/v1/candidates-search?q=silva&limit=1" },
};

async function testRateLimit(config: TestConfig) {
  console.log(`\n🧪 Testing Rate Limiting`);
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Limit: ${config.limit} requests/minute`);
  console.log(`   URL: ${config.baseUrl}`);
  console.log(`   Requests to make: ${config.requestsToMake}\n`);

  const results = {
    successful: 0,
    rateLimited: 0,
    errors: 0,
    responses: [] as Array<{
      attempt: number;
      status: number;
      retryAfter?: string;
      time: string;
    }>,
  };

  for (let i = 1; i <= config.requestsToMake; i++) {
    try {
      const response = await fetch(config.baseUrl, {
        method: "GET",
        headers: {
          "User-Agent": "RateLimitTest/1.0",
        },
      });

      const status = response.status;
      const retryAfter = response.headers.get("Retry-After");
      const time = new Date().toISOString().split("T")[1].slice(0, 8);

      results.responses.push({
        attempt: i,
        status,
        retryAfter: retryAfter || undefined,
        time,
      });

      if (status === 429) {
        results.rateLimited++;
        console.log(`   ⏸️  [${i}/${config.requestsToMake}] 429 Rate Limited (retry in ${retryAfter}s)`);
      } else if (status === 200 || status === 400) {
        // 200 = success, 400 = invalid params (still allowed)
        results.successful++;
        console.log(`   ✅ [${i}/${config.requestsToMake}] ${status} OK`);
      } else {
        results.errors++;
        console.log(`   ⚠️  [${i}/${config.requestsToMake}] ${status} Unexpected`);
      }
    } catch (error) {
      results.errors++;
      console.log(`   ❌ [${i}/${config.requestsToMake}] Error: ${error}`);
    }

    // Small delay between requests (10ms)
    await new Promise((r) => setTimeout(r, 10));
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Successful: ${results.successful}`);
  console.log(`   ⏸️  Rate Limited: ${results.rateLimited}`);
  console.log(`   ❌ Errors: ${results.errors}`);

  if (results.rateLimited > 0) {
    console.log(`\n✨ Rate limiting is WORKING! Got 429 after ~${results.limit} requests.`);
  } else if (results.successful >= config.limit) {
    console.log(
      `\n⚠️  WARNING: Made ${results.successful} requests without hitting rate limit.`
    );
    console.log(
      `   Either the rate limiter isn't active or the migration hasn't been applied yet.`
    );
  }

  return results;
}

// Parse CLI arguments
const args = process.argv.slice(2);
let endpoint: keyof typeof endpoints = "polls";
let requestsToMake = 60; // More than any limit

for (const arg of args) {
  if (arg.startsWith("--endpoint=")) {
    const value = arg.split("=")[1] as keyof typeof endpoints;
    if (value in endpoints) {
      endpoint = value;
    }
  }
  if (arg.startsWith("--requests=")) {
    const value = parseInt(arg.split("=")[1]);
    if (!isNaN(value)) {
      requestsToMake = value;
    }
  }
}

const config: TestConfig = {
  endpoint,
  limit: endpoints[endpoint].limit,
  baseUrl: endpoints[endpoint].url,
  requestsToMake,
};

testRateLimit(config)
  .then((results) => {
    process.exit(results.rateLimited > 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
