import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp, Vote } from "lucide-react";
import { SecondRoundTabs, type TabScenario } from "./second-round-tabs";

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
  cands: { name: string; party: string | null; color: string | null; slug: string; pct: number }[]; // 2, desc
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
      cands: sorted.map((c) => ({
        name: c.name, party: c.party, color: c.color, slug: c.slug, pct: c.pct,
      })),
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

// Schema combinado: Dataset + Article (corpo editorial) + FAQPage + BreadcrumbList.
// dateModified puxa da última publication_date no banco quando disponível.
function buildJsonLd(lastUpdated: string | null) {
  const dateModified = lastUpdated ?? new Date().toISOString().slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        "@id": "https://electiolab.com/pesquisas-presidenciais-2026#dataset",
        "name": "Média Agregada de Pesquisas Presidenciais 2026 — Brasil",
        "description":
          "Média ponderada ao vivo de todas as pesquisas presidenciais do Brasil em 2026, calculada por recência (meia-vida 10 dias), tamanho amostral (√n), metodologia de coleta (presencial > online) e acurácia histórica do instituto. Atualizada a cada 6 horas.",
        "url": "https://electiolab.com/pesquisas-presidenciais-2026",
        "sameAs": "https://electiolab.com/#dataset",
        "keywords": [
          "pesquisas presidenciais 2026",
          "intenção de voto presidente",
          "média eleitoral 2026",
          "Datafolha presidente 2026",
          "Quaest presidente 2026",
          "Atlas Intel presidente 2026",
        ],
        "creator": { "@id": "https://electiolab.com/#organization" },
        "publisher": { "@id": "https://electiolab.com/#organization" },
        "license": "https://creativecommons.org/licenses/by/4.0/",
        "isAccessibleForFree": true,
        "inLanguage": "pt-BR",
        "spatialCoverage": { "@type": "Country", "name": "Brasil" },
        "temporalCoverage": "2025-01/..",
        "dateModified": dateModified,
        "variableMeasured": [
          "Intenção de voto 1º turno (%)",
          "Intenção de voto 2º turno (%)",
          "Margem de erro (pp)",
          "Tamanho da amostra (n)",
        ],
        "distribution": [
          {
            "@type": "DataDownload",
            "encodingFormat": "application/json",
            "contentUrl": "https://electiolab.com/api/v1/averages",
            "name": "API REST — médias ponderadas presidenciais",
          },
          {
            "@type": "DataDownload",
            "encodingFormat": "application/json",
            "contentUrl": "https://electiolab.com/api/v1/polls",
            "name": "API REST — pesquisas individuais",
          },
        ],
      },
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
        dateModified: dateModified,
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

  // ── 2º turno: candidato comum (presente em todos os cenários) + abas ──
  // Em 2026 é Lula. Mantém o oponente comum fixo à esquerda em cada aba.
  let commonName = "";
  let commonColor: string | null = null;
  let tabScenarios: TabScenario[] = [];
  if (scenarios2t.length > 0) {
    const slugSets = scenarios2t.map((s) => new Set(s.cands.map((c) => c.slug)));
    const commonSlug =
      [...slugSets[0]].find((slug) => slugSets.every((set) => set.has(slug))) ?? null;

    if (commonSlug) {
      tabScenarios = scenarios2t
        .map((s) => {
          const common = s.cands.find((c) => c.slug === commonSlug);
          const adversary = s.cands.find((c) => c.slug !== commonSlug);
          if (!common || !adversary) return null;
          commonName = common.name;
          commonColor = common.color;
          const undecided = Math.max(0, 100 - common.pct - adversary.pct);
          return {
            label: s.label,
            adversaryName: adversary.name,
            adversaryParty: adversary.party,
            adversaryColor: adversary.color,
            adversaryPct: adversary.pct,
            commonPct: common.pct,
            undecided,
            polls: s.polls,
            status: s.status,
          } satisfies TabScenario;
        })
        .filter((x): x is TabScenario => x !== null);
    }
  }

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
          {/* Answer-first (GEO): resposta direta com números no topo, citável por IA */}
          {top1t.length >= 2 && (
            <p className="text-foreground/90 max-w-2xl leading-relaxed font-medium">
              Pela média ponderada do ElectioLab
              {updated
                ? ` (última pesquisa indexada em ${new Date(updated).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })})`
                : ""}
              , {top1t[0].name}
              {top1t[0].party ? ` (${top1t[0].party})` : ""} lidera a corrida presidencial de 2026
              com {top1t[0].pct.toFixed(1)}%, seguido de {top1t[1].name} com{" "}
              {top1t[1].pct.toFixed(1)}%
              {top1t[2] ? ` e ${top1t[2].name} com ${top1t[2].pct.toFixed(1)}%` : ""}. Médias
              calculadas a partir de {top1t[0].polls} pesquisas, ponderadas por recência, amostra,
              método e acurácia histórica do instituto.
            </p>
          )}
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
              Veja{" "}
              <Link href="/margem-de-erro-pesquisa-eleitoral" className="text-primary hover:underline">
                margem de erro
              </Link>
              {" "}pra entender. Cada % é a média ponderada por recência (meia-vida 10 dias), tamanho
              da amostra (raiz quadrada),{" "}
              <Link href="/pesquisa-presencial-vs-online" className="text-primary hover:underline">
                metodologia
              </Link>
              {" "}(presencial &gt; telefônica &gt; online) e acurácia histórica do instituto.{" "}
              <Link href="/sobre" className="text-primary hover:underline">
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
            <SecondRoundTabs
              commonName={commonName}
              commonColor={commonColor}
              scenarios={tabScenarios}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Cada aba é um <strong>cenário independente</strong>: os institutos perguntam
              &quot;se o 2º turno for {commonName || "o titular"} × adversário X&quot;. Os adversários
              nunca foram testados entre si. As percentuais não somam 100% porque o restante são
              eleitores indecisos, brancos ou nulos — mostrado em cada aba.
            </p>
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

        {/* Glossário — base teórica */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Entenda pesquisa eleitoral
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { label: "Glossário completo", href: "/glossario-pesquisa-eleitoral", sub: "Todos os termos" },
              { label: "Margem de erro", href: "/margem-de-erro-pesquisa-eleitoral", sub: "Como ler ±3pp e IC 95%" },
              { label: "Empate técnico", href: "/empate-tecnico-pesquisa-eleitoral", sub: "Quando 45×43 é empate" },
              { label: "Estimulada vs espontânea", href: "/pesquisa-estimulada-vs-espontanea", sub: "Por que números variam" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-card border border-border rounded-sm px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {l.label}
                  </span>
                  <span className="text-primary text-xs">→</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{l.sub}</p>
              </Link>
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
