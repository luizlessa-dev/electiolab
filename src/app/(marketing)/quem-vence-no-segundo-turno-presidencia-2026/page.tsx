import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, BarChart3, TrendingUp } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Quem vence no 2º turno da Presidência 2026?",
  description:
    "Cenários simulados de 2º turno 2026: Lula vs Flávio, Caiado, Zema e Tarcísio. Datafolha, Quaest, Atlas e Paraná Pesquisas comparados.",
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

// ─── Tipos ────────────────────────────────────────────────────────────
type Avg = {
  scenario_label: string;
  candidate: { name: string; party: string | null; color: string | null; slug: string };
  weighted_average: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  polls_included: number;
};

type PollLine = {
  publication_date: string;
  institute: string;
  results: { name: string; pct: number; color: string | null }[];
};

type ScenarioBlock = {
  label: string;           // "lula-vs-zema"
  display: string;         // "Lula × Zema"
  candidates: Avg[];       // 2 avgs (uma por candidato)
  pollsCount: number;
  status: "empate" | "vantagem" | "folga" | "raso";
  history: PollLine[];
};

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Classifica o status do cenário com base no gap e na sobreposição de IC.
 * - empate: IC do líder se sobrepõe com IC do segundo
 * - vantagem: gap > 0 mas IC quase encosta (≤2pp de folga acima do limite)
 * - folga: gap claro, IC não se sobrepõe e nem encosta
 * - raso: < 3 pesquisas, qualquer leitura é pouco robusta
 */
function classify(a: Avg, b: Avg): ScenarioBlock["status"] {
  if (a.polls_included < 3) return "raso";
  const lead = a.weighted_average >= b.weighted_average ? a : b;
  const trail = a.weighted_average >= b.weighted_average ? b : a;
  const overlap = lead.confidence_interval_low <= trail.confidence_interval_high;
  if (overlap) return "empate";
  const margin = lead.confidence_interval_low - trail.confidence_interval_high;
  if (margin < 2) return "vantagem";
  return "folga";
}

