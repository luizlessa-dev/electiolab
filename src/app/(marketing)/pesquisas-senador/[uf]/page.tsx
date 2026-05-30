import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BarChart3, Landmark, Users, TrendingUp } from "lucide-react";
import { UF_NAMES } from "@/components/historic-election/page-template";
import { getLatestSenatorPoll } from "@/lib/marketing-data";
import { StatePollSnapshotCard } from "@/components/state-poll-snapshot";

export const revalidate = 3600;
export const dynamicParams = false;

// Grandes colégios eleitorais — onde há pesquisa de senado indexada
const UFS = ["sp", "mg", "rj", "ba", "rs", "pr", "pe", "ce"] as const;
type UF = (typeof UFS)[number];

export function generateStaticParams() {
  return UFS.map((uf) => ({ uf }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uf: UF }>;
}): Promise<Metadata> {
  const { uf } = await params;
  const stateName = UF_NAMES[uf.toUpperCase()];
  if (!stateName) return {};

  const title = `Pesquisas Senador ${uf.toUpperCase()} 2026 — ${stateName} | ElectioLab`;
  const description =
    `Pesquisas de intenção de voto para o Senado em ${stateName} nas eleições 2026. ` +
    `Candidatos, média das pesquisas e dados dos institutos registrados no TSE.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `https://electiolab.com/pesquisas-senador/${uf}` },
    openGraph: {
      title,
      description,
      url: `https://electiolab.com/pesquisas-senador/${uf}`,
    },
  };
}

export default async function SenadorPage({ params }: { params: Promise<{ uf: UF }> }) {
  const { uf } = await params;
  const ufUpper = uf.toUpperCase();
  const stateName = UF_NAMES[ufUpper];
  if (!stateName) notFound();

  const snapshot = await getLatestSenatorPoll(ufUpper);
  const leader = snapshot?.results?.[0];

  const FAQ = [
    {
      q: `Quantas vagas ao Senado ${stateName} elege em 2026?`,
      a: `Em 2026 cada estado elege 1 vaga ao Senado (renovação de 1/3). ${stateName}, como todas as unidades da federação, terá uma cadeira em disputa, com mandato de 8 anos.`,
    },
    {
      q: `Quem lidera as pesquisas para o Senado em ${stateName}?`,
      a: leader
        ? `${leader.name}${leader.party ? ` (${leader.party})` : ""} aparece à frente na pesquisa mais recente indexada pelo ElectioLab (${snapshot?.institute_name}, ${snapshot?.publication_date}), com ${leader.pct.toFixed(1)}%. As pesquisas de Senado são menos frequentes que as de governador.`
        : `As pesquisas para o Senado em ${stateName} ainda são esparsas em 2026. O ElectioLab indexa cada nova pesquisa registrada no TSE assim que publicada.`,
    },
    {
      q: `Quando é a eleição para senador em ${stateName}?`,
      a: `A eleição ocorre em 4 de outubro de 2026 (turno único para o Senado), junto com as eleições para presidente, governador e deputados. Não há 2º turno para o Senado.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `https://electiolab.com/pesquisas-senador/${uf}#page`,
        url: `https://electiolab.com/pesquisas-senador/${uf}`,
        name: `Pesquisas Senador ${stateName} 2026`,
        description: `Pesquisas de intenção de voto para o Senado em ${stateName} nas eleições de 2026.`,
        inLanguage: "pt-BR",
        isPartOf: { "@id": "https://electiolab.com/#website" },
        dateModified: new Date().toISOString().slice(0, 10),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Eleições por estado", item: "https://electiolab.com/mapa" },
          { "@type": "ListItem", position: 3, name: `Senador ${stateName} 2026`, item: `https://electiolab.com/pesquisas-senador/${uf}` },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link href={`/eleicoes/${uf}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Eleições {ufUpper}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Hero */}
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5" />
            Senado · {stateName} · Eleições 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Pesquisas para Senador em {stateName} 2026
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            {stateName} elege 1 vaga ao Senado em 2026, em turno único. O ElectioLab agrega as
            pesquisas registradas no TSE e mostra a mais recente abaixo. Pesquisas de Senado são
            menos frequentes que as de governador — atualizamos assim que novas são publicadas.
          </p>
        </div>

        {/* Snapshot */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Última pesquisa indexada
          </h2>
          {snapshot ? (
            <StatePollSnapshotCard snapshot={snapshot} />
          ) : (
            <div className="border border-border rounded-lg p-5 text-sm text-muted-foreground">
              Nenhuma pesquisa de Senado para {stateName} indexada ainda. Quando institutos
              publicarem, ela aparecerá aqui automaticamente.
            </div>
          )}
          <p className="text-xs text-muted-foreground font-mono">
            Fonte: pesquisa mais recente indexada no ElectioLab · Atualiza a cada 1h
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Perguntas frequentes
          </h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <p className="font-semibold text-sm mb-2">{f.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Links */}
        <section className="border-t border-border pt-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">
            Explore {stateName} 2026
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { href: `/eleicoes-governador-${uf}-2026`, label: `Governador ${ufUpper} 2026`, desc: "Pesquisas e análise da corrida estadual", icon: TrendingUp },
              { href: `/eleicoes/${uf}`, label: `Hub eleitoral ${ufUpper}`, desc: "Governador, senador e histórico", icon: Landmark },
              { href: `/candidatos?estado=${uf}&cargo=senador`, label: "Candidatos a senador", desc: "Perfis com dados TSE", icon: Users },
              { href: "/pesquisas-presidenciais-2026", label: "Presidencial 2026", desc: "Média ponderada nacional", icon: BarChart3 },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="group border border-border rounded-lg px-4 py-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </section>

        {/* Outros estados */}
        <section className="border-t border-border pt-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            Senado em outros estados
          </p>
          <div className="flex flex-wrap gap-2">
            {UFS.filter((u) => u !== uf).map((u) => (
              <Link key={u} href={`/pesquisas-senador/${u}`} className="px-3 py-1.5 text-xs font-mono border border-border rounded-md hover:bg-muted/30 hover:text-primary transition-colors uppercase">
                {u}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-4xl mx-auto px-4 text-xs text-muted-foreground font-mono text-center">
          ElectioLab · Pesquisas de Senado {stateName} 2026 · Dados TSE
        </div>
      </footer>
    </div>
  );
}
