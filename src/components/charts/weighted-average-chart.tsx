"use client";

interface CandidateAverage {
  name: string;
  party: string;
  average: number;
  confidenceLow: number;
  confidenceHigh: number;
  color: string;
  pollCount: number;
}

export function WeightedAverageChart({
  data,
}: {
  data: CandidateAverage[];
}) {
  const sorted = [...data].sort((a, b) => b.average - a.average);
  const max = Math.max(...sorted.map((d) => d.confidenceHigh || d.average), 60);

  return (
    <div className="space-y-1.5">
      {sorted.map((entry, i) => {
        const barWidth = (entry.average / max) * 100;
        const ciLow = (entry.confidenceLow / max) * 100;
        const ciHigh = (entry.confidenceHigh / max) * 100;

        return (
          <div key={entry.name} className="group">
            <div className="flex items-center gap-2">
              {/* Rank */}
              <span className="w-5 text-xs font-mono text-muted-foreground tabular-nums text-right">
                #{i + 1}
              </span>

              {/* Name + Party */}
              <div className="w-32 min-w-[8rem]">
                <span className="text-sm font-semibold text-foreground leading-none">
                  {entry.name}
                </span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground ml-1.5">
                  {entry.party}
                </span>
              </div>

              {/* Bar area */}
              <div className="flex-1 relative h-7">
                {/* Confidence interval line */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-[3px] opacity-30"
                  style={{
                    left: `${ciLow}%`,
                    width: `${ciHigh - ciLow}%`,
                    backgroundColor: entry.color || "#6b7280",
                  }}
                />
                {/* Main bar */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-5 rounded-sm transition-all"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: entry.color || "#6b7280",
                    opacity: 0.85,
                  }}
                />
              </div>

              {/* Value */}
              <div className="w-16 text-right">
                <span
                  className="text-base font-mono font-bold tabular-nums"
                  style={{ color: entry.color || "#6b7280" }}
                >
                  {entry.average}%
                </span>
              </div>
            </div>

            {/* Confidence on hover */}
            <div className="hidden group-hover:flex ml-[8.5rem] text-xs font-mono text-muted-foreground gap-3 pl-5">
              <span>IC: {entry.confidenceLow}–{entry.confidenceHigh}%</span>
              <span>{entry.pollCount} pesquisas</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
