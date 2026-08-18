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

/**
 * Paginação explícita: o PostgREST corta em 1000 linhas por padrão e a base tem
 * ~16.9k candidatos. Sem isso o sitemap listava 895 deles (5,3%) e o resto do
 * site ficava inalcançável para crawler — a paginação de /candidatos usa
 * <button onClick>, que o Googlebot não segue. Ver ELECTIOLAB-AUDIT-2026-08 C2.
 */
async function getCandidatesForSitemap(): Promise<{ slug: string }[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const PAGE = 1000;
    const rows: Array<{
      slug: string | null;
      bio: string | null;
      birth_date: string | null;
      profession: string | null;
      tse_id: string | null;
    }> = [];

    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("candidates")
        .select("slug,bio,birth_date,profession,tse_id")
        .eq("is_active", true)
        .order("slug", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) break;
      const page = data ?? [];
      rows.push(...page);
      if (page.length < PAGE) break;
    }

    const filtered = rows.filter((c) => {
      if (!c.slug) return false;
      if (c.bio) return true;
      return Boolean(c.birth_date && c.profession && c.tse_id);
    });
    return filtered.map((c) => ({ slug: c.slug as string }));
  } catch {
    return [];
  }
}

async function getInstitutesForSitemap(): Promise<{ slug: string }[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
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
  const now = new Date().toISOString();

  const candidates = await getCandidatesForSitemap();
  const candidatePages: MetadataRoute.Sitemap = candidates.map((c) => ({
    url: `${SITE_URL}/candidato/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const institutes = await getInstitutesForSitemap();
  const institutePages: MetadataRoute.Sitemap = institutes.map((i) => ({
    url: `${SITE_URL}/instituto/${i.slug}`,
    lastModified: now,
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
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const ufPages: MetadataRoute.Sitemap = FAMILIAS_UF.flatMap((f) =>
    UFS.map((uf) => ({
      url: `${SITE_URL}/${f.prefixo}/${uf}`,
      lastModified: now,
      changeFrequency: f.freq,
      priority: f.priority,
    }))
  );

  const editorialPages: MetadataRoute.Sitemap = PAGINAS_EDITORIAIS.map((p) => ({
    url: `${SITE_URL}/${p.path}`,
    lastModified: now,
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
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/candidatos`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/comparar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/mapa`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/embed`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/precos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/sobre`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // /dashboard removido: bloqueado no robots.ts → não indexável
    {
      url: `${SITE_URL}/privacidade`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/imprensa`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/pesquisas-presidenciais-2026`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/sancoes`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/cota-parlamentar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/redes-sociais`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/patrimonio`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/fefc`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/quem-vence-no-segundo-turno-presidencia-2026`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/instituto-mais-acurado-eleicoes-brasil`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/quanto-custa-campanha-eleitoral-google-ads-meta`,
      lastModified: now,
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
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/eleicao-2022`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/imprensa`,
      lastModified: now,
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
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Drilldowns por UF: /eleicao-{2018,2022}/{uf} — 54 páginas SEO de cauda longa
    ...["ac","al","am","ap","ba","ce","df","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to"].flatMap(
      (uf) => [
        {
          url: `${SITE_URL}/eleicao-2018/${uf}`,
          lastModified: now,
          changeFrequency: "yearly" as const,
          priority: 0.6,
        },
        {
          url: `${SITE_URL}/eleicao-2022/${uf}`,
          lastModified: now,
          changeFrequency: "yearly" as const,
          priority: 0.65,
        },
      ],
    ),
  ]);
}
