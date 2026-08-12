/**
 * Email Notification Service
 *
 * Sends emails for:
 * - Daily digest (9 AM UTC)
 * - Critical anomalies (immediate)
 * - Sync failures (immediate)
 * - Weekly summary (Monday 9 AM)
 */

export interface AnomalyAlert {
  state: string
  position: string
  candidateName: string
  researchPercentage: number
  aggregatedPercentage: number
  deviation: number
  confidence: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  timestamp: string
}

export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  tags?: string[]
}

export interface EmailTemplate {
  subject: string
  html: string
}

class EmailNotifier {
  private provider: 'sendgrid' | 'resend' | 'mailgun' | 'none' = 'none';
  private apiKey: string | null = null;
  private fromEmail: string = process.env.EMAIL_FROM || 'noreply@gastronomizae.com';
  private isEnabled: boolean = false;

  constructor() {
    const provider = process.env.EMAIL_PROVIDER?.toLowerCase();

    if (provider === 'sendgrid' || provider === 'resend' || provider === 'mailgun') {
      this.provider = provider as any;
      this.apiKey = process.env.EMAIL_API_KEY || null;
      this.isEnabled = !!this.apiKey;
    }

    if (!this.isEnabled) {
      console.warn('[Email] Provider not configured. Email notifications disabled.');
    }
  }

