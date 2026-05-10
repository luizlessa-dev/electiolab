import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHistoricElectionData } from "@/lib/queries/historic-elections";
import { HistoricElectionPage, buildJsonLd, UF_NAMES } from "@/components/historic-election/page-template";

export const revalidate = 86400; // 24h
export const dynamicParams = false;

const UFS = ["ac","al","am","ap","ba","ce","df","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to"];

export async function generateStaticParams() {
  return UFS.map((uf) => ({ uf }));
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  const ufUpper = uf.toUpperCase();
  const stateName = UF_NAMES[ufUpper];
  if (!stateName) return {};
  return {
    title: `Eleição de 2022 em ${stateName} — Resultados Oficiais | ElectioLab`,
    description: `Resultados oficiais da eleição de 2022 em ${stateName} (${ufUpper}): governador, senadores, deputados federais com votação total e perfil de cada candidato.`,
    alternates: { canonical: `https://electiolab.com/eleicao-2022/${uf}` },
    openGraph: {
      title: `Eleição de 2022 em ${stateName}`,
      description: `Governador, senadores e deputados eleitos em ${stateName} em 2022 com dados oficiais do TSE.`,
      url: `https://electiolab.com/eleicao-2022/${uf}`,
      type: "article",
      images: [{ url: "https://electiolab.com/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const ufUpper = uf.toUpperCase();
  if (!UF_NAMES[ufUpper]) notFound();
  const data = await getHistoricElectionData(2022, ufUpper);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(2022, data.electedCount, ufUpper)) }}
      />
      <HistoricElectionPage data={data} state={ufUpper} />
    </>
  );
}
