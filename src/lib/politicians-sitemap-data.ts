/**
 * Coleta (server-side, service role) os dados que o sitemap precisa para a rota por
 * pessoa. Separado de politicians-sitemap.ts para a lógica pura ficar testável sem banco.
 * Qualquer erro propaga: o chamador (sitemap.ts) trata como "sem ajustes" e mantém o
 * sitemap antigo, para uma falha transitória nunca remover URL.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rankCandidateRows } from "@/lib/queries";
import { getIdsComDadosNoTf } from "@/lib/tf-data";
import { calcularAjustes, type AjustesSitemap, type PessoaParaSitemap } from "@/lib/politicians-sitemap";

type LinhaAtiva = { id: string | null; slug: string | null; tse_id: string | null; election_id: string | null };

type LinkComPessoa = {
  politician_id: string;
  system: string;
  external_id: string;
  politician: { slug: string } | { slug: string }[] | null;
};

const slugDe = (p: LinkComPessoa["politician"]): string | null => (Array.isArray(p) ? p[0]?.slug : p?.slug) ?? null;

async function todosOsLinks(systems: string[]): Promise<LinkComPessoa[]> {
  const out: LinkComPessoa[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("politician_links")
      .select("politician_id, system, external_id, politician:politicians(slug)")
      .in("system", systems)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as LinkComPessoa[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/**
 * @param linhasAtivas linhas ativas de `candidates` que o sitemap já carregou (todas, antes do filtro de qualidade)
 * @param slugsListados slugs de candidatura que o sitemap listaria hoje
 */
export async function buscarAjustesPorPessoa(
  linhasAtivas: LinhaAtiva[],
  slugsListados: ReadonlySet<string>,
): Promise<AjustesSitemap> {
  const { data: eleicoes, error: eErr } = await supabaseAdmin.from("elections").select("id, type, state, year, round");
  if (eErr) throw eErr;
  const eleicaoPorId = new Map((eleicoes ?? []).map((e) => [e.id as string, e]));

  // Linha que /candidato/<slug> serve para cada slug: mesmo desempate da página (rankCandidateRows).
  const porSlug = new Map<string, LinhaAtiva[]>();
  for (const r of linhasAtivas) if (r.slug && r.id) porSlug.set(r.slug, [...(porSlug.get(r.slug) ?? []), r]);
  const servidaPorSlug = new Map<string, string>();
  for (const [slug, rows] of porSlug) {
    const ranked = rankCandidateRows(
      rows.map((r) => ({
        id: r.id,
        tse_id: r.tse_id,
        cpf: null,
        is_active: true,
        election: r.election_id ? (eleicaoPorId.get(r.election_id) ?? null) : null,
      })),
    );
    if (ranked[0]) servidaPorSlug.set(slug, ranked[0].id);
  }

  // O sitemap só lista candidatos ATIVOS, de propósito. O slug de uma candidatura inativa continua
  // existindo (a página serve o histórico), então ele conta como "slug que existe em candidates" e
  // a pessoa dele não pode entrar como se fosse nova.
  const { data: inativas, error: iErr } = await supabaseAdmin
    .from("candidates")
    .select("slug")
    .eq("is_active", false)
    .not("slug", "is", null)
    .limit(5000);
  if (iErr) throw iErr;

  const [linksCand, linksTf, tf] = await Promise.all([
    todosOsLinks(["candidates"]),
    todosOsLinks(["tf_parlamentar", "camara", "senado"]),
    getIdsComDadosNoTf(),
  ]);

  const pessoaPorLinha = new Map<string, string>(); // candidate id → slug da pessoa
  const pessoasComCandidatura = new Set<string>(); // politician_id
  for (const l of linksCand) {
    pessoasComCandidatura.add(l.politician_id);
    const s = slugDe(l.politician);
    if (s) pessoaPorLinha.set(l.external_id, s);
  }

  const pessoaDoSlugServido = new Map<string, string>();
  for (const [slug, id] of servidaPorSlug) {
    const pessoa = pessoaPorLinha.get(id);
    if (pessoa) pessoaDoSlugServido.set(slug, pessoa);
  }

  // Pessoas para as quais a rota por pessoa cria URL: sem candidatura (só TF) ou servidas por vínculo.
  const pessoas = new Map<string, PessoaParaSitemap & { _id: string }>();
  for (const l of linksTf) {
    const slug = slugDe(l.politician);
    if (!slug) continue;
    const atual = pessoas.get(l.politician_id) ?? {
      _id: l.politician_id,
      slug,
      temCandidatura: pessoasComCandidatura.has(l.politician_id),
      temDadosTf: false,
    };
    const id = Number(l.external_id);
    if (l.system === "camara" && tf.camara.has(id)) atual.temDadosTf = true;
    if (l.system === "senado" && tf.senado.has(id)) atual.temDadosTf = true;
    pessoas.set(l.politician_id, atual);
  }
  // Pessoas com candidatura mas sem vínculo no TF (a maioria): só interessam se o slug delas não for de candidates.
  const slugsComCandidatura = new Map<string, string>();
  for (const l of linksCand) {
    const s = slugDe(l.politician);
    if (s && !pessoas.has(l.politician_id)) slugsComCandidatura.set(l.politician_id, s);
  }
  const lista: PessoaParaSitemap[] = [
    ...[...pessoas.values()].map(({ slug, temCandidatura, temDadosTf }) => ({ slug, temCandidatura, temDadosTf })),
    ...[...slugsComCandidatura.values()].map((slug) => ({ slug, temCandidatura: true, temDadosTf: false })),
  ];

  return calcularAjustes({
    slugsListados,
    todosSlugsDeCandidates: new Set([...porSlug.keys(), ...(inativas ?? []).map((r) => r.slug as string)]),
    pessoaDoSlugServido,
    pessoas: lista,
  });
}
