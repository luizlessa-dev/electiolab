import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp, Vote } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Presidenciais 2026 — Média Agregada | ElectioLab" },
  description:
    "Acompanhe a média agregada de todas as pesquisas presidenciais de 2026. Dados de Datafolha, Quaest, Atlas Intel e outros institutos. Atualizado semanalmente.",
  alternates: { canonical: "https://electiolab.com/pesquisas-presidenciais-2026" },
  openGraph: {
    title: "Pesquisas Presidenciais 2026 — Média Agregada | ElectioLab",
    description:
      "Acompanhe a média agregada de todas as pesquisas presidenciais de 2026. Dados de Datafolha, Quaest, Atlas Intel e outros institutos. Atualizado semanalmente.",
    url: "https://electiolab.com/pesquisas-presidenciais-2026",
    images: [
      {
        url: "https://electiolab.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ElectioLab — Pesquisas Presidenciais 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pesquisas Presidenciais 2026 — Média Agregada | ElectioLab",
    description:
      "Acompanhe a média agregada de todas as pesquisas presidenciais de 2026. Datafolha, Quaest, Atlas Intel.",
    images: ["https://electiolab.com/opengraph-image"],
  },
};

const FAQ_ITEMS = [
  {
    question: "Quais institutos fazem pesquisas presidenciais 2026?",
    answer:
      "Os principais institutos que realizam pesquisas presidenciais 2026 são Datafolha, Quaest (incluindo Genial/Quaest), Atlas Intel, Ipec, PoderData e outros registrados no TSE. Cada instituto utiliza metodologias distintas — presencial, telefônica ou online — e publica com frequências variadas. O ElectioLab monitora e agrega todas as pesquisas registradas para fornecer uma visão consolidada da corrida presidencial.",
  },
  {
    question: "Com que frequência as pesquisas presidenciais 2026 são publicadas?",
    answer:
      "A frequência varia por instituto. Em geral, Datafolha e Quaest publicam pesquisas a cada uma ou duas semanas durante o período eleitoral. Atlas Intel publica com maior frequência, frequentemente semanal ou até mais. PoderData e outros institutos têm cadência mensal ou bimensal. O ElectioLab atualiza a média agregada sempre que uma nova pesquisa é publicada.",
  },
  {
    question: "Qual candidato lidera as pesquisas presidenciais 2026?",
    answer:
      "A posição atual de cada candidato nas pesquisas presidenciais 2026 está disponível no dashboard do ElectioLab com a média ponderada atualizada. Em vez de depender de uma única pesquisa — que pode ser um outlier —, o dashboard exibe a tendência agregada de todos os institutos, ponderada por recência, tamanho de amostra, metodologia e histórico de acurácia. Acesse o dashboard para ver o líder atual.",
  },
  {
    question: "Como funciona a média ponderada das pesquisas?",
    answer:
      "A média ponderada do ElectioLab considera quatro fatores para cada pesquisa: (1) Recência — pesquisas mais antigas decaem com meia-vida de 10 dias; (2) Tamanho da amostra — amostras maiores têm mais peso, com retorno decrescente calculado via raiz quadrada do n; (3) Metodologia de coleta — presencial supera telefônica, que supera online; (4) Histórico de acurácia do instituto — institutos com menor Erro Médio Absoluto em eleições anteriores recebem peso maior. O resultado é uma estimativa mais estável do que qualquer pesquisa individual.",
  },
  {
    question: "As pesquisas presidenciais 2026 são confiáveis?",
    answer:
      "Pesquisas individuais têm margem de erro e variações metodológicas que podem gerar leituras distorcidas. Um instituto pode apontar 39% enquanto outro diz 33% para o mesmo candidato na mesma semana — ambos dentro de suas margens de erro. A agregação de pesquisas, método usado pelo FiveThirtyEight nos EUA e pelo ElectioLab no Brasil, reduz esse ruído ao combinar múltiplas fontes com pesos diferenciados. O resultado é significativamente mais confiável do que qualquer pesquisa isolada para identificar a tendência real da corrida presidencial.",
  },
];

// ─── Tipos ────────────────────────────────────────────────────────────
type CandidateAvg = {
  name: string;
  party: string | null;
  color: string | null;
  slug: string;
  pct: number;
  ci_low: number;
  ci_high: number;
  polls: number;
};

type ScenarioSummary = {
  label: string;        // "lula-vs-zema"
  display: string;      // "Lula × Zema"
  leader: { name: string; pct: number; color: string | null };
  trailer: { name: string; pct: number; color: string | null };
  polls: number;
  gap: number;
  status: "empate" | "vantagem" | "folga" | "raso";
};

// ─── Election IDs (snapshot 2026-05) ──────────────────────────────────
const PRES_1T_ID = "21f8e9a3-5ff8-4baf-b0ae-6b00d2614248";
const PRES_2T_ID = "cd7032c5-06ed-4eb9-8702-ddd6c75d83de";

async function getData(): Promise<{
  averages1t: CandidateAvg[];
  scenarios2t: ScenarioSummary[];
  updated: string | null;
}> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // 1º turno (scenario_label IS NULL = média global por candidato)
  const { data: avgs1t } = await sb
    .from("weighted_averages")
    .select(
      `weighted_average, confidence_interval_low, confidence_interval_high, polls_included,
       candidate:candidates(name, party, color, slug)`
    )
    .eq("election_id", PRES_1T_ID)
    .is("scenario_label", null)
    .order("weighted_average", { ascending: false });

  type Raw1t = {
    weighted_average: number;
    confidence_interval_low: number;
    confidence_interval_high: number;
    polls_included: number;
    candidate:
      | { name: string; party: string | null; color: string | null; slug: string }[]
      | { name: string; party: string | null; color: string | null; slug: string }
      | null;
  };
  const averages1t: CandidateAvg[] = ((avgs1t ?? []) as Raw1t[])
    .map((r) => {
      const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
      return c
        ? {
            name: c.name,
            party: c.party,
            color: c.color,
            slug: c.slug,
            pct: r.weighted_average,
            ci_low: r.confidence_interval_low,
            ci_high: r.confidence_interval_high,
            polls: r.polls_included,
          }
        : null;
    })
    .filter((x): x is CandidateAvg => x !== null);

  // 2º turno (agrupar por scenario_label)
  const { data: avgs2t } = await sb
    .from("weighted_averages")
    .select(
      `scenario_label, weighted_average, confidence_interval_low, confidence_interval_high, polls_included,
       candidate:candidates(name, party, color, slug)`
    )
    .eq("election_id", PRES_2T_ID)
    .not("scenario_label", "is", null);

  const byScenario = new Map<string, CandidateAvg[]>();
  for (const r of (avgs2t ?? []) as Array<{
    scenario_label: string;
    weighted_average: number;
    confidence_interval_low: number;
    confidence_interval_high: number;
    polls_included: number;
    candidate:
      | { name: string; party: string | null; color: string | null; slug: string }[]
      | { name: string; party: string | null; color: string | null; slug: string }
      | null;
  }>) {
    const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
    if (!c || !r.scenario_label) continue;
    const arr = byScenario.get(r.scenario_label) ?? [];
    arr.push({
      name: c.name,
      party: c.party,
      color: c.color,
      slug: c.slug,
      pct: r.weighted_average,
      ci_low: r.confidence_interval_low,
      ci_high: r.confidence_interval_high,
      polls: r.polls_included,
    });
    byScenario.set(r.scenario_label, arr);
  }

  const scenarios2t: ScenarioSummary[] = [];
  for (const [label, cands] of byScenario) {
    if (cands.length !== 2) continue;
    const sorted = [...cands].sort((a, b) => b.pct - a.pct);
    const [lead, trail] = sorted;
    const overlap = lead.ci_low <= trail.ci_high;
    const margin = lead.ci_low - trail.ci_high;
    const polls = Math.max(lead.polls, trail.polls);
    let status: ScenarioSummary["status"] = "folga";
    if (polls < 3) status = "raso";
    else if (overlap) status = "empate";
    else if (margin < 2) status = "vantagem";
    scenarios2t.push({
      label,
      display: `${lead.name} × ${trail.name}`,
      leader: { name: lead.name, pct: lead.pct, color: lead.color },
      trailer: { name: trail.name, pct: trail.pct, color: trail.color },
      polls,
      gap: lead.pct - trail.pct,
      status,
    });
  }
  // Empate primeiro, depois por nº de polls
  const prio: Record<ScenarioSummary["status"], number> = {
    empate: 0, vantagem: 1, folga: 2, raso: 3,
  };
  scenarios2t.sort((a, b) => prio[a.status] - prio[b.status] || b.polls - a.polls);

  // Última pesquisa indexada (pra mostrar "atualizado em")
  const { data: lastPoll } = await sb
    .from("polls")
    .select("publication_date")
    .in("election_id", [PRES_1T_ID, PRES_2T_ID])
    .order("publication_date", { ascending: false })
    .limit(1);
  const updated = (lastPoll?.[0] as { publication_date?: string })?.publication_date ?? null;

  return { averages1t, scenarios2t, updated };
}

