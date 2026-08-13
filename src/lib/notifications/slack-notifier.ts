/**
 * Slack Notification Service
 *
 * Sends alerts to Slack for:
 * - Critical anomalies
 * - Sync job failures
 * - TSE discrepancies
 * - Admin actions
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

interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
}

interface SlackBlockElement {
  type: string
  text?: SlackTextObject
  url?: string
  style?: 'primary' | 'danger'
}

interface SlackBlock {
  type: 'header' | 'section' | 'actions' | 'context' | 'divider'
  text?: SlackTextObject
  fields?: SlackTextObject[]
  elements?: Array<SlackTextObject | SlackBlockElement>
}

interface SlackAttachmentField {
  title: string
  value: string
  short?: boolean
}

interface SlackAttachment {
  color?: string
  fields?: SlackAttachmentField[]
}

export interface SlackMessage {
  channel?: string
  text: string
  blocks: SlackBlock[]
  attachments?: SlackAttachment[]
}

export interface SlackNotificationOptions {
  mentions?: string[] // @user or @channel
  thread_ts?: string
  reply_broadcast?: boolean
}

class SlackNotifier {
  private webhookUrl: string | null = null;
  private channel: string = process.env.SLACK_CHANNEL || '#eleicoes-alerts';
  private isEnabled: boolean = false;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || null;
    this.isEnabled = !!this.webhookUrl;

    if (!this.isEnabled) {
      console.warn('[Slack] Webhook URL not configured. Slack notifications disabled.');
    }
  }

  /**
   * Send anomaly alert to Slack
   */
  async sendAnomalyAlert(
    anomaly: AnomalyAlert,
    options?: SlackNotificationOptions
  ): Promise<void> {
    if (!this.isEnabled) {
      console.log('[Slack] Skipped (disabled):', anomaly);
      return;
    }

    const severity = anomaly.severity.toUpperCase();
    const icon = this.getSeverityIcon(anomaly.severity);
    const mentions = this.shouldMention(anomaly.severity) ? this.getMentions(anomaly.severity) : '';

    const message: SlackMessage = {
      channel: this.channel,
      text: `${icon} ${severity} ANOMALY - ${anomaly.state}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${icon} ${severity} Anomaly Detected`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*State:*\n${anomaly.state}`,
            },
            {
              type: 'mrkdwn',
              text: `*Position:*\n${this.formatPosition(anomaly.position)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Candidate:*\n${anomaly.candidateName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${severity}`,
            },
          ],
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Baseline:*\n${anomaly.researchPercentage}%`,
            },
            {
              type: 'mrkdwn',
              text: `*Current:*\n${anomaly.aggregatedPercentage.toFixed(1)}%`,
            },
            {
              type: 'mrkdwn',
              text: `*Deviation:*\n${anomaly.deviation > 0 ? '+' : ''}${anomaly.deviation.toFixed(1)}%`,
            },
            {
              type: 'mrkdwn',
              text: `*Confidence:*\n${(anomaly.confidence * 100).toFixed(0)}%`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Dashboard',
              },
              url: `${process.env.NEXT_PUBLIC_APP_URL}/pesquisas/${anomaly.state}`,
              style: 'primary',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Review',
              },
              url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/discrepancies?state=${anomaly.state}&candidate=${anomaly.candidateName}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕐 ${new Date(anomaly.timestamp).toLocaleString('pt-BR')}`,
            },
          ],
        },
      ],
    };

    if (mentions) {
      message.text = `${mentions}\n${message.text}`;
    }

    await this.sendMessage(message);
  }

  /**
   * Send TSE discrepancy alert
   */
  async sendDiscrepancyAlert(
    state: string,
    discrepancyCount: number,
    criticalCount: number
  ): Promise<void> {
    if (!this.isEnabled) return;

    const icon = criticalCount > 0 ? '🔴' : '🟡';
    const mentions = criticalCount > 0 ? this.getMentions('critical') : '';

    const message: SlackMessage = {
      channel: this.channel,
      text: `${icon} TSE Discrepancies - ${state}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${icon} TSE Discrepancies Detected`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*State:*\n${state}`,
            },
            {
              type: 'mrkdwn',
              text: `*Total:*\n${discrepancyCount}`,
            },
            {
              type: 'mrkdwn',
              text: `*Critical:*\n${criticalCount}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Review in Admin',
              },
              url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/discrepancies?state=${state}`,
              style: criticalCount > 0 ? 'danger' : 'primary',
            },
          ],
        },
      ],
    };

    if (mentions) {
      message.text = `${mentions}\n${message.text}`;
    }

    await this.sendMessage(message);
  }

  /**
   * Send admin action notification
   */
  async sendAdminAction(
    action: 'resolve' | 'dismiss' | 'escalate',
    state: string,
    candidate: string,
    resolvedBy: string
  ): Promise<void> {
    if (!this.isEnabled) return;

    const icons = {
      resolve: '✅',
      dismiss: '⏭️',
      escalate: '🚀',
    };

    const message: SlackMessage = {
      channel: this.channel,
      text: `${icons[action]} Admin Action - ${action.toUpperCase()}`,
      blocks: [
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Action:*\n${action.toUpperCase()}`,
            },
            {
              type: 'mrkdwn',
              text: `*State:*\n${state}`,
            },
            {
              type: 'mrkdwn',
              text: `*Candidate:*\n${candidate}`,
            },
            {
              type: 'mrkdwn',
              text: `*By:*\n${resolvedBy}`,
            },
          ],
        },
      ],
    };

    await this.sendMessage(message);
  }

  /**
   * Send raw message to Slack
   */
  private async sendMessage(message: SlackMessage): Promise<void> {
    if (!this.webhookUrl) {
      console.error('[Slack] Webhook URL not configured');
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('[Slack] Failed to send message:', response.statusText);
      } else {
        console.log('[Slack] Message sent successfully');
      }
    } catch (error) {
      console.error('[Slack] Error sending message:', error);
    }
  }

  /**
   * Get icon for severity
   */
  private getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
    };
    return icons[severity] || '⚪';
  }

  /**
   * Check if should mention users
   */
  private shouldMention(severity: string): boolean {
    const mentionSeverities = ['critical', 'high'];
    return mentionSeverities.includes(severity);
  }

  /**
   * Get mentions for severity level
   */
  private getMentions(severity: string): string {
    const mentionConfig: Record<string, string[]> = {
      critical: (process.env.SLACK_MENTION_ON_CRITICAL || '').split(',').filter(Boolean),
      high: (process.env.SLACK_MENTION_ON_HIGH || '').split(',').filter(Boolean),
    };

    const mentions = mentionConfig[severity] || [];
    return mentions.map(m => `<${m}>`).join(' ');
  }

  /**
   * Format position for display
   */
  private formatPosition(position: string): string {
    const labels: Record<string, string> = {
      governador: '🏛️ Governador',
      senador: '📜 Senador',
      presidencial: '🇧🇷 Presidencial',
    };
    return labels[position] || position;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('[Slack] Notifications disabled');
      return false;
    }

    try {
      const message: SlackMessage = {
        channel: this.channel,
        text: '🧪 Test message',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✅ Slack integration is working!',
            },
          },
        ],
      };

      await this.sendMessage(message);
      return true;
    } catch (error) {
      console.error('[Slack] Test failed:', error);
      return false;
    }
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    enabled: boolean
    configured: boolean
    channel: string
  } {
    return {
      enabled: this.isEnabled,
      configured: !!this.webhookUrl,
      channel: this.channel,
    };
  }
}

// Export singleton
export const slackNotifier = new SlackNotifier();
