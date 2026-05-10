import Link from "next/link";
import { ArrowLeft, Trophy, MapPin, Users } from "lucide-react";
import {
  HISTORIC_OFFICE_LABELS,
  formatVotes,
  statusLabel,
  type HistoricElectionData,
  type HistoricResult,
} from "@/lib/queries/historic-elections";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
// Ordem editorial dos cargos
const OFFICE_ORDER = ["governador", "senador", "deputado_federal", "deputado_estadual", "deputado_distrital"];
const TOP_PER_STATE_OVERVIEW = 5;
const TOP_PER_STATE_DRILLDOWN = 25;

export const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MG: "Minas Gerais", MS: "Mato Grosso do Sul", MT: "Mato Grosso", PA: "Pará",
  PB: "Paraíba", PE: "Pernambuco", PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul",
  SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

function ResultRow({ r }: { r: HistoricResult }) {
  const isElected = r.result_status === "eleito";
  return (
    <Link
      href={`/candidato/${r.candidate_slug}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition hover:border-primary/50 hover:bg-accent"
    >
      <div className="flex min-w-0 items-center gap-3">
        {isElected ? (
          <Trophy className="h-4 w-4 shrink-0 text-amber-500" aria-label="Eleito" />
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate font-medium">{r.candidate_name}</span>
        {r.party && <span className="text-xs text-muted-foreground">{r.party}</span>}
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">{statusLabel(r.result_status)}</span>
        <span className="font-mono tabular-nums">{formatVotes(r.total_votes)} votos</span>
      </div>
    </Link>
  );
}

function OfficeSection({
  office,
  byState,
  drilldown = false,
}: {
  office: string;
  byState: Record<string, HistoricResult[]>;
  drilldown?: boolean;
}) {
  const label = HISTORIC_OFFICE_LABELS[office] ?? office;
  const states = Object.keys(byState).sort();
  if (!states.length) return null;
  const limit = drilldown ? TOP_PER_STATE_DRILLDOWN : TOP_PER_STATE_OVERVIEW;

  return (
    <section id={office} className="scroll-mt-20 space-y-6">
      <div className="border-b border-border pb-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Users className="h-5 w-5 text-primary" />
          {label}
        </h2>
        {!drilldown && (
          <p className="mt-1 text-sm text-muted-foreground">
            {states.length} {states.length === 1 ? "unidade federativa" : "unidades federativas"} com candidatos registados.
          </p>
        )}
      </div>

      <div className={drilldown ? "space-y-1.5" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
        {drilldown
          ? byState[states[0]].slice(0, limit).map((r) => (
              <ResultRow key={`${r.candidate_id}-${r.state}`} r={r} />
            ))
          : states.map((uf) => {
              const top = byState[uf].slice(0, limit);
              return (
                <div key={uf} className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {uf}
                  </h3>
                  <div className="space-y-1.5">
                    {top.map((r) => (
                      <ResultRow key={`${r.candidate_id}-${r.state}`} r={r} />
                    ))}
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
}

export function HistoricElectionPage({ data, state }: { data: HistoricElectionData; state?: string }) {
  const offices = OFFICE_ORDER.filter((o) => data.byOffice[o]?.length);
  const totalCandidates = Object.values(data.byOffice).reduce((acc, arr) => acc + arr.length, 0);
  const isDrilldown = Boolean(state);
  const stateName = state ? UF_NAMES[state] ?? state : null;

  return (
    <div className="container mx-auto max-w-6xl space-y-12 px-4 py-12">
      <Link
        href={state ? `/eleicao-${data.year}` : "/"}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {state ? `Voltar para Eleição ${data.year}` : "Voltar ao início"}
      </Link>

      <header className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {isDrilldown
            ? `Eleição de ${data.year} em ${stateName}`
            : `Eleição de ${data.year} — Resultados Completos`}
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          {isDrilldown ? (
            <>
              Resultados oficiais da eleição de <strong>{data.year}</strong> em{" "}
              <strong>{stateName} ({state})</strong>: governador, senadores, deputados federais e estaduais —
              dados do <strong>TSE</strong>. {totalCandidates.toLocaleString("pt-BR")} candidatos com perfil ativo
              em nossa base.
            </>
          ) : (
            <>
              Governadores, senadores e deputados eleitos em <strong>{data.year}</strong>, com base em dados oficiais do{" "}
              <strong>Tribunal Superior Eleitoral (TSE)</strong>. {totalCandidates.toLocaleString("pt-BR")} candidatos
              registados, <strong>{data.electedCount.toLocaleString("pt-BR")} eleitos</strong>.
            </>
          )}
        </p>

        <nav aria-label="Cargos">
          <ul className="flex flex-wrap gap-2">
            {offices.map((o) => (
              <li key={o}>
                <a
                  href={`#${o}`}
                  className="rounded-full border border-border bg-card px-3 py-1 text-sm transition hover:border-primary/50 hover:bg-accent"
                >
                  {HISTORIC_OFFICE_LABELS[o] ?? o}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {!isDrilldown && (
          <nav aria-label="Drilldown por UF" className="pt-2">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Ver por estado</p>
            <ul className="flex flex-wrap gap-1.5">
              {UFS.map((uf) => (
                <li key={uf}>
                  <Link
                    href={`/eleicao-${data.year}/${uf.toLowerCase()}`}
                    className="rounded border border-border bg-card px-2 py-1 text-xs font-mono uppercase transition hover:border-primary/50 hover:bg-accent"
                  >
                    {uf}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {offices.map((office) => (
        <OfficeSection
          key={office}
          office={office}
          byState={data.byOfficeAndState[office] ?? {}}
          drilldown={isDrilldown}
        />
      ))}

      <footer className="space-y-4 border-t border-border pt-8 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Sobre estes dados</h2>
        <p>
          Os resultados acima vêm dos <em>datasets</em> oficiais{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">votacao_candidato_munzona_{data.year}</code> e{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">consulta_cand_{data.year}</code> do TSE,
          ingeridos no ElectioLab via <em>parser</em> em <em>streaming</em>. Os votos exibidos são a soma da
          votação nominal por município, no <strong>1º turno</strong>. O status (eleito, suplente, etc.)
          reflete o resultado final do pleito após apuração total.
        </p>
        <p>
          Apenas candidatos com perfil ativo na nossa base aparecem listados — concorrentes que não estavam
          em nenhuma eleição posterior podem estar omitidos. Para ver o histórico individual completo,{" "}
          abra o perfil do candidato.
        </p>
      </footer>
    </div>
  );
}

export function buildJsonLd(year: number, electedCount: number, state?: string) {
  const stateName = state ? UF_NAMES[state] ?? state : null;
  const url = state
    ? `https://electiolab.com/eleicao-${year}/${state.toLowerCase()}`
    : `https://electiolab.com/eleicao-${year}`;
  const headline = state
    ? `Eleição de ${year} em ${stateName} — Resultados Oficiais`
    : `Eleição de ${year} — Resultados, Eleitos e Mais Votados`;
  const description = state
    ? `Resultados oficiais da eleição de ${year} em ${stateName} (${state}): governador, senadores, deputados federais e estaduais com perfil de cada candidato.`
    : `Resultados oficiais da eleição de ${year}: governadores, senadores e deputados eleitos por estado, com votação total e perfil de cada candidato. ${electedCount} eleitos cobertos.`;

  const breadcrumbs: Array<{ "@type": "ListItem"; position: number; name: string; item: string }> = [
    { "@type": "ListItem", position: 1, name: "Início", item: "https://electiolab.com/" },
    { "@type": "ListItem", position: 2, name: `Eleição ${year}`, item: `https://electiolab.com/eleicao-${year}` },
  ];
  if (state) {
    breadcrumbs.push({ "@type": "ListItem", position: 3, name: stateName!, item: url });
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline,
        description,
        author: { "@type": "Organization", name: "ElectioLab" },
        publisher: { "@type": "Organization", name: "ElectioLab", url: "https://electiolab.com" },
        url,
        datePublished: `${year}-10-01`,
        dateModified: new Date().toISOString().slice(0, 10),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs,
      },
    ],
  };
}
