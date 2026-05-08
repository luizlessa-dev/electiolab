import { createClient } from "@/lib/supabase/server";
import { authenticate, applyRateLimitHeaders } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("elections")
    .select("id, name, type, state, city, year, round, election_date, is_active")
    .order("year", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return applyRateLimitHeaders(
    NextResponse.json({ data, count: data?.length ?? 0 }),
    auth
  );
}
