"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2 } from "lucide-react";

type DataPoint = {
  date: string;
  weighted_average: number;
  total_sample_size: number;
};

type Props = {
  candidateId: string;
  candidateName: string;
  color: string;
  initialData?: DataPoint[];
};

export function DriftChart({ candidateId, candidateName, color, initialData }: Props) {
  const [data, setData] = useState<DataPoint[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) return;
    fetch(`/api/v1/drift?candidate_id=${candidateId}&days=120`)
      .then((r) => r.json())
      .then((d: { data?: DataPoint[] }) => {
        setData(d.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [candidateId, initialData]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Carregando histórico…</span>
      </div>
    );
  }

  if (data.length < 2) {
    return null; // Sem dados suficientes — esconde
  }

  const formatted = data.map((d) => ({
    ...d,
    dateStr: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    pct: Number(d.weighted_average),
  }));

  const first = formatted[0]?.pct ?? 0;
  const last = formatted[formatted.length - 1]?.pct ?? 0;
  const delta = last - first;
  const deltaSign = delta >= 0 ? "+" : "";
  const deltaColor = delta >= 0 ? "text-positive" : "text-negative";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Drift dos últimos 120 dias
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            % por pesquisa individual · {formatted.length} pontos
          </p>
        </div>
        <div className="text-right">
          <p className={`text-base font-mono font-bold tabular-nums ${deltaColor}`}>
            {deltaSign}
            {delta.toFixed(1)}pp
          </p>
          <p className="text-[10px] text-muted-foreground">
            {first.toFixed(1)}% → {last.toFixed(1)}%
          </p>
        </div>
      </div>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <LineChart data={formatted} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" opacity={0.3} />
            <XAxis
              dataKey="dateStr"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted-foreground)", fontSize: 10 }}
              formatter={(value: unknown) => [
                typeof value === "number" ? `${value.toFixed(1)}%` : String(value),
                candidateName,
              ]}
            />
            <Line
              type="monotone"
              dataKey="pct"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