function statusLabel(s: ScenarioSummary["status"]): { label: string; cls: string } {
  return {
    empate:   { label: "Empate técnico",  cls: "text-amber-500" },
    vantagem: { label: "Vantagem",        cls: "text-blue-400" },
    folga:    { label: "Folga clara",     cls: "text-emerald-400" },
    raso:     { label: "Poucos dados",    cls: "text-muted-foreground" },
  }[s];
}

// Schema combinado: Article (corpo editorial) + FAQPage + BreadcrumbList.
// dateModified puxa da última publication_date no banco quando disponível.
function buildJsonLd(lastUpdated: string | null) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": "https://electiolab.com/pesquisas-presidenciais-2026#article",
        headline: "Média Agregada de Pesquisas Presidenciais 2026",
        description:
          "Acompanhe a média agregada de todas as pesquisas presidenciais de 2026. Datafolha, Quaest, Atlas Intel e outros.",
        url: "https://electiolab.com/pesquisas-presidenciais-2026",
        mainEntityOfPage: "https://electiolab.com/pesquisas-presidenciais-2026",
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-04-01",
        dateModified: lastUpdated ?? new Date().toISOString().slice(0, 10),
        inLanguage: "pt-BR",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Pesquisas Presidenciais 2026" },
        ],
      },
    ],
  };
}

