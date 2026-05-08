import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://electiolab.com";

// Data de criação das páginas estáticas de governador.
// Atualizar manualmente sempre que dados de uma pesquisa forem revisados.
const GOVERNOR_PAGES_DATE = "2026-04-23T00:00:00.000Z";

async function getCandidatesForSitemap(): Promise<{ slug: string }[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("candidates")
      .select("slug,bio,birth_date,profession,tse_id")
      .eq("is_active", true);
    const filtered = (data ?? []).filter((c) => {
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

  return [
    ...candidatePages,
    ...institutePages,
    ...partyPages,
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
  ];
}
