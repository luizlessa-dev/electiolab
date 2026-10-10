/** Barras lado a lado de um confronto de 2º turno (server component, sem estado). */

export type MatchupSide = {
  nome: string;
  partido?: string | null;
  pct: number;
  cor?: string | null;
};

function Side({ s, leading }: { s: MatchupSide; leading: boolean }) {
  const c = s.cor ?? "#6b7280";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
          <span className="truncate">{s.nome}</span>
          {s.partido && <span className="text-[11px] text-muted-foreground font-mono shrink-0">{s.partido}</span>}
        </span>
        <span
          className="font-mono tabular-nums text-xl font-bold shrink-0"
          style={{ color: leading ? c : undefined }}
        >
          {s.pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.pct)}%`, backgroundColor: c }} />
      </div>
    </div>
  );
}

export function Matchup({ lados }: { lados: MatchupSide[] }) {
  const max = Math.max(...lados.map((l) => l.pct));
  return (
    <div className="space-y-3">
      {lados.map((l) => (
        <Side key={l.nome} s={l} leading={l.pct === max} />
      ))}
    </div>
  );
}

export function fmtData(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}
