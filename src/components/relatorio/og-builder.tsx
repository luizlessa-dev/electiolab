import { ImageResponse } from "next/og";
import type { ReportData } from "./types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Gera uma ImageResponse para a OG image de um relatório semanal.
 * Use em cada opengraph-image.tsx das páginas de semana.
 */
export function buildRelatorioOG(d: ReportData): ImageResponse {
  const top3 = d.presidencial.slice(0, 3);
  const maxPct = top3[0]?.pct ?? 40;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg,#0b1220 0%,#0f172a 60%,#111827 100%)",
          color: "#f9fafb",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "56px 64px",
          position: "relative",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Lateral stripe */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 10,
            background: "#3b82f6",
            display: "flex",
          }}
        />

        {/* Top row: brand + week badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "#94a3b8",
              fontSize: 20,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 900,
                color: "#0b1220",
              }}
            >
              E
            </div>
            ELECTIOLAB · RELATÓRIO SEMANAL
          </div>

          {/* Week badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#1e3a5f",
              border: "1px solid #2563eb44",
              borderRadius: 8,
              padding: "8px 20px",
            }}
          >
            <span style={{ fontSize: 14, color: "#93c5fd", letterSpacing: 2, textTransform: "uppercase" }}>
              Semana
            </span>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#3b82f6" }}>
              {d.semana}
            </span>
          </div>
        </div>

        {/* Date range */}
        <div
          style={{
            fontSize: 22,
            color: "#64748b",
            marginTop: 12,
            display: "flex",
          }}
        >
          {d.dateRange}
        </div>

        {/* Candidates */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1, justifyContent: "center" }}>
          {top3.map((c, i) => {
            const barPct = Math.round((c.pct / (maxPct * 1.1)) * 100);
            const deltaSign = c.delta > 0 ? "+" : "";
            const deltaColor = c.delta > 0 ? "#22c55e" : c.delta < 0 ? "#ef4444" : "#6b7280";
            return (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {/* Rank */}
                <span
                  style={{
                    fontSize: 18,
                    color: "#475569",
                    fontVariantNumeric: "tabular-nums",
                    width: 18,
                    display: "flex",
                  }}
                >
                  {i + 1}
                </span>

                {/* Name + party */}
                <div style={{ display: "flex", flexDirection: "column", width: 200 }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{c.name}</span>
                  <span style={{ fontSize: 14, color: "#64748b" }}>{c.party}</span>
                </div>

                {/* Bar */}
                <div
                  style={{
                    flex: 1,
                    height: 10,
                    background: "#1e293b",
                    borderRadius: 5,
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${barPct}%`,
                      background: c.cor,
                      borderRadius: 5,
                      display: "flex",
                    }}
                  />
                </div>

                {/* Pct */}
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: c.cor,
                    width: 80,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  {c.pct}%
                </span>

                {/* Delta */}
                <span
                  style={{
                    fontSize: 16,
                    color: deltaColor,
                    width: 52,
                    fontVariantNumeric: "tabular-nums",
                    display: "flex",
                  }}
                >
                  {deltaSign}{c.delta.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid #1e293b",
            paddingTop: 20,
          }}
        >
          <div style={{ display: "flex", gap: 48, fontSize: 16, color: "#475569" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: "#94a3b8" }}>
                {d.totalPesquisas}
              </span>
              <span>pesquisas</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: "#94a3b8" }}>
                {d.totalInstitutos}
              </span>
              <span>institutos</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: "#94a3b8" }}>
                {(d.totalEntrevistados / 1000).toFixed(0)}k
              </span>
              <span>entrevistados</span>
            </div>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#3b82f6" }}>
            electiolab.com
          </span>
        </div>
      </div>
    ),
    size
  );
}
