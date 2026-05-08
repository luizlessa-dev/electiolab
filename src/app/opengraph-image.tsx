import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ElectioLab — A verdade eleitoral está nos dados";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg,#0b1220 0%,#0f172a 60%,#111827 100%)",
          color: "#f9fafb",
          fontFamily: "system-ui, -apple-system, sans-serif",
          flexDirection: "column",
          padding: 80,
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* Faixa lateral */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 12,
            background: "#3b82f6",
            display: "flex",
          }}
        />

        {/* Top: brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#94a3b8",
            fontSize: 22,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              color: "#0b1220",
            }}
          >
            E
          </div>
          ELECTIOLAB
        </div>

        {/* Center: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 980,
              color: "#f9fafb",
            }}
          >
            A verdade eleitoral está nos dados.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#cbd5e1",
              maxWidth: 920,
              lineHeight: 1.4,
            }}
          >
            Agregador de pesquisas, média ponderada por recência e acurácia dos
            institutos. Eleições 2026.
          </div>
        </div>

        {/* Bottom: stats */}
        <div
          style={{
            display: "flex",
            gap: 60,
            fontSize: 18,
            color: "#94a3b8",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#f9fafb" }}>
              27
            </span>
            <span>governadores</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#f9fafb" }}>
              280+
            </span>
            <span>candidatos</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#f9fafb" }}>
              média
            </span>
            <span>ponderada</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#3b82f6" }}>
              electiolab.com
            </span>
            <span>API · Newsletter · Dashboard</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
