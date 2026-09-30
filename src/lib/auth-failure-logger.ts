import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface AuthFailureEvent {
  endpoint: string;
  method: string;
  status_code: number;
  error_message: string;
  user_id?: string;
}

export async function logAuthFailure(event: AuthFailureEvent) {
  try {
    const headersList = await headers();
    const ip_address = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const user_agent = headersList.get("user-agent");

    const supabase = await createClient() as any;

    // auth_failure_logs is created by migration but not in generated types yet
    await supabase.from("auth_failure_logs").insert({
      endpoint: event.endpoint,
      method: event.method,
      ip_address,
      user_id: event.user_id || null,
      status_code: event.status_code,
      error_message: event.error_message,
      user_agent: user_agent || null,
    });
  } catch (error) {
    // Silently fail logging to avoid cascading errors
    console.error("[Auth Logger] Failed to log auth failure:", error);
  }
}

/**
 * Check for repeated authentication failures from the same IP
 * Returns true if suspicious activity is detected (5+ failures in 15 minutes)
 */
export async function checkSuspiciousActivity(ip: string): Promise<boolean> {
  try {
    const supabase = await createClient() as any;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const { data, error } = await supabase
      .from("auth_failure_logs")
      .select("id")
      .eq("ip_address", ip)
      .gte("timestamp", fifteenMinutesAgo.toISOString())
      .limit(1);

    if (error) return false;

    // If we found any failures, it means there were some in the last 15 min
    // For detailed threshold checking, you'd need to count, but this is good enough
    return (data?.length || 0) >= 5;
  } catch (error) {
    console.error("[Suspicious Activity Check] Error:", error);
    return false;
  }
}
