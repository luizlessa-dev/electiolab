"use client";

interface InstituteData {
  name: string;
  methodology_default: string | null;
  reliability_score: number;
  total_polls: number;
}

function scoreColor(score: number) {
  if (score >= 0.85) return "text-emerald-400";
  if (score >= 0.75) return "text-yellow-400";
  if (score >= 0.65) return "text-orange-400";
  return "text-red-400";
}

function scoreLabel(score: number) {
  if (score >= 0.85) return "A+";
  if (score >= 0.75) return "A";
  if (score >= 0.65) return "B";
  return "C";
}

function methodColor(method: string | null) {
  switch (method) {
    case "presencial": return "bg-emerald-400";
    case "telefonica": return "bg-blue-400";
    case "online": return "bg-purple-400";
    case "mista": return "bg-amber-400";
    default: return "bg-muted-foreground";
  }
}

export function InstituteRanking({ data }: { data: InstituteData[] }) {
  const sorted = [...data].sort(
    (a, b) => b.reliability_score - a.reliability_score
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
        <span className="w-8">#</span>
        <span className="flex-1">Instituto</span>
        <span className="w-20 text-center">Metodo</span>
        <span className="w-16 text-right">Pesquisas</span>
        <span className="w-20 text-right">Score</span>
        <span className="w-10 text-right">Nota</span>
      </div>

      {/* Rows */}
      {sorted.map((inst, i) => (
        <div
          key={inst.name}
          className={`flex items-center px-3 py-2.5 text-xs border-b border-border/50 hover:bg-accent/30 transition-colors ${
            i % 2 === 0 ? "bg-transparent" : "bg-muted/20"
          }`}
        >
          <span className="w-8 font-mono text-muted-foreground tabular-nums">
            {i + 1}
          </span>
          <span className="flex-1 font-medium text-foreground">
            {inst.name}
          </span>
          <span className="w-20 text-center flex items-center justify-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${methodColor(inst.methodology_default)}`} />
            <span className="text-muted-foreground text-xs">
              {inst.methodology_default ?? "—"}
            </span>
          </span>
          <span className="w-16 text-right font-mono tabular-nums text-muted-foreground">
            {inst.total_polls}
          </span>
          <span className="w-20 text-right">
            <span className="font-mono tabular-nums font-semibold">
              {(inst.reliability_score * 100).toFixed(0)}%
            </span>
          </span>
          <span className={`w-10 text-right font-mono font-bold ${scoreColor(inst.reliability_score)}`}>
            {scoreLabel(inst.reliability_score)}
          </span>
        </div>
      ))}
    </div>
  );
}
