import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ElectioLab — Inteligência eleitoral";
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
          background: "#0b1220",
          color: "#f9fafb",
          fontFamily: "system-ui, -apple-system, sans-serif",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              color: "#0b1220",
            }}
          >
            E
          </div>
          ElectioLab
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          Inteligência eleitoral.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 34,
            color: "#94a3b8",
          }}
        >
          Pesquisas, apuração e dados das eleições 2026.
        </div>
      </div>
    ),
    size
  );
}
