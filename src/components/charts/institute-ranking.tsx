"use client";

import { Badge } from "@/components/ui/badge";

interface InstituteData {
  name: string;
  methodology_default: string | null;
  reliability_score: number;
  total_polls: number;
}

function scoreColor(score: number) {
  if (score >= 0.85) return "bg-emerald-500";
  if (score >= 0.75) return "bg-yellow-500";
  if (score >= 0.65) return "bg-orange-500";
  return "bg-red-500";
}

function scoreLabel(score: number) {
  if (score >= 0.85) return "Excelente";
  if (score >= 0.75) return "Bom";
  if (score >= 0.65) return "Regular";
  return "Fraco";
}

export function InstituteRanking({ data }: { data: InstituteData[] }) {
  const sorted = [...data].sort(
    (a, b) => b.reliability_score - a.reliability_score
  );

  return (
    <div className="space-y-2">
      {sorted.map((inst, i) => (
        <div
          key={inst.name}
          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-muted-foreground w-6">
              #{i + 1}
            </span>
            <div>
              <p className="font-medium text-sm">{inst.name}</p>
              <p className="text-xs text-muted-foreground">
                {inst.methodology_default ?? "—"} · {inst.total_polls} pesquisas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${scoreColor(inst.reliability_score)}`}
                style={{
                  width: `${inst.reliability_score * 100}%`,
                }}
              />
            </div>
            <Badge variant="secondary" className="text-xs min-w-[70px] justify-center">
              {(inst.reliability_score * 100).toFixed(0)}% — {scoreLabel(inst.reliability_score)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
