import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, BarChart3 } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Quem vence no 2º turno da Presidência 2026? Pesquisas atualizadas",
  description:
    "Comparativo dos cenários simulados de 2º turno presidencial 2026 segundo Datafolha, Quaest e demais institutos. Lula vs Flávio Bolsonaro, Caiado, Zema e Tarcísio — análise atualizada.",
  alternates: {
    canonical: "https://electiolab.com/quem-vence-no-segundo-turno-presidencia-2026",
  },
  openGraph: {
    title: "Quem vence no 2º turno da Presidência 2026?",
    description:
      "Cenários simulados Lula vs Bolsonaro/Caiado/Zema/Tarcísio com base nas últimas pesquisas Datafolha e Quaest.",
    url: "https://electiolab.com/quem-vence-no-segundo-turno-presidencia-2026",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

type Scenario = {
  scenario_label: string | null;
  publication_date: string;
  institute: string;
  results: { name: string; party: string | null; pct: number; color: string | null }[];
};

async function getScenarios(): Promise<Scenario[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await sb
    .from("polls")
    .select(
      `id, scenario_label, publication_date, sample_size, source_url,
       institute:institutes(name),
       results:poll_results(percentage, candidate:candidates(name, party, color))`
    )
    .eq("election_id", "21f8e9a3-5ff8-4baf-b0ae-6b00d2614248") // Pres 2026 1T
    .eq("round", 2)
    .order("publication_date", { ascending: false });

  return ((data ?? []) as unknown as Array<{
    scenario_label: string | null;
    publication_date: string;
    institute: { name: string }[] | { name: string } | null;
    results: Array<{
      percentage: number;
      candidate:
        | { name: string; party: string | null; color: string | null }[]
        | { name: string; party: string | null; color: string | null }
        | null;
    }>;
  }>).map((p) => ({
    scenario_label: p.scenario_label,
    publication_date: p.publication_date,
    institute: (Array.isArray(p.institute) ? p.institute[0] : p.institute)?.name ?? "?",
    results: (p.results ?? []).map((r) => {
      const cand = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
      return {
        name: cand?.name ?? "?",
        party: cand?.party ?? null,
        color: cand?.color ?? null,
        pct: Number(r.percentage),
      };
    }),
  }));
}

const FAQS = [
  {
    q: "Lula vai vencer Flávio Bolsonaro no 2º turno?",
    a: "Pelas pesquisas mais recentes de abril/2026, Lula e Flávio Bolsonaro aparecem dentro da margem de erro — Datafolha (45×46), Quaest (40×42). Em média ponderada, o cenário é tecnicamente empatado.",
  },
  {
    q: "Lula bate Caiado no 2º turno?",
    a: "Pela Quaest abril/2026, Lula lidera contra Caiado com vantagem ampla (43-44% vs 30%+). Caiado tem maior potencial em Goiás e Centro-Oeste, mas pouco capital nacional comparado a Lula ou Flávio.",
  },
  {
    q: "Tarcísio entra no 2º turno presidencial?",
    a: "Pelas pesquisas atuais Tarcísio aparece com 4-7% no 1º turno, abaixo de Caiado e Zema na disputa pelo segundo lugar do bloco da direita. Tarcísio ainda não está oficialmente lançado, podendo subir caso lance candidatura formal.",
  },
  {
    q: "Qual instituto é mais confiável para o 2º turno presidencial?",
    a: "Pelo histórico de erro absoluto vs resultado oficial: Datafolha (92% acurácia), Ipec (88%), Quaest (85%), Genial/Quaest (84%). Em comparativos de 2º turno, Datafolha tem maior consistência histórica.",
  },
];

export default async function Quem2TurnoPage() {
  const scenarios = await getScenarios();

  // FAQPage schema pra esta página específica
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id":
          "https://electiolab.com/quem-vence-no-segundo-turno-presidencia-2026#article",
        headline: "Quem vence no 2º turno da Presidência 2026?",
        description:
          "Comparativo dos cenários simulados de 2º turno presidencial 2026.",
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-04-29",
        dateModified: new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Pesquisas Presidenciais 2026", item: "https://electiolab.com/pesquisas-presidenciais-2026" },
          { "@type": "ListItem", position: 3, name: "Quem vence no 2º turno?" },
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Acessar Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        <article>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Análise · Eleições 2026</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Quem vence no 2º turno da Presidência 2026?
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-6">
            Os principais institutos brasileiros — Datafolha, Quaest, Ipec, Atlas Intel —
            já testam cenários simulados de 2º turno entre Lula e seus prováveis
            adversários (Flávio Bolsonaro, Caiado, Zema, Tarcísio). Aqui consolidamos os
            últimos números, com média ponderada por recência, amostra e acurácia
            histórica do instituto.
          </p>

          {scenarios.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-3">Cenários atuais</h2>
              <div className="space-y-3">
                {scenarios.slice(0, 8).map((s, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span className="font-mono">
                        {s.scenario_label ?? "Cenário 2T"}
                      </span>
                      <span>
                        {s.institute} · {new Date(s.publication_date).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {s.results
                        .sort((a, b) => b.pct - a.pct)
                        .map((r, ri) => (
                          <div key={ri} className="flex items-center justify-between text-sm">
                            <span>
                              {r.name}
                              {r.party && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {r.party}
                                </span>
                              )}
                            </span>
                            <span
                              className="font-mono font-bold tabular-nums"
                              style={{ color: r.color ?? undefined }}
                            >
                              {r.pct.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-xl font-bold mb-4">Perguntas frequentes</h2>
            <div className="space-y-5">
              {FAQS.map((f, i) => (
                <div key={i}>
                  <h3 className="text-base font-semibold mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 pt-6 border-t border-border space-y-3">
            <h2 className="text-base font-bold">Continue explorando</h2>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/pesquisas-presidenciais-2026" className="text-primary hover:underline">
                  Pesquisas presidenciais 2026 — todas as rodadas
                </Link>
              </li>
              <li>
                <Link href="/comparar?a=lula&b=flavio-bolsonaro" className="text-primary hover:underline">
                  Comparativo Lula × Flávio Bolsonaro
                </Link>
              </li>
              <li>
                <Link href="/institutos" className="text-primary hover:underline">
                  Ranking de acurácia dos institutos
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="text-primary hover:underline">
                  Como funciona a média ponderada do ElectioLab
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Última atualização das pesquisas: {new Date().toLocaleDateString("pt-BR")}
        </div>
      </footer>
    </div>
  );
}
