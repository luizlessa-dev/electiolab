import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "Instituto de Pesquisa — ElectioLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function getInstitute(slug: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await sb
    .from("institutes")
    .select("name, reliability_score, methodology_default, accuracy:institute_accuracy(mean_absolute_error)")
    .eq("slug", slug)
    .maybeSingle();
  return data as {
    name: string;
    reliability_score: number | null;
    methodology_default: string | null;
    accuracy: { mean_absolute_error: number }[] | null;
  } | null;
}

async function getPollCount(slug: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { count } = await sb
    .from("polls")
    .select("id", { count: "exact", head: true })
    .eq("institute_id", (
      await sb.from("institutes").select("id").eq("slug", slug).maybeSingle()
    ).data?.id ?? "");
  return count ?? 0;
}

function scoreToLabel(score: number | null): string {
  if (score === null) return "Sem histórico";
  if (score >= 0.8) return "Alta acurácia";
  if (score >= 0.6) return "Acurácia média";
  return "Em avaliação";
}

function scoreColor(score: number | null): string {
  if (score === null) return "#6b7280";
  if (score >= 0.8) return "#22c55e";
  if (score >= 0.6) return "#f59e0b";
  return "#ef4444";
}

export default async function OG({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [institute, pollCount] = await Promise.all([
    getInstitute(slug).catch(() => null),
    getPollCount(slug).catch(() => 0),
  ]);

  if (!institute) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg,#0b1220,#1f2937)",
            color: "#fff",
            fontFamily: "sans-serif",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
          }}
        >
          ElectioLab
        </div>
      ),
      size
    );
  }

  const accent = scoreColor(institute.reliability_score);
  const mae = institute.accuracy?.[0]?.mean_absolute_error;
  const initials = institute.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

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
          padding: 64,
          position: "relative",
        }}
      >
        {/* Lateral stripe */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 12,
            background: accent,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
          {/* Brand */}
          <div
            style={{
              fontSize: 20,
              color: "#94a3b8",
              letterSpacing: 2,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            ELECTIOLAB · INSTITUTOS DE PESQUISA
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 48, marginTop: 16 }}>
            {/* Initials avatar */}
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 20,
                background: `${accent}22`,
                border: `3px solid ${accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                fontWeight: 900,
                color: accent,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            {/* Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  fontSize: 68,
                  fontWeight: 800,
                  lineHeight: 1.05,
                  color: "#f9fafb",
                  maxWidth: 760,
                }}
              >
                {institute.name}
              </div>
              {institute.methodology_default && (
                <div
                  style={{
                    fontSize: 26,
                    color: "#94a3b8",
                    display: "flex",
                  }}
                >
                  {institute.methodology_default}
                </div>
              )}
              <div
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  fontSize: 22,
                  fontWeight: 600,
                  background: `${accent}22`,
                  color: accent,
                  padding: "6px 16px",
                  borderRadius: 999,
                  border: `1px solid ${accent}44`,
                }}
              >
                {scoreToLabel(institute.reliability_score)}
              </div>
            </div>
          </div>

          {/* Footer stats */}
          <div
            style={{
              display: "flex",
              gap: 60,
              marginTop: "auto",
              fontSize: 20,
              color: "#94a3b8",
              alignItems: "flex-end",
            }}
          >
            {pollCount > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: "#f9fafb" }}>
                  {pollCount}
                </span>
                <span>pesquisas indexadas</span>
              </div>
            )}
            {mae !== undefined && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: accent }}>
                  {mae.toFixed(1)}pp
                </span>
                <span>erro médio histórico</span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginLeft: "auto" }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#3b82f6" }}>
                electiolab.com
              </span>
              <span>Dados abertos · TSE</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
