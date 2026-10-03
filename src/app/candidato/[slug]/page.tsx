import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getCandidateById,
  getCandidateBySlug,
  getCandidateElections,
  getPrimaryCandidateIdAmong,
} from "@/lib/queries";
import { getCandidateIdsDaPessoa, getPoliticoByCandidateId, getPoliticoBySlug } from "@/lib/politicians";
import { destinoCanonico } from "@/lib/politicians-routing";
import { getCeapByCamaraId, getParlamentarByCpf, getVotacoesParlamentar } from "@/lib/tf-data";
import { CandidateView } from "./candidate-view";
import { ParlamentarView, cargoDoParlamentar } from "./parlamentar-view";

/**
 * Rota por pessoa (slug de `politicians`). Atrás de ROTA_POLITICIANS=1; desligada,
 * esta página se comporta exatamente como antes. Ligada:
 *  - slug que não existe em `candidates` mas é de uma pessoa deixa de ser 404;
 *  - a candidatura secundária de uma pessoa (slug diferente do slug dela) redireciona
 *    (308 permanente) para o slug da pessoa, na eleição certa.
 * A página é ISR de 7 dias: ligar/desligar exige revalidar (POST /api/revalidate).
 */
const rotaPorPessoa = () => process.env.ROTA_POLITICIANS === "1";

type PaginaDaPessoa =
  | { tipo: "candidatura"; c: NonNullable<Awaited<ReturnType<typeof getCandidateById>>> }
  | {
      tipo: "parlamentar";
      politico: NonNullable<Awaited<ReturnType<typeof getPoliticoBySlug>>>;
      parlamentar: NonNullable<Awaited<ReturnType<typeof getParlamentarByCpf>>>;
      votacoes: Awaited<ReturnType<typeof getVotacoesParlamentar>>;
      ceap: Awaited<ReturnType<typeof getCeapByCamaraId>>;
    };

/** Resolve o slug como pessoa. `cache` evita repetir as consultas entre generateMetadata e a página. */
const resolverPorPessoa = cache(async (slug: string): Promise<PaginaDaPessoa | null> => {
  const politico = await getPoliticoBySlug(slug);
  if (!politico) return null;

  const ids = await getCandidateIdsDaPessoa(politico.id);
  if (ids.length) {
    const principal = await getPrimaryCandidateIdAmong(ids);
    const c = principal ? await getCandidateById(principal) : null;
    return c ? { tipo: "candidatura", c } : null;
  }

  const parlamentar = await getParlamentarByCpf(politico.cpf);
  if (!parlamentar) return null;
  const [votacoes, ceap] = await Promise.all([
    getVotacoesParlamentar(parlamentar),
    parlamentar.id_camara ? getCeapByCamaraId(parlamentar.id_camara) : Promise.resolve(null),
  ]);
  return { tipo: "parlamentar", politico, parlamentar, votacoes, ceap };
});

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
  if (!c) {
    const pessoa = rotaPorPessoa() ? await resolverPorPessoa(slug) : null;
    if (pessoa?.tipo === "candidatura") return metadataDaCandidatura(pessoa.c, slug);
    if (pessoa?.tipo === "parlamentar") {
      const nome = pessoa.parlamentar.nome_parlamentar ?? pessoa.politico.displayName;
      const partido = pessoa.parlamentar.partido_atual ?? pessoa.parlamentar.partido;
      const title = `${nome}${partido ? ` (${partido})` : ""} — Votações e cota parlamentar`;
      const description = `${cargoDoParlamentar(pessoa.parlamentar)} ${nome}${
        partido ? ` (${partido})` : ""
      }: como votou no plenário, presença e cota parlamentar, a partir de dados oficiais.`;
      return {
        title,
        description,
        openGraph: { title, description },
        twitter: { title, description, card: "summary" },
        alternates: { canonical: `https://electiolab.com/candidato/${slug}` },
      };
    }
    return { title: "Candidato não encontrado" };
  }
  return metadataDaCandidatura(c, slug);
}

function metadataDaCandidatura(
  c: NonNullable<Awaited<ReturnType<typeof getCandidateBySlug>>>,
  slug: string,
): Metadata {
  // O ano vem da eleição da linha servida, não fixo em 2026: /candidato/bolsonaro
  // resolve para a linha de 2022 (é a mais recente dele) e anunciava
  // "Pesquisas Eleitorais 2026" no title, no OG e no Twitter card.
  const ano = c.election?.year ?? 2026;
  // GSC mostrava buscas do tipo "[nome] candidato [ano]" (ex.: "padre kelmon
  // candidato 2026", 251 impr., 0 cliques) sem nenhum clique — a palavra
  // "candidato" não aparecia em lugar nenhum do title.
  const title = `${c.name}${c.party ? ` (${c.party})` : ""} — Candidato ${ano}: Pesquisas Eleitorais`;
  const description = `Pesquisas e intenção de voto de ${c.name}${
    c.party ? ` (${c.party})` : ""
  }, candidato(a) nas eleições ${ano}: média ponderada ElectioLab, trajetória, patrimônio e financiamento de campanha.`;

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

  if (!c) {
    const pessoa = rotaPorPessoa() ? await resolverPorPessoa(slug) : null;
    if (!pessoa) notFound();
    if (pessoa.tipo === "parlamentar") {
      return (
        <ParlamentarView
          politico={pessoa.politico}
          parlamentar={pessoa.parlamentar}
          votacoes={pessoa.votacoes}
          ceap={pessoa.ceap}
        />
      );
    }
    // Pessoa com candidaturas, mas nenhuma delas tem este slug: serve a principal.
    return <CandidateView c={pessoa.c} slug={slug} canonicalPath={`/candidato/${slug}`} elections={[]} />;
  }

  if (rotaPorPessoa()) {
    // A pessoa é a da LINHA servida (por CPF), não "quem tem este slug": slug repetido cobre
    // homônimos, e redirecionar por slug mandaria o visitante para a pessoa errada.
    const pessoa = await getPoliticoByCandidateId(c.id);
    if (pessoa && pessoa.slug !== slug) {
      const opcoes = await getCandidateElections(pessoa.slug);
      const destino = destinoCanonico({
        slugPedido: slug,
        pessoaSlug: pessoa.slug,
        candidateId: c.id,
        opcoesDaPessoa: opcoes.map((o) => ({ candidateId: o.candidateId, segment: o.segment, isPrimary: o.isPrimary })),
      });
      if (destino) permanentRedirect(destino);
    }
  }

  return (
    <CandidateView
      c={c}
      slug={slug}
      canonicalPath={`/candidato/${slug}`}
      elections={elections}
    />
  );
}
