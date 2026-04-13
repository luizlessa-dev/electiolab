import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ApiKeyInfo {
  user_id: string;
  tier: string;
  rate_limit: number;
  requests_used: number;
}

export async function validateApiKey(
  request: Request
): Promise<ApiKeyInfo | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header. Use: Bearer <api_key>" },
      { status: 401 }
    );
  }

  const key = authHeader.slice(7);
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const { data: apiKey, error } = await supabaseAdmin
    .from("api_keys")
    .select("user_id, tier, rate_limit, requests_used, is_active")
    .eq("key_hash", keyHash)
    .single();

  if (error || !apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!apiKey.is_active) {
    return NextResponse.json({ error: "API key is inactive" }, { status: 403 });
  }

  if (apiKey.requests_used >= apiKey.rate_limit) {
    return NextResponse.json(
      { error: "Rate limit exceeded", limit: apiKey.rate_limit, used: apiKey.requests_used },
      { status: 429 }
    );
  }

  // Increment usage
  await supabaseAdmin
    .from("api_keys")
    .update({ requests_used: apiKey.requests_used + 1 })
    .eq("key_hash", keyHash);

  return apiKey;
}
