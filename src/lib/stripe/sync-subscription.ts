/**
 * Sincronizar subscription do Stripe com api_keys table
 *
 * Usado pelo webhook para atualizar tier, rate_limit, stripe_subscription_id
 * e criar audit trail em subscription_changes.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SubscriptionSyncInput {
  userId: string;
  stripeSubscriptionId: string;
  tier: "pro" | "business" | "enterprise";
  currentPeriodEnd?: Date;
  trigger: "checkout" | "subscription.updated" | "subscription.deleted" | "manual";
  changedBy?: string;
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
  } = input;

  const newRateLimit = TIER_LIMITS[tier];

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
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      throw new Error(`upsert api_keys failed: ${upsertError.message}`);
    }

    // 3. Registrar mudança em subscription_changes (se houver mudança real)
    if (oldTier !== tier || oldRateLimit !== newRateLimit) {
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
          notes: `Stripe webhook: ${trigger}`,
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
