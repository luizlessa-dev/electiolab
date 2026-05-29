/**
 * Helpers para páginas SEO marketing (server components estáticos com `revalidate`).
 * Usa supabase-js direto com anon key — não compartilha cookies/auth com app autenticado.
 *
 * Todas as páginas que importam daqui devem declarar `export const revalidate = 3600;`.
 */
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export type StatePollResult = {
  name: string;
  party: string | null;
  pct: number;
  color: string | null;
};

export type StatePollSnapshot = {
  publication_date: string;
  institute_name: string;
  institute_slug: string | null;
  sample_size: number | null;
  margin_of_error: number | null;
  methodology: string | null;
  scope: string | null;
  scenario_label: string | null;
  source_url: string | null;
  results: StatePollResult[];
};

/**
 * Busca a pesquisa mais recente para governador de um estado em 2026.
 * Retorna null se não houver pesquisa.
 */
export async function getLatestStateGovPoll(
  uf: string
): Promise<StatePollSnapshot | null> {
  const supabase = sb();

  // Pega election_id de governador 2026 do estado
  const { data: election } = await supabase
    .from("elections")
    .select("id")
    .eq("type", "governador")
    .eq("state", uf)
    .eq("year", 2026)
    .eq("round", 1)
    .maybeSingle();

  if (!election) return null;

  // Pega poll mais recente daquela eleição com mais resultados (cenário completo)
  const { data: polls } = await supabase
    .from("polls")
    .select(
      `id, publication_date, sample_size, margin_of_error, methodology, scope,
       scenario_label, source_url,
       institute:institutes(name, slug),
       results:poll_results(percentage, candidate:candidates(name, party, color))`
    )
    .eq("election_id", election.id)
    .order("publication_date", { ascending: false })
    .limit(10);

  if (!polls || polls.length === 0) return null;

  // Pega o poll com MAIS resultados (cenário completo, não os reduzidos com 2-3 candidatos)
  const ranked = polls.map((p: unknown) => {
    const pp = p as {
      id: string;
      publication_date: string;
      sample_size: number | null;
      margin_of_error: number | null;
      methodology: string | null;
      scope: string | null;
      scenario_label: string | null;
      source_url: string | null;
      institute: { name: string; slug: string | null }[] | { name: string; slug: string | null } | null;
      results: Array<{
        percentage: number;
        candidate:
          | { name: string; party: string | null; color: string | null }[]
          | { name: string; party: string | null; color: string | null }
          | null;
      }>;
    };
    return { ...pp, n_results: pp.results?.length ?? 0 };
  });

  // Da pesquisa mais recente, escolhe o cenário com MAIS candidatos testados
  const mostRecentDate = ranked[0].publication_date;
  const sameDayPolls = ranked.filter((p) => p.publication_date === mostRecentDate);
  const best = sameDayPolls.reduce((acc, p) => (p.n_results > acc.n_results ? p : acc), sameDayPolls[0]);

  const institute = Array.isArray(best.institute) ? best.institute[0] : best.institute;

  const results: StatePollResult[] = (best.results ?? [])
    .map((r) => {
      const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
      return {
        name: c?.name ?? "—",
        party: c?.party ?? null,
        color: c?.color ?? null,
        pct: Number(r.percentage),
      };
    })
    .sort((a, b) => b.pct - a.pct);

  return {
    publication_date: best.publication_date,
    institute_name: institute?.name ?? "—",
    institute_slug: institute?.slug ?? null,
    sample_size: best.sample_size,
    margin_of_error: best.margin_of_error,
    methodology: best.methodology,
    scope: best.scope,
    scenario_label: best.scenario_label,
    source_url: best.source_url,
    results,
  };
}

/**
 * Cenários de 2º turno (head-to-head) para governador de um estado.
 *
 * Diferente do presidencial, governadores NÃO têm weighted_averages por cenário.
 * Aqui agregamos direto dos polls crus: agrupamos por PAR de candidatos (robusto
 * contra rótulos inconsistentes como "Paes × Ruas" vs "Paes × Douglas Ruas" ou
 * "Tarcísio × Haddad (Quaest/Vox/Paraná)") e calculamos a média simples das
 * pesquisas de cada par, mantendo atribuição (institutos, data, nº de pesquisas).
 */
