import type { Metadata } from "next";
import { getHistoricElectionData } from "@/lib/queries/historic-elections";
import { HistoricElectionPage, buildJsonLd } from "@/components/historic-election/page-template";

export const revalidate = 86400; // 24h

export const metadata: Metadata = {
  title: "Eleição de 2022 — Resultados, Eleitos e Mais Votados | ElectioLab",
  description:
    "Resultados oficiais da eleição de 2022: governadores, senadores e deputados federais eleitos por estado, com votação total e perfil de cada candidato.",
  alternates: { canonical: "https://electiolab.com/eleicao-2022" },
  openGraph: {
    title: "Eleição de 2022 — Resultados Completos",
    description: "Governadores, senadores e deputados eleitos em 2022 com dados oficiais do TSE.",
    url: "https://electiolab.com/eleicao-2022",
    type: "article",
    images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
  },
};

export default async function Page() {
  const data = await getHistoricElectionData(2022);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(2022, data.electedCount)) }}
      />
      <HistoricElectionPage data={data} />
    </>
  );
}
