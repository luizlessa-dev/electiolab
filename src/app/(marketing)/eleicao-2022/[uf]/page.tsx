import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHistoricElectionData } from "@/lib/queries/historic-elections";
import { HistoricElectionPage, buildJsonLd, UF_NAMES } from "@/components/historic-election/page-template";

export const revalidate = 86400; // 24h
export const dynamicParams = true;

// generateStaticParams vazio de propósito: mesma causa do timeout de build
// da página /eleicao-2018 — ver src/app/(marketing)/eleicao-2018/[uf]/page.tsx
// e a migration idx_prior_election_results_year_round_state. year=2022 tem
// ~1.85M linhas em prior_election_results, sem índice pra (year, round,
// state); pré-renderizar as 27 UFs no build também estourava o
// statement_timeout. Cada UF agora gera sob demanda e fica em cache (ISR).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  const ufUpper = uf.toUpperCase();
  const stateName = UF_NAMES[ufUpper];
  if (!stateName) return {};
  return {
    title: `Eleição 2022 em ${stateName} — Resultados Oficiais`,
    description: `Resultados oficiais 2022 em ${stateName}: governador, senadores e deputados eleitos com votação total.`,
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
