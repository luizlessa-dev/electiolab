"use client";

import { useState } from "react";

export type RunoffTabScenario = {
  key: string;
  /** oponente comum (fixo à esquerda) — pode ser null se não houver candidato comum */
  commonName: string;
  commonColor: string | null;
  commonPct: number;
  adversaryName: string;
  adversaryParty: string | null;
  adversaryColor: string | null;
  adversaryPct: number;
  undecided: number;
  polls: number;
  institutes: string[];
  latest: string;
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

function fmtDate(iso: string): string {
  // "2026-04-29" → "29/04/2026" sem depender de timezone
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function StateRunoffTabs({ scenarios }: { scenarios: RunoffTabScenario[] }) {
  const [active, setActive] = useState(0);
  if (scenarios.length === 0) return null;
  const s = scenarios[active] ?? scenarios[0];

  const commonLeads = s.commonPct >= s.adversaryPct;
  const gap = Math.abs(s.commonPct - s.adversaryPct);
  const leaderName = commonLeads ? s.commonName : s.adversaryName;
  const single = s.polls === 1;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Abas — uma por confronto */}
      <div
        role="tablist"
        aria-label="Cenários de 2º turno"
        className="flex overflow-x-auto border-b border-border bg-muted/20"
      >
        {scenarios.map((sc, i) => {
          const isActive = i === active;
          return (
            <button
              key={sc.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {sc.commonName.split(" ")[0]}{" "}
              <span className="text-muted-foreground font-normal">×</span>{" "}
              {sc.adversaryName.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Painel ativo */}
      <div className="px-4 py-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold">
            {s.commonName} <span className="text-muted-foreground font-normal">×</span> {s.adversaryName}
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {gap < 4 ? "Disputa apertada" : `${leaderName} à frente`}
          </span>
        </div>

        <div className="space-y-3">
          <Bar name={s.commonName} party={null} pct={s.commonPct} color={s.commonColor} leading={commonLeads} />
          <Bar name={s.adversaryName} party={s.adversaryParty} pct={s.adversaryPct} color={s.adversaryColor} leading={!commonLeads} />
          <div className="space-y-1 pt-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">Indecisos · brancos · nulos</span>
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

        {/* Atribuição — transparente sobre a fragilidade do dado */}
        <div className="flex items-center justify-between gap-3 flex-wrap text-[11px] text-muted-foreground border-t border-border pt-3">
          <span>
            {single ? (
              <>Pesquisa única · {s.institutes[0]} · {fmtDate(s.latest)}</>
            ) : (
              <>Média de {s.polls} pesquisas · {s.institutes.join(", ")}</>
            )}
          </span>
          {gap < 4 && (
            <span className="font-mono">diferença {gap.toFixed(1)}pp</span>
          )}
        </div>
      </div>
    </div>
  );
}
