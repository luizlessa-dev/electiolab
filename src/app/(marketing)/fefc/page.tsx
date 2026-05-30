import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { LeiaTabem } from "@/components/editorial/leia-tambem";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Ranking FEFC — Fundo Especial recebido por candidato",
  description:
    "Quem recebeu mais dinheiro público (FEFC) para campanha eleitoral no Brasil. Ranking dos repasses do Fundo Especial de Financiamento de Campanha por candidato.",
  alternates: { canonical: "https://electiolab.com/fefc" },
  openGraph: {
    title: "Ranking FEFC — quem recebeu mais dinheiro público para campanha?",
    description:
      "Lista dos candidatos brasileiros com maior repasse FEFC. Dados oficiais TSE.",
    url: "https://electiolab.com/fefc",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

type Row = {
  candidate_id: string;
  amount_received: number;
  party_acronym: string | null;
  election_year: number;
  candidate: { name: string; slug: string; party: string | null; color: string | null } | null;
};

async function getTop(): Promise<Row[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb
    .from("candidate_fefc")
    .select("candidate_id, amount_received, party_acronym, election_year, candidate:candidates(name, slug, party, color)")
    .order("amount_received", { ascending: false })
    .limit(100);

  if (!data) return [];
  return (data as unknown as Row[]).map((r) => ({
    ...r,
    candidate: Array.isArray((r as unknown as { candidate: unknown }).candidate)
      ? ((r as unknown as { candidate: Row["candidate"][] }).candidate)[0]
      : (r.candidate as Row["candidate"]),
  }));
}

function fmt(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

export default async function FefcPage() {
  const top = await getTop();
  const totalDistribuido = top.reduce((s, r) => s + Number(r.amount_received ?? 0), 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Ranking FEFC — quem recebeu mais dinheiro público para campanha?",
        description:
          "Lista dos candidatos brasileiros com maior repasse do Fundo Especial de Financiamento de Campanha (FEFC), conforme prestação de contas oficial ao TSE.",
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
          { "@type": "ListItem", position: 2, name: "FEFC — Fundo Eleitoral" },
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
            <Wallet className="h-3.5 w-3.5" />
            <span>Análise · Fundo Eleitoral</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Quem recebeu mais FEFC? Ranking do Fundo Eleitoral por candidato
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-2">
            O <strong className="text-foreground">FEFC</strong> (Fundo Especial de Financiamento
            de Campanha) é dinheiro do Tesouro Nacional repassado pelos partidos aos seus
            candidatos. Em 2022, o fundo total foi de R$ 4,9 bilhões — o maior da história. Aqui
            estão os candidatos brasileiros com maior repasse individual, segundo a prestação
            de contas oficial ao TSE.
          </p>
          {top.length > 0 && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Total agregado deste ranking (top {top.length}): <strong className="text-foreground">{fmt(totalDistribuido)}</strong>
            </p>
          )}

          <section>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {top.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Dados ainda em ingestão. Volte em alguns minutos.
                </p>
              ) : (
                top.map((r, i) => (
                  <div
                    key={`${r.candidate_id}-${r.election_year}`}
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
                        {r.party_acronym ?? r.candidate?.party ?? "—"} · {r.election_year}
                      </p>
                    </div>
                    <span
                      className="font-mono font-bold tabular-nums"
                      style={{ color: r.candidate?.color ?? undefined }}
                    >
                      {fmt(Number(r.amount_received))}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Fonte: TSE — Prestação de Contas Eleitorais.
            </p>
          </section>
        <LeiaTabem current="/fefc" />
        </article>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · FEFC · Dados oficiais TSE
        </div>
      </footer>
    </div>
  );
}
