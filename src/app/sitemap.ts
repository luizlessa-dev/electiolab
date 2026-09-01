import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://electiolab.com";

// Data de criação das páginas estáticas de governador.
// Atualizar manualmente sempre que dados de uma pesquisa forem revisados.
const GOVERNOR_PAGES_DATE = "2026-04-23T00:00:00.000Z";

const UFS = [
  "ac", "al", "am", "ap", "ba", "ce", "df", "es", "go", "ma", "mg", "ms",
  "mt", "pa", "pb", "pe", "pi", "pr", "rj", "rn", "ro", "rr", "rs", "sc",
  "se", "sp", "to",
];

/**
 * Famílias de rota por UF. Estavam inteiramente ausentes do sitemap: 135 URLs
 * que nenhum crawler alcançava, incluindo as 27 páginas de senador e as 27 de
 * eleição por estado. Geradas a partir de UFS em vez de listadas à mão, que é
 * como as ~30 rotas do array original foram ficando para trás.
 */
const FAMILIAS_UF: Array<{ prefixo: string; priority: number; freq: "weekly" | "monthly" | "yearly" }> = [
  { prefixo: "eleicoes", priority: 0.8, freq: "weekly" },
  { prefixo: "pesquisas-senador", priority: 0.8, freq: "weekly" },
  { prefixo: "pesquisas", priority: 0.7, freq: "weekly" },
  { prefixo: "eleicao-2022", priority: 0.5, freq: "yearly" },
  { prefixo: "eleicao-2018", priority: 0.4, freq: "yearly" },
];

/**
 * Páginas estáticas públicas que faltavam no array manual. Rotas privadas
 * (dashboard/*, admin/*, auth/*), transacionais (newsletter/confirmar,
 * newsletter/cancelado) e de teste (sentry-example-page) ficam fora de
 * propósito — não são conteúdo indexável.
 */
const PAGINAS_EDITORIAIS: Array<{ path: string; priority: number }> = [
  { path: "metodologia", priority: 0.9 },
  { path: "eleicoes-governador-2026", priority: 0.9 },
  { path: "pesquisas", priority: 0.8 },
  { path: "aprovacao-governo-lula", priority: 0.8 },
  { path: "rejeicao-candidatos-presidente-2026", priority: 0.8 },
  { path: "dinheiro-e-votos-pesquisas-2026", priority: 0.7 },
  { path: "dinheiro", priority: 0.6 },
  { path: "margem-de-erro-pesquisa-eleitoral", priority: 0.7 },
  { path: "empate-tecnico-pesquisa-eleitoral", priority: 0.7 },
  { path: "pesquisa-estimulada-vs-espontanea", priority: 0.7 },
  { path: "pesquisa-presencial-vs-online", priority: 0.7 },
  { path: "por-que-institutos-dao-numeros-diferentes", priority: 0.7 },
  { path: "pesquisas-eleitorais-sao-confiaveis", priority: 0.7 },
  { path: "pesquisas-erraram-2022", priority: 0.7 },
  { path: "glossario-pesquisa-eleitoral", priority: 0.6 },
  { path: "newsletter", priority: 0.5 },
];

/**
 * Relatórios semanais. A série está pausada desde a semana 22, então
 * changeFrequency é "never" — declarar "weekly" numa página que não muda há
 * meses é sinal falso de frescor.
 */
const RELATORIOS = [17, 18, 19, 20, 21, 22];

/** Client anônimo de leitura. Centralizado pra dar um tipo estável às funções
 *  auxiliares abaixo. */
function criarClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type SitemapClient = ReturnType<typeof criarClient>;

/**
 * Data de referência para páginas agregadoras (UF, editoriais, /candidatos).
 * Usada quando não há sinal melhor. Não é `new Date()`: carimbar "agora" em
 * toda regeneração do sitemap diz ao crawler que a página mudou quando ela não
 * mudou, e isso multiplica re-crawl desnecessário.
 */
const FALLBACK_DATE = "2026-01-01T12:00:00.000Z";

/** `date` do Postgres (YYYY-MM-DD) → ISO ancorado ao meio-dia UTC, sem virar
 *  o dia por fuso. */
function dateParaIso(d: string): string {
  return `${d}T12:00:00.000Z`;
}

type CandidatoSitemap = {
  slug: string;
  lastModified: string;
  /** Tem pesquisa vinculada, então a página de fato muda quando entra pesquisa
   *  nova. 494 dos ~19,4k candidatos listados. O resto é conteúdo estático de
   *  cadastro TSE e não deve ser anunciado como "weekly". */
  volatil: boolean;
};

/**
 * Última publicação de pesquisa por candidato, para alimentar o `lastModified`
 * real de cada página. Paginado porque o PostgREST corta em 1000 linhas.
 */
