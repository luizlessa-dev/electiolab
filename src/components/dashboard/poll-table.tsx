"use client";

interface PollRow {
  id: string;
  publication_date: string;
  institute_name: string;
  methodology: string;
  sample_size: number;
  margin_of_error: number | null;
  results: { candidate_name: string; percentage: number; color: string }[];
}

function methodDot(method: string) {
  switch (method) {
    case "presencial": return "bg-emerald-400";
    case "telefonica": return "bg-blue-400";
    case "online": return "bg-purple-400";
    case "mista": return "bg-amber-400";
    default: return "bg-muted-foreground";
  }
}

export function PollTable({ polls }: { polls: PollRow[] }) {
  if (polls.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">
        Nenhuma pesquisa encontrada.
      </p>
    );
  }

  const topCandidates = polls[0]?.results
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5) ?? [];

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-center px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
        <span className="w-16">Data</span>
        <span className="w-28">Instituto</span>
        <span className="w-20">Metodo</span>
        <span className="w-16 text-right">Amostra</span>
        {topCandidates.map((c) => (
          <span key={c.candidate_name} className="w-16 text-right">
            {c.candidate_name.split(" ")[0]}
          </span>
        ))}
      </div>

      {/* Rows */}
      {polls.map((poll, i) => (
        <div
          key={poll.id}
          className={`flex items-center px-3 py-2 text-sm border-b border-border/30 hover:bg-accent/30 transition-colors ${
            i % 2 === 0 ? "bg-transparent" : "bg-muted/15"
          }`}
        >
          <span className="w-16 font-mono tabular-nums text-muted-foreground text-xs">
            {(() => {
              const d = new Date(poll.publication_date);
              return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`;
            })()}
          </span>
          <span className="w-28 font-medium text-foreground truncate">
            {poll.institute_name}
          </span>
          <span className="w-20 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${methodDot(poll.methodology)}`} />
            <span className="text-muted-foreground text-xs truncate">
              {poll.methodology}
            </span>
          </span>
          <span className="w-16 text-right font-mono tabular-nums text-muted-foreground text-xs">
            {poll.sample_size.toLocaleString("pt-BR")}
          </span>
          {topCandidates.map((tc) => {
            const result = poll.results.find(
              (r) => r.candidate_name === tc.candidate_name
            );
            const pct = result?.percentage ?? 0;
            return (
              <span
                key={tc.candidate_name}
                className="w-16 text-right font-mono tabular-nums text-xs font-semibold"
                style={{ color: pct > 0 ? tc.color : "oklch(0.35 0 0)" }}
              >
                {pct > 0 ? `${pct}%` : "—"}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
