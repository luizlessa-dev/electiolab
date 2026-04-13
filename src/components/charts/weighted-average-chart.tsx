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
  const maxVal = Math.max(...sorted.map((d) => d.average), 1);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  }

  return (
    <div className="space-y-3">
      {sorted.map((c) => (
        <div key={c.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="font-semibold">{c.name}</span>
              <span className="text-muted-foreground text-xs">
                {c.party}
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold font-mono" style={{ color: c.color }}>
                {c.average}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                ({c.confidenceLow}-{c.confidenceHigh})
              </span>
            </div>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(c.average / 55) * 100}%`,
                backgroundColor: c.color,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {c.pollCount} pesquisas
          </p>
        </div>
      ))}
    </div>
  );
}
