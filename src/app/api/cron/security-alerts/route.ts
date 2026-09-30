import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AlertEvent {
  type: 'auth_failures' | 'rate_limit_abuse';
  severity: 'warning' | 'critical';
  ip?: string;
  count: number;
  message: string;
  timestamp: string;
}

async function checkAuthFailures(): Promise<AlertEvent[]> {
  const alerts: AlertEvent[] = [];

  // Check for 5+ failures in last 15 minutes
  const { data, error } = await supabase
    .from('auth_failure_logs')
    .select('ip_address, COUNT(*) as count')
    .gt('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .group('ip_address')
    .gte('count', 5);

  if (error) {
    console.error('Error checking auth failures:', error);
    return alerts;
  }

  if (data && Array.isArray(data) && data.length > 0) {
    for (const entry of data) {
      const count = (entry as unknown as { count: number }).count;
      if (count >= 5) {
        alerts.push({
          type: 'auth_failures',
          severity: count >= 10 ? 'critical' : 'warning',
          ip: entry.ip_address || 'unknown',
          count,
          message: `🚨 Auth brute force detected: ${entry.ip_address} (${count} failures in 15min)`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

async function checkRateLimitAbuse(): Promise<AlertEvent[]> {
  const alerts: AlertEvent[] = [];

  // Check rate_limit_counters for abuse patterns
  const { data, error } = await supabase
    .from('rate_limit_counters')
    .select('*')
    .gt('reset_at', new Date().toISOString());

  if (error) {
    console.error('Error checking rate limits:', error);
    return alerts;
  }

  // Analyze patterns (this is simplified; in production you'd track 429 responses)
  if (data && Array.isArray(data)) {
    for (const counter of data) {
      const counter_data = counter as unknown as {
        identifier: string;
        count: number;
        endpoint?: string;
      };

      // If same identifier hit limit multiple times quickly
      if (counter_data.count > 100) {
        alerts.push({
          type: 'rate_limit_abuse',
          severity: counter_data.count > 200 ? 'critical' : 'warning',
          message: `⏸️ Rate limit abuse: ${counter_data.identifier} (${counter_data.count} attempts)`,
          count: counter_data.count,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

async function sendSlackAlert(alert: AlertEvent) {
  const slackWebhook = process.env.SLACK_SECURITY_WEBHOOK;
  if (!slackWebhook) return false;

  try {
    const color = alert.severity === 'critical' ? '#FF0000' : '#FFA500';
    const response = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: `🔒 Security Alert - ${alert.type}`,
            fields: [
              { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
              { title: 'Type', value: alert.type, short: true },
              { title: 'Count', value: String(alert.count), short: true },
              { title: 'IP/ID', value: alert.ip || 'N/A', short: true },
              { title: 'Message', value: alert.message, short: false },
              { title: 'Timestamp', value: alert.timestamp, short: true },
            ],
            footer: 'ElectioLab Security',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
    return false;
  }
}

async function sendEmailAlert(alert: AlertEvent) {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];
  if (!adminEmails.length) return false;

  try {
    // Using Resend (already configured in .env.local)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'security@electiolab.com',
        to: adminEmails,
        subject: `🔒 [${alert.severity.toUpperCase()}] ${alert.type} Detected`,
        html: `
          <h2>Security Alert</h2>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Count:</strong> ${alert.count}</p>
          ${alert.ip ? `<p><strong>IP/ID:</strong> ${alert.ip}</p>` : ''}
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Time:</strong> ${alert.timestamp}</p>
          <hr />
          <p>
            <a href="https://electiolab.vercel.app/api/admin/security-alerts">
              View Dashboard
            </a>
          </p>
        `,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send email alert:', error);
    return false;
  }
}

async function recordAlert(alert: AlertEvent) {
  // Store alert in database to track what was already sent
  const { error } = await supabase.from('security_alerts').insert({
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    metadata: {
      ip: alert.ip,
      count: alert.count,
    },
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to record alert:', error);
  }
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const secret = request.headers.get('X-Cron-Secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔍 Running security alerts check...');

    const authFailureAlerts = await checkAuthFailures();
    const rateLimitAlerts = await checkRateLimitAbuse();
    const allAlerts = [...authFailureAlerts, ...rateLimitAlerts];

    if (allAlerts.length === 0) {
      return NextResponse.json({
        status: 'ok',
        message: 'No security alerts',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`⚠️  Found ${allAlerts.length} alerts`);

    // Send alerts
    for (const alert of allAlerts) {
      await recordAlert(alert);
      await sendSlackAlert(alert);
      await sendEmailAlert(alert);
      console.log(`✅ Alert sent: ${alert.type} - ${alert.message}`);
    }

    return NextResponse.json({
      status: 'alerts_sent',
      count: allAlerts.length,
      alerts: allAlerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