async function getUltimaPesquisaPorCandidato(
  supabase: SitemapClient
): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  const PAGE = 1000;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("poll_results")
      .select("candidate_id,poll:polls(publication_date)")
      .is("excluded_reason", null)
      .order("candidate_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) break;

    const page = (data ?? []) as Array<{
      candidate_id: string | null;
      // O embed do PostgREST vem como objeto ou array dependendo de como a FK
      // é resolvida; tratar os dois evita quebrar o sitemap inteiro num catch.
      poll: { publication_date: string | null } | { publication_date: string | null }[] | null;
    }>;

    for (const linha of page) {
      if (!linha.candidate_id) continue;
      const poll = Array.isArray(linha.poll) ? linha.poll[0] : linha.poll;
      const pub = poll?.publication_date;
      if (!pub) continue;
      const iso = dateParaIso(pub);
      const atual = mapa.get(linha.candidate_id);
      if (!atual || iso > atual) mapa.set(linha.candidate_id, iso);
    }

    if (page.length < PAGE) break;
  }

  return mapa;
}

/**
 * Paginação explícita: o PostgREST corta em 1000 linhas por padrão e a base tem
 * ~19,9k candidatos ativos. Sem isso o sitemap listava 895 deles (5,3%) e o resto do
 * site ficava inalcançável para crawler — a paginação de /candidatos usa
 * <button onClick>, que o Googlebot não segue. Ver ELECTIOLAB-AUDIT-2026-08 C2.
 */
async function getCandidatesForSitemap(): Promise<CandidatoSitemap[]> {
  try {
    const supabase = criarClient();
    const PAGE = 1000;
    const rows: Array<{
      id: string | null;
      slug: string | null;
      bio: string | null;
      birth_date: string | null;
      profession: string | null;
      tse_id: string | null;
      created_at: string | null;
      editorial_published_at: string | null;
    }> = [];

    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("candidates")
        .select("id,slug,bio,birth_date,profession,tse_id,created_at,editorial_published_at")
        .eq("is_active", true)
        .order("slug", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) break;
      const page = data ?? [];
      rows.push(...page);
      if (page.length < PAGE) break;
    }

    const ultimaPesquisa = await getUltimaPesquisaPorCandidato(supabase);

    const filtered = rows.filter((c) => {
      if (!c.slug) return false;
      if (c.bio) return true;
      return Boolean(c.birth_date && c.profession && c.tse_id);
    });

    return filtered.map((c) => {
      const pesquisa = c.id ? ultimaPesquisa.get(c.id) : undefined;
      const candidatas = [c.created_at, c.editorial_published_at, pesquisa].filter(
        (d): d is string => Boolean(d)
      );
      const lastModified = candidatas.length
        ? candidatas.reduce((a, b) => (a > b ? a : b))
        : FALLBACK_DATE;

      return {
        slug: c.slug as string,
        lastModified,
        volatil: Boolean(pesquisa),
      };
    });
  } catch {
    return [];
  }
}

