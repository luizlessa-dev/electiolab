/**
 * GET /api/admin/notifications/test
 *
 * Test notification integrations
 *
 * Query:
 * - channel: slack|email|all (default: all)
 */

import { NextRequest, NextResponse } from 'next/server';
import { slackNotifier } from '@/lib/notifications/slack-notifier';
import { emailNotifier } from '@/lib/notifications/email-notifier';

export async function GET(request: NextRequest) {
  try {
    const channel = request.nextUrl.searchParams.get('channel') || 'all';

    const results: Record<string, any> = {};

    // Test Slack
    if (channel === 'slack' || channel === 'all') {
      try {
        const slackStatus = slackNotifier.getStatus();
        results.slack = {
          status: slackStatus.enabled ? 'testing' : 'disabled',
          configured: slackStatus.configured,
          channel: slackStatus.channel,
        };

        if (slackStatus.enabled) {
          const testResult = await slackNotifier.testConnection();
          results.slack.tested = testResult;
          results.slack.result = testResult ? 'success' : 'failed';
        }
      } catch (error) {
        results.slack = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Test Email
    if (channel === 'email' || channel === 'all') {
      try {
        const emailStatus = emailNotifier.getStatus();
        results.email = {
          status: emailStatus.enabled ? 'configured' : 'disabled',
          configured: emailStatus.configured,
          provider: emailStatus.provider,
          fromEmail: emailStatus.fromEmail,
        };

        // Email doesn't have real-time test, just check config
        if (!emailStatus.enabled) {
          results.email.note = 'Email provider not configured. Set EMAIL_PROVIDER and EMAIL_API_KEY.';
        }
      } catch (error) {
        results.email = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return NextResponse.json(
      {
        testedAt: new Date().toISOString(),
        channels: results,
        nextSteps:
          !results.slack?.tested || !results.email?.configured
            ? 'Configure missing channels in environment variables'
            : 'All channels ready',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Test] Error:', error);
    return NextResponse.json(
      { error: 'Failed to test notifications' },
      { status: 500 }
    );
  }
}
