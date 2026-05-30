import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "Eleições 2026 por estado — ElectioLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MG: "Minas Gerais", MS: "Mato Grosso do Sul", MT: "Mato Grosso", PA: "Pará",
  PB: "Paraíba", PE: "Pernambuco", PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul",
  SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

const UF_REGION: Record<string, string> = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MS: "Centro-Oeste", MT: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

async function getGovLeader(uf: string): Promise<{ name: string; pct: number; color: string } | null> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: election } = await sb
      .from("elections")
      .select("id")
      .eq("type", "governador")
      .eq("state", uf)
      .eq("year", 2026)
      .eq("round", 1)
      .maybeSingle();
    if (!election) return null;

    const { data: polls } = await sb
      .from("polls")
      .select("publication_date, results:poll_results(percentage, candidate:candidates(name, color))")
      .eq("election_id", election.id)
      .order("publication_date", { ascending: false })
      .limit(10);
    if (!polls || polls.length === 0) return null;

    // pega a pesquisa mais recente com mais resultados (cenário completo)
    const best = polls
      .map((p) => ({ ...p, n: (p.results ?? []).length }))
      .sort((a, b) => b.n - a.n)[0];

    const ranked = (best.results ?? [])
      .map((r) => {
        const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
        return { name: c?.name ?? "—", color: c?.color ?? "#3b82f6", pct: Number(r.percentage) };
      })
      .sort((a, b) => b.pct - a.pct);

    return ranked[0] ?? null;
  } catch {
    return null;
  }
}

export default async function OG({ params }: { params: { uf: string } }) {
  const uf = (params.uf || "").toUpperCase();
  const stateName = UF_NAMES[uf] ?? "Brasil";
  const region = UF_REGION[uf] ?? "";
  const leader = await getGovLeader(uf).catch(() => null);
  const accent = leader?.color ?? "#3b82f6";

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
        <div
          style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0, width: 12,
            background: accent, display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
          <div
            style={{
              fontSize: 20, color: "#94a3b8", letterSpacing: 2,
              textTransform: "uppercase", display: "flex",
            }}
          >
            ELECTIOLAB · ELEIÇÕES 2026{region ? ` · ${region}` : ""}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 8 }}>
            <div
              style={{
                width: 150, height: 150, borderRadius: 24,
                background: `${accent}22`, border: `3px solid ${accent}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 64, fontWeight: 900, color: accent, flexShrink: 0,
              }}
            >
              {uf}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.0, maxWidth: 760 }}>
                {stateName}
              </div>
              <div style={{ fontSize: 26, color: "#94a3b8", display: "flex" }}>
                Governador · Senador · Pesquisas 2026
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex", gap: 60, marginTop: "auto",
              fontSize: 20, color: "#94a3b8", alignItems: "flex-end",
            }}
          >
            {leader && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 18, color: "#64748b" }}>Lidera p/ governador</span>
                <span style={{ fontSize: 40, fontWeight: 800, color: accent }}>
                  {leader.name} {leader.pct.toFixed(0)}%
                </span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginLeft: "auto" }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: "#3b82f6" }}>
                electiolab.com
              </span>
              <span>Média ponderada · Dados TSE</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
