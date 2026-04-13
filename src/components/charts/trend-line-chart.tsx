"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Scatter,
  ScatterChart,
  ComposedChart,
} from "recharts";

interface TrendPoint {
  [key: string]: number | string;
}

interface CandidateInfo {
  name: string;
  color: string;
}

export function TrendLineChart({
  data,
  candidates,
}: {
  data: TrendPoint[];
  candidates: CandidateInfo[];
}) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => {
            const d = new Date(v);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          }}
        />
        <YAxis
          domain={[0, 60]}
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          labelFormatter={(v) => {
            const d = new Date(v as string);
            return d.toLocaleDateString("pt-BR");
          }}
          formatter={(value) => [`${value}%`]}
        />
        <Legend />
        {candidates.map((c) => (
          <Line
            key={c.name}
            type="monotone"
            dataKey={c.name}
            stroke={c.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
