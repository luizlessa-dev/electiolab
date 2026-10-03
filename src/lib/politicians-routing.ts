/**
 * Rota por pessoa (/candidato/<slug-da-pessoa>): decisões puras, sem I/O.
 * Contexto em docs/BASTIDORES-POS-ELEICAO.md e na decisão "slug público por pessoa".
 */

export type OpcaoEleicao = {
  candidateId: string;
  /** Segmento de URL da eleição (electionSegment em queries.ts). */
  segment: string;
  /** true na eleição que /candidato/<slug> (sem segmento) serve. */
  isPrimary: boolean;
};

/**
 * Para onde redirecionar (301) quem pediu `slugPedido` e foi servido pela linha
 * `candidateId`, cuja pessoa tem o slug `pessoaSlug`. null = não redirecionar.
 *
 * - Já está no slug da pessoa, ou a linha não tem pessoa: não redireciona.
 * - A linha é de OUTRA eleição da pessoa (existe como opção não primária): vai
 *   para /candidato/<pessoa>/<segmento>, para o visitante continuar vendo a
 *   eleição que pediu e não ser jogado na principal.
 * - Qualquer outro caso (linha duplicada na mesma eleição, ou irmã que o seletor
 *   filtra por inativa): vai para a página base da pessoa, que sempre existe.
 */
export function destinoCanonico(args: {
  slugPedido: string;
  pessoaSlug: string | null;
  candidateId: string;
  opcoesDaPessoa: OpcaoEleicao[];
}): string | null {
  const { slugPedido, pessoaSlug, candidateId, opcoesDaPessoa } = args;
  if (!pessoaSlug || pessoaSlug === slugPedido) return null;

  const opcao = opcoesDaPessoa.find((o) => o.candidateId === candidateId);
  if (opcao && !opcao.isPrimary) return `/candidato/${pessoaSlug}/${opcao.segment}`;
  return `/candidato/${pessoaSlug}`;
}
