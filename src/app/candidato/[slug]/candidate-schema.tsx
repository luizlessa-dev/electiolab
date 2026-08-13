import type { getCandidateBySlug } from "@/lib/queries";

type CandidateWithRelations = NonNullable<Awaited<ReturnType<typeof getCandidateBySlug>>>;

interface CandidateSchemaProps {
  candidate: CandidateWithRelations;
  latestPollPercentage?: number;
}

export function CandidateSchema({ candidate, latestPollPercentage }: CandidateSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `https://electiolab.com/candidato/${candidate.slug}#person`,
        name: candidate.name,
        image: candidate.photo_url || undefined,
        birthDate: candidate.birth_date || undefined,
        jobTitle: "Political Candidate",
        affiliation: {
          "@type": "Organization",
          name: candidate.party || undefined,
        },
      },
      {
        "@type": "CreativeWork",
        "@id": `https://electiolab.com/candidato/${candidate.slug}#creative`,
        name: `${candidate.name} — Pesquisas Eleitorais 2026`,
        description: `Pesquisas e intenção de voto de ${candidate.name}${candidate.party ? ` (${candidate.party})` : ""} nas eleições 2026`,
        about: {
          "@type": "Person",
          "@id": `https://electiolab.com/candidato/${candidate.slug}#person`,
        },
        ...(latestPollPercentage && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: latestPollPercentage.toFixed(1),
            bestRating: 100,
            worstRating: 0,
            ratingCount: 1,
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
