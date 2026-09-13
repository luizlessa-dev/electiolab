"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApiKey {
  id: string;
  user_id: string;
  tier: string;
  rate_limit: number;
  requests_used: number;
  is_active: boolean;
  created_at: string;
  period_start: string;
}

interface IpRateLimit {
  ip_hash: string;
  scope: string;
  count: number;
  reset_at: string;
}

interface SubscriptionChange {
  id: string;
  user_id: string;
  old_tier: string | null;
  new_tier: string;
  old_rate_limit: number | null;
  new_rate_limit: number;
  trigger: string;
  changed_at: string;
  notes: string | null;
}

interface QuotaAlertRun {
  id: string;
  email: string;
  usage_percent: number;
  status: string;
  sent_at: string;
}

export default function AdminApiUsagePage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [ipLimits, setIpLimits] = useState<IpRateLimit[]>([]);
  const [subscriptionChanges, setSubscriptionChanges] = useState<SubscriptionChange[]>([]);
  const [quotaAlerts, setQuotaAlerts] = useState<QuotaAlertRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeKeys: 0,
    monthlyRequests: 0,
    anon24h: 0,
    topTier: "" as string,
    quotaAlertsToday: 0,
    quotaAlertsLastRun: "" as string,
  });

  useEffect(() => {
    const loadData = async () => {
      const sb = createClient();

      // Carregar API keys
      const { data: keys, error: keysError } = await sb
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (!keysError && keys) {
        setApiKeys(keys as ApiKey[]);

        // Calcular stats
        const active = keys.filter((k: any) => k.is_active).length;
        const totalRequests = keys.reduce((sum: number, k: any) => sum + (k.requests_used || 0), 0);

        setStats((prev) => ({
          ...prev,
          activeKeys: active,
          monthlyRequests: totalRequests,
        }));
      }

      // Carregar IP rate limits (top 20)
      const { data: ips, error: ipsError } = await sb
        .from("ip_rate_limits")
        .select("*")
        .order("count", { ascending: false })
        .limit(20);

      if (!ipsError && ips) {
        setIpLimits(ips as IpRateLimit[]);
      }

      // Carregar histórico de mudanças de subscription (últimas 20)
      const { data: subs, error: subsError } = await sb
        .from("subscription_changes")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(20);

      if (!subsError && subs) {
        setSubscriptionChanges(subs as SubscriptionChange[]);
      }

      // Carregar quota alerts (últimos 20)
      const { data: alerts, error: alertsError } = await sb
        .from("quota_alert_runs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(20);

      if (!alertsError && alerts) {
        setQuotaAlerts(alerts as QuotaAlertRun[]);

        // Calcular alertas de hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sentToday = alerts.filter((a: any) => {
          const alertDate = new Date(a.sent_at);
          return alertDate >= today && a.status === "sent";
        }).length;

        const lastRun = alerts.length > 0
          ? new Date(alerts[0].sent_at).toLocaleString("pt-BR")
          : "Nunca";

        setStats((prev) => ({
          ...prev,
          quotaAlertsToday: sentToday,
          quotaAlertsLastRun: lastRun,
        }));
      }

      setLoading(false);
    };

    loadData().catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  const usageByTier = {
    pro: apiKeys.filter((k) => k.tier === "pro" && k.is_active).length,
    business: apiKeys.filter((k) => k.tier === "business" && k.is_active).length,
    enterprise: apiKeys.filter((k) => k.tier === "enterprise" && k.is_active).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin: Uso de API</h1>
        <p className="text-muted-foreground mt-2">
          Monitoramento de keys, rate limits e tráfego
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">API Keys Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeKeys}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {apiKeys.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Requisições Este Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.monthlyRequests / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Consumo agregado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pro Ativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageByTier.pro}</div>
            <p className="text-xs text-muted-foreground mt-1">
              × 1.000 req/mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Business Ativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageByTier.business}</div>
            <p className="text-xs text-muted-foreground mt-1">
              × 10.000 req/mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Alertas Quota Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quotaAlertsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Última execução: {stats.quotaAlertsLastRun}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys ({apiKeys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">User ID</th>
                  <th className="text-left py-2 px-2">Tier</th>
                  <th className="text-right py-2 px-2">Limite</th>
                  <th className="text-right py-2 px-2">Uso</th>
                  <th className="text-center py-2 px-2">Ativa</th>
                  <th className="text-left py-2 px-2">Reset</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.slice(0, 20).map((key) => (
                  <tr key={key.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-mono text-xs">
                      {key.user_id.slice(0, 8)}...
                    </td>
                    <td className="py-2 px-2 capitalize">{key.tier}</td>
                    <td className="py-2 px-2 text-right">{key.rate_limit.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{key.requests_used}</td>
                    <td className="py-2 px-2 text-center">
                      {key.is_active ? "✅" : "❌"}
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {new Date(key.period_start).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {apiKeys.length > 20 && (
              <p className="text-xs text-muted-foreground mt-2">
                Mostrando 20 de {apiKeys.length}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* IP Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>IP Rate Limits (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">IP Hash</th>
                  <th className="text-left py-2 px-2">Scope</th>
                  <th className="text-right py-2 px-2">Count</th>
                  <th className="text-left py-2 px-2">Reset</th>
                </tr>
              </thead>
              <tbody>
                {ipLimits.map((limit) => (
                  <tr
                    key={`${limit.ip_hash}-${limit.scope}`}
                    className="border-b hover:bg-muted/50"
                  >
                    <td className="py-2 px-2 font-mono text-xs">
                      {limit.ip_hash.slice(0, 12)}...
                    </td>
                    <td className="py-2 px-2">{limit.scope}</td>
                    <td className="py-2 px-2 text-right">{limit.count}</td>
                    <td className="py-2 px-2 text-xs">
                      {new Date(limit.reset_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quota Alerts History */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Quota (Últimos 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-right py-2 px-2">Uso %</th>
                  <th className="text-center py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Enviado</th>
                </tr>
              </thead>
              <tbody>
                {quotaAlerts.length > 0 ? (
                  quotaAlerts.map((alert) => (
                    <tr key={alert.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 text-xs">{alert.email}</td>
                      <td className="py-2 px-2 text-right font-mono">
                        <span className={alert.usage_percent >= 100 ? "text-red-600" : alert.usage_percent >= 90 ? "text-orange-600" : ""}>
                          {alert.usage_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={
                          alert.status === "sent"
                            ? "text-green-600 text-xs"
                            : alert.status === "failed"
                            ? "text-red-600 text-xs"
                            : "text-muted-foreground text-xs"
                        }>
                          {alert.status === "sent" ? "✓" : alert.status === "failed" ? "✗" : "○"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {new Date(alert.sent_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 px-2 text-center text-muted-foreground">
                      Nenhum alerta enviado ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Changes History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Mudanças de Tier (Últimas 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">User ID</th>
                  <th className="text-left py-2 px-2">Mudança</th>
                  <th className="text-left py-2 px-2">Limite</th>
                  <th className="text-left py-2 px-2">Trigger</th>
                  <th className="text-left py-2 px-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionChanges.length > 0 ? (
                  subscriptionChanges.map((change) => (
                    <tr key={change.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-mono text-xs">
                        {change.user_id.slice(0, 8)}...
                      </td>
                      <td className="py-2 px-2 text-sm">
                        <span className="text-muted-foreground">
                          {change.old_tier || "—"} → {change.new_tier}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {change.old_rate_limit ? `${change.old_rate_limit} → ` : ""}
                        {change.new_rate_limit}
                      </td>
                      <td className="py-2 px-2 text-xs capitalize">
                        {change.trigger}
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {new Date(change.changed_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-2 text-center text-muted-foreground">
                      Nenhuma mudança registrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-muted">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ Informações</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <ul className="space-y-1">
            <li>• Anonymous: 60 req/dia (IP-based)</li>
            <li>• Pro: 1.000 req/mês (R$ 97/mês)</li>
            <li>• Business: 10.000 req/mês (R$ 497/mês)</li>
            <li>• Enterprise: ilimitado (custom)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
