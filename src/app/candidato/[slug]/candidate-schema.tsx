import type { getCandidateBySlug } from "@/lib/queries";

type CandidateWithRelations = NonNullable<Awaited<ReturnType<typeof getCandidateBySlug>>>;

interface CandidateSchemaProps {
  candidate: CandidateWithRelations;
  latestPollPercentage?: number;
}

export function CandidateSchema({ candidate, latestPollPercentage }: CandidateSchemaProps) {
  // O nó Person já existe no <script> de page.tsx (mesmo @id) — não duplicar
  // aqui com dado pior (jobTitle hardcoded em inglês, sem description/url).
  // @id cruzando os dois <script type="application/ld+json"> da mesma página
  // resolve normalmente (mesmo padrão usado em instituto/[slug] pra @id
  // cross-page, ex.: author referenciando /sobre#founder).
  //
  // % de pesquisa vai como additionalProperty/PropertyValue, não
  // AggregateRating: não é avaliação de usuário, e rating auto-atribuído
  // viola as diretrizes de structured data do Google (mesmo motivo já
  // documentado em instituto/[slug]/page.tsx).
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `https://electiolab.com/candidato/${candidate.slug}#creative`,
        name: `${candidate.name} — Pesquisas Eleitorais 2026`,
        description: `Pesquisas e intenção de voto de ${candidate.name}${candidate.party ? ` (${candidate.party})` : ""} nas eleições 2026`,
        about: {
          "@type": "Person",
          "@id": `https://electiolab.com/candidato/${candidate.slug}#person`,
        },
        ...(latestPollPercentage != null && {
          additionalProperty: {
            "@type": "PropertyValue",
            name: "Intenção de voto — pesquisa mais recente",
            value: latestPollPercentage,
            unitText: "PERCENT",
            minValue: 0,
            maxValue: 100,
          },
        }),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