async function getInstitutesForSitemap(): Promise<{ slug: string }[]> {
  try {
    const supabase = criarClient();
    const { data } = await supabase
      .from("institutes")
      .select("slug")
      .not("slug", "is", null);
    return (data ?? [])
      .filter((i): i is { slug: string } => Boolean(i.slug))
      .map((i) => ({ slug: i.slug }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const candidates = await getCandidatesForSitemap();

  /**
   * Data real da última movimentação de dados, usada nas páginas agregadoras.
   * Substitui o antigo `new Date()`: as agregadoras mudam quando entra pesquisa
   * nova, não a cada regeneração do sitemap.
   */
  const atualizacaoDados = candidates.reduce(
    (maior, c) => (c.volatil && c.lastModified > maior ? c.lastModified : maior),
    FALLBACK_DATE
  );

  const candidatePages: MetadataRoute.Sitemap = candidates.map((c) => ({
    url: `${SITE_URL}/candidato/${c.slug}`,
    lastModified: c.lastModified,
    // Só as ~494 páginas com pesquisa vinculada mudam de semana em semana. As
    // outras são cadastro TSE estático: anunciar "weekly" nas 19k convidava o
    // crawler a revisitar tudo e disparava o pico de invocações.
    changeFrequency: c.volatil ? ("weekly" as const) : ("yearly" as const),
    priority: c.volatil ? 0.7 : 0.4,
  }));

  const institutes = await getInstitutesForSitemap();
  const institutePages: MetadataRoute.Sitemap = institutes.map((i) => ({
    url: `${SITE_URL}/instituto/${i.slug}`,
    lastModified: atualizacaoDados,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Páginas de partido (slugs canônicos dos partidos com >5 candidatos 2026)
  const PARTY_SLUGS = [
    "pl", "pt", "psd", "mdb", "uniao-brasil", "pp", "psb", "novo",
    "psdb", "republicanos", "psol", "pdt", "podemos", "solidariedade",
    "missao", "pstu", "dc", "cidadania", "avante", "rede", "pv", "pcb",
    "ptb", "agir", "mobiliza", "up", "uniao-progressista",
  ];
  const partyPages: MetadataRoute.Sitemap = PARTY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/partido/${slug}`,
    lastModified: atualizacaoDados,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const ufPages: MetadataRoute.Sitemap = FAMILIAS_UF.flatMap((f) =>
    UFS.map((uf) => ({
      url: `${SITE_URL}/${f.prefixo}/${uf}`,
      lastModified: atualizacaoDados,
      changeFrequency: f.freq,
      priority: f.priority,
    }))
  );

  const editorialPages: MetadataRoute.Sitemap = PAGINAS_EDITORIAIS.map((p) => ({
    url: `${SITE_URL}/${p.path}`,
    lastModified: atualizacaoDados,
    changeFrequency: "weekly" as const,
    priority: p.priority,
  }));

  const relatorioPages: MetadataRoute.Sitemap = RELATORIOS.map((n) => ({
    url: `${SITE_URL}/relatorio/semana-${n}-2026`,
    lastModified: GOVERNOR_PAGES_DATE,
    changeFrequency: "never" as const,
    priority: 0.5,
  }));

  /**
   * Dedupe por URL. Duas origens: slug repetido em `candidates` (~400 casos —
   * várias linhas apontando para a mesma página de candidato, ver o item de
   * dedupe por tse_id no backlog da auditoria) e sobreposição entre as listas
   * geradas e o array manual. URL repetida em sitemap é desperdício de crawl
   * budget e sinal de baixa qualidade; deduplicar aqui é barato e não depende
   * de arrumar o dado primeiro.
   */
  const dedupe = (entradas: MetadataRoute.Sitemap): MetadataRoute.Sitemap => {
    const vistas = new Set<string>();
    return entradas.filter((e) => {
      if (vistas.has(e.url)) return false;
      vistas.add(e.url);
      return true;
    });
  };

  return dedupe([
    ...candidatePages,
    ...institutePages,
    ...partyPages,
    ...ufPages,
    ...editorialPages,
    ...relatorioPages,
    {
      url: `${SITE_URL}/institutos`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/candidatos`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/comparar`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/mapa`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/embed`,
      lastModified: atualizacaoDados,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: SITE_URL,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/precos`,
      lastModified: atualizacaoDados,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/sobre`,
      lastModified: atualizacaoDados,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // /dashboard removido: bloqueado no robots.ts → não indexável
    {
      url: `${SITE_URL}/privacidade`,
      lastModified: atualizacaoDados,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/imprensa`,
      lastModified: atualizacaoDados,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/pesquisas-presidenciais-2026`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/sancoes`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/cota-parlamentar`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/redes-sociais`,
      lastModified: atualizacaoDados,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/patrimonio`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/fefc`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/quem-vence-no-segundo-turno-presidencia-2026`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/instituto-mais-acurado-eleicoes-brasil`,
      lastModified: atualizacaoDados,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/quanto-custa-campanha-eleitoral-google-ads-meta`,
      lastModified: atualizacaoDados,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/relatorio/semana-17-2026`,
      lastModified: "2026-04-27T00:00:00.000Z",
      changeFrequency: "never",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/eleicao-2018`,
      lastModified: atualizacaoDados,
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/eleicao-2022`,
      lastModified: atualizacaoDados,
      changeFrequency: "yearly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/imprensa`,
      lastModified: atualizacaoDados,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-sp-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-mg-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-rj-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-rs-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-ba-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-pe-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-go-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-ce-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-pr-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-pa-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-sc-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-ma-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-am-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-pb-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-es-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-rn-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-pi-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-mt-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-df-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-al-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-ms-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-se-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-to-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-ro-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-ac-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-ap-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/eleicoes-governador-rr-2026`,
      lastModified: GOVERNOR_PAGES_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/api`,
      lastModified: atualizacaoDados,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Drilldowns por UF: /eleicao-{2018,2022}/{uf} — 54 páginas SEO de cauda longa
    ...["ac","al","am","ap","ba","ce","df","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to"].flatMap(
      (uf) => [
        {
          url: `${SITE_URL}/eleicao-2018/${uf}`,
          lastModified: atualizacaoDados,
          changeFrequency: "yearly" as const,
          priority: 0.6,
        },
        {
          url: `${SITE_URL}/eleicao-2022/${uf}`,
          lastModified: atualizacaoDados,
          changeFrequency: "yearly" as const,
          priority: 0.65,
        },
      ],
    ),
  ]);
}
