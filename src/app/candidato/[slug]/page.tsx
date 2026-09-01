import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCandidateBySlug, getCandidateElections } from "@/lib/queries";
import { CandidateView } from "./candidate-view";

/**
 * 7 dias. O conteúdo destas páginas é cadastro TSE: 19,5k das ~19,9k não têm
 * nenhuma pesquisa vinculada e não mudam de um mês para o outro. Com TTL de 1h,
 * cada passagem de crawler pelas 19,4k URLs do sitemap disparava uma
 * regeneração por página — foi o que produziu o pico de invocações de 31/08.
 *
 * Frescor não depende mais do TTL: POST /api/revalidate?path=/candidato/<slug>
 * regenera na hora quando entra pesquisa ou dado novo.
 */
export const revalidate = 604800; // 7d ISR — gera sob demanda na primeira request

// Sem isso, `revalidate` sozinho não registra a rota no pipeline de ISR da
// Vercel — o Next.js renderiza como dinâmico completo em toda request
// (confirmado na doc oficial: generateStaticParams precisa retornar um
// array, mesmo vazio, senão "the route will be dynamically rendered").
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCandidateBySlug(slug);
  if (!c) return { title: "Candidato não encontrado" };

  // O ano vem da eleição da linha servida, não fixo em 2026: /candidato/bolsonaro
  // resolve para a linha de 2022 (é a mais recente dele) e anunciava
  // "Pesquisas Eleitorais 2026" no title, no OG e no Twitter card.
  const ano = c.election?.year ?? 2026;
  const title = `${c.name}${c.party ? ` (${c.party})` : ""} — Pesquisas Eleitorais ${ano}`;
  const description = `Pesquisas e intenção de voto de ${c.name}${
    c.party ? ` (${c.party})` : ""
  } nas eleições ${ano}: média ponderada ElectioLab, trajetória, patrimônio e financiamento de campanha.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description, card: "summary_large_image" },
    alternates: { canonical: `https://electiolab.com/candidato/${slug}` },
  };
}

export default async function CandidatoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [c, elections] = await Promise.all([
    getCandidateBySlug(slug),
    getCandidateElections(slug),
  ]);
  if (!c) notFound();

  return (
    <CandidateView
      c={c}
      slug={slug}
      canonicalPath={`/candidato/${slug}`}
      elections={elections}
    />
  );
}
