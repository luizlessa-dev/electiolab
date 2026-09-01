import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCandidateBySlugAndSegment, getCandidateElections } from "@/lib/queries";
import { CandidateView } from "../candidate-view";

/**
 * /candidato/<slug>/<eleicao> — uma eleição específica da pessoa por trás do
 * slug. O segmento é `<cargo>-<ano>-<turno>t` (ex.: "presidente-2022-2t").
 *
 * Existe porque um turno é uma eleição separada nesta base, com campo de
 * candidatos, pesquisas e resultado próprios. /candidato/<slug>, sozinho, só
 * consegue servir uma delas — a que vence o desempate year DESC, round DESC —
 * e as outras não tinham URL nenhuma. Ver a CORREÇÃO 2026-08-31 no topo da
 * migration 20260819120000_dedup_candidates_by_tse_id.sql.
 *
 * Mesmo ISR da rota base: são as mesmas páginas, com o mesmo perfil de
 * atualização.
 */
export const revalidate = 604800; // 7d ISR

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; eleicao: string }>;
}): Promise<Metadata> {
  const { slug, eleicao } = await params;
  const [c, elections] = await Promise.all([
    getCandidateBySlugAndSegment(slug, eleicao),
    getCandidateElections(slug),
  ]);
  if (!c) return { title: "Candidato não encontrado" };

  const nomeEleicao = c.election?.name ?? `eleições ${c.election?.year ?? ""}`.trim();
  const title = `${c.name}${c.party ? ` (${c.party})` : ""} — ${nomeEleicao}`;
  const description = `Pesquisas e intenção de voto de ${c.name}${
    c.party ? ` (${c.party})` : ""
  } na ${nomeEleicao}: média ponderada ElectioLab, trajetória e resultado.`;

  /**
   * A eleição primária já é servida em /candidato/<slug> com o mesmo conteúdo.
   * Apontar o canonical para lá evita duas URLs disputando o mesmo conteúdo —
   * as secundárias apontam para si mesmas.
   */
  const primaria = elections.find((o) => o.segment === eleicao)?.isPrimary ?? false;
  const canonical = primaria
    ? `https://electiolab.com/candidato/${slug}`
    : `https://electiolab.com/candidato/${slug}/${eleicao}`;

  /**
   * A imagem OG é a da rota base. `opengraph-image` é convenção por segmento e
   * o arquivo do pai não desce para o filho dinâmico, então sem isto a sub-rota
   * sairia sem og:image nenhuma. Reexportar o componente do pai não é opção —
   * o Next recusa `runtime` reexportado.
   */
  const ogImage = `/candidato/${slug}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      description,
      card: "summary_large_image",
      images: [ogImage],
    },
    alternates: { canonical },
  };
}

export default async function CandidatoEleicaoPage({
  params,
}: {
  params: Promise<{ slug: string; eleicao: string }>;
}) {
  const { slug, eleicao } = await params;
  const [c, elections] = await Promise.all([
    getCandidateBySlugAndSegment(slug, eleicao),
    getCandidateElections(slug),
  ]);
  // Segmento que não corresponde a nenhuma eleição da pessoa é 404, e não a
  // eleição errada servida em silêncio.
  if (!c) notFound();

  const primaria = elections.find((o) => o.segment === eleicao)?.isPrimary ?? false;

  return (
    <CandidateView
      c={c}
      slug={slug}
      canonicalPath={primaria ? `/candidato/${slug}` : `/candidato/${slug}/${eleicao}`}
      elections={elections}
    />
  );
}
