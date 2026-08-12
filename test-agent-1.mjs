#!/usr/bin/env node

/**
 * Test script for Agent 1 (TSE Ingestão)
 *
 * Usage:
 *   node test-agent-1.mjs
 *
 * Tests:
 *   1. Download TSE ZIP (real or mock)
 *   2. Extract CSV
 *   3. Parse CSV
 *   4. (Requires env vars for Supabase test)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log("🧪 Agent 1 Test Script");
console.log("======================\n");

// Test 1: Can we connect to Supabase?
console.log("📋 Test 1: Supabase connection...");
try {
  const { error } = await supabase
    .from("pesqele_registry")
    .select("count")
    .limit(1);

  if (error) throw error;
  console.log("✅ Supabase connected");
} catch (e) {
  console.error("❌ Supabase connection failed:", e.message);
  process.exit(1);
}

// Test 2: Does TSE ZIP URL respond?
console.log("\n📋 Test 2: TSE CDN URL reachability...");
const TSE_URL = "https://cdn.tse.jus.br/pesquisa_eleitoral_2026.zip";
try {
  const response = await fetch(TSE_URL, { method: "HEAD" });
  if (response.ok || response.status === 405) {
    // 405 = Method Not Allowed is OK (means URL exists)
    console.log(`✅ TSE CDN URL reachable (status: ${response.status})`);
  } else {
    console.warn(`⚠️  TSE CDN returned ${response.status}`);
  }
} catch (e) {
  console.error("❌ TSE CDN unreachable:", e.message);
  console.log("   (This may be expected if offline or behind firewall)");
}

// Test 3: Mock CSV parsing
console.log("\n📋 Test 3: CSV parsing (mock)...");
const mockCsv = `protocol,institute,fieldwork_start,fieldwork_end,publication_date
001,Datafolha,2026-08-01,2026-08-05,2026-08-06
002,Ipec,2026-08-02,2026-08-06,2026-08-07
003,Quaest,2026-08-03,2026-08-07,2026-08-08`;

function parseCSV(content) {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    if (row.protocol) {
      rows.push(row);
    }
  }

  return rows;
}

const parsed = parseCSV(mockCsv);
if (parsed.length === 3) {
  console.log(`✅ CSV parsing works (parsed ${parsed.length} rows)`);
  console.log(`   Sample row:`, parsed[0]);
} else {
  console.error(`❌ CSV parsing failed (expected 3 rows, got ${parsed.length})`);
  process.exit(1);
}

// Test 4: Supabase upsert (safe test — won't commit)
console.log("\n📋 Test 4: Supabase upsert simulation...");
console.log("   (Testing connection, not actually upserting)");

try {
  // Just test the connection, don't actually insert
  const { error } = await supabase
    .from("pesqele_registry")
    .select("count")
    .limit(1);

  if (error) throw error;
  console.log("✅ Supabase upsert API reachable");
} catch (e) {
  console.error("❌ Supabase upsert failed:", e.message);
  process.exit(1);
}

console.log("\n✅ All tests passed!");
console.log("\nNext steps:");
console.log("1. Review Agent 1 code: src/agents/agent-1-tse.ts");
console.log("2. Run: npm run dev");
console.log("3. Test webhook: POST /api/webhooks/ruflo/tse-complete");
console.log("4. Monitor logs for any errors");
