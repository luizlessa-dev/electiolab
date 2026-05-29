import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, DollarSign, TrendingUp, BarChart3, AlertCircle } from "lucide-react";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Dinheiro e Votos: FEFC, gastos de campanha e as pesquisas presidenciais 2026",
  description:
    "Quanto cada candidato à presidência recebeu do fundo eleitoral (FEFC) e como isso se relaciona com os números nas pesquisas. Dados oficiais do TSE atualizados.",
  alternates: {
    canonical: "https://electiolab.com/dinheiro-e-votos-pesquisas-2026",
  },
  openGraph: {
    title: "Dinheiro e Votos — FEFC e pesquisas presidenciais 2026",
    description:
      "Quem recebeu mais do fundo eleitoral? Quem lidera as pesquisas? O cruzamento dos dados revela que dinheiro e votos nem sempre andam juntos.",
    url: "https://electiolab.com/dinheiro-e-votos-pesquisas-2026",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type FefcRow = {
  candidate_id: string;
  amount_received: number;
  party_acronym: string | null;
  election_year: number;
  candidate: { name: string; slug: string; party: string | null; color: string | null } | null;
};

type AdsRow = {
  platform: string;
  spend_lower: number | null;
  spend_upper: number | null;
  page_name: string;
  candidate: { name: string; slug: string; party: string | null; color: string | null } | null;
};

type WeightedAvgRow = {
  candidate_id: string;
  weighted_avg: number;
  candidate: { name: string; slug: string; party: string | null; color: string | null } | null;
};

type CombinedRow = {
  name: string;
  slug: string;
  party: string | null;
  color: string | null;
  fefc2026: number;
  ads2022: number;
  avg: number | null;
};

// ─── Data fetching ────────────────────────────────────────────────────────────

function sbClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getFefcData(): Promise<FefcRow[]> {
  const { data } = await sbClient()
    .from("candidate_fefc")
    .select(
      "candidate_id, amount_received, party_acronym, election_year, candidate:candidates(name, slug, party, color)"
    )
    .eq("election_year", 2026)
    .order("amount_received", { ascending: false })
    .limit(20);
  if (!data) return [];
  return (data as unknown as FefcRow[]).map((r) => ({
    ...r,
    candidate: Array.isArray((r as unknown as { candidate: unknown }).candidate)
      ? ((r as unknown as { candidate: FefcRow["candidate"][] }).candidate)[0]
      : (r.candidate as FefcRow["candidate"]),
  }));
}

async function getAds2022(): Promise<AdsRow[]> {
  const { data } = await sbClient()
    .from("digital_ads")
    .select(
      "platform, spend_lower, spend_upper, page_name, candidate:candidates(name, slug, party, color)"
    )
    .order("spend_upper", { ascending: false, nullsFirst: false })
    .limit(20);
  if (!data) return [];
  return (data as unknown as AdsRow[]).map((r) => ({
    ...r,
    candidate: Array.isArray((r as unknown as { candidate: unknown }).candidate)
      ? ((r as unknown as { candidate: AdsRow["candidate"][] }).candidate)[0]
      : (r.candidate as AdsRow["candidate"]),
  }));
}

async function getWeightedAverages(): Promise<WeightedAvgRow[]> {
  const { data } = await sbClient()
    .from("weighted_averages")
    .select(
      "candidate_id, weighted_avg, candidate:candidates(name, slug, party, color)"
    )
    .order("weighted_avg", { ascending: false })
    .limit(10);
  if (!data) return [];
  return (data as unknown as WeightedAvgRow[]).map((r) => ({
    ...r,
    candidate: Array.isArray((r as unknown as { candidate: unknown }).candidate)
      ? ((r as unknown as { candidate: WeightedAvgRow["candidate"][] }).candidate)[0]
      : (r.candidate as WeightedAvgRow["candidate"]),
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return `R$ ${v.toFixed(0)}`;
}

function colorBar(pct: number, color: string | null) {
  const safeColor = color ?? "#6366f1";
  return (
    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: safeColor }}
      />
    </div>
  );
}

const FAQS = [
  {
    q: "O que é o FEFC e como é distribuído?",
    a: "O FEFC (Fundo Especial de Financiamento de Campanha) é o principal fundo público de campanhas eleitorais no Brasil. Ele é distribuído pelo TSE entre os partidos com base na representação parlamentar, e cada partido repassa aos seus candidatos conforme decisão interna. Em 2026, o valor total disponível é de aproximadamente R$ 4,9 bilhões.",
  },
  {
    q: "Por que candidatos com mais dinheiro nem sempre lideram as pesquisas?",
    a: "Verba de campanha é um recurso, não um garantia. Candidatos com alta rejeição ou pouca presença regional podem gastar muito sem converter em votos. Além disso, candidatos com forte estrutura de partido ou grande visibilidade prévia precisam de menos investimento para manter posições. Os dados do FEFC cruzados com as pesquisas ilustram bem essa dinâmica.",
  },
  {
    q: "Os dados de gastos em Google Ads e Meta são de 2022 ou 2026?",
    a: "Atualmente, os dados de propaganda digital disponíveis são de 2022, ano da última eleição presidencial. Eles servem como linha de base para comparação. A partir de agosto de 2026, quando começar o período oficial de campanha, o ElectioLab passará a capturar os dados de 2026 automaticamente do Google Ad Transparency Center e da Meta Ad Library.",
  },
  {
    q: "Candidatos podem usar dinheiro do FEFC para pagar Google Ads?",
    a: "Sim. Recursos do FEFC podem ser usados para qualquer tipo de propaganda eleitoral, incluindo Google Ads, Meta (Facebook e Instagram) e outras plataformas digitais. A proporção destinada a digital variou entre 15% e 40% do total nas últimas eleições. O TikTok é exceção: proíbe propaganda política paga no Brasil desde 2019.",
  },
  {
    q: "Como o ElectioLab calcula a média ponderada das pesquisas?",
    a: "A média usa quatro fatores: (1) Recência — pesquisas recentes têm mais peso; (2) Amostra — amostras maiores valem mais; (3) Metodologia — pesquisas presenciais têm peso maior que online; (4) Acurácia histórica do instituto. O resultado é uma média W = Wr × Wa × Wm × Wi. Mais detalhes em /metodologia.",
  },
  {
    q: "O FEFC substitui completamente o financiamento privado?",
    a: "Não. Pessoas físicas podem fazer doações a candidatos dentro dos limites legais (máximo de 10% dos rendimentos brutos). Doações de empresas a candidatos são proibidas desde 2015 (ADI 4.650). Além do FEFC, partidos podem usar recursos do Fundo Partidário (FPOE) para custear estrutura, mas não diretamente a campanha.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DinheiroEVotosPage() {
  const [fefcRows, adsRows, avgRows] = await Promise.all([
    getFefcData(),
    getAds2022(),
    getWeightedAverages(),
  ]);

  // Build a unified map keyed by candidate slug
  const map = new Map<string, CombinedRow>();

  // Seed from FEFC data
  for (const r of fefcRows) {
    const c = r.candidate;
    if (!c?.slug) continue;
    map.set(c.slug, {
      name: c.name,
      slug: c.slug,
      party: c.party,
      color: c.color,
      fefc2026: Number(r.amount_received ?? 0),
      ads2022: 0,
      avg: null,
    });
  }

  // Add 2022 ads spend (aggregate by candidate)
  for (const r of adsRows) {
    const c = r.candidate;
    if (!c?.slug) continue;
    const spend = Math.max(Number(r.spend_upper ?? 0), Number(r.spend_lower ?? 0));
    const existing = map.get(c.slug);
    if (existing) {
      existing.ads2022 += spend;
    } else {
      map.set(c.slug, {
        name: c.name,
        slug: c.slug,
        party: c.party,
        color: c.color,
        fefc2026: 0,
        ads2022: spend,
        avg: null,
      });
    }
  }

  // Add polling averages
  for (const r of avgRows) {
    const c = r.candidate;
    if (!c?.slug) continue;
    const existing = map.get(c.slug);
    if (existing) {
      existing.avg = Number(r.weighted_avg ?? 0);
    } else {
      map.set(c.slug, {
        name: c.name,
        slug: c.slug,
        party: c.party,
        color: c.color,
        fefc2026: 0,
        ads2022: 0,
        avg: Number(r.weighted_avg ?? 0),
      });
    }
  }

  const combined = Array.from(map.values()).filter(
    (r) => r.fefc2026 > 0 || r.avg !== null
  );

  // Sort by FEFC 2026 desc, then by poll avg
  const sorted = [...combined].sort(
    (a, b) => b.fefc2026 - a.fefc2026 || (b.avg ?? 0) - (a.avg ?? 0)
  );

  const maxFefc = Math.max(...sorted.map((r) => r.fefc2026), 1);
  const maxAds = Math.max(...sorted.map((r) => r.ads2022), 1);

  const totalFefc = fefcRows.reduce((s, r) => s + Number(r.amount_received ?? 0), 0);

  const hasFefcData = fefcRows.length > 0;
  const hasAvgData = avgRows.length > 0;

  const dateModified = new Date().toISOString().slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": "https://electiolab.com/dinheiro-e-votos-pesquisas-2026#article",
        headline:
          "Dinheiro e Votos: FEFC, gastos de campanha e as pesquisas presidenciais 2026",
        description:
          "Análise cruzada do FEFC 2026 distribuído por candidato, gastos em propaganda digital (benchmark 2022) e a posição atual nas médias ponderadas das pesquisas.",
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-05-28",
        dateModified,
        inLanguage: "pt-BR",
        url: "https://electiolab.com/dinheiro-e-votos-pesquisas-2026",
        mainEntityOfPage: "https://electiolab.com/dinheiro-e-votos-pesquisas-2026",
      },
      {
        "@type": "Dataset",
        "@id": "https://electiolab.com/dinheiro-e-votos-pesquisas-2026#dataset",
        name: "Financiamento eleitoral e pesquisas presidenciais 2026",
        description:
          "Cruzamento de dados de FEFC 2026 (TSE), gastos em propaganda digital 2022 (Google/Meta) e médias ponderadas de pesquisas presidenciais 2026.",
        url: "https://electiolab.com/dinheiro-e-votos-pesquisas-2026",
        creator: { "@id": "https://electiolab.com/#organization" },
        license: "https://creativecommons.org/licenses/by/4.0/",
        isAccessibleForFree: true,
        dateModified,
        keywords: [
          "FEFC 2026",
          "fundo eleitoral",
          "financiamento campanha",
          "propaganda digital",
          "pesquisas presidenciais 2026",
          "Google Ads eleições",
          "Meta ads eleições",
        ],
        distribution: [
          {
            "@type": "DataDownload",
            contentUrl: "https://electiolab.com/api/v1/averages",
            encodingFormat: "application/json",
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ElectioLab",
            item: "https://electiolab.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Dinheiro e Votos — FEFC 2026",
            item: "https://electiolab.com/dinheiro-e-votos-pesquisas-2026",
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="px-4 py-6 border-b border-border">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/pesquisas-presidenciais-2026"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-3 w-3" />
              Pesquisas presidenciais 2026
            </Link>

            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-1">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                  Análise · ElectioLab
                </p>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                  Dinheiro e Votos
                </h1>
                <p className="text-lg text-muted-foreground mt-1">
                  FEFC, gastos de campanha e as pesquisas presidenciais 2026
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground max-w-2xl">
              O Fundo Especial de Financiamento de Campanha (FEFC) distribui R$ 4,9 bilhões entre
              candidatos. Mas quem recebe mais, lidera nas urnas? O cruzamento dos repasses
              oficiais do TSE com as médias ponderadas das pesquisas revela padrões — e surpresas.
            </p>

            <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                FEFC 2026 — dados oficiais TSE
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                Ads digitais 2022 — benchmark (Google + Meta)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Média ponderada de pesquisas — ao vivo
              </span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="px-4 py-10">
          <div className="max-w-4xl mx-auto space-y-14">

            {/* Section 1 — Context */}
            <section className="space-y-5">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                O que é o FEFC?
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    icon: DollarSign,
                    label: "Total disponível em 2026",
                    value: "R$ 4,9 bi",
                    note: "Fundo público de campanhas",
                    color: "text-primary",
                  },
                  {
                    icon: BarChart3,
                    label: "Critério de distribuição",
                    value: "Representação",
                    note: "Proporcional à bancada na Câmara",
                    color: "text-amber-500",
                  },
                  {
                    icon: TrendingUp,
                    label: "Uso permitido",
                    value: "Qualquer mídia",
                    note: "TV, radio, digital, estrutura",
                    color: "text-emerald-500",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-card border border-border rounded-lg px-5 py-4 space-y-1"
                  >
                    <item.icon className={`h-4 w-4 ${item.color} mb-2`} />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-xl font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-5 text-sm leading-relaxed space-y-3">
                <p>
                  O FEFC foi criado em 2017 após o STF proibir doações de empresas a partidos e
                  candidatos (ADI 4.650, 2015). Ele substituiu o sistema de financiamento privado
                  corporativo e concentrou o custeio das campanhas no erário público.
                </p>
                <p>
                  Os partidos recebem do TSE e distribuem internamente aos candidatos. Os repasses
                  são públicos e auditáveis via prestação de contas no Portal do TSE. O ElectioLab
                  captura esses dados automaticamente e cruza com as posições nas pesquisas.
                </p>
              </div>
            </section>

            {/* Section 2 — FEFC Ranking */}
            <section className="space-y-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Ranking FEFC 2026 × Pesquisas
                </h2>
                {hasFefcData && (
                  <span className="text-xs text-muted-foreground">
                    Total distribuído:{" "}
                    <span className="text-foreground font-semibold">{fmtBRL(totalFefc)}</span>
                  </span>
                )}
              </div>

              {!hasFefcData ? (
                <div className="bg-muted/30 border border-border rounded-lg p-6 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">
                      Dados de FEFC ainda não disponíveis
                    </p>
                    <p>
                      Os repasses individuais do FEFC 2026 são publicados pelo TSE conforme os
                      partidos registram a prestação de contas. Esta página atualiza
                      automaticamente quando os dados entrarem.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-medium w-8">
                          #
                        </th>
                        <th className="pb-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          Candidato
                        </th>
                        <th className="pb-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right">
                          FEFC 2026
                        </th>
                        <th className="pb-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right hidden md:table-cell">
                          Ads 2022
                          <span className="text-muted-foreground/60 normal-case tracking-normal ml-1">
                            (ref.)
                          </span>
                        </th>
                        <th className="pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right">
                          Pesquisas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sorted.map((row, i) => (
                        <tr key={row.slug} className="group hover:bg-muted/20 transition-colors">
                          <td className="py-3 pr-4 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="py-3 pr-4">
                            <Link
                              href={`/candidato/${row.slug}`}
                              className="hover:underline font-medium"
                            >
                              {row.name}
                            </Link>
                            {row.party && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {row.party}
                              </span>
                            )}
                            {row.fefc2026 > 0 &&
                              colorBar((row.fefc2026 / maxFefc) * 100, row.color)}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {row.fefc2026 > 0 ? (
                              <span className="text-foreground">{fmtBRL(row.fefc2026)}</span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums hidden md:table-cell">
                            {row.ads2022 > 0 ? (
                              <span className="text-amber-500/80">{fmtBRL(row.ads2022)}</span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="py-3 text-right tabular-nums">
                            {row.avg !== null ? (
                              <span className="text-emerald-500 font-semibold">
                                {row.avg.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Fontes: TSE (FEFC 2026), Google Ad Transparency Center e Meta Ad Library (ads 2022
                — benchmark), ElectioLab (médias ponderadas ao vivo).{" "}
                <Link href="/metodologia" className="underline hover:text-foreground">
                  Como funciona a média?
                </Link>
              </p>
            </section>

            {/* Section 3 — Benchmark Ads 2022 */}
            <section className="space-y-5">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Benchmark: gastos em propaganda digital em 2022
              </h2>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Os dados de Google Ads e Meta abaixo são da eleição de{" "}
                  <strong className="text-foreground">2022</strong> e servem como linha de
                  referência. A partir de agosto de 2026, quando começar o período oficial de
                  campanha, o ElectioLab capturará os dados de 2026 automaticamente.
                </p>
              </div>

              {adsRows.filter((r) => r.candidate).length > 0 ? (
                <div className="space-y-2">
                  {adsRows
                    .filter((r) => r.candidate)
                    .slice(0, 10)
                    .map((r) => {
                      const spend = Math.max(
                        Number(r.spend_upper ?? 0),
                        Number(r.spend_lower ?? 0)
                      );
                      const pct = (spend / maxAds) * 100;
                      const c = r.candidate!;
                      return (
                        <div key={`${r.platform}-${c.slug}`} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/candidato/${c.slug}`}
                                className="font-medium hover:underline"
                              >
                                {c.name}
                              </Link>
                              {c.party && (
                                <span className="text-xs text-muted-foreground">{c.party}</span>
                              )}
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">
                                {r.platform}
                              </span>
                            </div>
                            <span className="tabular-nums text-amber-500 font-semibold">
                              {fmtBRL(spend)}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1">
                            <div
                              className="h-1 rounded-full bg-amber-500/60"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Dados de propaganda digital 2022 indisponíveis no momento.
                </p>
              )}

              <div className="bg-muted/30 border border-border rounded-lg p-5 text-sm leading-relaxed space-y-3">
                <p className="font-semibold">Por que comparar 2022 e 2026?</p>
                <p className="text-muted-foreground">
                  Os gastos em propaganda digital crescem eleição a eleição. Em 2018, o total foi
                  irrisório; em 2022, ultrapassou R$ 100 milhões entre os principais candidatos.
                  Para 2026, analistas estimam um crescimento de 40%–70% sobre 2022, impulsionado
                  pela regulação mais estável do Google/Meta e pelo crescimento do eleitorado
                  digital. Os dados de 2022 permitem calibrar expectativas e estabelecer ranking
                  relativo entre candidatos recorrentes.
                </p>
              </div>
            </section>

            {/* Section 4 — Editorial analysis */}
            <section className="space-y-5">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Dinheiro garante votos?
              </h2>

              <div className="prose prose-sm prose-invert max-w-none space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  A literatura de ciência política é consistente: financiamento de campanha tem{" "}
                  <strong className="text-foreground">efeito marginal</strong> nas intenções de
                  voto em disputas presidenciais de alta visibilidade. O motivo é que, nesse nível,
                  a cobertura jornalística gratuita supera em alcance qualquer gasto pago.
                </p>
                <p>
                  Isso não significa que dinheiro seja irrelevante. Ele importa em três momentos:
                  (1) na{" "}
                  <strong className="text-foreground">fase de construção de imagem</strong>, antes
                  do candidato ter visibilidade orgânica; (2) em{" "}
                  <strong className="text-foreground">eleições locais</strong>, onde a cobertura
                  espontânea é escassa; (3) no{" "}
                  <strong className="text-foreground">ground game</strong> — comícios, materiais,
                  cabos eleitorais — que as pesquisas não medem diretamente mas impactam o dia do
                  pleito.
                </p>
                <p>
                  Nas pesquisas presidenciais 2026, os candidatos com maiores médias ponderadas são
                  exatamente aqueles com maior presença na mídia orgânica, independente do FEFC. O
                  fundo eleitoral, nesse ciclo, serve mais para consolidar do que para construir.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Alta verba, alto voto",
                    desc: "Candidatos de partidos grandes com bancada expressiva recebem mais FEFC e costumam já ter alta visibilidade. A correlação existe, mas é espúria — o tamanho do partido explica ambas as variáveis.",
                    color: "border-emerald-500/30 bg-emerald-500/5",
                    badge: "Correlação positiva",
                    badgeColor: "text-emerald-400",
                  },
                  {
                    title: "Alta verba, baixo voto",
                    desc: "Partidos médios com bancada relevante recebem FEFC substancial para candidatos que mal chegam ao 1% nas pesquisas. Aqui o fundo serve para marcar presença institucional, não para vencer.",
                    color: "border-red-500/30 bg-red-500/5",
                    badge: "Baixa conversão",
                    badgeColor: "text-red-400",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={`border rounded-lg p-4 space-y-2 ${item.color}`}
                  >
                    <span className={`text-xs font-mono uppercase tracking-wider ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 5 — 2026 outlook */}
            <section className="space-y-5">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                O que esperar em 2026
              </h2>
              <div className="bg-muted/30 border border-border rounded-lg p-5 text-sm leading-relaxed space-y-4">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  {[
                    { label: "Início do período de campanha", value: "Ago 2026", sub: "Ads digitais liberados" },
                    { label: "Primeiro turno", value: "Out 2026", sub: "2 de outubro" },
                    { label: "Segundo turno (se houver)", value: "Out 2026", sub: "30 de outubro" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs border-t border-border pt-4">
                  Esta página atualiza automaticamente quando novos dados de FEFC ou propaganda
                  digital forem publicados pelo TSE e pelas plataformas. Última atualização:{" "}
                  <span className="text-foreground">{dateModified}</span>.
                </p>
              </div>
            </section>

            {/* FAQ */}
            <section className="space-y-5">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Perguntas frequentes
              </h2>
              <div className="space-y-4">
                {FAQS.map(({ q, a }) => (
                  <div key={q} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <p className="font-semibold text-sm mb-2">{q}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Internal links */}
            <LeiaTabem current="/dinheiro-e-votos-pesquisas-2026" />
          </div>
        </div>
      </div>
    </>
  );
}
