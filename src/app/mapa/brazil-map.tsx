"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

type StateData = {
  state: string;
  election_id: string;
  election_name: string;
  leader: { name: string; party: string | null; color: string | null; pct: number; slug: string } | null;
  polls_count: number;
  most_recent: string | null;
};

type Props = { states: StateData[] };

// Cartograma simplificado do Brasil (não geograficamente preciso, mas
// preserva relações Norte-Sul-Leste-Oeste). Cada célula = 1 UF clicável.
// Posições: { state: [row, col] }
const POSITIONS: Record<string, [number, number]> = {
  RR: [0, 2], AP: [0, 4],
  AM: [1, 1], PA: [1, 3], MA: [1, 4], CE: [1, 5], RN: [1, 6],
  AC: [2, 0], RO: [2, 1], TO: [2, 3], PI: [2, 4], PB: [2, 6],
                          MT: [3, 2],            BA: [3, 4], PE: [3, 5], AL: [3, 6],
                          MS: [4, 2], GO: [4, 3], MG: [4, 4], ES: [4, 5], SE: [4, 6],
                          DF: [3, 3],
                                       PR: [5, 3], SP: [5, 4], RJ: [5, 5],
                                       SC: [6, 3],
                                       RS: [7, 3],
};

const STATE_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

const ROWS = 8;
const COLS = 7;

export function BrazilMap({ states }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const dataByState = new Map(states.map((s) => [s.state, s]));

  const grid: (string | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );
  for (const [uf, [r, c]] of Object.entries(POSITIONS)) {
    grid[r][c] = uf;
  }

  const hoveredData = hover ? dataByState.get(hover) : null;

  // Stats agregados
  const partyLeaders = new Map<string, number>();
  for (const s of states) {
    if (s.leader?.party) {
      partyLeaders.set(s.leader.party, (partyLeaders.get(s.leader.party) ?? 0) + 1);
    }
  }
  const topParties = Array.from(partyLeaders.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* Mapa cartograma */}
      <div className="rounded-lg border border-border bg-card p-6 overflow-x-auto">
        <div
          className="grid gap-2 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(56px, 80px))`,
            maxWidth: 640,
          }}
        >
          {grid.flat().map((uf, idx) => {
            if (!uf) return <div key={idx} />;
            const data = dataByState.get(uf);
            const color = data?.leader?.color ?? "#374151";
            const isHover = hover === uf;
            return (
              <Link
                key={uf}
                href={data ? `/dashboard?election=${data.election_id}` : "#"}
                onMouseEnter={() => setHover(uf)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(uf)}
                onBlur={() => setHover(null)}
                className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs font-bold transition-all duration-150 group ${
                  isHover ? "scale-105 shadow-lg z-10 relative" : ""
                }`}
                style={{
                  backgroundColor: data?.leader ? color : "#374151",
                  color: "#fff",
                  border: isHover ? "2px solid white" : "2px solid transparent",
                }}
                title={`${STATE_NAMES[uf]}${data?.leader ? ` — ${data.leader.name}` : ""}`}
              >
                <span className="text-[10px] font-mono opacity-90">{uf}</span>
                {data?.leader && (
                  <span className="text-[10px] font-mono mt-0.5 opacity-95">
                    {data.leader.pct.toFixed(0)}%
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-4 italic">
          Cartograma não-geográfico · cada quadrado = 1 UF · cores = partido do líder
        </p>
      </div>

      {/* Painel lateral */}
      <aside className="space-y-4">
        {/* Tooltip ao hover */}
        {hoveredData ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{hoveredData.state}</span>
              <h3 className="text-base font-bold">{STATE_NAMES[hoveredData.state]}</h3>
            </div>
            {hoveredData.leader ? (
              <>
                <div className="mt-3 pb-3 border-b border-border">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Líder
                  </p>
                  <p className="text-lg font-bold mt-0.5">{hoveredData.leader.name}</p>
                  <p className="text-xs text-muted-foreground">{hoveredData.leader.party}</p>
                  <p
                    className="text-3xl font-mono font-bold tabular-nums mt-2"
                    style={{ color: hoveredData.leader.color ?? undefined }}
                  >
                    {hoveredData.leader.pct.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {hoveredData.polls_count} pesquisa{hoveredData.polls_count === 1 ? "" : "s"}
                  {hoveredData.most_recent && (
                    <>
                      {" · última "}
                      {new Date(hoveredData.most_recent).toLocaleDateString("pt-BR")}
                    </>
                  )}
                </p>
                <Link
                  href={`/dashboard?election=${hoveredData.election_id}`}
                  className="mt-3 text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Ver dashboard <ChevronRight className="h-3 w-3" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem pesquisa indexada.</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card/30 p-4 text-center">
            <p className="text-xs text-muted-foreground italic">
              Passe o cursor numa UF
            </p>
          </div>
        )}

        {/* Stats agregadas */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Líderes por partido
          </p>
          <div className="space-y-2">
            {topParties.map(([party, count]) => {
              const sample = states.find((s) => s.leader?.party === party);
              return (
                <div key={party} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: sample?.leader?.color ?? "#6b7280" }}
                    />
                    <span className="font-medium">{party}</span>
                  </div>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {count} UF{count === 1 ? "" : "s"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
