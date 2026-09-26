import type { Metadata } from "next";
import { getHistoricElectionData } from "@/lib/queries/historic-elections";
import { HistoricElectionPage, buildJsonLd } from "@/components/historic-election/page-template";

// force-dynamic: mesma causa do timeout de build das páginas /[uf] (ver
// esse diretório) — esta página chama getHistoricElectionData(2018) SEM
// filtro de estado, ou seja, pagina ~1.03M linhas de prior_election_results
// inteiras a cada build. Achado ao investigar o timeout original: teria o
// mesmo risco de estourar o statement_timeout no build, só que não tinha
// aparecido ainda no log porque o build já parava antes, na primeira
// página de UF que falhava. Sem generateStaticParams (rota sem segmento
// dinâmico), a única forma de tirar isso do build é marcar como dinâmica.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Eleição 2018 — Resultados Completos do TSE",
  description:
    "Resultados oficiais 2018: governadores, senadores e deputados eleitos por estado, com votação total e perfil de cada candidato.",
  alternates: { canonical: "https://electiolab.com/eleicao-2018" },
  openGraph: {
    title: "Eleição de 2018 — Resultados Completos",
    description: "Governadores, senadores e deputados eleitos em 2018 com dados oficiais do TSE.",
    url: "https://electiolab.com/eleicao-2018",
    type: "article",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

export default async function Page() {
  const data = await getHistoricElectionData(2018);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(2018, data.electedCount)) }}
      />
      <HistoricElectionPage data={data} />
    </>
  );
}
