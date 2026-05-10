import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { Key, AlertTriangle, RefreshCw, Code2, BookOpen, FileJson } from "lucide-react";
import { RegenerateKeyButton } from "./regenerate-button";
import { CopyButton } from "./copy-button";

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

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function usageColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function usageLabel(pct: number): { text: string; tone: string } {
  if (pct >= 90) return { text: "Atenção: próximo do limite", tone: "text-red-600 dark:text-red-400" };
  if (pct >= 70) return { text: "Uso intenso", tone: "text-amber-600 dark:text-amber-400" };
  return { text: "Saudável", tone: "text-emerald-600 dark:text-emerald-400" };
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

  const usagePct = apiKey?.is_active
    ? Math.min(100, (apiKey.requests_used / apiKey.rate_limit) * 100)
    : 0;
  const resetIso = apiKey?.period_start
    ? new Date(new Date(apiKey.period_start).getTime() + 30 * 86400000).toISOString()
    : null;
  const daysToReset = daysUntil(resetIso);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            API Key
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesse os dados do ElectioLab via API REST. Bearer token no header Authorization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/api"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <BookOpen className="h-3.5 w-3.5" /> Documentação
          </Link>
          <a
            href="/openapi.yaml"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <FileJson className="h-3.5 w-3.5" /> OpenAPI
          </a>
        </div>
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
                  {daysToReset !== null ? `${daysToReset}d` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(resetIso)}
                  {apiKey.last_used_at ? ` · última: ${fmtDate(apiKey.last_used_at)}` : ""}
                </p>
              </div>
            </div>

            {/* Barra de progresso colorida + label de status */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${usageLabel(usagePct).tone}`}>
                  {usageLabel(usagePct).text}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {usagePct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${usageColor(usagePct)}`}
                  style={{ width: `${usagePct}%` }}
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
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Como usar
              </p>
              <CopyButton
                text={`curl https://electiolab.com/api/v1/averages -H "Authorization: Bearer el_${apiKey.tier}_..."`}
                label="Copiar curl"
              />
            </div>
            <pre className="bg-muted/40 rounded-md p-3 text-xs overflow-x-auto font-mono">
              {`curl https://electiolab.com/api/v1/averages \\
  -H "Authorization: Bearer el_${apiKey.tier}_..."`}
            </pre>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Endpoints disponíveis</p>
              <pre className="bg-muted/40 rounded-md p-3 text-xs overflow-x-auto font-mono leading-relaxed">
                {`GET /api/v1/elections             → lista todas as eleições
GET /api/v1/polls                 → pesquisas brutas (?format=csv também)
GET /api/v1/averages              → média ponderada por candidato
GET /api/v1/candidates-by-slug    → consolida até 3 candidatos
GET /api/v1/drift                 → série temporal % p/ candidato
GET /api/v1/me                    → status da sua key (uso, limit, reset)`}
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Headers de retorno</p>
              <pre className="bg-muted/40 rounded-md p-3 text-xs overflow-x-auto font-mono leading-relaxed">
                {`X-RateLimit-Limit              → seu limite mensal
X-RateLimit-Remaining          → quanto resta
X-RateLimit-Reset              → quando reseta (ISO)
X-API-Tier                     → plano detectado (pro/business)`}
              </pre>
            </div>

            <p className="text-xs text-muted-foreground">
              Documentação completa: <Link href="/api" className="text-primary underline-offset-4 hover:underline">/api</Link>{" "}
              · Spec OpenAPI 3.1: <a href="/openapi.yaml" className="text-primary underline-offset-4 hover:underline">/openapi.yaml</a>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
