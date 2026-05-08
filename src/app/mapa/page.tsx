import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import { BrazilMap } from "./brazil-map";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mapa Eleições 2026 — Governadores por UF",
  description:
    "Mapa interativo do Brasil com a corrida para governador 2026 em cada UF. Clique numa UF e veja os candidatos, líder em pesquisas e cobertura de polls.",
  alternates: { canonical: "https://electiolab.com/mapa" },
  openGraph: {
    title: "Mapa Brasil 2026 — Governadores por UF",
    description: "27 corridas estaduais, líder em cada uma. Clique pra ver detalhes.",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

type StateData = {
  state: string;
  election_id: string;
  election_name: string;
  leader: { name: string; party: string | null; color: string | null; pct: number; slug: string } | null;
  polls_count: number;
  most_recent: string | null;
};

async function getStatesData(): Promise<StateData[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: elections } = await sb
    .from("elections")
    .select(
      `id, name, state,
       polls(publication_date),
       averages:weighted_averages(weighted_average, candidate:candidates(name, party, color, slug))`
    )
    .eq("type", "governador")
    .eq("year", 2026)
    .eq("round", 1);

  if (!elections) return [];

  return (elections as unknown as Array<{
    id: string;
    name: string;
    state: string;
    polls?: Array<{ publication_date: string | null }>;
    averages?: Array<{
      weighted_average: number;
      candidate: { name: string; party: string | null; color: string | null; slug: string }[] | { name: string; party: string | null; color: string | null; slug: string };
    }>;
  }>).map((e) => {
    const sortedAvgs = (e.averages ?? [])
      .map((a) => ({
        ...a,
        cand: Array.isArray(a.candidate) ? a.candidate[0] : a.candidate,
      }))
      .sort((a, b) => (b.weighted_average ?? 0) - (a.weighted_average ?? 0));
    const top = sortedAvgs[0];
    const polls = e.polls ?? [];
    const dates = polls.map((p) => p.publication_date).filter(Boolean) as string[];
    return {
      state: e.state,
      election_id: e.id,
      election_name: e.name,
      leader: top?.cand
        ? {
            name: top.cand.name,
            party: top.cand.party,
            color: top.cand.color,
            pct: top.weighted_average ?? 0,
            slug: top.cand.slug,
          }
        : null,
      polls_count: polls.length,
      most_recent: dates.length ? dates.sort().reverse()[0] : null,
    };
  });
}

export default async function MapaPage() {
  const states = await getStatesData();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <MapIcon className="h-3.5 w-3.5" />
            <span>Mapa Brasil · Governadores 2026</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Quem lidera em cada estado
          </h1>
          <p className="text-base text-muted-foreground max-w-prose leading-relaxed">
            Mapa interativo das 27 corridas estaduais 2026. Cada UF é colorida pela cor partidária
            do líder em pesquisas. Passe o cursor pra ver detalhes; clique pra abrir o dashboard.
          </p>
        </section>

        <BrazilMap states={states} />

        <section className="rounded-lg border border-border bg-muted/20 p-6 space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Cores:</strong> partido do candidato líder em
            cada UF. <strong className="text-foreground">Cinza:</strong> sem pesquisa indexada.{" "}
            <strong className="text-foreground">Tooltip:</strong> nome do líder, %, partido,
            número de pesquisas.
          </p>
          <p className="text-xs text-muted-foreground">
            Atualizado automaticamente a cada 6h pelo cron de média ponderada.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Mapa SVG vetorial otimizado · Dados: TSE
        </div>
      </footer>
    </div>
  );
}
