/**
 * Ajustes do sitemap para a rota por pessoa (ROTA_POLITICIANS=1). Lógica pura, sem I/O.
 *
 * - REMOVER os slugs de candidatura que a página vai redirecionar (308) para o slug da
 *   pessoa: sitemap não lista URL que redireciona.
 * - ADICIONAR as URLs que passam a existir: pessoas só do TF com dados (votações/CEAP),
 *   pessoas servidas por vínculo (slug que não existe em `candidates`) e o destino dos
 *   redirecionamentos, quando o filtro de qualidade do sitemap o deixou de fora.
 */

export type PessoaParaSitemap = {
  slug: string;
  /** Tem pelo menos uma linha em `candidates` ligada por CPF. */
  temCandidatura: boolean;
  /** Parlamentar no TF com votações ou CEAP publicados (a página não fica vazia). */
  temDadosTf: boolean;
};

export type AjustesSitemap = {
  remover: Set<string>;
  adicionar: string[];
};

export function calcularAjustes(args: {
  /** Slugs de candidatura que o sitemap já listaria. */
  slugsListados: ReadonlySet<string>;
  /** Todo slug existente em `candidates` (para saber se o slug de uma pessoa já é de uma candidatura). */
  todosSlugsDeCandidates: ReadonlySet<string>;
  /** slug de candidatura → slug da PESSOA da linha que a página serve para esse slug. */
  pessoaDoSlugServido: ReadonlyMap<string, string>;
  pessoas: readonly PessoaParaSitemap[];
}): AjustesSitemap {
  const { slugsListados, todosSlugsDeCandidates, pessoaDoSlugServido, pessoas } = args;

  const remover = new Set<string>();
  for (const slug of slugsListados) {
    const pessoa = pessoaDoSlugServido.get(slug);
    if (pessoa && pessoa !== slug) remover.add(slug);
  }

  const candidatos = new Set<string>();
  for (const slug of remover) {
    const destino = pessoaDoSlugServido.get(slug);
    if (destino) candidatos.add(destino);
  }
  for (const p of pessoas) {
    if (!p.temCandidatura && p.temDadosTf) candidatos.add(p.slug);
    else if (p.temCandidatura && !todosSlugsDeCandidates.has(p.slug)) candidatos.add(p.slug);
  }

  // `remover` ⊂ `slugsListados`: quem já está listado (inclusive o que redireciona) não volta.
  const adicionar = [...candidatos].filter((s) => !slugsListados.has(s)).sort();

  return { remover, adicionar };
}
