import { UF_NAMES } from "@/components/historic-election/page-template";
import type { StatePollSnapshot } from "@/lib/marketing-data";

const ORG = "https://electiolab.com/#organization";

/**
 * Dataset (Schema.org) JSON-LD para páginas de cauda longa de cargo estadual
 * (governador / senador). Expõe a média de pesquisas por UF como dataset
 * citável por AI Overviews, ChatGPT e Perplexity.
 *
 * Os números ao vivo ficam no HTML (StatePollSnapshotCard); este schema dá a
 * camada estrutural — proveniência (TSE), licença (CC BY 4.0), cobertura
 * temporal/espacial e o endpoint de distribuição (API pública).
 */
export function buildStateRaceDataset(opts: {
  uf: string; // "SP" ou "sp"
  race: "governador" | "senador";
  url: string; // canonical absoluto da página
  snapshot: StatePollSnapshot | null;
}): Record<string, unknown> {
  const ufUpper = opts.uf.toUpperCase();
  const stateName = UF_NAMES[ufUpper] ?? ufUpper;
  const cargo = opts.race === "governador" ? "Governador" : "Senador";

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Pesquisas para ${cargo} de ${stateName} 2026`,
    description:
      `Média ponderada das pesquisas de intenção de voto para ${cargo.toLowerCase()} de ` +
      `${stateName} nas eleições de 2026, agregadas pelo ElectioLab a partir de pesquisas ` +
      `registradas no TSE. Ponderação por recência, amostra, metodologia e acurácia do instituto.`,
    url: opts.url,
    isAccessibleForFree: true,
    inLanguage: "pt-BR",
    creator: { "@id": ORG },
    publisher: { "@id": ORG },
    license: "https://creativecommons.org/licenses/by/4.0/",
    temporalCoverage: "2026",
    spatialCoverage: {
      "@type": "Place",
      name: stateName,
      containedInPlace: { "@type": "Country", name: "Brasil" },
    },
    variableMeasured: {
      "@type": "PropertyValue",
      name: "Intenção de voto",
      unitText: "PERCENT",
    },
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: "https://electiolab.com/api/v1/averages",
      },
    ],
    ...(opts.snapshot?.publication_date
      ? { dateModified: opts.snapshot.publication_date }
      : {}),
    ...(opts.snapshot?.institute_name
      ? { citation: `Pesquisa mais recente indexada: ${opts.snapshot.institute_name}` }
      : {}),
  };
}
