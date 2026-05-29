"use client";

import { useState } from "react";

export type TabScenario = {
  label: string;
  adversaryName: string;
  adversaryParty: string | null;
  adversaryColor: string | null;
  adversaryPct: number;
  commonPct: number;
  undecided: number;
  polls: number;
  status: "empate" | "vantagem" | "folga" | "raso";
};

const STATUS: Record<
  TabScenario["status"],
  { label: string; cls: string }
> = {
  empate: { label: "Empate técnico", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  vantagem: { label: "Vantagem do líder", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  folga: { label: "Folga clara", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  raso: { label: "Poucos dados", cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

function Bar({
  name,
  party,
  pct,
  color,
  leading,
}: {
  name: string;
  party: string | null;
  pct: number;
  color: string | null;
  leading: boolean;
}) {
  const c = color ?? "#6b7280";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
          <span className="truncate">{name}</span>
          {party && <span className="text-[11px] text-muted-foreground font-mono shrink-0">{party}</span>}
        </span>
        <span
          className="font-mono tabular-nums text-base font-bold shrink-0"
          style={{ color: leading ? c : undefined }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: c }}
        />
      </div>
    </div>
  );
}

export function SecondRoundTabs({
  commonName,
  commonColor,
  scenarios,
}: {
  commonName: string;
  commonColor: string | null;
  scenarios: TabScenario[];
}) {
  const [active, setActive] = useState(0);
  if (scenarios.length === 0) return null;
  const s = scenarios[active] ?? scenarios[0];

  const commonLeads = s.commonPct >= s.adversaryPct;
  const gap = Math.abs(s.commonPct - s.adversaryPct);
  const leaderName = commonLeads ? commonName : s.adversaryName;
  const st = STATUS[s.status];

  return (
    <div className="rounded-sm border border-border bg-card overflow-hidden">
      {/* Abas — uma por adversário (oponente comum fixo) */}
      <div
        role="tablist"
        aria-label="Cenários de 2º turno"
        className="flex overflow-x-auto border-b border-border bg-muted/20 scrollbar-none"
      >
        {scenarios.map((sc, i) => {
          const isActive = i === active;
          return (
            <button
              key={sc.label}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-muted-foreground font-normal">vs</span> {sc.adversaryName}
            </button>
          );
        })}
      </div>

      {/* Painel do cenário ativo */}
      <div className="px-4 py-5 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold">
            {commonName} <span className="text-muted-foreground font-normal">×</span> {s.adversaryName}
          </h3>
          <span className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${st.cls}`}>
            {st.label}
          </span>
        </div>

        <div className="space-y-3">
          <Bar
            name={commonName}
            party={null}
            pct={s.commonPct}
            color={commonColor}
            leading={commonLeads}
          />
          <Bar
            name={s.adversaryName}
            party={s.adversaryParty}
            pct={s.adversaryPct}
            color={s.adversaryColor}
            leading={!commonLeads}
          />
          {/* Indecisos / brancos / nulos — torna a soma compreensível */}
          <div className="space-y-1 pt-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Indecisos · brancos · nulos
              </span>
              <span className="font-mono tabular-nums text-xs text-muted-foreground">
                {s.undecided.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-muted-foreground/30"
                style={{ width: `${Math.min(100, s.undecided)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Resumo do cenário */}
        <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground border-t border-border pt-3">
          <span>
            {s.status === "empate" ? (
              <>Empate técnico — diferença de <strong className="text-foreground font-mono">{gap.toFixed(1)}pp</strong> dentro da margem</>
            ) : (
              <>
                <strong className="text-foreground">{leaderName}</strong> à frente por{" "}
                <strong className="text-foreground font-mono">{gap.toFixed(1)}pp</strong>
              </>
            )}
          </span>
          <span className="font-mono">
            {s.polls} {s.polls === 1 ? "pesquisa" : "pesquisas"}
          </span>
        </div>
      </div>
    </div>
  );
}
