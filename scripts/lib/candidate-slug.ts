/**
 * Geração de slug de candidato — regras compartilhadas entre o ingest do TSE e
 * o script de correção de homônimos.
 *
 * Existe porque a regra estava só dentro de scripts/ingest-tse-candidaturas.ts,
 * escrita errada: a unicidade era garantida por `${election.id}:${slug}`, ou
 * seja, POR ELEIÇÃO, enquanto a URL /candidato/[slug] é global. Dois homônimos
 * em eleições diferentes recebiam o mesmo slug e só um ficava alcançável —
 * 386 slugs cobrindo 446 pessoas escondidas quando isso foi medido (2026-09-01).
 */

/** Precisa bater com os ~20k slugs que já existem na base. */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type EleicaoRef = {
  type: string | null;
  state: string | null;
  year: number | null;
  round: number | null;
};

/**
 * Quem fica com o slug "nu" quando duas pessoas diferentes disputam o mesmo
 * nome. Cargo vem ANTES de ano de propósito: pelo ano, /candidato/ciro serviria
 * um deputado estadual de SC de 2026 e Ciro Gomes cairia em /candidato/ciro-sc.
 * Quem procura "ciro" quer o presidenciável.
 */
export const CARGO_PRIORITY: Record<string, number> = {
  presidente: 6,
  governador: 5,
  senador: 4,
  deputado_federal: 3,
  deputado_estadual: 2,
  deputado_distrital: 2,
};

/**
 * Identidade da PESSOA. CPF primeiro; tse_id quando falta CPF (é o caso das
 * linhas de 2022); o id da linha como último recurso, que isola a linha em vez
 * de fundi-la com outra por engano.
 *
 * Nunca use `slug` para isso — é exatamente o campo que não identifica pessoa.
 */
export function pessoaKey(r: { cpf?: string | null; tse_id?: string | null; id: string }): string {
  return r.cpf || r.tse_id || `row:${r.id}`;
}

/** Ordena candidatos ao mesmo slug: o primeiro fica com o slug nu. */
export function ordenarPorPrioridade<T extends { id: string; election: EleicaoRef | null }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const ea = a.election;
    const eb = b.election;
    return (
      (CARGO_PRIORITY[eb?.type ?? ""] ?? 0) - (CARGO_PRIORITY[ea?.type ?? ""] ?? 0) ||
      (eb?.year ?? 0) - (ea?.year ?? 0) ||
      (eb?.round ?? 0) - (ea?.round ?? 0) ||
      a.id.localeCompare(b.id)
    );
  });
}

/**
 * Escada de desempate. Medida contra a base em 2026-09-01: UF resolve 440 das
 * 446 colisões, UF+cargo resolve mais 4, cargo sozinho resolve as 2 restantes
 * (presidenciais, que não têm UF). O sufixo numérico nunca foi necessário —
 * fica como rede, porque nada garante isso para uma base futura.
 *
 * Sufixo legível em vez de "-2" para a URL dizer alguma coisa: "serginho-sc"
 * em vez de "serginho-3".
 */
export function escolherSlugUnico(
  base: string,
  eleicao: EleicaoRef | null,
  emUso: ReadonlySet<string>
): string {
  const uf = (eleicao?.state ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const cargo = (eleicao?.type ?? "").replace(/_/g, "-");

  const escada = [base];
  if (uf) escada.push(`${base}-${uf}`);
  if (uf && cargo) escada.push(`${base}-${uf}-${cargo}`);
  if (cargo) escada.push(`${base}-${cargo}`);

  for (const c of escada) if (!emUso.has(c)) return c;

  let n = 2;
  while (emUso.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
