import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BarChart3, MapPin, Users, TrendingUp } from "lucide-react";
import { UF_NAMES } from "@/components/historic-election/page-template";
import {
  getLatestStateGovPoll,
  getLatestDeputadoFederalPoll,
  getLatestDeputadoEstadualPoll,
  getLatestDeputadoDistritalPoll,
  getStateRunoffScenarios,
  toRunoffTabs,
} from "@/lib/marketing-data";
import { StatePollSnapshotCard } from "@/components/state-poll-snapshot";
import { StateRunoffTabs } from "@/components/state-runoff-tabs";

export const revalidate = 3600;
export const dynamicParams = false;

const UFS = [
  "ac","al","am","ap","ba","ce","df","es","go","ma",
  "mg","ms","mt","pa","pb","pe","pi","pr","rj","rn",
  "ro","rr","rs","sc","se","sp","to",
] as const;

type UF = (typeof UFS)[number];

// Região de cada UF para contexto editorial
const UF_REGION: Record<string, string> = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MS: "Centro-Oeste", MT: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

// Cadeiras de deputado federal por UF (Lei Complementar 78/1993, distribuição vigente em 2026 — total 513)
const DEPUTADOS_FEDERAIS_POR_UF: Record<string, number> = {
  SP: 70, MG: 53, RJ: 46, BA: 39, RS: 31, PR: 30, PE: 25, CE: 22, MA: 18,
  GO: 17, PA: 17, SC: 16, PB: 12, ES: 10, PI: 10, AL: 9,
  AC: 8, AM: 8, AP: 8, DF: 8, MS: 8, MT: 8, RN: 8, RO: 8, RR: 8, SE: 8, TO: 8,
};

// Cadeiras de deputado estadual por UF (CF art. 27: 3x deputados federais até
// 12; acima disso, 36 + (federais - 12)). DF não tem deputado estadual — tem
// Câmara Legislativa (deputado distrital), fora desse mapa.
const DEPUTADOS_ESTADUAIS_POR_UF: Record<string, number> = {
  SP: 94, MG: 77, RJ: 70, BA: 63, RS: 55, PR: 54, PE: 49, CE: 46, MA: 42,
  GO: 41, PA: 41, SC: 40, PB: 36, ES: 30, PI: 30, AL: 27,
  AC: 24, AM: 24, AP: 24, MS: 24, MT: 24, RN: 24, RO: 24, RR: 24, SE: 24, TO: 24,
};

// Colégio eleitoral estimado 2026 (TSE fev/2026, em milhões)
const UF_ELEITORES: Record<string, string> = {
  SP: "35,8 mi", MG: "15,7 mi", RJ: "12,5 mi", BA: "10,3 mi", RS: "8,4 mi",
  PR: "8,2 mi", PE: "6,9 mi", CE: "6,6 mi", PA: "5,8 mi", SC: "5,5 mi",
  MA: "4,8 mi", GO: "4,7 mi", AM: "2,7 mi", ES: "2,9 mi", PB: "2,9 mi",
  RN: "2,5 mi", PI: "2,4 mi", MT: "2,5 mi", AL: "2,3 mi", MS: "1,9 mi",
  DF: "2,1 mi", RO: "1,2 mi", SE: "1,6 mi", TO: "1,1 mi", AC: "0,6 mi",
  AP: "0,6 mi", RR: "0,4 mi",
};

export function generateStaticParams() {
  return UFS.map((uf) => ({ uf }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uf: UF }>;
}): Promise<Metadata> {
  const { uf } = await params;
  const ufUpper = uf.toUpperCase();
  const stateName = UF_NAMES[ufUpper];
  if (!stateName) return {};

  // Título de HUB: lidera com "Eleições {estado}" e lista os cargos, deixando a
  // frase "Pesquisas Governador {UF}" para a página deep-dive (/eleicoes-governador-{uf}-2026),
  // evitando competir pela mesma keyword. Canonical permanece próprio (hub ≠ deep-dive).
  const title = `Eleições ${stateName} 2026 — Governador, Senador e Candidatos`;
  const description =
    `Acompanhe as pesquisas eleitorais para governador e senador de ${stateName} em 2026. ` +
    `Dados ao vivo, médias ponderadas e análise dos candidatos — ElectioLab.`;

  return {
    title,
    description,
    alternates: { canonical: `https://electiolab.com/eleicoes/${uf}` },
    openGraph: {
      title,
      description,
      url: `https://electiolab.com/eleicoes/${uf}`,
      // images: gerado automaticamente pela OG dinâmica co-localizada (opengraph-image.tsx)
    },
  };
}

