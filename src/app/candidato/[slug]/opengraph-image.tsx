import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "Perfil do candidato — ElectioLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ElectionInfo = { type?: string; state?: string | null; year?: number | null; round?: number | null };

// Mesma prioridade de cargo do desempate em src/lib/queries.ts
// (resolveCandidateRowsBySlug) — duplicado aqui, não importado, pra manter
// este gerador de imagem autocontido (roda em edge runtime).
const TYPE_PRIORITY: Record<string, number> = {
  presidente: 5, governador: 4, senador: 3,
  deputado_federal: 2, deputado_estadual: 1, deputado_distrital: 1,
};

type Candidato = {
  id: string;
  name: string;
  party: string | null;
  color: string | null;
  bio: string | null;
  current_position: string | null;
  photo_url: string | null;
  official_photo_url: string | null;
  election: ElectionInfo | null;
  poll_results: Array<{ percentage: number }>;
};

async function getCandidate(slug: string): Promise<Candidato | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("candidates")
    .select(
      "id, name, party, color, bio, current_position, photo_url, official_photo_url, election:elections(type,state,year,round), poll_results(percentage)"
    )
    .eq("slug", slug)
    .eq("is_active", true);

  if (!data?.length) return null;

  // Desempate: year DESC, round DESC, prioridade de cargo, id ASC — igual
  // getCandidateBySlug, pra a imagem OG bater com o que /candidato/[slug]
  // (sem segmento de eleição) realmente serve.
  const vencedor = [...data].sort((a, b) => {
    const ea = (Array.isArray(a.election) ? a.election[0] : a.election) as ElectionInfo | null;
    const eb = (Array.isArray(b.election) ? b.election[0] : b.election) as ElectionInfo | null;
    return (
      (eb?.year ?? 0) - (ea?.year ?? 0) ||
      (eb?.round ?? 0) - (ea?.round ?? 0) ||
      (TYPE_PRIORITY[eb?.type ?? ""] ?? 0) - (TYPE_PRIORITY[ea?.type ?? ""] ?? 0) ||
      a.id.localeCompare(b.id)
    );
  })[0];

  return {
    ...vencedor,
    election: (Array.isArray(vencedor.election) ? vencedor.election[0] : vencedor.election) ?? null,
  } as Candidato;
}

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCandidate(slug);
  if (!c) {
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

  const election = c.election;
  const electionLabel = election?.type
    ? `${election.type[0].toUpperCase() + election.type.slice(1)}${
        election.state ? " " + election.state : ""
      }${election.year ? " " + election.year : ""}`
    : "ElectioLab 2026";

  // % médio se disponível
  const polls = (c.poll_results ?? [])
    .map((p) => p.percentage)
    .filter((p) => typeof p === "number");
  const avg =
    polls.length > 0 ? (polls.reduce((a, b) => a + b, 0) / polls.length).toFixed(1) : null;

  const accent = c.color || "#3b82f6";
  const bio = (c.bio ?? "").slice(0, 220);
  const photo = c.official_photo_url || c.photo_url;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg,#0b1220 0%,#0f172a 60%,#111827 100%)",
          color: "#f9fafb",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: 64,
          position: "relative",
        }}
      >
        {/* Stripe lateral colorida */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 12,
            background: accent,
          }}
        />

        {/* Conteúdo */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
          <div
            style={{
              // Texto literal + expressão são dois filhos separados em JSX
              // ("ELECTIOLAB · " e {electionLabel}) — mesmo padrão do bug no
              // <div> do bio, satori exige display explícito nesse caso.
              display: "flex",
              fontSize: 22,
              color: "#94a3b8",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            ELECTIOLAB · {electionLabel}
          </div>

          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1.05,
              marginTop: 8,
              maxWidth: 760,
            }}
          >
            {c.name}
          </div>

          {c.party && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                fontSize: 28,
                fontWeight: 600,
                background: accent,
                color: "#0b1220",
                padding: "6px 18px",
                borderRadius: 999,
                marginTop: 4,
              }}
            >
              {c.party}
            </div>
          )}

          {bio && (
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: "#cbd5e1",
                marginTop: 16,
                lineHeight: 1.4,
                maxWidth: 760,
              }}
            >
              {bio}
              {(c.bio?.length ?? 0) > 220 ? "…" : ""}
            </div>
          )}

          <div style={{ display: "flex", gap: 48, marginTop: "auto" }}>
            {avg && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 18, color: "#94a3b8" }}>Média ponderada</span>
                <span style={{ fontSize: 56, fontWeight: 800, color: accent }}>{avg}%</span>
              </div>
            )}
            {c.current_position && (
              <div style={{ display: "flex", flexDirection: "column", maxWidth: 380 }}>
                <span style={{ fontSize: 18, color: "#94a3b8" }}>Cargo atual</span>
                <span style={{ fontSize: 28, fontWeight: 600 }}>{c.current_position}</span>
              </div>
            )}
          </div>
        </div>

        {/* Foto */}
        {photo && (
           
          <img
            src={photo}
            alt=""
            width={320}
            height={400}
            style={{
              objectFit: "cover",
              borderRadius: 16,
              border: `3px solid ${accent}`,
              alignSelf: "center",
              marginLeft: 48,
            }}
          />
        )}
      </div>
    ),
    size
  );
}
