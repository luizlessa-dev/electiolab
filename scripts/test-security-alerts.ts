#!/usr/bin/env node

/**
 * Security Alerts Test Script
 *
 * Tests the alert system by:
 * 1. Simulating auth failures
 * 2. Triggering alert detection
 * 3. Validating Slack/Email notifications
 *
 * Usage:
 *   npx tsx scripts/test-security-alerts.ts [--simulate-auth] [--simulate-ratelimit]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: string;
}

const results: TestResult[] = [];

async function testTableExists() {
  console.log('\n🔍 Test 1: Check if security_alerts table exists...');

  try {
    const { data, error } = await supabase
      .from('security_alerts')
      .select('id')
      .limit(1);

    if (error && error.message.includes('no such table')) {
      results.push({
        test: 'security_alerts table',
        status: 'fail',
        message: 'Table does not exist',
        details: 'Run migration 20260930120000_security_alerts_table.sql in Supabase SQL Editor',
      });
      console.log('   ❌ Table does not exist');
      return false;
    }

    results.push({
      test: 'security_alerts table',
      status: 'pass',
      message: 'Table exists and accessible',
    });
    console.log('   ✅ Table exists');
    return true;
  } catch (error) {
    results.push({
      test: 'security_alerts table',
      status: 'fail',
      message: String(error),
    });
    console.log('   ❌ Error:', error);
    return false;
  }
}

async function simulateAuthFailures() {
  console.log('\n🔍 Test 2: Simulate auth failures (5+ in 15min)...');

  if (!process.argv.includes('--simulate-auth')) {
    results.push({
      test: 'Simulate auth failures',
      status: 'skip',
      message: 'Skipped (use --simulate-auth to run)',
    });
    console.log('   ⏭️  Skipped (use --simulate-auth flag)');
    return;
  }

  try {
    // Create 6 auth failures
    const testIp = '192.168.1.99';
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const timestamp = new Date(now.getTime() - (15 - i) * 60 * 1000); // Last 15 minutes
      await supabase.from('auth_failure_logs').insert({
        endpoint: '/admin',
        method: 'GET',
        ip_address: testIp,
        user_id: null,
        status_code: 401,
        error_message: `Test failure ${i + 1}`,
        timestamp: timestamp.toISOString(),
        user_agent: 'test-script/1.0',
      });
    }

    console.log(`   ✅ Inserted 6 auth failures for IP ${testIp}`);
    console.log('   📊 Should trigger alert on next cron run (*/5 * * * *)');

    results.push({
      test: 'Simulate auth failures',
      status: 'pass',
      message: `Created 6 failures for ${testIp}`,
    });
  } catch (error) {
    results.push({
      test: 'Simulate auth failures',
      status: 'fail',
      message: String(error),
    });
    console.log('   ❌ Error:', error);
  }
}

async function simulateRateLimitAbuse() {
  console.log('\n🔍 Test 3: Simulate rate limit abuse (100+ attempts)...');

  if (!process.argv.includes('--simulate-ratelimit')) {
    results.push({
      test: 'Simulate rate limit abuse',
      status: 'skip',
      message: 'Skipped (use --simulate-ratelimit to run)',
    });
    console.log('   ⏭️  Skipped (use --simulate-ratelimit flag)');
    return;
  }

  try {
    // Create 150 rate limit entries
    const testIdentifier = 'test-api-key-abuse-123';
    const now = new Date();

    // Insert 150 rate limit counters
    const entries = Array.from({ length: 150 }, (_, i) => ({
      identifier: testIdentifier,
      count: i + 1,
      endpoint: '/api/v1/polls',
      reset_at: new Date(now.getTime() + 60000).toISOString(),
    }));

    await supabase.from('rate_limit_counters').insert(entries);

    console.log(`   ✅ Inserted 150 rate limit entries for ${testIdentifier}`);
    console.log('   📊 Should trigger alert on next cron run');

    results.push({
      test: 'Simulate rate limit abuse',
      status: 'pass',
      message: `Created 150 attempts for ${testIdentifier}`,
    });
  } catch (error) {
    results.push({
      test: 'Simulate rate limit abuse',
      status: 'fail',
      message: String(error),
    });
    console.log('   ❌ Error:', error);
  }
}

async function testCronEndpoint() {
  console.log('\n🔍 Test 4: Test cron endpoint manually...');

  try {
    const port = process.env.PORT || '3001';
    const url = `http://localhost:${port}/api/cron/security-alerts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Cron-Secret': process.env.CRON_SECRET || '',
      },
    });

    if (response.status === 401) {
      results.push({
        test: 'Cron endpoint',
        status: 'fail',
        message: 'Invalid CRON_SECRET',
      });
      console.log('   ❌ Cron secret is invalid');
      return;
    }

    const data = await response.json();

    results.push({
      test: 'Cron endpoint',
      status: response.ok ? 'pass' : 'fail',
      message: data.message || data.error,
      details: `Alerts found: ${data.count || 0}`,
    });

    console.log(`   ✅ Cron response: ${data.message || data.error}`);
    if (data.alerts) {
      console.log(`   📊 Alerts: ${data.alerts.length}`);
    }
  } catch (error) {
    results.push({
      test: 'Cron endpoint',
      status: 'fail',
      message: String(error),
    });
    console.log('   ❌ Error:', error);
  }
}

async function testSlackNotification() {
  console.log('\n🔍 Test 5: Test Slack notification...');

  if (!process.env.SLACK_SECURITY_WEBHOOK) {
    results.push({
      test: 'Slack notification',
      status: 'skip',
      message: 'SLACK_SECURITY_WEBHOOK not configured',
    });
    console.log('   ⏭️  Skipped (SLACK_SECURITY_WEBHOOK not set)');
    return;
  }

  try {
    const response = await fetch(process.env.SLACK_SECURITY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color: '#FFA500',
            title: '🔒 Security Alert - Test',
            fields: [
              { title: 'Type', value: 'test_alert', short: true },
              { title: 'Message', value: 'This is a test alert', short: false },
            ],
          },
        ],
      }),
    });

    results.push({
      test: 'Slack notification',
      status: response.ok ? 'pass' : 'fail',
      message: response.ok ? 'Test alert sent to Slack' : 'Failed to send',
    });

    console.log(response.ok ? '   ✅ Test alert sent to Slack' : '   ❌ Failed to send');
  } catch (error) {
    results.push({
      test: 'Slack notification',
      status: 'fail',
      message: String(error),
    });
    console.log('   ❌ Error:', error);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  for (const result of results) {
    const icon =
      result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
    console.log(`${icon} ${result.test}: ${result.message}`);
    if (result.details) {
      console.log(`   └─ ${result.details}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('='.repeat(60) + '\n');

  if (failed > 0) {
    console.log('📋 Next Steps:');
    console.log('1. Apply migration in Supabase SQL Editor:');
    console.log('   supabase/migrations/20260930120000_security_alerts_table.sql');
    console.log('2. Configure environment variables:');
    console.log('   - SLACK_SECURITY_WEBHOOK (optional)');
    console.log('   - RESEND_API_KEY and ADMIN_EMAILS (optional)');
    console.log('3. Run: npx tsx scripts/test-security-alerts.ts --simulate-auth\n');
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 SECURITY ALERTS TEST SUITE');
  console.log('Generated:', new Date().toISOString());
  console.log('='.repeat(60));

  await testTableExists();
  await simulateAuthFailures();
  await simulateRateLimitAbuse();
  await testCronEndpoint();
  await testSlackNotification();
  await printSummary();

  process.exit(results.filter((r) => r.status === 'fail').length > 0 ? 1 : 0);
}

runTests();
