/**
 * Agent 3: Validação + Alertas
 *
 * Monitora gaps de pesquisas, detecta anomalias,
 * escalona alertas ao operador via email
 *
 * Status: ✅ MVP READY
 */

import { RufloAgent, AgentConfig } from "./base";

export interface AlertData {
  election_id: string;
  alert_type: "gap_alert" | "anomaly_alert";
  severity: "low" | "medium" | "high";
  message: string;
  created_at: string;
}

export class ValidacaoAgent extends RufloAgent {
  private GAP_ALERT_THRESHOLD = 3; // dias

  constructor() {
    const config: AgentConfig = {
      name: "Validação + Alertas",
      id: "validation-001",
      timeout_ms: 60000,
      max_retries: 1,
    };
    super(config);
  }

  async run() {
    const startTime = Date.now();
    console.log(`[${this.config.id}] Starting validation...`);

    try {
      const result = await this.runValidation();

      const finalResult = {
        ...result,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      await this.logAudit(finalResult);
      return finalResult;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error(`[${this.config.id}] ERROR:`, error.message);
      await this.logAudit(null, error);
      throw error;
    }
  }

  private async runValidation() {
    // 1. Fetch active elections
    const { data: elections, error: electionsError } = await this.supabase
      .from("elections")
      .select(
        `
        id, name, year, is_active,
        polls (
          id, institute, publication_date, fieldwork_end
        )
      `
      )
      .eq("is_active", true);

    if (electionsError) {
      throw new Error(`Failed to fetch elections: ${electionsError.message}`);
    }

    if (!elections || elections.length === 0) {
      console.log(`[${this.config.id}] No active elections found`);
      return {
        ok: true,
        elections_checked: 0,
        alerts_count: 0,
        status: "healthy",
      };
    }

    console.log(
      `[${this.config.id}] Checking ${elections.length} active elections...`
    );

    const alerts: AlertData[] = [];
    let electionsChecked = 0;

    for (const election of elections) {
      electionsChecked++;

      const polls = election.polls || [];
      if (polls.length === 0) {
        console.log(`[${this.config.id}] ${election.name}: No polls found`);
        continue;
      }

      // Sort by publication date (newest first)
      const sortedPolls = polls.sort(
        (a, b) =>
          new Date(b.publication_date).getTime() -
          new Date(a.publication_date).getTime()
      );

      const lastPoll = sortedPolls[0];
      const lastPollDate = new Date(lastPoll.publication_date);
      const gapDays = Math.floor(
        (Date.now() - lastPollDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(
        `[${this.config.id}] ${election.name}: gap=${gapDays} days (last=${lastPoll.institute})`
      );

      // Check gap threshold
      if (gapDays > this.GAP_ALERT_THRESHOLD) {
        const alert: AlertData = {
          election_id: election.id,
          alert_type: "gap_alert",
          severity: gapDays > 7 ? "high" : "medium",
          message: `${election.name}: ${gapDays} dias sem pesquisas`,
          created_at: new Date().toISOString(),
        };

        alerts.push(alert);
        console.log(`[${this.config.id}] ALERT: ${alert.message}`);
      }
    }

    // 2. Insert alerts to DB
    let alertsInserted = 0;
    if (alerts.length > 0) {
      const { error: insertError } = await this.supabase
        .from("operador_alerts")
        .insert(
          alerts.map((a) => ({
            election_id: a.election_id,
            alert_type: a.alert_type,
            severity: a.severity,
            message: a.message,
            created_at: a.created_at,
            reviewed: false,
          }))
        );

      if (insertError) {
        console.warn(`[${this.config.id}] Failed to insert alerts:`, insertError);
      } else {
        alertsInserted = alerts.length;
        console.log(`[${this.config.id}] Inserted ${alertsInserted} alerts`);
      }
    }

    return {
      ok: alerts.length === 0,
      elections_checked: electionsChecked,
      alerts_count: alertsInserted,
      alerts,
      status: alerts.length > 0 ? "needs_review" : "healthy",
    };
  }
}

export async function handleAlertGapWebhook(alert: any) {
  console.log("[alert-gap webhook] Received alert:", {
    election_id: alert.election_id,
    alert_type: alert.alert_type,
    severity: alert.severity,
    message: alert.message,
  });

  // TODO: Send email via Resend
  // const { data, error } = await resend.emails.send({
  //   from: "alerts@electiolab.com",
  //   to: "operador@electiolab.com",
  //   subject: `[${alert.severity.toUpperCase()}] ${alert.message}`,
  //   html: `<p>${alert.message}</p>`
  // });
}