export default async function EstadoPage({ params }: { params: Promise<{ uf: UF }> }) {
  const { uf } = await params;
  const ufUpper = uf.toUpperCase();
  const stateName = UF_NAMES[ufUpper];
  if (!stateName) notFound();

  const region = UF_REGION[ufUpper] ?? "";
  const eleitores = UF_ELEITORES[ufUpper] ?? "";

  const [govSnapshot, runoffScenarios, depFedSnapshot, depEstSnapshot, depDistSnapshot] = await Promise.all([
    getLatestStateGovPoll(ufUpper),
    getStateRunoffScenarios(ufUpper),
    getLatestDeputadoFederalPoll(ufUpper),
    ufUpper === "DF" ? Promise.resolve(null) : getLatestDeputadoEstadualPoll(ufUpper),
    ufUpper === "DF" ? getLatestDeputadoDistritalPoll(ufUpper) : Promise.resolve(null),
  ]);
  const runoffTabs = toRunoffTabs(runoffScenarios);

  const govUrl = `/eleicoes-governador-${uf}-2026`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `https://electiolab.com/eleicoes/${uf}#page`,
        url: `https://electiolab.com/eleicoes/${uf}`,
        name: `Eleições ${stateName} 2026 — Pesquisas Governador e Senador`,
        description: `Hub de pesquisas eleitorais de ${stateName} para as eleições de 2026.`,
        inLanguage: "pt-BR",
        isPartOf: { "@id": "https://electiolab.com/#website" },
        dateModified: new Date().toISOString().slice(0, 10),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Quem lidera as pesquisas para governador de ${stateName} em 2026?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: govSnapshot?.results?.[0]
                ? `${govSnapshot.results[0].name} (${govSnapshot.results[0].party ?? ""}) lidera as pesquisas para governador de ${stateName} em 2026 com ${govSnapshot.results[0].pct.toFixed(1)}% na pesquisa mais recente do ElectioLab (${govSnapshot.institute_name}, ${govSnapshot.publication_date}).`
                : `Acompanhe as pesquisas mais recentes para governador de ${stateName} 2026 no ElectioLab. Dados atualizados a cada nova pesquisa publicada.`,
            },
          },
          {
            "@type": "Question",
            name: `Quando são as eleições em ${stateName} em 2026?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `As eleições estaduais de 2026 em ${stateName} ocorrem em 4 de outubro de 2026 (1º turno) e, se necessário, 25 de outubro de 2026 (2º turno), simultaneamente às eleições presidenciais. ${stateName} elegerá governador, senador e deputados federais e estaduais.`,
            },
          },
          {
            "@type": "Question",
            name: `Quais institutos fazem pesquisas eleitorais em ${stateName}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Os principais institutos que realizam pesquisas eleitorais em ${stateName} em 2026 incluem Paraná Pesquisas, Quaest, Datafolha, AtlasIntel, Real Time Big Data, Veritá e outros registrados no TSE. O ElectioLab agrega todas as pesquisas publicadas e calcula uma média ponderada por recência, tamanho de amostra e acurácia histórica do instituto.`,
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
          { "@type": "ListItem", position: 2, name: "Eleições por estado", item: "https://electiolab.com/mapa" },
          { "@type": "ListItem", position: 3, name: `${stateName} 2026`, item: `https://electiolab.com/eleicoes/${uf}` },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="px-4 py-8 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/mapa"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <MapPin className="h-3 w-3" />
            Mapa eleitoral 2026
          </Link>

          <div className="flex items-start gap-4">
            {/* UF badge */}
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-primary">{ufUpper}</span>
            </div>

            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {region} · Eleições 2026
              </p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{stateName}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {eleitores} eleitores
                </span>
                <span>·</span>
                <span>Governador · Senador · Deputados</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-10">

          {/* Governador */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Governador 2026
              </h2>
              <Link
                href={govUrl}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Ver análise completa <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {govSnapshot ? (
              <StatePollSnapshotCard snapshot={govSnapshot} />
            ) : (
              <div className="border border-border rounded-lg p-5 text-sm text-muted-foreground">
                Nenhuma pesquisa para governador de {stateName} indexada ainda. Quando institutos
                publicarem pesquisas para este estado, elas aparecerão aqui automaticamente.
                <Link href={govUrl} className="ml-2 text-primary hover:underline">
                  Ver página do estado →
                </Link>
              </div>
            )}
          </section>

          {/* 2º turno — cenários testados (só aparece onde há head-to-head) */}
          {runoffTabs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                2º turno — cenários testados
              </h2>
              <StateRunoffTabs scenarios={runoffTabs} />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Cada aba é um confronto direto simulado pelos institutos. As percentuais não somam
                100% — o restante são indecisos, brancos e nulos, mostrado em cada aba. Cenários de
                2º turno para governador ainda têm poucas pesquisas; a atribuição (instituto e data)
                aparece em cada confronto.
              </p>
            </section>
          )}

          {/* Senador */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Senador 2026
            </h2>
            <div className="border border-border rounded-lg p-5 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {stateName} elegerá 2 senadores em 2026 — o eleitor vota em até dois nomes, e os
                dois mais votados são eleitos. 2026 é ano de renovação de dois terços do Senado
                (54 das 81 cadeiras); em 2022 apenas 1 vaga por estado esteve em disputa. Pesquisas
                para senador são menos frequentes que as para governador — os primeiros
                levantamentos costumam surgir a partir de março do ano eleitoral.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/candidatos?uf=${ufUpper}&type=senador`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/30 transition-colors"
                >
                  <Users className="h-3 w-3" />
                  Ver candidatos a senador de {ufUpper}
                </Link>
                <Link
                  href="/institutos"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/30 transition-colors"
                >
                  <BarChart3 className="h-3 w-3" />
                  Institutos que cobrem {stateName}
                </Link>
              </div>
            </div>
          </section>

          {/* Deputado Federal */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Deputado Federal 2026
            </h2>
            <div className="border border-border rounded-lg p-5 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {stateName} elege {DEPUTADOS_FEDERAIS_POR_UF[ufUpper] ?? "várias"} cadeiras de
                deputado federal em 2026, pelo sistema proporcional (quociente eleitoral) — não é
                um confronto de 2 ou 3 nomes como governador. Por isso, pesquisa nominal pra esse
                cargo é rara: a maioria dos institutos testa só governador e senador. Quando existe,
                costuma ser pesquisa <strong>espontânea</strong> (o entrevistado cita quem quiser,
                sem lista de opções) — os números ficam na casa de poucos % porque dezenas de
                candidatos dividem a atenção, o que não é comparável ao formato "líder a 40%" de
                governador.
              </p>
              {depFedSnapshot ? (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                    Candidatos mais citados espontaneamente
                  </p>
                  <StatePollSnapshotCard snapshot={depFedSnapshot} />
                </div>
              ) : (
                <div className="border border-border rounded-sm bg-card p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nenhuma pesquisa nominal de deputado federal indexada pra {stateName} ainda. O
                    ElectioLab atualiza assim que institutos publicarem.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/candidatos?uf=${ufUpper}&type=deputado_federal`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/30 transition-colors"
                >
                  <Users className="h-3 w-3" />
                  Ver candidatos a deputado federal de {ufUpper}
                </Link>
              </div>
            </div>
          </section>

          {/* Deputado Estadual (DF não tem — usa Câmara Legislativa/deputado distrital) */}
          {ufUpper !== "DF" && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Deputado Estadual 2026
              </h2>
              <div className="border border-border rounded-lg p-5 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stateName} elege {DEPUTADOS_ESTADUAIS_POR_UF[ufUpper] ?? "várias"} cadeiras na
                  Assembleia Legislativa em 2026 — ainda mais pulverizado que deputado federal, então
                  pesquisa nominal é raríssima. Quando existe, é espontânea e o primeiro colocado
                  costuma ficar na casa de 1-2%, dentro da margem de erro da amostra total — leia como
                  termômetro de quem está mais lembrado, não como projeção de resultado.
                </p>
                {depEstSnapshot ? (
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                      Candidatos mais citados espontaneamente
                    </p>
                    <StatePollSnapshotCard snapshot={depEstSnapshot} />
                  </div>
                ) : (
                  <div className="border border-border rounded-sm bg-card p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Nenhuma pesquisa nominal de deputado estadual indexada pra {stateName} ainda. O
                      ElectioLab atualiza assim que institutos publicarem.
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/candidatos?uf=${ufUpper}&type=deputado_estadual`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <Users className="h-3 w-3" />
                    Ver candidatos a deputado estadual de {ufUpper}
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Deputado Distrital (só existe no DF — Câmara Legislativa) */}
          {ufUpper === "DF" && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Deputado Distrital 2026
              </h2>
              <div className="border border-border rounded-lg p-5 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O Distrito Federal elege 24 cadeiras na Câmara Legislativa (CLDF) em 2026 — o
                  equivalente distrital à Assembleia Legislativa dos estados. Mesmo caveat do
                  deputado estadual: pesquisa nominal é rara e, quando existe, é espontânea — o
                  primeiro colocado costuma ficar na casa de poucos %, dentro da margem de erro da
                  amostra total.
                </p>
                {depDistSnapshot ? (
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                      Candidatos mais citados espontaneamente
                    </p>
                    <StatePollSnapshotCard snapshot={depDistSnapshot} />
                  </div>
                ) : (
                  <div className="border border-border rounded-sm bg-card p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Nenhuma pesquisa nominal de deputado distrital indexada ainda. O ElectioLab
                      atualiza assim que institutos publicarem.
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/candidatos?uf=DF&type=deputado_distrital`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <Users className="h-3 w-3" />
                    Ver candidatos a deputado distrital
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Links para outras disputas */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Outras disputas em {stateName}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  href: govUrl,
                  label: `Governador ${ufUpper} 2026`,
                  desc: "Análise completa + histórico de pesquisas",
                  icon: TrendingUp,
                },
                {
                  href: `/candidatos?uf=${ufUpper}`,
                  label: `Candidatos de ${stateName}`,
                  desc: "Perfis com dados TSE, patrimônio e FEFC",
                  icon: Users,
                },
                {
                  href: `/eleicao-2022/${uf}`,
                  label: `Resultado eleição 2022 — ${ufUpper}`,
                  desc: "Governador, senadores e deputados eleitos",
                  icon: BarChart3,
                },
                {
                  href: `/eleicao-2018/${uf}`,
                  label: `Resultado eleição 2018 — ${ufUpper}`,
                  desc: "Histórico completo com votação oficial",
                  icon: BarChart3,
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group border border-border rounded-lg px-4 py-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </section>

          {/* Presidencial */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Presidencial 2026 — impacto em {stateName}
            </h2>
            <div className="bg-muted/20 border border-border rounded-lg p-5 text-sm text-muted-foreground space-y-3 leading-relaxed">
              <p>
                O voto presidencial em {stateName} tem impacto{" "}
                {["SP", "MG", "RJ", "BA", "RS"].includes(ufUpper) ? (
                  <strong className="text-foreground">decisivo</strong>
                ) : (
                  <strong className="text-foreground">relevante</strong>
                )}{" "}
                no resultado nacional — o estado concentra {eleitores || "significativo número de"}{" "}
                eleitores.
              </p>
              <Link
                href="/pesquisas-presidenciais-2026"
                className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
              >
                Ver médias presidenciais ao vivo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          {/* Todos os estados */}
          <section className="border-t border-border pt-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
              Outros estados
            </p>
            <div className="flex flex-wrap gap-2">
              {UFS.filter((u) => u !== uf).map((u) => (
                <Link
                  key={u}
                  href={`/eleicoes/${u}`}
                  className="px-3 py-1.5 text-xs font-mono border border-border rounded-md hover:bg-muted/30 hover:text-primary transition-colors uppercase"
                >
                  {u}
                </Link>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
