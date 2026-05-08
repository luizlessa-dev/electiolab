import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe, ExternalLink } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Redes sociais oficiais dos políticos brasileiros — TSE",
  description:
    "Lista das redes sociais declaradas oficialmente ao TSE pelos candidatos brasileiros. Instagram, Twitter, Facebook, TikTok e mais — fonte primária TSE Dados Abertos.",
  alternates: { canonical: "https://electiolab.com/redes-sociais" },
  openGraph: {
    title: "Redes sociais oficiais dos políticos brasileiros (TSE)",
    description: "Listagem oficial das URLs de redes sociais declaradas pelos candidatos ao Tribunal Superior Eleitoral.",
    url: "https://electiolab.com/redes-sociais",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

type Row = {
  id: string;
  candidate_id: string;
  platform: string;
  url: string;
  handle: string | null;
  election_year: number;
  candidate: { name: string; slug: string; party: string | null; color: string | null } | null;
};

async function getData(): Promise<Row[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb
    .from("candidate_social_media")
    .select("id, candidate_id, platform, url, handle, election_year, candidate:candidates(name, slug, party, color)")
    .order("election_year", { ascending: false });

  if (!data) return [];
  return (data as unknown as Row[]).map((r) => ({
    ...r,
    candidate: Array.isArray((r as unknown as { candidate: unknown }).candidate)
      ? ((r as unknown as { candidate: Row["candidate"][] }).candidate)[0]
      : (r.candidate as Row["candidate"]),
  }));
}

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#E4405F" },
  twitter: { label: "Twitter / X", color: "#1DA1F2" },
  facebook: { label: "Facebook", color: "#1877F2" },
  youtube: { label: "YouTube", color: "#FF0000" },
  tiktok: { label: "TikTok", color: "#010101" },
  website: { label: "Site oficial", color: "#666666" },
  threads: { label: "Threads", color: "#000000" },
  kwai: { label: "Kwai", color: "#FF5000" },
  telegram: { label: "Telegram", color: "#0088CC" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  other: { label: "Outras", color: "#888888" },
};

export default async function RedesSociaisPage() {
  const all = await getData();

  // Distribuição por plataforma
  const byPlatform = new Map<string, number>();
  for (const r of all) byPlatform.set(r.platform, (byPlatform.get(r.platform) ?? 0) + 1);
  const platforms = Array.from(byPlatform.entries()).sort((a, b) => b[1] - a[1]);

  // Agrupa por candidato
  const byCandidate = new Map<string, { ref: Row["candidate"]; rows: Row[] }>();
  for (const r of all) {
    if (!r.candidate) continue;
    const cur = byCandidate.get(r.candidate_id) ?? { ref: r.candidate, rows: [] };
    cur.rows.push(r);
    byCandidate.set(r.candidate_id, cur);
  }
  const candidates = Array.from(byCandidate.values()).sort((a, b) => b.rows.length - a.rows.length);
  const totalCandidatos = candidates.length;
  const totalUrls = all.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Redes sociais oficiais dos políticos brasileiros — TSE",
        description: "Compilação das URLs de redes sociais declaradas oficialmente pelos candidatos ao TSE.",
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-04-29",
        dateModified: new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Redes sociais oficiais" },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        <article>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <Globe className="h-3.5 w-3.5" />
            <span>Análise · Redes sociais TSE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Redes sociais oficiais dos políticos brasileiros
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-6">
            Toda candidatura ao TSE pode declarar suas URLs oficiais de redes sociais. O ElectioLab
            agrega esses dados diretamente da fonte (TSE Dados Abertos), permitindo verificar
            <strong className="text-foreground"> qual conta é oficialmente vinculada a cada candidato</strong> —
            uma proteção contra perfis fake que se passam por políticos.
          </p>

          {/* Stats */}
          <section className="grid sm:grid-cols-3 gap-3 mb-10">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">URLs totais</p>
              <p className="text-3xl font-mono font-bold tabular-nums">{totalUrls}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Candidatos</p>
              <p className="text-3xl font-mono font-bold tabular-nums">{totalCandidatos}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Plataformas</p>
              <p className="text-3xl font-mono font-bold tabular-nums">{platforms.length}</p>
            </div>
          </section>

          {/* Distribuição por plataforma */}
          {platforms.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-4">Distribuição por plataforma</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {platforms.map(([p, count]) => {
                  const meta = PLATFORM_META[p] ?? PLATFORM_META.other;
                  const pct = ((count / totalUrls) * 100).toFixed(0);
                  return (
                    <div key={p} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                      <span className="flex-1 text-sm font-medium">{meta.label}</span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                      <span className="font-mono font-bold tabular-nums w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Candidatos com mais URLs */}
          {candidates.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-4">Candidatos com perfis declarados</h2>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {candidates.map(({ ref, rows }) => (
                  <div key={ref?.slug ?? Math.random()} className="border-b border-border/30 last:border-0">
                    <div className="flex items-center px-4 py-3 bg-muted/15">
                      {ref?.slug ? (
                        <Link href={`/candidato/${ref.slug}`} className="flex-1 font-semibold hover:text-primary hover:underline">
                          {ref.name}
                        </Link>
                      ) : (
                        <span className="flex-1 font-semibold">—</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {ref?.party ?? "—"} · {rows.length} URL{rows.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="px-4 py-2 space-y-1">
                      {rows.map((r) => {
                        const meta = PLATFORM_META[r.platform] ?? PLATFORM_META.other;
                        return (
                          <a
                            key={r.id}
                            href={r.url.startsWith("http") ? r.url : `https://${r.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-xs hover:bg-muted/20 rounded px-2 py-1.5 transition-colors"
                          >
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                            <span className="font-medium w-24 shrink-0 uppercase tracking-wide text-[10px]">
                              {meta.label}
                            </span>
                            <span className="font-mono truncate flex-1 text-muted-foreground">
                              {r.handle ? `@${r.handle}` : r.url.replace(/^https?:\/\//, "")}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-border bg-muted/20 p-6">
            <h2 className="text-base font-bold mb-2">Por que esta lista é pequena?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Apenas <strong>candidaturas registradas no TSE</strong> com declaração formal de redes sociais
              aparecem aqui. As eleições 2026 ainda não tiveram registro oficial (julho/2026 em diante),
              então hoje só temos dados retroativos de 2022. Quando o TSE publicar as candidaturas 2026,
              esta página será automaticamente expandida com centenas de novas entradas.
            </p>
            <p className="text-xs text-muted-foreground">
              Fonte: TSE Dados Abertos · <code>rede_social_candidato</code> 2022.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Dados oficiais TSE
        </div>
      </footer>
    </div>
  );
}
