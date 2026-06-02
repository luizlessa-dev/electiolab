import Link from "next/link";
import type { Metadata } from "next";
import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BookOpen,
} from "lucide-react";
import type { ReportData } from "./types";

// ─── Metadata helper ─────────────────────────────────────────────────────────

/**
 * Gera o objeto Metadata do Next.js para um relatório semanal.
 * Use como `export const metadata = buildReportMetadata(DATA)` em cada
 * arquivo de semana.
 */
export function buildReportMetadata(d: ReportData): Metadata {
  const [first, second, third] = d.presidencial;
  const slugTitle = `Relatório Semanal — Semana ${d.semana} · ${d.dateRange} | ElectioLab`;
  const slugDesc =
    `Média agregada das pesquisas presidenciais na semana ${d.semana} de 2026 ` +
    `(${d.dateRange}). ${first.name} ${first.pct}%, ${second.name} ${second.pct}%, ` +
    `${third?.name ?? "Outros"} ${third?.pct ?? 0}%. Variação semanal e pesquisas da semana.`;
  const ogDesc =
    `${first.name} ${first.pct}% (${first.delta > 0 ? "+" : ""}${first.delta.toFixed(1)}), ` +
    `${second.name} ${second.pct}% (${second.delta > 0 ? "+" : ""}${second.delta.toFixed(1)}), ` +
    `${third?.name ?? "Outros"} ${third?.pct ?? 0}% — média agregada ${d.dateRange}.`;
  const slug = `semana-${d.semana}-2026`;

  return {
    title: { absolute: slugTitle },
    description: slugDesc,
    alternates: { canonical: `https://electiolab.com/relatorio/${slug}` },
    openGraph: {
      title: `Relatório Semanal Semana ${d.semana} · ElectioLab`,
      description: ogDesc,
      url: `https://electiolab.com/relatorio/${slug}`,
      images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

// ─── Delta badge ─────────────────────────────────────────────────────────────

function Delta({ v }: { v: number }) {
  if (v > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-400">
        <TrendingUp className="h-2.5 w-2.5" />+{v.toFixed(1)}
      </span>
    );
  if (v < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-rose-400">
        <TrendingDown className="h-2.5 w-2.5" />
        {v.toFixed(1)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
      <Minus className="h-2.5 w-2.5" />
      0.0
    </span>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export function RelatorioPage({ data: d }: { data: ReportData }) {
  const slug = `semana-${d.semana}-2026`;
  const canonicalUrl = `https://electiolab.com/relatorio/${slug}`;
  const maxPct = d.presidencial[0]?.pct ?? 40;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${canonicalUrl}#article`,
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        headline: `Relatório Semanal ElectioLab — Semana ${d.semana} (${d.dateRange})`,
        description:
          `Média ponderada das pesquisas presidenciais na semana ${d.semana} de 2026 (${d.dateRange}). ` +
          d.presidencial.map((c) => `${c.name} ${c.pct}%`).join(", ") +
          ".",
        datePublished: d.dateISO,
        dateModified: d.dateISO,
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        image: [
          {
            "@type": "ImageObject",
            url: "https://electiolab.com/opengraph-image",
            width: 1200,
            height: 630,
          },
        ],
        inLanguage: "pt-BR",
        isPartOf: { "@id": "https://electiolab.com/#website" },
        articleSection: "Pesquisas Eleitorais",
        keywords: ["pesquisa eleitoral", "presidencial 2026", ...d.presidencial.map((c) => c.name)],
        about: {
          "@type": "Event",
          name: "Eleições Presidenciais Brasil 2026",
          startDate: "2026-10-04",
          location: { "@type": "Country", name: "Brazil" },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          {
            "@type": "ListItem",
            position: 2,
            name: "Relatórios semanais",
            item: "https://electiolab.com/imprensa",
          },
          { "@type": "ListItem", position: 3, name: `Semana ${d.semana} · ${d.dateRange}` },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Sticky header ── */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/imprensa"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3 w-3" /> Imprensa
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Início
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 space-y-14">

        {/* ── Cabeçalho ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/20 text-xs font-mono text-primary">
              <Calendar className="h-3 w-3" /> SEMANA {d.semana}
            </span>
            <span className="text-xs font-mono text-muted-foreground">{d.dateRange}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório Semanal de Pesquisas Eleitorais
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Média ponderada atualizada com todas as pesquisas publicadas entre {d.dateRange}.
            {d.pesquisas.length > 0 &&
              ` ${d.pesquisas.length} pesquisa${d.pesquisas.length > 1 ? "s" : ""} nova${d.pesquisas.length > 1 ? "s" : ""} incorporada${d.pesquisas.length > 1 ? "s" : ""} à base.`}
            {d.prevSemana && ` Variação vs. semana ${d.prevSemana}.`}
          </p>
          {/* Byline visível (E-E-A-T): autoria explícita no HTML, não só no JSON-LD */}
          <p className="text-xs text-muted-foreground">
            Por{" "}
            <Link href="/sobre" className="text-foreground hover:underline">
              Luiz Lessa
            </Link>
            , ElectioLab · Publicado em{" "}
            {new Date(d.dateISO).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* ── Média presidencial ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Presidencial 2026 — Média ponderada
          </h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                {d.totalPesquisas} pesquisas · {d.totalInstitutos} institutos ·{" "}
                {d.totalEntrevistados.toLocaleString("pt-BR")} entrevistados acumulados
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Semana {d.semana} · 2026
              </span>
            </div>
            <div className="divide-y divide-border">
              {d.presidencial.map((c, i) => (
                <div key={c.name} className="px-4 py-3.5 flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <Delta v={c.delta} />
                    </div>
                    <p className="text-xs text-muted-foreground">{c.party}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-36 hidden sm:block">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(c.pct / (maxPct * 1.1)) * 100}%`,
                            backgroundColor: c.cor,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">
                      {c.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <p className="text-[10px] font-mono text-muted-foreground">
                Variação vs. semana {d.prevSemana ?? d.semana - 1} em pp. Ponderação: recência
                (e^(−t/10)) · amostra (√n) · metodologia · acurácia histórica do instituto.{" "}
                <Link href="/metodologia" className="underline hover:text-foreground">
                  Como funciona?
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── Análise da semana ── */}
        {(d.analise.length > 0 || d.destaqueAnalise) && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Análise da semana
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {d.analise.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              {d.destaqueAnalise && (
                <div className="border-l-2 border-primary pl-4 py-1">
                  <p className="text-foreground font-medium">{d.destaqueAnalise}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Pesquisas da semana ── */}
        {d.pesquisas.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Pesquisas incorporadas esta semana
            </h2>
            <div className="space-y-2">
              {d.pesquisas.map((p) => (
                <div
                  key={`${p.instituto}-${p.publicacao}`}
                  className="border border-border rounded-sm bg-card overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-border flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-foreground">{p.instituto}</span>
                      {p.cliente !== "Espontânea" && (
                        <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 bg-muted/40 rounded-sm">
                          {p.cliente}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{p.publicacao}</span>
                  </div>
                  <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      <span className="text-foreground font-medium">Método:</span> {p.metodologia}
                    </span>
                    <span>
                      <span className="text-foreground font-medium">Amostra:</span>{" "}
                      {p.n.toLocaleString("pt-BR")} entrevistas
                    </span>
                    <span>
                      <span className="text-foreground font-medium">Líder:</span> {p.lider}{" "}
                      {p.pct_lider}%
                    </span>
                  </div>
                  <div className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">Destaque: </span>
                    {p.destaque}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Governadores ── */}
        {d.governadores.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Governadores — variação da semana
            </h2>
            <div className="border border-border rounded-sm bg-card overflow-hidden">
              <div className="divide-y divide-border">
                {d.governadores.map((g) => (
                  <Link
                    key={g.uf}
                    href={`/eleicoes-governador-${g.uf.toLowerCase()}-2026`}
                    className="px-4 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors group"
                  >
                    <span className="text-xs font-mono font-bold text-primary w-8">{g.uf}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{g.lider}</span>
                        <span className="text-[10px] text-muted-foreground">{g.partido}</span>
                        <Delta v={g.delta} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums">{g.pct}%</span>
                    <span className="text-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-border bg-muted/20">
                <Link href="/#estados" className="text-xs text-primary hover:underline font-mono">
                  Ver todos os 27 estados →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Próximo relatório / CTA ── */}
        <section className="border border-border rounded-sm bg-card px-6 py-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              {d.nextSemana ? (
                <>
                  <p className="text-sm font-semibold text-foreground">Próximo relatório</p>
                  <p className="text-xs text-muted-foreground">
                    Semana {d.nextSemana}
                    {d.nextDateRange ? ` · ${d.nextDateRange}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">Dados ao vivo</p>
                  <p className="text-xs text-muted-foreground">
                    Acompanhe as médias no dashboard
                  </p>
                </>
              )}
            </div>
            <Link
              href="/pesquisas-presidenciais-2026"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0"
            >
              <TrendingUp className="h-3.5 w-3.5" /> Ver médias ao vivo
            </Link>
          </div>
          <div className="pt-2 border-t border-border flex flex-wrap gap-x-4 gap-y-2">
            {d.prevSemana && (
              <Link
                href={`/relatorio/semana-${d.prevSemana}-2026`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Semana {d.prevSemana}
              </Link>
            )}
            <Link
              href="/pesquisas-presidenciais-2026"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Presidencial 2026
            </Link>
            <Link
              href="/imprensa"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Imprensa & Press Kit
            </Link>
            <Link
              href="/metodologia"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Metodologia
            </Link>
          </div>
        </section>

      </main>

      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            ElectioLab — Terminal de Inteligência Eleitoral
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/sobre" className="hover:text-foreground transition-colors">
              Metodologia
            </Link>
            <span>·</span>
            <Link href="/imprensa" className="hover:text-foreground transition-colors">
              Imprensa
            </Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
