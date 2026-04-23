"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

interface TrendPoint {
  [key: string]: number | string;
}

interface CandidateInfo {
  name: string;
  color: string;
}

const AXIS_COLOR = "oklch(0.35 0.005 260)";
const GRID_COLOR = "oklch(0.20 0.005 260)";
const LABEL_COLOR = "oklch(0.50 0 0)";

export function TrendLineChart({
  data,
  candidates,
}: {
  data: TrendPoint[];
  candidates: CandidateInfo[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
      >
        <XAxis
          dataKey="date"
          axisLine={{ stroke: AXIS_COLOR }}
          tickLine={false}
          tick={{ fontSize: 10, fill: LABEL_COLOR, fontFamily: "var(--font-geist-mono)" }}
          tickFormatter={(v) => {
            const d = new Date(v);
            return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
          }}
        />
        <YAxis
          domain={[0, "auto"]}
          axisLine={{ stroke: AXIS_COLOR }}
          tickLine={false}
          tick={{ fontSize: 10, fill: LABEL_COLOR, fontFamily: "var(--font-geist-mono)" }}
          tickFormatter={(v) => `${v}%`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.18 0.005 260)",
            border: "1px solid oklch(0.25 0.005 260)",
            borderRadius: "4px",
            fontSize: "11px",
            fontFamily: "var(--font-geist-mono)",
          }}
          itemStyle={{ color: "oklch(0.85 0 0)" }}
          labelStyle={{ color: "oklch(0.55 0 0)", fontSize: "10px" }}
          labelFormatter={(v) => {
            const d = new Date(v as string);
            return d.toLocaleDateString("pt-BR");
          }}
          formatter={(value) => [`${value}%`]}
        />
        {candidates.map((c) => (
          <Line
            key={c.name}
            type="monotone"
            dataKey={c.name}
            stroke={c.color}
            strokeWidth={2.5}
            dot={false}
            connectNulls
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
