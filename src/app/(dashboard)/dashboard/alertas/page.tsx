import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Bell, Lock } from "lucide-react";
import { AlertasManager } from "./alertas-manager";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/alertas");

  // Confirma plano Pro+
  const { data: apiKey } = await sb
    .from("api_keys")
    .select("tier, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPro =
    apiKey?.is_active && (apiKey.tier === "pro" || apiKey.tier === "business" || apiKey.tier === "enterprise");

  // Fetch alertas existentes
  const { data: alerts } = await sb
    .from("user_alerts")
    .select(
      `id, alert_type, threshold_pp, is_active, last_value, last_triggered_at, created_at,
       candidate:candidates(id, name, slug, party, color),
       election:elections(id, name, type, state)`
    )
    .order("created_at", { ascending: false });

  // Lista de candidates+elections pra dropdown
  const { data: candidates } = await sb
    .from("candidates")
    .select("id, name, slug, party, election:elections!inner(type, state, year)")
    .eq("is_active", true)
    .eq("election.year", 2026)
    .order("name");

  const candList = (candidates ?? []).map((c) => {
    const elec = Array.isArray(c.election) ? c.election[0] : c.election;
    return {
      id: c.id as string,
      name: c.name as string,
      party: c.party as string | null,
      slug: c.slug as string,
      label: `${c.name}${c.party ? ` (${c.party})` : ""} — ${elec?.type ?? ""}${elec?.state ? " " + elec.state : ""}`,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Alertas customizados
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Receba email quando um candidato sobe/cai, quando uma pesquisa nova é registrada,
          ou quando a situação TSE muda. Verificado a cada 30 minutos.
        </p>
      </div>

      {!isPro ? (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-warning" />
            <p className="font-semibold">Recurso exclusivo do plano Pro+</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Alertas customizados estão disponíveis nos planos Pro e Business. Faça upgrade
            para ativar.
          </p>
          <Link
            href="/precos"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Ver planos →
          </Link>
        </div>
      ) : (
        <AlertasManager
          initialAlerts={(alerts ?? []) as Parameters<typeof AlertasManager>[0]["initialAlerts"]}
          candidates={candList}
        />
      )}
    </div>
  );
}