export default async function PesquisasPresidenciais2026Page() {
  const { averages1t, scenarios2t, updated } = await getData();
  const top1t = averages1t.filter((c) => c.pct >= 0.5).slice(0, 10);
  const maxPct = top1t.length > 0 ? Math.max(...top1t.map((c) => c.pct)) : 50;
  const jsonLd = buildJsonLd(updated);

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">

        {/* Hero */}
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">
            Pesquisas Presidenciais 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Média Agregada de Pesquisas Presidenciais 2026
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            O ElectioLab consolida todas as pesquisas presidenciais publicadas em 2026 — Datafolha,
            Quaest, Atlas Intel, PoderData e outros — em uma única média ponderada. Cada pesquisa
            recebe um peso baseado em quatro fatores: recência, tamanho da amostra, metodologia de
            coleta e histórico de acurácia do instituto.
          </p>
          {updated && (
            <p className="text-xs text-muted-foreground font-mono">
              Última pesquisa indexada:{" "}
              {new Date(updated).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "long", year: "numeric",
              })}
            </p>
          )}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Ver dashboard completo →
          </Link>
        </div>

        {/* ── BLOCO 1: Média ponderada do 1º turno ── */}
        {top1t.length > 0 && (
          <section className="space-y-4" id="primeiro-turno">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Vote className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">
                  Cenário atual — 1º turno
                </h2>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                média ponderada · {top1t[0]?.polls ?? 0} pesquisas
              </span>
            </div>
            <div className="rounded-sm border border-border bg-card overflow-hidden">
              {top1t.map((c, i) => {
                const barWidth = (c.pct / maxPct) * 100;
                return (
                  <Link
                    key={c.slug}
                    href={`/candidato/${c.slug}`}
                    className={`block px-4 py-3 hover:bg-muted/30 transition-colors ${
                      i > 0 ? "border-t border-border/60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-xs font-mono text-muted-foreground tabular-nums text-right">
                        #{i + 1}
                      </span>
                      <div className="w-32 md:w-40 shrink-0 min-w-0">
                        <div className="text-sm font-semibold truncate">{c.name}</div>
                        {c.party && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {c.party}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 relative h-2 bg-muted/40 rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: c.color ?? "#6b7280",
                            opacity: 0.85,
                          }}
                        />
                      </div>
                      <div className="w-16 text-right">
                        <span
                          className="font-mono font-bold tabular-nums text-sm"
                          style={{ color: c.color ?? undefined }}
                        >
                          {c.pct.toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          ±{((c.ci_high - c.ci_low) / 2).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Margens (±) representam o intervalo de confiança 95% sobre a média ponderada.
              Cada % é a média ponderada por recência (meia-vida 10 dias), tamanho da amostra
              (raiz quadrada), metodologia (presencial &gt; telefônica &gt; online) e acurácia
              histórica do instituto. <Link href="/sobre" className="text-primary hover:underline">
                Como funciona →
              </Link>
            </p>
          </section>
        )}

        {/* ── BLOCO 2: Resumo do 2º turno ── */}
        {scenarios2t.length > 0 && (
          <section className="space-y-4" id="segundo-turno">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">
                  Cenários de 2º turno
                </h2>
              </div>
              <Link
                href="/quem-vence-no-segundo-turno-presidencia-2026"
                className="text-xs text-primary hover:underline font-medium"
              >
                Ver análise completa →
              </Link>
            </div>
            <div className="rounded-sm border border-border bg-card overflow-hidden">
              {scenarios2t.map((s, i) => {
                const st = statusLabel(s.status);
                return (
                  <div
                    key={s.label}
                    className={`px-4 py-3 ${
                      i > 0 ? "border-t border-border/60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm font-semibold min-w-0">
                        {s.display}
                      </div>
                      <div className="flex items-center gap-3 font-mono tabular-nums text-sm">
                        <span style={{ color: s.leader.color ?? undefined }} className="font-bold">
                          {s.leader.pct.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">×</span>
                        <span style={{ color: s.trailer.color ?? undefined }} className="font-bold">
                          {s.trailer.pct.toFixed(1)}
                        </span>
                        <span className={`text-[11px] font-medium ${st.cls} min-w-[100px] text-right`}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="space-y-4" id="faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="border border-border rounded-sm bg-card overflow-hidden group"
              >
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-3">
                  {item.question}
                  <span className="text-muted-foreground text-xs shrink-0 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Links relacionados */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Eleições estaduais 2026
          </h2>
          <div className="grid sm:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { label: "Governador SP 2026", href: "/eleicoes-governador-sp-2026" },
              { label: "Governador MG 2026", href: "/eleicoes-governador-mg-2026" },
              { label: "Governador RJ 2026", href: "/eleicoes-governador-rj-2026" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-card px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-between"
              >
                {l.label} <span className="text-primary">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="border border-border rounded-sm bg-card px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Dados ao vivo no Dashboard</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Acompanhe a média ponderada atualizada, tendência histórica e ranking de acurácia dos
              institutos em tempo real.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir dashboard
          </Link>
        </section>

      </main>

      {/* Footer */}
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
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