export type RunoffCandidate = {
  name: string;
  party: string | null;
  color: string | null;
  slug: string;
  pct: number;
};

export type RunoffScenario = {
  /** chave estável = slugs do par ordenados */
  key: string;
  candidates: RunoffCandidate[]; // 2, ordenados por pct desc
  polls: number;
  institutes: string[];
  latest: string;       // data da pesquisa mais recente do par
  undecided: number;    // 100 - soma das médias (clamp ≥0)
};

export async function getStateRunoffScenarios(uf: string): Promise<RunoffScenario[]> {
  const supabase = sb();

  const { data: election } = await supabase
    .from("elections")
    .select("id")
    .eq("type", "governador")
    .eq("state", uf)
    .eq("year", 2026)
    .eq("round", 1)
    .maybeSingle();
  if (!election) return [];

  const { data: polls } = await supabase
    .from("polls")
    .select(
      `publication_date, scenario_label,
       institute:institutes(name),
       results:poll_results(percentage, candidate:candidates(name, party, color, slug))`
    )
    .eq("election_id", election.id)
    .not("scenario_label", "is", null)
    .order("publication_date", { ascending: false });

  if (!polls) return [];

  type Acc = {
    cands: Map<string, { name: string; party: string | null; color: string | null; slug: string; sum: number; count: number }>;
    polls: number;
    institutes: Set<string>;
    latest: string;
  };
  const byPair = new Map<string, Acc>();

  for (const p of polls as unknown as Array<{
    publication_date: string;
    scenario_label: string | null;
    institute: { name: string }[] | { name: string } | null;
    results: Array<{
      percentage: number;
      candidate:
        | { name: string; party: string | null; color: string | null; slug: string }[]
        | { name: string; party: string | null; color: string | null; slug: string }
        | null;
    }>;
  }>) {
    const results = (p.results ?? []).map((r) => {
      const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
      return c ? { ...c, pct: Number(r.percentage) } : null;
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    // Head-to-head genuíno = exatamente 2 candidatos
    if (results.length !== 2) continue;

    const key = results.map((r) => r.slug).sort().join("|");
    const inst = (Array.isArray(p.institute) ? p.institute[0] : p.institute)?.name ?? "?";

    const acc = byPair.get(key) ?? {
      cands: new Map(),
      polls: 0,
      institutes: new Set<string>(),
      latest: p.publication_date,
    };
    acc.polls += 1;
    acc.institutes.add(inst);
    if (p.publication_date > acc.latest) acc.latest = p.publication_date;
    for (const r of results) {
      const cur = acc.cands.get(r.slug) ?? {
        name: r.name, party: r.party, color: r.color, slug: r.slug, sum: 0, count: 0,
      };
      cur.sum += r.pct;
      cur.count += 1;
      acc.cands.set(r.slug, cur);
    }
    byPair.set(key, acc);
  }

  const scenarios: RunoffScenario[] = [];
  for (const [key, acc] of byPair) {
    const candidates = [...acc.cands.values()]
      .map((c) => ({
        name: c.name, party: c.party, color: c.color, slug: c.slug,
        pct: c.count > 0 ? c.sum / c.count : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
    if (candidates.length !== 2) continue;
    const undecided = Math.max(0, 100 - candidates[0].pct - candidates[1].pct);
    scenarios.push({
      key,
      candidates,
      polls: acc.polls,
      institutes: [...acc.institutes],
      latest: acc.latest,
      undecided,
    });
  }

  // Mais pesquisas primeiro, depois mais recente
  scenarios.sort((a, b) => b.polls - a.polls || b.latest.localeCompare(a.latest));
  return scenarios;
}

/**
 * Shape pronto para a UI de abas: oponente comum (presente em todos os
 * confrontos) fixo à esquerda; senão o líder de cada confronto.
 */
export type RunoffTabScenario = {
  key: string;
  commonName: string;
  commonColor: string | null;
  commonPct: number;
  adversaryName: string;
  adversaryParty: string | null;
  adversaryColor: string | null;
  adversaryPct: number;
  undecided: number;
  polls: number;
  institutes: string[];
  latest: string;
};

export function toRunoffTabs(scenarios: RunoffScenario[]): RunoffTabScenario[] {
  if (scenarios.length === 0) return [];
  const slugSets = scenarios.map((s) => new Set(s.candidates.map((c) => c.slug)));
  const commonSlug =
    [...slugSets[0]].find((slug) => slugSets.every((set) => set.has(slug))) ?? null;

  return scenarios
    .map((s) => {
      const common = commonSlug
        ? s.candidates.find((c) => c.slug === commonSlug)
        : s.candidates[0];
      const adversary = s.candidates.find((c) => c.slug !== (common?.slug ?? ""));
      if (!common || !adversary) return null;
      return {
        key: s.key,
        commonName: common.name,
        commonColor: common.color,
        commonPct: common.pct,
        adversaryName: adversary.name,
        adversaryParty: adversary.party,
        adversaryColor: adversary.color,
        adversaryPct: adversary.pct,
        undecided: s.undecided,
        polls: s.polls,
        institutes: s.institutes,
        latest: s.latest,
      } satisfies RunoffTabScenario;
    })
    .filter((x): x is RunoffTabScenario => x !== null);
}

/**
 * Ranking de institutos por reliability_score.
 */
export type InstituteRanking = {
  id: string;
  name: string;
  slug: string;
  reliability_score: number;
  pct: number; // reliability_score * 100, arredondado
};

export async function getInstitutesRanking(): Promise<InstituteRanking[]> {
  const supabase = sb();
  const { data } = await supabase
    .from("institutes")
    .select("id, name, slug, reliability_score")
    .not("reliability_score", "is", null)
    .order("reliability_score", { ascending: false });

  return (data ?? []).map((i) => ({
    id: i.id as string,
    name: i.name as string,
    slug: i.slug as string,
    reliability_score: Number(i.reliability_score),
    pct: Math.round(Number(i.reliability_score) * 100),
  }));
}

/**
 * Busca a pesquisa presidencial 1T mais recente. Útil pra landing e páginas long-tail.
 */
export async function getLatestPresidentialPoll(): Promise<StatePollSnapshot | null> {
  const supabase = sb();

  const { data: election } = await supabase
    .from("elections")
    .select("id")
    .eq("type", "presidencial")
    .eq("year", 2026)
    .eq("round", 1)
    .maybeSingle();

  if (!election) return null;

  const { data: polls } = await supabase
    .from("polls")
    .select(
      `id, publication_date, sample_size, margin_of_error, methodology, scope,
       scenario_label, source_url,
       institute:institutes(name, slug),
       results:poll_results(percentage, candidate:candidates(name, party, color))`
    )
    .eq("election_id", election.id)
    .order("publication_date", { ascending: false })
    .limit(5);

  if (!polls || polls.length === 0) return null;

  const ranked = polls.map((p: unknown) => {
    const pp = p as Parameters<typeof Object.assign>[1] & {
      id: string;
      publication_date: string;
      results: unknown[];
    };
    return { ...pp, n_results: pp.results?.length ?? 0 };
  });

  const mostRecentDate = ranked[0].publication_date;
  const sameDayPolls = ranked.filter((p) => p.publication_date === mostRecentDate);
  const best = sameDayPolls.reduce(
    (acc, p) => (p.n_results > acc.n_results ? p : acc),
    sameDayPolls[0]
  ) as unknown as {
    publication_date: string;
    sample_size: number | null;
    margin_of_error: number | null;
    methodology: string | null;
    scope: string | null;
    scenario_label: string | null;
    source_url: string | null;
    institute: { name: string; slug: string | null }[] | { name: string; slug: string | null } | null;
    results: Array<{
      percentage: number;
      candidate:
        | { name: string; party: string | null; color: string | null }[]
        | { name: string; party: string | null; color: string | null }
        | null;
    }>;
  };

  const institute = Array.isArray(best.institute) ? best.institute[0] : best.institute;

  const results: StatePollResult[] = (best.results ?? [])
    .map((r) => {
      const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
      return {
        name: c?.name ?? "—",
        party: c?.party ?? null,
        color: c?.color ?? null,
        pct: Number(r.percentage),
      };
    })
    .sort((a, b) => b.pct - a.pct);

  return {
    publication_date: best.publication_date,
    institute_name: institute?.name ?? "—",
    institute_slug: institute?.slug ?? null,
    sample_size: best.sample_size,
    margin_of_error: best.margin_of_error,
    methodology: best.methodology,
    scope: best.scope,
    scenario_label: best.scenario_label,
    source_url: best.source_url,
    results,
  };
}
