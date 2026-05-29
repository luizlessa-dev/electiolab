import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, MapPin, Wallet, Home as HomeIcon, TrendingUp } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { slugToParty, partyMatchesSlug, partyColor } from "@/lib/party-utils";

export const revalidate = 3600;

type Candidate = {
  id: string;
  name: string;
  slug: string;
  party: string | null;
  color: string | null;
  current_position: string | null;
  election: { type: string; state: string | null; name: string } | null;
};

type PartyData = {
  party: string;
  candidates: Candidate[];
  byType: Record<string, Candidate[]>; // 'presidente' | 'governador' | 'senador'
  totalAssets: number;
  totalFefc: number;
  fefcCount: number;
  assetCount: number;
};

async function getParty(slug: string): Promise<PartyData | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const partyLabel = slugToParty(slug);
  if (!partyLabel) return null;

  // Busca candidatos por nome de partido (algumas variações: "União Brasil" pode vir como "UB" também)
  // Tenta primeiro o label canônico
  const { data: rawCandidates } = await sb
    .from("candidates")
    .select("id, name, slug, party, color, current_position, election:elections(type, state, name, year)")
    .eq("is_active", true);

  const candidates = ((rawCandidates ?? []) as unknown as Array<
    Candidate & { election: { type: string; state: string | null; name: string; year: number }[] | { type: string; state: string | null; name: string; year: number } | null }
  >)
    .filter((c) => partyMatchesSlug(c.party, slug))
    .map((c) => ({
      ...c,
      election: Array.isArray(c.election) ? c.election[0] : c.election,
    }))
    .filter((c) => c.election?.year === undefined || (c.election as { year?: number } | null)?.year === 2026);

  if (candidates.length === 0) return null;

  // Agregados de patrimônio + FEFC
  const ids = candidates.map((c) => c.id);
  const [{ data: assets }, { data: fefc }] = await Promise.all([
    sb.from("candidate_assets").select("candidate_id, value_brl").in("candidate_id", ids),
    sb.from("candidate_fefc").select("candidate_id, amount_received").in("candidate_id", ids),
  ]);

  const totalAssets = (assets ?? []).reduce((s, a) => s + Number(a.value_brl ?? 0), 0);
  const assetCount = new Set((assets ?? []).map((a) => a.candidate_id)).size;
  const totalFefc = (fefc ?? []).reduce((s, f) => s + Number(f.amount_received ?? 0), 0);
  const fefcCount = new Set((fefc ?? []).map((f) => f.candidate_id)).size;

  const byType: Record<string, Candidate[]> = {};
  for (const c of candidates) {
    const t = c.election?.type ?? "outros";
    (byType[t] ||= []).push(c);
  }

  return {
    party: partyLabel,
    candidates,
    byType,
    totalAssets,
    totalFefc,
    fefcCount,
    assetCount,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getParty(slug);
  if (!data) return { title: "Partido não encontrado" };

  const title = `${data.party} — Candidatos, FEFC e Patrimônio 2026`;
  const description = `${data.candidates.length} candidatos do ${data.party} nas eleições 2026: presidente, governador e senador. Total FEFC recebido R$ ${(data.totalFefc / 1_000_000).toFixed(1)} mi. Patrimônio agregado declarado R$ ${(data.totalAssets / 1_000_000).toFixed(1)} mi.`;
  return {
    title,
    description,
    alternates: { canonical: `https://electiolab.com/partido/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://electiolab.com/partido/${slug}`,
      images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

function fmt(v: number): string {
  if (v >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(2)} bi`;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

const TYPE_LABEL: Record<string, string> = {
  presidente: "Presidência",
  governador: "Governadores",
  senador: "Senadores",
};

export default async function PartidoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getParty(slug);
  if (!data) notFound();

  const color = partyColor(slug);

  const partyUrl = `https://electiolab.com/partido/${slug}`;
  const dateModified = new Date().toISOString().slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${partyUrl}#article`,
        url: partyUrl,
        mainEntityOfPage: partyUrl,
        headline: `${data.party} — Candidatos, FEFC e Patrimônio nas Eleições 2026`,
        description: `Análise consolidada do partido ${data.party} nas eleições brasileiras de 2026. ${data.candidates.length} candidatos ativos.`,
        author: { "@id": "https://electiolab.com/sobre#founder" },
        publisher: { "@id": "https://electiolab.com/#organization" },
        datePublished: "2026-04-30",
        dateModified,
        inLanguage: "pt-BR",
      },
      {
        // PoliticalParty é subtype de Organization — compatível com todos os parsers
        "@type": ["PoliticalParty", "Organization"],
        "@id": `${partyUrl}#party`,
        name: data.party,
        alternateName: slug.toUpperCase().replace(/-/g, " "),
        url: partyUrl,
        numberOfEmployees: { "@type": "QuantitativeValue", value: data.candidates.length },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${partyUrl}#breadcrumb`,
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
            name: "Partidos",
            item: "https://electiolab.com/candidatos",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: data.party,
            item: partyUrl,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            <span>ElectioLab</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <section>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            <Users className="h-3.5 w-3.5" />
            <span>Partido político · Eleições 2026</span>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ backgroundColor: color }}
            >
              {data.party.slice(0, 4).replace(/\s/g, "")}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{data.party}</h1>
              <p className="text-sm text-muted-foreground">{data.candidates.length} candidatos nas eleições 2026</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
              <Users className="h-3.5 w-3.5" /> Candidatos
            </div>
            <p className="text-3xl font-mono font-bold tabular-nums">{data.candidates.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
              <Wallet className="h-3.5 w-3.5" /> FEFC recebido
            </div>
            <p className="text-3xl font-mono font-bold tabular-nums">{fmt(data.totalFefc)}</p>
            <p className="text-[10px] text-muted-foreground">{data.fefcCount} candidatos · 2018+2022</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
              <HomeIcon className="h-3.5 w-3.5" /> Patrimônio total
            </div>
            <p className="text-3xl font-mono font-bold tabular-nums">{fmt(data.totalAssets)}</p>
            <p className="text-[10px] text-muted-foreground">{data.assetCount} candidatos com bens declarados</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
              <MapPin className="h-3.5 w-3.5" /> Estados
            </div>
            <p className="text-3xl font-mono font-bold tabular-nums">
              {new Set(data.candidates.map((c) => c.election?.state).filter(Boolean)).size}
            </p>
            <p className="text-[10px] text-muted-foreground">UFs com candidatos</p>
          </div>
        </section>

        {/* Candidatos por cargo */}
        {Object.entries(data.byType)
          .sort(([a], [b]) => {
            const order = ["presidente", "governador", "senador"];
            return order.indexOf(a) - order.indexOf(b);
          })
          .map(([type, list]) => (
            <section key={type}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-xl font-bold">
                  {TYPE_LABEL[type] ?? type} <span className="text-sm font-normal text-muted-foreground">· {list.length}</span>
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {list
                  .sort((a, b) => (a.election?.state ?? "").localeCompare(b.election?.state ?? ""))
                  .map((c) => (
                    <Link
                      key={c.id}
                      href={`/candidato/${c.slug}`}
                      className="rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors block"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        {c.election?.state && (
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {c.election.state}
                          </span>
                        )}
                      </div>
                      {c.current_position && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{c.current_position}</p>
                      )}
                    </Link>
                  ))}
              </div>
            </section>
          ))}

        <section className="rounded-lg border border-border bg-muted/20 p-6">
          <h2 className="text-base font-bold mb-2">Sobre os dados deste partido</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            Os <strong>candidatos 2026</strong> incluem apenas aqueles testados em pesquisas dos institutos
            cobertos pelo ElectioLab. Os <strong>valores FEFC e patrimônio</strong> são agregados das eleições
            anteriores (2018 e 2022) registradas no TSE — refletem o histórico financeiro dos políticos do
            partido, não captação 2026 (ainda não disponível).
          </p>
          <p className="text-xs text-muted-foreground">
            Fonte: TSE Dados Abertos · ElectioLab agrega e calcula.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Dados oficiais TSE
        </div>
      </footer>
    </div>
  );
}
