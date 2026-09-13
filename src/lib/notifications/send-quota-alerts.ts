/**
 * Enviar alertas de quota para clientes que atingiram 80%+ do limite
 *
 * Executado diariamente via cron (6:00 UTC).
 * Envia email diário enquanto usage >= 80%.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export interface QuotaAlert {
  api_key_id: string;
  user_id: string;
  email: string;
  usage_percent: number;
  tier: string;
  rate_limit: number;
  requests_used: number;
  period_resets_at: string;
}

interface SendResult {
  totalAlerts: number;
  sentEmails: number;
  failedEmails: number;
  errors: Array<{ email: string; error: string }>;
}

export async function sendQuotaAlerts(
  admin: SupabaseClient,
  resend: Resend | null
): Promise<SendResult> {
  const result: SendResult = {
    totalAlerts: 0,
    sentEmails: 0,
    failedEmails: 0,
    errors: [],
  };

  if (!resend) {
    console.warn("[quota-alerts] Resend not configured, skipping");
    return result;
  }

  try {
    // 1. Chamar RPC para obter alertas a enviar
    const { data: alerts, error: rpcError } = await admin.rpc(
      "check_api_quota_alerts"
    );

    if (rpcError) {
      throw new Error(`check_api_quota_alerts failed: ${rpcError.message}`);
    }

    const typedAlerts = (alerts as unknown[] || []) as QuotaAlert[];
    result.totalAlerts = typedAlerts.length;

    console.log(`[quota-alerts] Found ${typedAlerts.length} alert(s) to send`);

    // 2. Enviar email para cada alerta
    for (const alert of typedAlerts) {
      try {
        const upgradeUrl = `https://electiolab.com/dashboard/api?tier=${
          alert.tier === "pro" ? "business" : "enterprise"
        }`;

        const emailHtml = `
          <div style="font-family: ui-sans-serif, system-ui; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #dc2626;">⚠️ Aviso: Cota de API próxima do limite</h2>

            <p style="font-size: 16px; margin: 16px 0;">
              Olá,<br>
              Você consumiu <strong>${alert.usage_percent}%</strong> da sua cota mensal de requisições.
            </p>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0;">
                <strong>Cota atual:</strong> ${alert.requests_used.toLocaleString(
                  "pt-BR"
                )} / ${alert.rate_limit.toLocaleString("pt-BR")} requisições<br>
                <strong>Tier:</strong> ${alert.tier.toUpperCase()}<br>
                <strong>Reset:</strong> ${new Date(
                  alert.period_resets_at
                ).toLocaleDateString("pt-BR")}
              </p>
            </div>

            <h3 style="margin-top: 24px;">Opções:</h3>
            <ul style="line-height: 1.8;">
              <li>
                <strong>Fazer upgrade:</strong>
                <a href="${upgradeUrl}" style="color: #2563eb;">
                  Upgrade para ${
                    alert.tier === "pro" ? "Business" : "Enterprise"
                  }
                </a>
              </li>
              <li>
                <strong>Otimizar requisições:</strong>
                Revise sua integração para cachear respostas e reduzir chamadas.
              </li>
              <li>
                <strong>Suporte:</strong>
                Dúvidas? Contato: <a href="mailto:api@electiolab.com" style="color: #2563eb;">api@electiolab.com</a>
              </li>
            </ul>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
            <p style="color: #737373; font-size: 12px; margin: 0;">
              ElectioLab — Inteligência Eleitoral<br>
              <a href="https://electiolab.com/dashboard/api" style="color: #2563eb;">Dashboard</a> |
              <a href="https://electiolab.com/docs" style="color: #2563eb;">Documentação</a>
            </p>
          </div>
        `;

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "ElectioLab <noreply@electiolab.com>",
          to: alert.email,
          subject: `ElectioLab: Cota de API ${alert.usage_percent}% consumida`,
          html: emailHtml,
        });

        // Registrar alerta enviado
        await admin.from("quota_alert_runs").insert({
          api_key_id: alert.api_key_id,
          user_id: alert.user_id,
          email: alert.email,
          usage_percent: alert.usage_percent,
          tier: alert.tier,
          rate_limit: alert.rate_limit,
          requests_used: alert.requests_used,
          reset_at: alert.period_resets_at,
          status: "sent",
        });

        // Marcar como alerta enviado
        await admin.rpc("mark_alert_sent", {
          p_api_key_id: alert.api_key_id,
          p_user_id: alert.user_id,
        });

        result.sentEmails++;
        console.log(`[quota-alerts] Sent to ${alert.email} (${alert.usage_percent}%)`);
      } catch (err) {
        result.failedEmails++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        result.errors.push({ email: alert.email, error: errorMsg });

        // Registrar falha
        await admin.from("quota_alert_runs").insert({
          api_key_id: alert.api_key_id,
          user_id: alert.user_id,
          email: alert.email,
          usage_percent: alert.usage_percent,
          tier: alert.tier,
          rate_limit: alert.rate_limit,
          requests_used: alert.requests_used,
          reset_at: alert.period_resets_at,
          status: "failed",
          error_message: errorMsg,
        });

        console.error(`[quota-alerts] Failed for ${alert.email}:`, errorMsg);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[quota-alerts] Fatal error:", errorMsg);
    result.errors.push({ email: "system", error: errorMsg });
  }

  const summary = `Sent ${result.sentEmails}/${result.totalAlerts} quota alerts (${result.failedEmails} failures)`;
  console.log(`[quota-alerts] Summary: ${summary}`);

  return result;
}
