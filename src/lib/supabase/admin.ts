import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Lazy singleton — avoids instantiating (and requiring env vars) at import time.
// Service-role client for backend-only routes. Bypasses RLS — never import
// from client components or anywhere that ships to the browser.
let _supabaseAdmin: SupabaseClient | undefined;

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createAdminClient();
    }
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
