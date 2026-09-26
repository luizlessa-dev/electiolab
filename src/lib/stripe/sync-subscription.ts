/**
 * Sincronizar subscription do Stripe com api_keys table
 *
 * Usado pelo webhook para atualizar tier, rate_limit, stripe_subscription_id
 * e criar audit trail em subscription_changes.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SubscriptionSyncInput {
  userId: string;
  stripeSubscriptionId: string | null;
  tier: "pro" | "business" | "enterprise";
  currentPeriodEnd?: Date;
  trigger: "checkout" | "subscription.updated" | "subscription.deleted" | "manual";
  changedBy?: string;
  /** Texto livre para subscription_changes.notes; default é "Stripe webhook: <trigger>". */
  notes?: string;
  /** Só usado quando ainda não existe api_keys para o user (key_hash é NOT NULL). */
  apiKeyHash?: string;
  apiKeyName?: string;
}

const TIER_LIMITS = {
  pro: 1000,
  business: 10000,
  enterprise: 999999,
} as const;

export async function syncSubscription(
  admin: SupabaseClient,
  input: SubscriptionSyncInput
): Promise<{ success: boolean; error?: string }> {
  const {
    userId,
    stripeSubscriptionId,
    tier,
    currentPeriodEnd,
    trigger,
    changedBy,
    notes,
    apiKeyHash,
    apiKeyName,
  } = input;

  const newRateLimit = TIER_LIMITS[tier];
  // "manual" = atribuído via scripts/grant-manual-plan.ts, fora do fluxo do
  // Stripe — o webhook (src/app/api/webhooks/stripe/route.ts) checa esse
  // campo e não sobrescreve contas marcadas como manual.
  const planSource = trigger === "manual" ? "manual" : "stripe";

  try {
    // 1. Buscar api_keys atual para comparar
    const { data: apiKeyRow, error: fetchError } = await admin
      .from("api_keys")
      .select("id, tier, rate_limit")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows found (primeira key)
      throw new Error(`fetch api_keys failed: ${fetchError.message}`);
    }

    const oldTier = apiKeyRow?.tier || null;
    const oldRateLimit = apiKeyRow?.rate_limit || null;
    const apiKeyId = apiKeyRow?.id;

    // 2. Upsert api_keys com novo tier e stripe_subscription_id
    const { error: upsertError } = await admin.from("api_keys").upsert(
      {
        user_id: userId,
        tier,
        rate_limit: newRateLimit,
        stripe_subscription_id: stripeSubscriptionId,
        billing_cycle_end: currentPeriodEnd?.toISOString() || null,
        is_active: true,
        plan_source: planSource,
        // Só entra no payload se veio preenchido (primeira key do user);
        // em update (ON CONFLICT), key_hash/name existentes não são tocados.
        ...(apiKeyHash ? { key_hash: apiKeyHash, name: apiKeyName ?? `${tier} key` } : {}),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      throw new Error(`upsert api_keys failed: ${upsertError.message}`);
    }

    // 3. Registrar mudança em subscription_changes. Para trigger "manual"
    // sempre loga (mesmo sem mudança de tier/limite), já que o motivo/quem
    // autorizou é o que importa para auditoria de acesso gratuito.
    if (trigger === "manual" || oldTier !== tier || oldRateLimit !== newRateLimit) {
      const { error: auditError } = await admin
        .from("subscription_changes")
        .insert({
          api_key_id: apiKeyId || null,
          user_id: userId,
          old_tier: oldTier,
          new_tier: tier,
          old_rate_limit: oldRateLimit,
          new_rate_limit: newRateLimit,
          trigger,
          changed_by: changedBy || null,
          notes: notes ?? `Stripe webhook: ${trigger}`,
        });

      if (auditError) {
        console.warn(`[sync-subscription] audit log failed: ${auditError.message}`);
        // Não falha a sync se o audit falhar
      }
    }

    console.log(
      `[sync-subscription] synced user ${userId}: ${oldTier || "none"} → ${tier} (${newRateLimit} req/mês)`
    );
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-subscription] error:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * True se o plano do usuário foi atribuído manualmente (scripts/grant-manual-plan.ts),
 * ou seja, sem assinatura Stripe por trás. Usado pelo webhook do Stripe para
 * nunca sobrescrever/desativar essas contas.
 */
export async function isManualOverrideActive(
  admin: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await admin
    .from("api_keys")
    .select("plan_source")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn(`[sync-subscription] isManualOverrideActive check failed: ${error.message}`);
    return false;
  }

  return data?.plan_source === "manual";
}

export async function logPaymentFailure(
  admin: SupabaseClient,
  input: {
    stripeCustomerId?: string;
    userId?: string;
    invoiceId: string;
    invoiceAmountCents: number;
    invoiceCurrency: string;
    failureReason: string;
    customerEmail?: string;
  }
): Promise<void> {
  const {
    stripeCustomerId,
    userId,
    invoiceId,
    invoiceAmountCents,
    invoiceCurrency,
    failureReason,
    customerEmail,
  } = input;

  try {
    await admin.from("payment_failures").insert({
      stripe_customer_id: stripeCustomerId || null,
      user_id: userId || null,
      invoice_id: invoiceId,
      invoice_amount_cents: invoiceAmountCents,
      invoice_currency: invoiceCurrency,
      failure_reason: failureReason,
    });

    console.log(
      `[payment-failure-log] recorded: ${customerEmail || "unknown"} (${invoiceId})`
    );
  } catch (err) {
    console.error(`[payment-failure-log] insert failed:`, err);
  }
}
