import { getStripe } from "@/lib/stripe/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

let _admin: SupabaseClient | null = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "ElectioLab <noreply@electiolab.com>";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe webhook] verify failed:", err);
    return NextResponse.json(
      { error: `Webhook signature error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 }
    );
  }

  console.log(`[stripe webhook] ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const tier = (session.metadata?.tier ?? "pro") as "pro" | "business" | "enterprise";
        const customerEmail = session.customer_email ?? session.customer_details?.email;

        if (!userId) {
          console.warn("[stripe webhook] checkout.session.completed sem user_id");
          break;
        }

        // Gera key raw e hash
        const keyRaw = `el_${tier}_${crypto.randomUUID().replace(/-/g, "")}`;
        const keyHash = await sha256(keyRaw);
        const keyPrefix = keyRaw.slice(0, 12); // ex: el_pro_a3b7c9
        const rateLimit =
          tier === "enterprise" ? 999999 : tier === "business" ? 10000 : 1000;

        await getAdmin().from("api_keys").upsert(
          {
            user_id: userId,
            key_hash: keyHash,
            name: `${tier} key`,
            tier,
            rate_limit: rateLimit,
            is_active: true,
          },
          { onConflict: "user_id" }
        );

        // Email com a key (única vez que ela aparece em texto puro)
        if (customerEmail && resend) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: "ElectioLab — Sua API key está pronta",
            html: `
              <div style="font-family: ui-sans-serif, system-ui; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #2563eb;">Bem-vindo ao ElectioLab ${tier.toUpperCase()}</h2>
                <p>Sua assinatura foi ativada com sucesso. Aqui está sua API key:</p>
                <pre style="background: #f4f4f5; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto;">${keyRaw}</pre>
                <p style="color: #525252; font-size: 14px;">
                  <strong>⚠️ Importante:</strong> guarde esta key em local seguro.
                  Ela não será exibida novamente. Se perder, gere uma nova nas configurações.
                </p>
                <h3 style="margin-top: 24px;">Como usar</h3>
                <pre style="background: #f4f4f5; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto;">curl https://electiolab.com/api/v1/averages \\
  -H "Authorization: Bearer ${keyRaw}"</pre>
                <p style="color: #525252; font-size: 14px;">
                  Limite: <strong>${rateLimit.toLocaleString("pt-BR")} requisições/mês</strong>.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
                <p style="color: #737373; font-size: 12px;">
                  ElectioLab — Inteligência Eleitoral · <a href="https://electiolab.com" style="color: #2563eb;">electiolab.com</a>
                </p>
              </div>
            `,
          }).catch((e) => console.error("[stripe webhook] email send failed:", e));
        }

        console.log(`[stripe webhook] API key created for user ${userId} (tier: ${tier}, prefix: ${keyPrefix})`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (userId) {
          // Reativa se estava inativo (ex: pagamento voltou)
          if (sub.status === "active" || sub.status === "trialing") {
            await getAdmin()
              .from("api_keys")
              .update({ is_active: true })
              .eq("user_id", userId);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (userId) {
          await getAdmin()
            .from("api_keys")
            .update({ is_active: false })
            .eq("user_id", userId);
          console.log(`[stripe webhook] API key deactivated for user ${userId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as { customer_email?: string | null };
        console.warn(`[stripe webhook] payment_failed for ${invoice.customer_email ?? "unknown"}`);
        // Email opcional avisando o usuário
        break;
      }

      default:
        console.log(`[stripe webhook] ignored event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
