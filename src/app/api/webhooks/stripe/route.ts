import { getStripe } from "@/lib/stripe/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook Error: ${err}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier ?? "pro";

      if (userId) {
        const keyRaw = `el_${tier}_${crypto.randomUUID().replace(/-/g, "")}`;
        const keyHash = await hashKey(keyRaw);
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
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
