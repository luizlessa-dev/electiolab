import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { partyColor, slugToParty } from "@/lib/party-utils";

export const runtime = "edge";
export const alt = "Partido — ElectioLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function getPartyStats(slug: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await sb
    .from("candidates")
    .select("id, name, election:elections(type, year)")
    .eq("is_active", true);

  const candidates = ((data ?? []) as unknown as Array<{
    id: string;
    name: string;
    party?: string;
    election: { type: string; year: number } | { type: string; year: number }[] | null;
  }>);

  // Count 2026 active candidates for this party
  const slugLower = slug.toLowerCase();
  const matching = candidates.filter((c) => {
    const elec = Array.isArray(c.election) ? c.election[0] : c.election;
    return elec?.year === 2026;
  });

  return {
    total: matching.length,
  };
}

export default async function OG({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const partyLabel = slugToParty(slug) ?? slug.toUpperCase();
  const accent = partyColor(slug);
  const stats = await getPartyStats(slug).catch(() => ({ total: 0 }));

  // Short acronym for the big avatar block
  const acronym = partyLabel.length <= 6 ? partyLabel : partyLabel.split(" ").map((w) => w[0]).join("").slice(0, 4).toUpperCase();

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
            ELECTIOLAB · PARTIDOS 2026
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 48, marginTop: 16 }}>
            {/* Party avatar */}
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 24,
                background: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: acronym.length <= 3 ? 80 : 56,
                fontWeight: 900,
                color: "#0b1220",
                flexShrink: 0,
                letterSpacing: -2,
              }}
            >
              {acronym}
            </div>

            {/* Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  fontSize: 80,
                  fontWeight: 800,
                  lineHeight: 1.0,
                  color: "#f9fafb",
                }}
              >
                {partyLabel}
              </div>
              <div
                style={{
                  fontSize: 28,
                  color: "#94a3b8",
                  display: "flex",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                Candidatos · FEFC · Patrimônio · Pesquisas 2026
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
            }}
          >
            {stats.total > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: accent }}>
                  {stats.total}
                </span>
                <span>candidatos 2026</span>
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
