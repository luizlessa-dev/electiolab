"use client";

import { useState } from "react";
import {
  Bell,
  Trash2,
  Plus,
  TrendingUp,
  FileSearch,
  ShieldCheck,
  Loader2,
  Search,
} from "lucide-react";

type Alert = {
  id: string;
  alert_type: "new_poll" | "movement" | "tse_change";
  threshold_pp: number | null;
  is_active: boolean;
  last_value: number | null;
  last_triggered_at: string | null;
  created_at: string;
  candidate:
    | { id: string; name: string; slug: string; party: string | null; color: string | null }
    | { id: string; name: string; slug: string; party: string | null; color: string | null }[]
    | null;
  election:
    | { id: string; name: string; type: string; state: string | null }
    | { id: string; name: string; type: string; state: string | null }[]
    | null;
};

type Candidate = { id: string; name: string; party: string | null; slug: string; label: string };

type Props = {
  initialAlerts: Alert[];
  candidates: Candidate[];
};

const TYPE_INFO: Record<Alert["alert_type"], { label: string; desc: string; icon: typeof Bell }> = {
  new_poll: {
    label: "Pesquisa nova",
    desc: "Avisa quando uma pesquisa nova é registrada na eleição do candidato.",
    icon: FileSearch,
  },
  movement: {
    label: "Movimento de %",
    desc: "Avisa quando a média ponderada do candidato muda mais que o threshold (em pontos percentuais).",
    icon: TrendingUp,
  },
  tse_change: {
    label: "Mudança TSE",
    desc: "Avisa quando a situação no TSE do candidato muda (Apto ↔ Indeferido).",
    icon: ShieldCheck,
  },
};

function singleObj<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function AlertasManager({ initialAlerts, candidates }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<Alert["alert_type"]>("new_poll");
  const [candidateId, setCandidateId] = useState<string>("");
  const [threshold, setThreshold] = useState<number>(5);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredCands = candidates.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  async function createAlert() {
    if (!candidateId) {
      setError("Selecione um candidato.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/account/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_type: type,
          candidate_id: candidateId,
          threshold_pp: type === "movement" ? threshold : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar");
      // Reload
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
      setSubmitting(false);
    }
  }

  async function deleteAlert(id: string) {
    if (!confirm("Remover esse alerta?")) return;
    const res = await fetch(`/api/account/alerts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }
  }

  return (
    <>
      {/* Lista alertas */}
      {alerts.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Nenhum alerta configurado</p>
          <p className="text-xs text-muted-foreground">
            Crie seu primeiro alerta abaixo para receber emails sobre os candidatos que importam.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const cand = singleObj(a.candidate);
            const info = TYPE_INFO[a.alert_type];
            const Icon = info.icon;
            return (
              <div
                key={a.id}
                className="rounded-lg border border-border bg-card p-4 flex items-start gap-3"
              >
                <div
                  className="w-1 self-stretch rounded-full"
                  style={{ backgroundColor: cand?.color ?? "#6b7280" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold">{info.label}</span>
                    {cand && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-mono uppercase border"
                        style={{ borderColor: cand.color ?? undefined, color: cand.color ?? undefined }}
                      >
                        {cand.party}
                      </span>
                    )}
                    {a.is_active ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-positive/15 text-positive font-mono uppercase">
                        ativo
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground font-mono uppercase">
                        desativado
                      </span>
                    )}
                  </div>
                  {cand && (
                    <p className="text-sm font-medium">{cand.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {info.desc}
                    {a.alert_type === "movement" && a.threshold_pp && (
                      <> · threshold ±{a.threshold_pp}pp</>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Criado em {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    {a.last_triggered_at && (
                      <> · último disparo {new Date(a.last_triggered_at).toLocaleString("pt-BR")}</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => deleteAlert(a.id)}
                  className="p-2 rounded hover:bg-muted/50 text-muted-foreground hover:text-negative shrink-0"
                  aria-label="Remover alerta"
                  title="Remover alerta"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Botão / form de criação */}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-lg border-2 border-dashed border-border bg-card/30 hover:border-primary/50 hover:bg-card transition-colors py-4 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Criar novo alerta
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Novo alerta</p>
            <button
              onClick={() => setCreating(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>

          {/* Type radio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(Object.keys(TYPE_INFO) as Array<Alert["alert_type"]>).map((t) => {
              const info = TYPE_INFO[t];
              const Icon = info.icon;
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`p-3 rounded-md border text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{info.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{info.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Search candidate */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Candidato
            </label>
            <div className="relative mt-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar candidato..."
                className="w-full pl-9 pr-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {search && (
              <div className="max-h-48 overflow-y-auto mt-2 rounded-md border border-border bg-background">
                {filteredCands.slice(0, 10).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCandidateId(c.id);
                      setSearch(c.name);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 border-b border-border/30 last:border-0 ${
                      candidateId === c.id ? "bg-primary/10" : ""
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
                {filteredCands.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground text-center">Nenhum encontrado.</p>
                )}
              </div>
            )}
          </div>

          {/* Threshold (only for movement) */}
          {type === "movement" && (
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Threshold ({threshold} pp)
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                className="w-full mt-2"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Avisa quando a média mudar mais de {threshold}pp em qualquer direção.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-negative">{error}</p>
          )}

          <button
            onClick={createAlert}
            disabled={submitting || !candidateId}
            className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Criar alerta
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Os alertas são verificados pelo cron a cada 30 minutos. Emails são enviados pelo Resend
        para o endereço cadastrado.
      </p>
    </>
  );
}
