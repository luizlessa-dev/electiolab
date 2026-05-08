import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { Key, AlertTriangle, RefreshCw, Code2 } from "lucide-react";
import { RegenerateKeyButton } from "./regenerate-button";

export const dynamic = "force-dynamic";

const admin = () =>
  createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

const TIER_LABELS: Record<string, { label: string; price: string }> = {
  pro: { label: "Pro", price: "R$ 97 / mês" },
  business: { label: "Business", price: "R$ 497 / mês" },
  enterprise: { label: "Enterprise", price: "Sob consulta" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ApiKeyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/dashboard/api");
  }

  const { data: apiKey } = await admin()
    .from("api_keys")
    .select(
      "id, tier, rate_limit, requests_used, is_active, period_start, last_used_at, created_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API Key
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acesse os dados do ElectioLab via API REST. Bearer token no header
          Authorization.
        </p>
      </div>

      {!apiKey || !apiKey.is_active ? (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="font-semibold">
              {apiKey?.is_active === false
                ? "Sua API key está desativada"
                : "Você ainda não tem uma API key"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Assine um plano <strong>Pro</strong> ou <strong>Business</strong> para
            ativar acesso programático aos dados.
          </p>
          <a
            href="/precos"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Ver planos →
          </a>
        </div>
      ) : (
        <>
          {/* Status */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  Plano ativo
                </p>
                <p className="text-lg font-bold">
                  {TIER_LABELS[apiKey.tier]?.label ?? apiKey.tier}
                </p>
                <p className="text-xs text-muted-foreground">
                  {TIER_LABELS[apiKey.tier]?.price ?? ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  Uso no período
                </p>
                <p className="text-lg font-mono font-bold tabular-nums">
                  {apiKey.requests_used.toLocaleString("pt-BR")} /{" "}
                  {apiKey.rate_limit.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">requisições/mês</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  Próximo reset
                </p>
                <p className="text-lg font-mono font-bold tabular-nums">
                  {fmtDate(
                    apiKey.period_start
                      ? new Date(
                          new Date(apiKey.period_start).getTime() +
                            30 * 24 * 60 * 60 * 1000
                        ).toISOString()
                      : null
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {apiKey.last_used_at
                    ? `Última: ${fmtDate(apiKey.last_used_at)}`
                    : "Sem uso ainda"}
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (apiKey.requests_used / apiKey.rate_limit) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Regenerate */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Regenerar API key
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use isso se perdeu a key ou acha que ela vazou. A key anterior
                  é invalidada imediatamente.
                </p>
              </div>
              <RegenerateKeyButton />
            </div>
          </div>

          {/* Como usar */}
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="font-semibold flex items-center gap-2 mb-3">
              <Code2 className="h-4 w-4" />
              Como usar
            </p>
            <pre className="bg-muted/40 rounded-md p-3 text-xs overflow-x-auto font-mono">
              {`curl https://electiolab.com/api/v1/averages \\
  -H "Authorization: Bearer el_${apiKey.tier}_..."

# Endpoints disponíveis
GET /api/v1/elections          → lista todas as eleições
GET /api/v1/averages           → média ponderada por candidato
GET /api/v1/polls              → pesquisas brutas (?format=csv também)
GET /api/v1/me                 → status da sua key (uso, limit, reset)

# Headers de retorno
X-RateLimit-Limit              → seu limite mensal
X-RateLimit-Remaining          → quanto resta
X-RateLimit-Reset              → quando reseta (ISO)
X-API-Tier                     → plano detectado (pro/business)`}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
