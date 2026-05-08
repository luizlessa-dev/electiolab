import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Home as HomeIcon } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Ranking de patrimônio dos políticos brasileiros | TSE",
  description:
    "Lista dos políticos brasileiros com maior patrimônio declarado ao TSE. Dados oficiais do Tribunal Superior Eleitoral, agregados pelo ElectioLab.",
  alternates: { canonical: "https://electiolab.com/patrimonio" },
  openGraph: {
    title: "Ranking de patrimônio dos políticos brasileiros",
    description:
      "Quem é o mais rico da política brasileira? Ranking dos patrimônios declarados ao TSE.",
    url: "https://electiolab.com/patrimonio",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

type Row = {
  candidate_id: string;
  total_brl: number;
  asset_count: number;
  election_year: number;
  candidate: { name: string; slug: string; party: string | null; color: string | null } | null;
};

async function getTop(): Promise<Row[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  // Soma por candidato no ano mais recente disponível
  const { data } = await sb
    .from("candidate_assets")
    .select("candidate_id, election_year, value_brl, candidate:candidates(name, slug, party, color)")
    .not("value_brl", "is", null);

  if (!data) return [];
  const byCand = new Map<string, Row>();
  for (const r of data as unknown as Array<{
    candidate_id: string;
    election_year: number;
    value_brl: number;
    candidate: { name: string; slug: string; party: string | null; color: string | null }[] | { name: string; slug: string; party: string | null; color: string | null } | null;
  }>) {
    const cand = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
    if (!cand) continue;
    // Usa só ano mais recente por candidato
    const cur = byCand.get(r.candidate_id);
    if (cur && cur.election_year > r.election_year) {
      // ignora ano antigo se já tem ano mais novo
      continue;
    }
    if (cur && cur.election_year === r.election_year) {
      cur.total_brl += Number(r.value_brl);
      cur.asset_count++;
      continue;
    }
    byCand.set(r.candidate_id, {
      candidate_id: r.candidate_id,
      election_year: r.election_year,
      total_brl: Number(r.value_brl),
      asset_count: 1,
      candidate: cand,
    });
  }
  return Array.from(byCand.values())
    .sort((a, b) => b.total_brl - a.total_brl)
    .slice(0, 50);
}

function fmt(v: number): string {
  if (v >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(2)} bi`;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

export default async function PatrimonioPage() {
  const top = await getTop();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Ranking de patrimônio dos políticos brasileiros — TSE",
        description:
          "Lista dos políticos brasileiros com maior patrimônio declarado ao TSE em eleições recentes.",
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
          { "@type": "ListItem", position: 2, name: "Patrimônio dos políticos" },
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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <article>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <HomeIcon className="h-3.5 w-3.5" />
            <span>Análise · Patrimônio TSE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Os 50 políticos mais ricos do Brasil — patrimônio declarado ao TSE
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            Todo candidato a cargo eletivo precisa declarar seu patrimônio ao Tribunal Superior
            Eleitoral. O ElectioLab agrega esses dados oficiais e ordena pelo total declarado.
            Lembre-se: são valores **declarados pelo próprio candidato** — discrepâncias com o
            patrimônio real existem e são alvo frequente de investigação do Ministério Público.
          </p>

          <section>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {top.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Dados ainda em ingestão. Volte em alguns minutos.
                </p>
              ) : (
                top.map((r, i) => (
                  <div
                    key={r.candidate_id}
                    className={`flex items-center px-4 py-3 text-sm border-b border-border/30 last:border-0 ${i % 2 ? "bg-muted/15" : ""}`}
                  >
                    <span className="w-8 font-mono tabular-nums text-muted-foreground">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      {r.candidate?.slug ? (
                        <Link
                          href={`/candidato/${r.candidate.slug}`}
                          className="font-semibold hover:text-primary hover:underline truncate"
                        >
                          {r.candidate.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">—</span>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {r.candidate?.party ?? "—"} · {r.asset_count} bens · {r.election_year}
                      </p>
                    </div>
                    <span
                      className="font-mono font-bold tabular-nums"
                      style={{ color: r.candidate?.color ?? undefined }}
                    >
                      {fmt(r.total_brl)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Fonte: TSE — Bens declarados nas eleições 2022/2024.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Dados TSE · Bem Candidato
        </div>
      </footer>
    </div>
  );
}
