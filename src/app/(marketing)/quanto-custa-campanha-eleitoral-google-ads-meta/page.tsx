import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Megaphone } from "lucide-react";
import { LeiaTabem } from "@/components/editorial/leia-tambem";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Custo de campanha em Google Ads e Meta — 2022",
  description:
    "Quanto Lula, Bolsonaro, Tarcísio, Ciro e outros gastaram em ads em 2022. Dados oficiais do Google Transparency e Meta Ad Library.",
  alternates: {
    canonical:
      "https://electiolab.com/quanto-custa-campanha-eleitoral-google-ads-meta",
  },
  openGraph: {
    title: "Quanto custou cada campanha presidencial 2022 em ads digitais?",
    description:
      "Bolsonaro: R$ 28,6 mi · Ciro Gomes: R$ 3,6 mi · Lula: ... Confira o ranking completo.",
    url: "https://electiolab.com/quanto-custa-campanha-eleitoral-google-ads-meta",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

async function getTopSpenders() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb
    .from("digital_ads")
    .select(
      "platform, spend_lower, spend_upper, page_name, candidate:candidates(name, slug, party, color)"
    )
    .order("spend_upper", { ascending: false })
    .limit(15);
  return ((data ?? []) as unknown as Array<{
    platform: string;
    spend_lower: number;
    spend_upper: number;
    page_name: string;
    candidate:
      | { name: string; slug: string; party: string | null; color: string | null }[]
      | { name: string; slug: string; party: string | null; color: string | null }
      | null;
  }>).map((r) => ({
    platform: r.platform,
    spend: Math.max(r.spend_upper ?? 0, r.spend_lower ?? 0),
    page_name: r.page_name,
    candidate: Array.isArray(r.candidate) ? r.candidate[0] : r.candidate,
  }));
}

const FAQS = [
  {
    q: "Quanto Bolsonaro gastou em Google Ads em 2022?",
    a: "Pelos dados oficiais do Google Ads Transparency Center, a candidatura presidencial de Jair Bolsonaro em 2022 declarou R$ 28,6 milhões em propaganda no Google Ads (Search + YouTube + Display), distribuídos em 1.067 criativos. Foi o maior orçamento de Google Ads da disputa.",
  },
  {
    q: "Lula ou Bolsonaro gastou mais em propaganda digital em 2022?",
    a: "No Google Ads, Bolsonaro liderou com folga (R$ 28,6 mi vs valores não disponíveis pra Lula no banco oficial). No Meta (Facebook + Instagram), os valores eram comparáveis em milhões. Os dados completos estão em /candidato/[nome].",
  },
  {
    q: "Como descobrir quanto um candidato gastou em ads digitais?",
    a: "O Google publica todos os anúncios políticos no Transparency Center (adstransparency.google.com), e a Meta no Ad Library. O ElectioLab agrega ambas as fontes em /candidato/[slug] na seção 'Propaganda digital', com totais cross-platform e breakdown por plataforma.",
  },
  {
    q: "Os candidatos podem usar Google Ads em campanha eleitoral 2026?",
    a: "Sim. A propaganda paga no Google e Meta é permitida durante o período oficial de campanha (geralmente agosto-outubro do ano eleitoral). Toda propaganda política precisa ser declarada e o anunciante verificado. TikTok proíbe ads políticos no Brasil desde 2019.",
  },
  {
    q: "Qual a diferença entre Meta Ad Library e Google Transparency Center?",
    a: "Meta (Ad Library) mostra spend em ranges (R$ 100-499) e impressões em ranges. Google (Transparency Center) mostra valor exato em BRL gasto por anunciante. Ambos disponibilizam dados publicamente sem necessidade de cadastro.",
  },
];

function fmt(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

export default async function CustoAdsPage() {
  const top = await getTopSpenders();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline:
          "Quanto custa uma campanha eleitoral em Google Ads e Meta?",
        description:
          "Levantamento dos gastos de campanhas brasileiras em propaganda digital com base no Google Ads Transparency Center e Meta Ad Library.",
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
          { "@type": "ListItem", position: 2, name: "Análises" },
          { "@type": "ListItem", position: 3, name: "Custo de campanha eleitoral em ads" },
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
            <Megaphone className="h-3.5 w-3.5" />
            <span>Análise · Propaganda digital</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Quanto custa uma campanha eleitoral em Google Ads e Meta?
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-6">
            Em 2022, Jair Bolsonaro declarou <strong className="text-foreground">R$ 28,6 milhões</strong>{" "}
            em propaganda no Google Ads (Search + YouTube + Display). O ElectioLab agrega
            esses dados oficiais com a Meta Ad Library, mostrando quanto cada candidato
            gastou em propaganda digital. Para 2026, o sistema vai capturar automaticamente
            assim que o período oficial de campanha começar (ago-out/2026).
          </p>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Top gastadores em ads digitais (histórico)</h2>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {top.slice(0, 10).map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center px-4 py-3 text-sm border-b border-border/30 last:border-0 ${
                    i % 2 ? "bg-muted/15" : ""
                  }`}
                >
                  <span className="w-8 font-mono tabular-nums text-muted-foreground">
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {r.candidate?.slug ? (
                      <Link
                        href={`/candidato/${r.candidate.slug}`}
                        className="font-semibold hover:text-primary hover:underline truncate"
                      >
                        {r.candidate.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{r.page_name}</span>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {r.platform === "google" ? "Google Ads" : "Meta (FB+IG)"}
                    </p>
                  </div>
                  <span
                    className="font-mono font-bold tabular-nums"
                    style={{ color: r.candidate?.color ?? undefined }}
                  >
                    {fmt(r.spend)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Fonte: Google Ads Transparency Center + Meta Ad Library. Dados oficiais publicados
              pelas plataformas.
            </p>
          </section>

          <section>
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
        <LeiaTabem current="/quanto-custa-campanha-eleitoral-google-ads-meta" />
        </article>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Dados oficiais Google Ads Transparency + Meta Ad Library
        </div>
      </footer>
    </div>
  );
}
