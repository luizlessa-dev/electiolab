import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Wallet, Receipt } from "lucide-react";
import { getTopCeapSpenders } from "@/lib/tf-data";

export const revalidate = 3600;

const ANO = 2025;

export const metadata: Metadata = {
  title: `Ranking Cota Parlamentar Câmara ${ANO} — quem mais gastou`,
  description: `Ranking dos deputados federais que mais gastaram da Cota Parlamentar (CEAP) em ${ANO}. Dados oficiais Câmara dos Deputados via Transparência Federal.`,
  alternates: { canonical: "https://electiolab.com/cota-parlamentar" },
  openGraph: {
    title: `Ranking Cota Parlamentar Câmara ${ANO}`,
    description: "Quanto cada deputado gastou da CEAP — passagens, telefonia, escritório, divulgação.",
    url: "https://electiolab.com/cota-parlamentar",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

function fmt(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

export default async function CotaParlamentarPage() {
  const top = await getTopCeapSpenders(ANO, 50);
  const totalDistribuido = top.reduce((s, r) => s + r.total_liquido, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: `Ranking Cota Parlamentar Câmara ${ANO}`,
        description: "Lista dos deputados federais que mais gastaram da Cota Parlamentar de Atividade Eleitoral (CEAP) em 2025.",
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-04-30",
        dateModified: new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Cota Parlamentar" },
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
            <Receipt className="h-3.5 w-3.5" />
            <span>Análise · Cota Parlamentar</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Quem mais gastou da Cota Parlamentar em {ANO}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-2">
            A <strong className="text-foreground">CEAP</strong> (Cota para o Exercício da Atividade
            Parlamentar) é uma verba pública mensal disponibilizada a cada deputado federal para
            custear despesas como passagens, telefonia, escritório e divulgação política. Cada
            deputado tem teto entre R$ 30 mil e R$ 45 mil por mês conforme o estado de origem.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Total agregado deste ranking (top {top.length}): <strong className="text-foreground">{fmt(totalDistribuido)}</strong> em {ANO}.
          </p>

          <section>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {top.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Dados ainda em sincronização. Volte em alguns minutos.
                </p>
              ) : (
                top.map((r, i) => {
                  const p = r.parlamentar;
                  return (
                    <div
                      key={r.deputado_id_externo}
                      className={`flex items-center px-4 py-3 text-sm border-b border-border/30 last:border-0 ${i % 2 ? "bg-muted/15" : ""}`}
                    >
                      <span className="w-8 font-mono tabular-nums text-muted-foreground">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold truncate">
                          {p?.nome_parlamentar ?? p?.nome ?? `Dep. ID ${r.deputado_id_externo}`}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {[p?.partido_atual ?? p?.partido, p?.uf].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <span className="font-mono font-bold tabular-nums">{fmt(r.total_liquido)}</span>
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Fonte: Câmara dos Deputados — Dados Abertos · Cota Parlamentar (CEAP) · Sincronizado via Transparência Federal.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Cota Parlamentar Câmara · CEAP {ANO}
        </div>
      </footer>
    </div>
  );
}