function statusBadge(s: ScenarioBlock["status"]) {
  const map = {
    empate:   { label: "Empate técnico",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    vantagem: { label: "Vantagem do líder", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    folga:    { label: "Folga clara",     cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    raso:     { label: "Poucos dados",    cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  };
  return map[s];
}

function prettyLabel(slug: string, candidates: Avg[]): string {
  // "caiado-vs-lula" → "Caiado × Lula" (preserva ordem do par)
  const byName = new Map(candidates.map((c) => [c.candidate.slug, c.candidate.name]));
  const [a, b] = slug.split("-vs-");
  const na = byName.get(a) ?? a;
  const nb = byName.get(b) ?? b;
  return `${na} × ${nb}`;
}

// ─── Data fetch ───────────────────────────────────────────────────────

async function getData(): Promise<{ blocks: ScenarioBlock[]; updated: string | null }> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const PRES_2T_ID = "cd7032c5-06ed-4eb9-8702-ddd6c75d83de";

  // 1) Médias ponderadas por cenário (já calculadas pela Edge Function v5)
  const { data: avgs } = await sb
    .from("weighted_averages")
    .select(
      `scenario_label, weighted_average, confidence_interval_low, confidence_interval_high,
       polls_included, calculated_at,
       candidate:candidates(name, party, color, slug)`
    )
    .eq("election_id", PRES_2T_ID)
    .not("scenario_label", "is", null);

  // 2) Histórico bruto de polls 2T (pra accordion)
  const { data: polls } = await sb
    .from("polls")
    .select(
      `scenario_label, publication_date,
       institute:institutes(name),
       results:poll_results(percentage, candidate:candidates(name, color))`
    )
    .eq("round", 2)
    .order("publication_date", { ascending: false });

  // ─── Agrupa ─────────────────────────────────────────────────────────
  const blocks = new Map<string, ScenarioBlock>();
  for (const a of (avgs ?? []) as unknown as Array<
    Omit<Avg, "candidate"> & {
      candidate:
        | { name: string; party: string | null; color: string | null; slug: string }[]
        | { name: string; party: string | null; color: string | null; slug: string };
      calculated_at: string;
    }
  >) {
    const cand = Array.isArray(a.candidate) ? a.candidate[0] : a.candidate;
    if (!cand || !a.scenario_label) continue;
    const block = blocks.get(a.scenario_label) ?? {
      label: a.scenario_label,
      display: "",
      candidates: [],
      pollsCount: a.polls_included,
      status: "raso" as ScenarioBlock["status"],
      history: [],
    };
    block.candidates.push({ ...a, candidate: cand });
    block.pollsCount = Math.max(block.pollsCount, a.polls_included);
    blocks.set(a.scenario_label, block);
  }

  // Histórico por cenário
  const historyByScenario = new Map<string, PollLine[]>();
  for (const p of (polls ?? []) as unknown as Array<{
    scenario_label: string | null;
    publication_date: string;
    institute: { name: string }[] | { name: string } | null;
    results: Array<{
      percentage: number;
      candidate: { name: string; color: string | null }[] | { name: string; color: string | null } | null;
    }>;
  }>) {
    if (!p.scenario_label) continue;
    const inst = (Array.isArray(p.institute) ? p.institute[0] : p.institute)?.name ?? "?";
    const line: PollLine = {
      publication_date: p.publication_date,
      institute: inst,
      results: (p.results ?? []).map((r) => {
        const cand = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
        return { name: cand?.name ?? "?", pct: Number(r.percentage), color: cand?.color ?? null };
      }),
    };
    const arr = historyByScenario.get(p.scenario_label) ?? [];
    arr.push(line);
    historyByScenario.set(p.scenario_label, arr);
  }

  // Finaliza
  const finalBlocks: ScenarioBlock[] = [];
  for (const [label, block] of blocks) {
    // Ordena candidatos por % desc
    block.candidates.sort((a, b) => b.weighted_average - a.weighted_average);
    if (block.candidates.length === 2) {
      block.status = classify(block.candidates[0], block.candidates[1]);
    }
    block.display = prettyLabel(label, block.candidates);
    block.history = historyByScenario.get(label) ?? [];
    finalBlocks.push(block);
  }

  // Ordena cenários: empate primeiro (mais interessante), depois por nº de polls
  const priority: Record<ScenarioBlock["status"], number> = { empate: 0, vantagem: 1, folga: 2, raso: 3 };
  finalBlocks.sort((a, b) => priority[a.status] - priority[b.status] || b.pollsCount - a.pollsCount);

  // Última atualização
  const lastDate = (polls ?? [])
    .map((p) => (p as unknown as { publication_date?: string }).publication_date)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;

  return { blocks: finalBlocks, updated: lastDate };
}

// ─── FAQ ──────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Por que as porcentagens não somam 100%?",
    a: "Cada pesquisa tem ~8-15% de eleitores indecisos, brancos, nulos ou que não souberam responder. No ElectioLab essa parcela aparece explícita como 'Indecisos / Brancos / Nulos' fechando os 100% — diferente da maioria dos veículos que só mostra os 2 candidatos.",
  },
  {
    q: "Lula vai vencer Flávio Bolsonaro no 2º turno?",
    a: "Pelas pesquisas mais recentes de abril/2026, Lula e Flávio Bolsonaro aparecem dentro da margem de erro — em média ponderada o cenário é tecnicamente empatado, com Flávio levemente à frente (≈1.3pp).",
  },
  {
    q: "Lula bate Caiado no 2º turno?",
    a: "Sim, com vantagem de aproximadamente 6 pontos pela média ponderada de 7 pesquisas. Caiado tem força em Goiás e Centro-Oeste, mas pouco capital nacional.",
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

// ─── Componente de barra ───────────────────────────────────────────────

function BarRow({
  name,
  party,
  pct,
  color,
  ic,
  muted,
}: {
  name: string;
  party?: string | null;
  pct: number;
  color?: string | null;
  ic?: { low: number; high: number };
  muted?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm gap-2">
        <span className={muted ? "text-muted-foreground" : "font-medium"}>
          {name}
          {party && (
            <span className="text-xs text-muted-foreground ml-1.5">{party}</span>
          )}
        </span>
        <span
          className="font-mono font-bold tabular-nums"
          style={{ color: !muted && color ? color : undefined }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: muted ? "var(--muted-foreground)" : color ?? "#6b7280",
            opacity: muted ? 0.4 : 0.9,
          }}
        />
        {ic && (
          <div
            className="absolute inset-y-0 border-x border-white/40"
            style={{
              left: `${ic.low}%`,
              width: `${Math.max(0, ic.high - ic.low)}%`,
            }}
            title={`IC 95% · ${ic.low}–${ic.high}%`}
          />
        )}
      </div>
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────

export default async function Quem2TurnoPage() {
  const { blocks, updated } = await getData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id":
          "https://electiolab.com/quem-vence-no-segundo-turno-presidencia-2026#article",
        headline: "Quem vence no 2º turno da Presidência 2026?",
        description:
          "Comparativo dos cenários simulados de 2º turno presidencial 2026, com média ponderada por cenário.",
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
            Cada cenário de 2º turno é uma <strong>pergunta independente</strong> da
            pesquisa (&quot;se for Lula × Flávio&quot;, &quot;se for Lula × Zema&quot;, etc.).
            Aqui mostramos a média ponderada de cada cenário separadamente — somando
            indecisos para fechar os 100% — em vez de misturar tudo numa lista
            cronológica de polls.
          </p>

          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem cenários disponíveis no momento.</p>
          ) : (
            <section className="space-y-5">
              {blocks.map((b) => {
                const [lead, trail] = b.candidates;
                if (!lead || !trail) return null;
                const total = lead.weighted_average + trail.weighted_average;
                const indef = Math.max(0, 100 - total);
                const badge = statusBadge(b.status);
                const gap = Math.abs(lead.weighted_average - trail.weighted_average);

                return (
                  <div
                    key={b.label}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold">{b.display}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {b.pollsCount} {b.pollsCount === 1 ? "pesquisa" : "pesquisas"}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Bars */}
                    <div className="px-5 py-4 space-y-3">
                      <BarRow
                        name={lead.candidate.name}
                        party={lead.candidate.party}
                        pct={lead.weighted_average}
                        color={lead.candidate.color}
                        ic={{ low: lead.confidence_interval_low, high: lead.confidence_interval_high }}
                      />
                      <BarRow
                        name={trail.candidate.name}
                        party={trail.candidate.party}
                        pct={trail.weighted_average}
                        color={trail.candidate.color}
                        ic={{ low: trail.confidence_interval_low, high: trail.confidence_interval_high }}
                      />
                      {indef > 0 && (
                        <BarRow
                          name="Indecisos / Brancos / Nulos"
                          pct={indef}
                          muted
                        />
                      )}

                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>
                          Soma: {(total + indef).toFixed(1)}%
                        </span>
                        <span>
                          Diferença líder: {gap.toFixed(1)}pp
                        </span>
                      </div>

                      {/* Histórico em accordion */}
                      {b.history.length > 0 && (
                        <details className="group pt-2">
                          <summary className="cursor-pointer text-xs text-primary hover:underline list-none flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3" />
                            <span className="group-open:hidden">
                              Ver histórico ({b.history.length} {b.history.length === 1 ? "pesquisa" : "pesquisas"})
                            </span>
                            <span className="hidden group-open:inline">Ocultar histórico</span>
                          </summary>
                          <div className="mt-3 space-y-2 text-xs">
                            {b.history.map((p, i) => (
                              <div
                                key={i}
                                className="rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                              >
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                  <span>{p.institute}</span>
                                  <span>
                                    {new Date(p.publication_date).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {p.results
                                    .sort((a, b) => b.pct - a.pct)
                                    .map((r, ri) => (
                                      <span
                                        key={ri}
                                        className="font-mono tabular-nums"
                                        style={{ color: r.color ?? undefined }}
                                      >
                                        {r.name}: <strong>{r.pct.toFixed(1)}%</strong>
                                      </span>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
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
          ElectioLab · Última pesquisa indexada:{" "}
          {updated ? new Date(updated).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}
        </div>
      </footer>
    </div>
  );
}