  /**
   * Send anomaly alert email
   */
  async sendAnomalyEmail(anomaly: AnomalyAlert, recipients: string[]): Promise<void> {
    if (!this.isEnabled) {
      console.log('[Email] Skipped (disabled):', anomaly);
      return;
    }

    const template = this.createAnomalyTemplate(anomaly);
    const message: EmailMessage = {
      to: recipients,
      subject: template.subject,
      html: template.html,
      tags: ['anomaly', `severity-${anomaly.severity}`],
    };

    await this.sendEmail(message);
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigest(
    data: {
      totalStates: number
      healthyStates: number
      warningStates: number
      criticalStates: number
      totalAnomalies: number
      topAnomalies: AnomalyAlert[]
      summary: string
    },
    recipients: string[]
  ): Promise<void> {
    if (!this.isEnabled) return;

    const template = this.createDailyDigestTemplate(data);
    const message: EmailMessage = {
      to: recipients,
      subject: template.subject,
      html: template.html,
      tags: ['digest', 'daily'],
    };

    await this.sendEmail(message);
  }

  /**
   * Send sync failure notification
   */
  async sendSyncFailureEmail(
    error: string,
    failedStates: string[],
    recipients: string[]
  ): Promise<void> {
    if (!this.isEnabled) return;

    const template = this.createSyncFailureTemplate(error, failedStates);
    const message: EmailMessage = {
      to: recipients,
      subject: template.subject,
      html: template.html,
      tags: ['error', 'sync-failure'],
    };

    await this.sendEmail(message);
  }

  /**
   * Send weekly summary
   */
  async sendWeeklySummary(
    data: {
      week: string
      totalPolls: number
      totalAnomalies: number
      topChanges: Array<{
        candidate: string
        state: string
        change: number
      }>
      trends: string
    },
    recipients: string[]
  ): Promise<void> {
    if (!this.isEnabled) return;

    const template = this.createWeeklySummaryTemplate(data);
    const message: EmailMessage = {
      to: recipients,
      subject: template.subject,
      html: template.html,
      tags: ['summary', 'weekly'],
    };

    await this.sendEmail(message);
  }

  /**
   * Create anomaly email template
   */
  private createAnomalyTemplate(anomaly: AnomalyAlert): EmailTemplate {
    const severityColor: Record<string, string> = {
      critical: '#e20000',
      high: '#ff9900',
      medium: '#ffd700',
      low: '#3498db',
    };

    const color = severityColor[anomaly.severity] || '#999';

    return {
      subject: `🚨 [${anomaly.severity.toUpperCase()}] Anomaly Detected - ${anomaly.state}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${color}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .section { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
              .field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
              .field:last-child { border-bottom: none; }
              .label { font-weight: bold; color: #666; }
              .value { text-align: right; }
              .button { display: inline-block; padding: 10px 20px; background: ${color}; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px 10px 0; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">Election Poll Anomaly Detected</h2>
              </div>

              <div class="section">
                <h3>Anomaly Details</h3>
                <div class="field">
                  <span class="label">State:</span>
                  <span class="value">${anomaly.state}</span>
                </div>
                <div class="field">
                  <span class="label">Position:</span>
                  <span class="value">${this.formatPosition(anomaly.position)}</span>
                </div>
                <div class="field">
                  <span class="label">Candidate:</span>
                  <span class="value">${anomaly.candidateName}</span>
                </div>
                <div class="field">
                  <span class="label">Severity:</span>
                  <span class="value"><strong style="color: ${color};">${anomaly.severity.toUpperCase()}</strong></span>
                </div>
              </div>

              <div class="section">
                <h3>Data Comparison</h3>
                <div class="field">
                  <span class="label">Research Baseline:</span>
                  <span class="value">${anomaly.researchPercentage}%</span>
                </div>
                <div class="field">
                  <span class="label">Current Aggregation:</span>
                  <span class="value">${anomaly.aggregatedPercentage.toFixed(1)}%</span>
                </div>
                <div class="field">
                  <span class="label">Deviation:</span>
                  <span class="value"><strong>${anomaly.deviation > 0 ? '+' : ''}${anomaly.deviation.toFixed(1)}%</strong></span>
                </div>
                <div class="field">
                  <span class="label">Confidence:</span>
                  <span class="value">${(anomaly.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/pesquisas/${anomaly.state}" class="button">View Dashboard</a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/discrepancies" class="button">Review in Admin</a>
              </div>

              <div class="footer">
                <p>Detected at: ${new Date(anomaly.timestamp).toLocaleString('pt-BR')}</p>
                <p>© ElectioLab - Election Polling Analytics</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  }

  /**
   * Create daily digest template
   */
  private createDailyDigestTemplate(data: any): EmailTemplate {
    const anomalyRows = data.topAnomalies
      .slice(0, 5)
      .map(
        (a: any) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 10px;">${a.state}</td>
          <td style="padding: 10px;">${a.candidateName}</td>
          <td style="padding: 10px; text-align: right;"><strong>${a.deviation > 0 ? '+' : ''}${a.deviation.toFixed(1)}%</strong></td>
          <td style="padding: 10px; text-align: right; color: #666;">${a.severity.toUpperCase()}</td>
        </tr>
      `
      )
      .join('');

    return {
      subject: `📊 ElectioLab Daily Report - ${new Date().toLocaleDateString('pt-BR')}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin: 20px 0; }
              .stat { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
              .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
              .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">Daily Report</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>

              <div class="stats">
                <div class="stat">
                  <div class="stat-value">${data.healthyStates}</div>
                  <div class="stat-label">Healthy States</div>
                </div>
                <div class="stat">
                  <div class="stat-value" style="color: #ff9900;">${data.warningStates}</div>
                  <div class="stat-label">Warnings</div>
                </div>
                <div class="stat">
                  <div class="stat-value" style="color: #e20000;">${data.criticalStates}</div>
                  <div class="stat-label">Critical</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${data.totalAnomalies}</div>
                  <div class="stat-label">Anomalies</div>
                </div>
              </div>

              ${
                data.topAnomalies.length > 0
                  ? `
                <h3>Top Anomalies</h3>
                <table>
                  <thead style="background: #f5f5f5;">
                    <tr>
                      <th style="text-align: left; padding: 10px;">State</th>
                      <th style="text-align: left; padding: 10px;">Candidate</th>
                      <th style="text-align: right; padding: 10px;">Deviation</th>
                      <th style="text-align: right; padding: 10px;">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${anomalyRows}
                  </tbody>
                </table>
              `
                  : '<p style="color: #999;">No anomalies detected today ✅</p>'
              }

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/pesquisas" class="button">View Full Dashboard</a>
              </div>

              <div class="footer">
                <p>Generated at: ${new Date().toLocaleString('pt-BR')}</p>
                <p>© ElectioLab - Election Polling Analytics</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  }

  /**
   * Create sync failure template
   */
  private createSyncFailureTemplate(error: string, failedStates: string[]): EmailTemplate {
    return {
      subject: '🚨 TSE Sync Failure - Action Required',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .alert { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .error-box { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; font-family: monospace; font-size: 12px; overflow-x: auto; }
              .button { display: inline-block; padding: 10px 20px; background: #e20000; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #e20000;">TSE Synchronization Failed</h2>

              <div class="alert">
                <strong>⚠️ Action Required</strong>
                <p>The automatic TSE sync job failed. Manual intervention may be needed.</p>
              </div>

              <h3>Failed States (${failedStates.length}):</h3>
              <p>${failedStates.join(', ')}</p>

              <h3>Error Details:</h3>
              <div class="error-box">${error}</div>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/discrepancies" class="button">Review in Admin</a>
              </div>

              <p style="color: #666; font-size: 12px;">Next sync attempt: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('pt-BR')}</p>
            </div>
          </body>
        </html>
      `,
    };
  }

  /**
   * Create weekly summary template
   */
  private createWeeklySummaryTemplate(data: any): EmailTemplate {
    const topChanges = data.topChanges
      .slice(0, 10)
      .map(
        (c: any) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 10px;">${c.candidate}</td>
          <td style="padding: 10px;">${c.state}</td>
          <td style="padding: 10px; text-align: right;"><strong style="color: ${c.change > 0 ? '#28a745' : '#e20000'}">${c.change > 0 ? '+' : ''}${c.change.toFixed(1)}%</strong></td>
        </tr>
      `
      )
      .join('');

    return {
      subject: `📈 ElectioLab Weekly Summary - Week of ${data.week}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">Weekly Summary</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Week of ${data.week}</p>
              </div>

              <h3>Summary</h3>
              <p>${data.trends}</p>

              <h3>Top Changes This Week</h3>
              <table>
                <thead style="background: #f5f5f5;">
                  <tr>
                    <th style="text-align: left; padding: 10px;">Candidate</th>
                    <th style="text-align: left; padding: 10px;">State</th>
                    <th style="text-align: right; padding: 10px;">Change</th>
                  </tr>
                </thead>
                <tbody>
                  ${topChanges}
                </tbody>
              </table>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/pesquisas" class="button">View Full Analytics</a>
              </div>

              <div class="footer">
                <p>© ElectioLab - Election Polling Analytics</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  }

  /**
   * Send email via provider
   */
  private async sendEmail(message: EmailMessage): Promise<void> {
    if (!this.isEnabled || !this.apiKey) {
      console.log('[Email] Skipped (not configured)');
      return;
    }

    try {
      switch (this.provider) {
        case 'sendgrid':
        case 'resend':
        case 'mailgun':
          await this.sendViaResend(message);
          break;
        default:
          console.warn('[Email] Unknown provider:', this.provider);
      }
    } catch (error) {
      console.error('[Email] Error sending email:', error);
    }
  }

  /**
   * Send via SendGrid
   */
  private async sendViaResend(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        reply_to: message.replyTo,
        tags: message.tags,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    console.log('[Email] Sent via Resend');
  }

  /**
   * Send via SendGrid
   */
  private async sendViaResend2(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: (Array.isArray(message.to) ? message.to : [message.to]).map(email => ({ email })),
          },
        ],
        from: { email: this.fromEmail },
        subject: message.subject,
        content: [
          {
            type: 'text/html',
            value: message.html,
          },
        ],
        categories: message.tags,
      }),
    });

    if (response.status !== 202) {
      throw new Error(`SendGrid API error: ${response.statusText}`);
    }

    console.log('[Email] Sent via SendGrid');
  }

  /**
   * Send via Mailgun
   */
  private async sendViaMailgun(message: EmailMessage): Promise<void> {
    const domain = process.env.MAILGUN_DOMAIN || 'mail.gastronomizae.com';
    const formData = new FormData();

    formData.append('from', this.fromEmail);
    formData.append('to', Array.isArray(message.to) ? message.to.join(',') : message.to);
    formData.append('subject', message.subject);
    formData.append('html', message.html);

    if (message.replyTo) {
      formData.append('h:Reply-To', message.replyTo);
    }

    if (message.tags) {
      message.tags.forEach(tag => formData.append('o:tag', tag));
    }

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
      },
      body: formData as any,
    });

    if (!response.ok) {
      throw new Error(`Mailgun API error: ${response.statusText}`);
    }

    console.log('[Email] Sent via Mailgun');
  }

  /**
   * Format position for display
   */
  private formatPosition(position: string): string {
    const labels: Record<string, string> = {
      governador: 'Governador',
      senador: 'Senador',
      presidencial: 'Presidencial',
    };
    return labels[position] || position;
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    enabled: boolean
    provider: string
    configured: boolean
    fromEmail: string
  } {
    return {
      enabled: this.isEnabled,
      provider: this.provider,
      configured: !!this.apiKey,
      fromEmail: this.fromEmail,
    };
  }
}

// Export singleton
export const emailNotifier = new EmailNotifier();
