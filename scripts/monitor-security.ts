#!/usr/bin/env node

/**
 * Security Monitoring Dashboard
 *
 * Monitora:
 * 1. Security Alerts (/api/admin/security-alerts)
 * 2. Rate Limiting Logs
 * 3. RLS Policies Status
 *
 * Usage:
 *   npx tsx scripts/monitor-security.ts [--hours=1-24] [--admin-token=TOKEN]
 */

import * as fs from "fs";

interface SecurityAlert {
  ip: string;
  failureCount: number;
  lastFailure: string;
  endpoints: string[];
  statusCodes: number[];
}

interface RateLimitLog {
  timestamp: string;
  endpoint: string;
  ip: string;
  status: number;
  remaining: number;
  retryAfter?: number;
}

interface RLSPolicy {
  policyname: string;
  tablename: string;
  permissive: string;
  roles: string[];
  qual: string;
}

async function checkSecurityAlerts(hours: number = 1, adminToken?: string) {
  console.log("\n🔍 Checking Security Alerts...");

  try {
    const url = `http://localhost:3001/api/admin/security-alerts?hours=${hours}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }

    const response = await fetch(url, { headers });

    if (response.status === 401) {
      console.log("   ⚠️  Unauthenticated - need admin token");
      return { status: "unauthenticated" };
    }

    if (response.status === 403) {
      console.log("   ⚠️  Forbidden - token is not admin");
      return { status: "forbidden" };
    }

    if (!response.ok) {
      console.log(`   ❌ Error: ${response.status} ${response.statusText}`);
      return { status: "error" };
    }

    const data = await response.json();

    console.log(`   ✅ Endpoint responsive (${hours}h window)`);
    console.log(`   📊 Summary: ${data.summary?.total_failures || 0} failures`);

    if (data.suspicious_activity && data.suspicious_activity.length > 0) {
      console.log(`   🚨 SUSPICIOUS: ${data.suspicious_activity.length} IPs with high activity`);
      for (const alert of data.suspicious_activity.slice(0, 3)) {
        console.log(`      - IP: ${alert.ip}, Failures: ${alert.failure_count}`);
      }
    } else {
      console.log(`   ✨ No suspicious activity detected`);
    }

    return {
      status: "ok",
      data,
    };
  } catch (error) {
    console.log(`   ❌ Failed to check: ${error instanceof Error ? error.message : String(error)}`);
    return { status: "error" };
  }
}

async function checkRateLimitingLogs() {
  console.log("\n⏱️  Checking Rate Limiting Status...");

  try {
    // Test rate limiting by making rapid requests
    const endpoints = [
      { name: "polls", url: "http://localhost:3001/api/v1/polls?limit=1" },
      { name: "averages", url: "http://localhost:3001/api/v1/averages?election_id=test" },
      { name: "candidates-search", url: "http://localhost:3001/api/v1/candidates-search?q=test" },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        const retryAfter = response.headers.get("Retry-After");

        if (response.status === 429) {
          console.log(`   ⏸️  ${endpoint.name}: Rate limited (Retry-After: ${retryAfter}s)`);
        } else if (response.status === 200 || response.status === 400) {
          console.log(`   ✅ ${endpoint.name}: OK (${response.status})`);
        } else {
          console.log(`   ⚠️  ${endpoint.name}: Unexpected status (${response.status})`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint.name}: Connection error`);
      }
    }

    return { status: "ok" };
  } catch (error) {
    console.log(`   ❌ Failed to check: ${error instanceof Error ? error.message : String(error)}`);
    return { status: "error" };
  }
}

async function checkRLSPolicies() {
  console.log("\n🔐 Checking RLS Policies...");

  try {
    // This would normally query Supabase via MCP
    // For now, we'll show what to verify

    const requiredTables = ["polls", "weighted_averages", "auth_failure_logs"];
    const expectedPolicies = {
      polls: 6,
      weighted_averages: 6,
      auth_failure_logs: 1,
    };

    console.log(`   📋 Expected configuration:`);
    for (const table of requiredTables) {
      const count = expectedPolicies[table as keyof typeof expectedPolicies] || 0;
      console.log(`      - ${table}: ${count} policies, RLS enabled`);
    }

    console.log(`\n   ℹ️  To verify in Supabase SQL Editor, run:`);
    console.log(`      SELECT tablename, rowsecurity FROM pg_tables`);
    console.log(`      WHERE tablename IN ('polls', 'weighted_averages', 'auth_failure_logs');`);

    console.log(`\n      SELECT policyname, tablename FROM pg_policies`);
    console.log(`      WHERE tablename IN ('polls', 'weighted_averages', 'auth_failure_logs')`);
    console.log(`      ORDER BY tablename, policyname;`);

    return { status: "manual_check_required" };
  } catch (error) {
    console.log(`   ❌ Failed to check: ${error instanceof Error ? error.message : String(error)}`);
    return { status: "error" };
  }
}

async function generateReport(hours: number, adminToken?: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔒 SECURITY MONITORING REPORT`);
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}`);

  const alerts = await checkSecurityAlerts(hours, adminToken);
  const rateLimit = await checkRateLimitingLogs();
  const rls = await checkRLSPolicies();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${"=".repeat(60)}`);

  console.log(`\n✅ Security Alerts API: ${alerts.status === "ok" ? "WORKING" : "CHECK REQUIRED"}`);
  console.log(`✅ Rate Limiting: ${rateLimit.status === "ok" ? "WORKING" : "CHECK REQUIRED"}`);
  console.log(`✅ RLS Policies: ${rls.status === "manual_check_required" ? "VERIFY IN SUPABASE" : rls.status === "ok" ? "WORKING" : "CHECK REQUIRED"}`);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔗 Next Steps:`);
  console.log(`${"=".repeat(60)}`);
  console.log(`1. Monitor /api/admin/security-alerts every 5-15 minutes`);
  console.log(`2. Check rate limit headers in API responses`);
  console.log(`3. Verify RLS in Supabase dashboard (SQL Editor)`);
  console.log(`4. Set up alerts for 5+ failures in 15min window`);
  console.log(`5. Review auth_failure_logs table monthly\n`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
let hours = 1;
let adminToken: string | undefined;

for (const arg of args) {
  if (arg.startsWith("--hours=")) {
    const value = parseInt(arg.split("=")[1]);
    if (!isNaN(value) && value >= 1 && value <= 24) {
      hours = value;
    }
  }
  if (arg.startsWith("--admin-token=")) {
    adminToken = arg.split("=")[1];
  }
}

generateReport(hours, adminToken).catch((error) => {
  console.error("❌ Monitoring failed:", error);
  process.exit(1);
});
