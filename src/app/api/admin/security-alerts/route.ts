import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/security-alerts
 * 
 * Returns authentication failure statistics.
 * Only accessible to authenticated admin users.
 * 
 * Query params:
 * - hours: 1-24 (default: 1)
 */
export async function GET(request: Request) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.user_metadata?.role === "admin";
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Forbidden: admin role required" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const hoursParam = url.searchParams.get("hours") || "1";
  const hours = Math.min(Math.max(parseInt(hoursParam), 1), 24);

  const supabase = await createClient() as any;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    // @ts-ignore auth_failure_logs created by migration
    const { data: failures } = await supabase
      .from("auth_failure_logs")
      .select("*")
      .gte("timestamp", cutoff.toISOString())
      .order("timestamp", { ascending: false });

    const alertsByIP: Record<string, any> = {};

    (failures || []).forEach((failure: any) => {
      const ip = failure.ip_address;
      if (!alertsByIP[ip]) {
        alertsByIP[ip] = {
          ip,
          count: 0,
          endpoints: new Set(),
          lastAttempt: failure.timestamp,
          firstAttempt: failure.timestamp,
          errors: new Set(),
          statusCodes: new Set(),
        };
      }
      alertsByIP[ip].count++;
      alertsByIP[ip].endpoints.add(failure.endpoint);
      alertsByIP[ip].lastAttempt = failure.timestamp;
      alertsByIP[ip].errors.add(failure.error_message);
      alertsByIP[ip].statusCodes.add(failure.status_code);
    });

    const alerts = Object.values(alertsByIP)
      .map((alert) => ({
        ip: alert.ip,
        failureCount: alert.count,
        endpoints: Array.from(alert.endpoints),
        errors: Array.from(alert.errors),
        statusCodes: Array.from(alert.statusCodes),
        lastAttempt: alert.lastAttempt,
        firstAttempt: alert.firstAttempt,
        isSuspicious: alert.count >= 5,
        durationMinutes: Math.round(
          (new Date(alert.lastAttempt).getTime() - new Date(alert.firstAttempt).getTime()) / 60000
        ),
      }))
      .sort((a, b) => b.failureCount - a.failureCount);

    const suspiciousAlerts = alerts.filter((a) => a.isSuspicious);

    const failuresByStatus: Record<number, number> = {};
    (failures || []).forEach((f: any) => {
      failuresByStatus[f.status_code] = (failuresByStatus[f.status_code] || 0) + 1;
    });

    return NextResponse.json({
      summary: {
        totalFailures: failures?.length || 0,
        uniqueIPs: Object.keys(alertsByIP).length,
        suspiciousIPs: suspiciousAlerts.length,
        period: `last ${hours} hour(s)`,
        generatedAt: new Date().toISOString(),
      },
      failuresByStatus,
      alerts: alerts.slice(0, 50),
      suspiciousActivity: suspiciousAlerts,
      recommendations: suspiciousAlerts.length > 0
        ? ["Review suspicious IPs", "Consider IP blocking"]
        : ["No suspicious activity detected"],
    }, {
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve alerts" },
      { status: 500 }
    );
  }
}
