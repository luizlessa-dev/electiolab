import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ElectioLab — Inteligência Eleitoral";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0f1117",
          padding: "64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #3b82f6, rgba(59,130,246,0.3), transparent)",
          }}
        />

        {/* Logo + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              backgroundColor: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="14" width="4" height="7" rx="1" fill="#3b82f6" />
              <rect x="10" y="9" width="4" height="12" rx="1" fill="#3b82f6" opacity="0.7" />
              <rect x="17" y="4" width="4" height="17" rx="1" fill="#3b82f6" opacity="0.5" />
            </svg>
          </div>
          <span style={{ color: "#ffffff", fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px" }}>
            ElectioLab
          </span>
          <div
            style={{
              marginLeft: "8px",
              padding: "4px 10px",
              borderRadius: "4px",
              backgroundColor: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              color: "#93c5fd",
              fontSize: "12px",
              fontWeight: "600",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            AO VIVO
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ color: "#94a3b8", fontSize: "16px", fontWeight: "500", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Pesquisas Eleitorais Brasil 2026
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: "56px",
              fontWeight: "800",
              letterSpacing: "-2px",
              lineHeight: "1.1",
            }}
          >
            A verdade eleitoral
            <br />
            está nos{" "}
            <span style={{ color: "#3b82f6" }}>dados.</span>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "32px" }}>
            {[
              { value: "26+", label: "Pesquisas" },
              { value: "13", label: "Institutos" },
              { value: "60k+", label: "Entrevistados" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ color: "#ffffff", fontSize: "28px", fontWeight: "700", fontFamily: "monospace" }}>
                  {s.value}
                </span>
                <span style={{ color: "#64748b", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              borderRadius: "6px",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "700",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            electiolab.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
