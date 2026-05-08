import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";

const PRICE_MAP: Record<string, string | undefined> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
};

export async function POST(req: Request) {
  try {
    const { plan } = (await req.json()) as { plan: keyof typeof PRICE_MAP };
    const priceId = PRICE_MAP[plan];

    if (!priceId) {
      return NextResponse.json(
        { error: `Plano "${plan}" não configurado. Rode setup-stripe-products.ts.` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Não autenticado. Faça login antes de assinar." },
        { status: 401 }
      );
    }

    const origin =
      req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://electiolab.com";

    const tier = plan.startsWith("business") ? "business" : "pro";

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, tier, plan },
      subscription_data: {
        metadata: { user_id: user.id, tier },
      },
      success_url: `${origin}/dashboard?upgrade=success&plan=${plan}`,
      cancel_url: `${origin}/precos?canceled=1`,
      allow_promotion_codes: true,
      locale: "pt-BR",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
