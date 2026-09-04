import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { PROVENIENCIA_PUBLICA } from "./poll-provenance";

// Client sem cookies — todas as queries deste arquivo são de dado público
// (eleições, candidatos, pesquisas), sem contexto de sessão. Usar o client
// baseado em cookies (@/lib/supabase/server) aqui força renderização dinâmica
// em qualquer rota que importe este arquivo, mesmo com `revalidate` declarado
// (cookies()/headers() opta a rota inteira fora do ISR no App Router) — era
// a causa raiz do cache quebrado em /candidato/[slug]. Generic <Database>
// preserva a tipagem que o client de cookies tinha.
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function getActiveElection() {
  const { data } = await supabase
    .from("elections")
    .select("*")
    .eq("is_active", true)
    .order("year", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getElections() {
  const { data } = await supabase
    .from("elections")
    .select("*")
    .order("year", { ascending: false });
  return data ?? [];
}

export async function getElectionById(id: string) {
  const { data } = await supabase
    .from("elections")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function getCandidates(electionId: string) {
  const { data } = await supabase
    .from("candidates")
    .select("*")
    .eq("election_id", electionId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getPolls(electionId: string) {
  const { data } = await supabase
    .from("polls")
    .select(`
      *,
      institute:institutes(id, name, reliability_score, methodology_default),
      results:poll_results!inner(id, candidate_id, percentage)
    `)
    .eq("election_id", electionId)
    .is("results.excluded_reason", null)
    .or(PROVENIENCIA_PUBLICA)
    .order("publication_date", { ascending: false });
  return data ?? [];
}

export async function getInstitutes() {
  const { data } = await supabase
    .from("institutes")
    .select(`
      *,
      accuracy:institute_accuracy(election_id, mean_absolute_error)
    `)
    .order("reliability_score", { ascending: false });
  return data ?? [];
}

export async function getElectionResults(electionId: string) {
  const { data } = await supabase
    .from("election_results")
    .select("*, candidate:candidates(id, name, party, color, number)")
    .eq("election_id", electionId)
    .order("percentage", { ascending: false });
  return data ?? [];
}

export async function getEconomicIndicators(
  type?: string,
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from("economic_indicators")
    .select("*")
    .order("reference_date", { ascending: true });

  if (type) query = query.eq("indicator_type", type);
  if (startDate) query = query.gte("reference_date", startDate);
  if (endDate) query = query.lte("reference_date", endDate);

  const { data } = await query;
  return data ?? [];
}

export async function getCampaignFinances(electionId: string) {
  const { data } = await supabase
    .from("campaign_finances")
    .select("*, candidate:candidates(id, name, party, color)")
    .eq("election_id", electionId)
    .order("total_received", { ascending: false });
  return data ?? [];
}

/**
 * Prioridade de cargo no desempate quando o mesmo slug aparece em várias
 * eleições (Roberto Claudio, Rogério Marinho — governador E senador no mesmo
 * ciclo). Módulo-level porque agora é usado por getCandidateBySlug e por
 * getCandidateElections.
 */
const TYPE_PRIORITY: Record<string, number> = {
  presidente: 5, governador: 4, senador: 3,
  deputado_federal: 2, deputado_estadual: 1, deputado_distrital: 1,
};

type ElectionRef = {
  id?: string | null;
  name?: string | null;
  type: string | null;
  year: number | null;
  round: number | null;
  state?: string | null;
};

/**
 * Segmento de URL que identifica UMA eleição dentro da página de um candidato:
 * /candidato/<slug>/<segmento>. Ex.: "presidente-2022-2t", "governador-2026-1t".
 *
 * Inclui o `type` de propósito, e não só ano+turno. Uma pessoa pode disputar
 * dois cargos no mesmo ciclo (governador E senador, mesmo year e round) — são
 * ~29 slugs repetidos na base hoje — e "2026-1t" apontaria para as duas linhas.
 * type+year+round é único por pessoa: ninguém concorre duas vezes ao mesmo
 * cargo no mesmo turno. Ancorar o segmento só nos campos da própria eleição
 * também mantém a URL estável: ela não muda se aparecer uma linha irmã depois.
 */
export function electionSegment(e: ElectionRef): string {
  const type = (e.type ?? "eleicao").replace(/_/g, "-");
  return `${type}-${e.year ?? 0}-${e.round ?? 1}t`;
}

function normalizeElection(raw: unknown): ElectionRef | null {
  const e = Array.isArray(raw) ? raw[0] : raw;
  return (e as ElectionRef) ?? null;
}

type IdentidadePessoa = { cpf: string | null; tseId: string | null };

/**
 * Duas linhas são a mesma pessoa? CPF manda quando as duas têm; se falta em
 * alguma, cai para o tse_id.
 *
 * Precisa existir porque slug NÃO identifica pessoa nesta base: 384 slugs ativos
 * cobrem mais de um CPF (o pior, "serginho", cobre 5 pessoas). Sem este filtro o
 * seletor de eleições listaria a candidatura de um homônimo como se fosse desta
 * pessoa — /candidato/carlos-brandao chegou a mostrar "Deputado Federal Goias
 * 2026", que é de outro Carlos Brandão, de outro CPF.
 *
 * Nenhum dos dois campos sozinho resolve: as linhas de 2022 de Lula e Bolsonaro
 * estão sem CPF (só tse_id), e o tse_id de Lula muda entre 2026 1º e 2º turno
 * (só o CPF liga esses dois).
 */
function mesmaPessoa(a: IdentidadePessoa, b: IdentidadePessoa): boolean {
  if (a.cpf && b.cpf) return a.cpf === b.cpf;
  return Boolean(a.tseId && b.tseId && a.tseId === b.tseId);
}

/**
 * Linhas de `candidates` que respondem por um slug, já ordenadas pelo desempate
 * canônico. A primeira é a que /candidato/<slug> serve.
 *
 * Filtra is_active=true primeiro (caso Tarcísio: governador ativo vs presidente
 * inativo). Se nenhuma ativa, faz fallback para o histórico (caso Bolsonaro:
 * sem linha de 2026, mas as de 2022 existem).
 */
async function resolveCandidateRowsBySlug(slug: string) {
  const SELECT = "id, tse_id, cpf, is_active, election:elections(id, name, type, state, year, round)";

  let { data: rows } = await supabase
    .from("candidates")
    .select(SELECT)
    .eq("slug", slug)
    .eq("is_active", true);

  if (!rows?.length) {
    // fallback: histórico (ex.: Bolsonaro pai inativo em 2026 mas registros 2022 ativos)
    const fb = await supabase.from("candidates").select(SELECT).eq("slug", slug);
    rows = fb.data;
    if (!rows?.length) return [];
  }

  // Desempate quando slug aparece em múltiplas eleições:
  //   1) year DESC (mais recente)
  //   2) tem tse_id DESC (registro com candidatura confirmada > registro sem)
  //   3) round DESC (2T > 1T pra mesma eleição)
  //   4) type priority: presidente > governador > senador > deputado_federal > ...
  //   5) id ASC (estável)
  //
  // #2 existe por causa do 2º turno presidencial: a candidatura só é gravada
  // no registro de 1º turno (ver migration fix_tse_stamp_matching), então o
  // registro de 2T é sempre um stub sem tse_id/foto/bio. Sem esse critério,
  // "round DESC" sozinho preferia o stub ao perfil completo — foi o caso
  // descoberto com Flávio Bolsonaro (2026-09-01): /candidato/flavio-bolsonaro
  // passou a resolver pro registro de 2T (12 pesquisas, sem foto) em vez do
  // de 1T (76 pesquisas, perfil completo) assim que ambos ficaram is_active,
  // e chegou a ir pro ar assim em produção antes desse critério existir.
  //
  // #3-4 seguem valendo pro caso Roberto Claudio/Rogério Marinho — mesma
  // pessoa concorrendo a governador E senador no mesmo ciclo, ambos com
  // tse_id (empate em #2), desempatados por round e depois por cargo.
  const TYPE_PRIORITY: Record<string, number> = {
    presidente: 5, governador: 4, senador: 3,
    deputado_federal: 2, deputado_estadual: 1, deputado_distrital: 1,
  };
  return rows
    .map((c) => {
      const e = normalizeElection(c.election);
      return {
        id: c.id as string,
        tseId: (c.tse_id as string | null) ?? null,
        cpf: (c.cpf as string | null) ?? null,
        isActive: Boolean(c.is_active),
        election: e,
        year: e?.year ?? 0,
        hasTse: c.tse_id ? 1 : 0,
        round: e?.round ?? 0,
        prio: TYPE_PRIORITY[e?.type ?? ""] ?? 0,
      };
    })
    .sort((a, b) =>
      (b.year - a.year) ||
      (b.hasTse - a.hasTse) ||
      (b.round - a.round) ||
      (b.prio - a.prio) ||
      a.id.localeCompare(b.id)
    );
}

export type CandidateElectionOption = {
  candidateId: string;
  segment: string;
  election: ElectionRef;
  /** true na eleição que /candidato/<slug> (sem segmento) serve. */
  isPrimary: boolean;
};

/**
 * Todas as eleições da MESMA pessoa por trás de um slug, para o seletor de
 * eleição e para o sitemap.
 *
 * Junta as linhas por dois sinais, porque nenhum dos dois sozinho fecha a
 * conta na base de hoje:
 *
 *  - `slug`: as linhas de 2022 de Lula e Bolsonaro estão com slug NULL e não
 *    apareceriam numa busca por slug. (Preencher slug nelas também não seria
 *    solução: o desempate abaixo é round DESC, então dar "bolsonaro" à linha de
 *    2º turno só trocaria qual turno /candidato/bolsonaro serve.)
 *
 *  - `tse_id`: não é estável por pessoa. Lula tem 280001607829 em 2022 1º, 2022
 *    2º e 2026 1º, mas 280002542548 em 2026 2º — e é justamente essa última que
 *    vence o desempate do slug "lula". Agrupar só por tse_id perderia os turnos
 *    de 2022 inteiros.
 *
 * Então: parte das linhas do slug, coleta os tse_id delas e traz as irmãs desses
 * tse_id. Um salto só. Encadear mais correria o risco de juntar pessoas
 * diferentes através de um tse_id errado.
 *
 * Turnos distintos são eleições distintas nesta base e continuam em linhas
 * separadas de propósito (ver migration 20260819120000): campos de candidatos,
 * pesquisas e election_results diferentes por turno.
 */
export async function getCandidateElections(slug: string): Promise<CandidateElectionOption[]> {
  const seeds = await resolveCandidateRowsBySlug(slug);
  if (!seeds.length) return [];

  const primary = seeds[0];

  // Só as linhas do slug que são a MESMA pessoa da primária. As de homônimo
  // ficam de fora — /candidato/<slug> já serve só uma delas hoje, e o seletor
  // não pode sugerir que as outras são desta pessoa.
  const daPessoa = seeds.filter((r) => r.id === primary.id || mesmaPessoa(primary, r));
  const tseIds = [...new Set(daPessoa.map((r) => r.tseId).filter((t): t is string => Boolean(t)))];
  const cpfs = new Set(daPessoa.map((r) => r.cpf).filter((c): c is string => Boolean(c)));

  type LinhaIrma = { id: string; election: ElectionRef | null };
  const porId = new Map<string, LinhaIrma>();
  for (const r of daPessoa) porId.set(r.id, { id: r.id, election: r.election });

  const IRMAS_SELECT = "id, cpf, is_active, election:elections(id, name, type, state, year, round)";

  // Duas buscas, não uma: `tse_id` NÃO é estável no tempo. Medido ao vivo em
  // 2026-09-01 — o ingest diário do TSE reatribuiu o tse_id da linha de Lula
  // 2026 1º turno (de 280001607829 para 280002542548, igualando ao 2º turno)
  // entre uma sessão e outra, e isso sozinho desconectou as linhas de 2022
  // (que não têm cpf, só tse_id) de quem passou a servir /candidato/lula.
  // Buscar também por cpf sobrevive a esse tipo de drift; buscar só por
  // tse_id, não.
  if (tseIds.length) {
    // Só irmãs ativas quando o slug resolveu por linhas ativas. Sem isso, uma
    // candidatura indeferida (caso Tarcísio: governador ativo, presidente
    // inativo) entraria no seletor como se fosse eleição válida.
    let q = supabase.from("candidates").select(IRMAS_SELECT).in("tse_id", tseIds);
    if (primary.isActive) q = q.eq("is_active", true);

    const { data: irmas } = await q;
    for (const c of irmas ?? []) {
      const id = c.id as string;
      if (porId.has(id)) continue;
      // As irmãs já compartilham tse_id com alguma linha da pessoa por
      // construção. O CPF é a segunda barreira, para o caso de um tse_id
      // repetido entre pessoas diferentes.
      const cpf = (c.cpf as string | null) ?? null;
      if (cpf && cpfs.size && !cpfs.has(cpf)) continue;
      porId.set(id, { id, election: normalizeElection(c.election) });
    }
  }

  if (cpfs.size) {
    let q = supabase.from("candidates").select(IRMAS_SELECT).in("cpf", [...cpfs]);
    if (primary.isActive) q = q.eq("is_active", true);

    // Match direto por cpf já É a identidade da pessoa — sem barreira extra,
    // ao contrário do laço por tse_id acima.
    const { data: irmas } = await q;
    for (const c of irmas ?? []) {
      const id = c.id as string;
      if (porId.has(id)) continue;
      porId.set(id, { id, election: normalizeElection(c.election) });
    }
  }

  const opcoes = [...porId.values()]
    .map((r) =>
      r.election
        ? {
            candidateId: r.id,
            segment: electionSegment(r.election),
            election: r.election,
            isPrimary: r.id === primary.id,
          }
        : null
    )
    .filter((o): o is CandidateElectionOption => o !== null);

  // Mais recente primeiro, mesma ordem do desempate.
  return opcoes.sort((a, b) =>
    ((b.election.year ?? 0) - (a.election.year ?? 0)) ||
    ((b.election.round ?? 0) - (a.election.round ?? 0)) ||
    ((TYPE_PRIORITY[b.election.type ?? ""] ?? 0) - (TYPE_PRIORITY[a.election.type ?? ""] ?? 0)) ||
    a.candidateId.localeCompare(b.candidateId)
  );
}

/**
 * O SELECT completo da página de candidato. Compartilhado por
 * getCandidateBySlug e getCandidateBySlugAndSegment para que as duas rotas
 * rendam exatamente o mesmo shape.
 */
async function fetchCandidateDetail(candidateId: string) {
  const { data } = await supabase
    .from("candidates")
    .select(`
      *,
      election:elections(id, name, type, state, year, round, election_date),
      poll_results(percentage, poll:polls(id, publication_date, sample_size, methodology, institute:institutes(name, slug))),
      election_results(total_votes, percentage, is_elected, result_description),
      campaign_finances(total_received, total_spent, fund_partidario, fund_especial, receita_pf, receita_pj),
      digital_ads(id, platform, page_name, spend_lower, spend_upper, impressions_lower, impressions_upper, delivery_start, creative_text),
      legislative_votes(id, vote_date, bill_title, vote, topic, importance),
      judicial_proceedings(id, process_number, court, process_class, process_subject, current_status, is_relevant, source_url),
      candidate_assets(id, election_year, asset_type_name, description, value_brl),
      candidate_social_media(id, election_year, platform, url, handle),
      candidate_fefc(id, election_year, amount_received, amount_spent, party_acronym),
      prior_election_results(id, year, round, election_type, state, city, party, total_votes, result_status)
    `)
    .eq("id", candidateId)
    .is("poll_results.excluded_reason", null)
    .order("publication_date", { foreignTable: "poll_results.poll", ascending: false })
    .maybeSingle();
  return data;
}

export async function getCandidateBySlug(slug: string) {
  const rows = await resolveCandidateRowsBySlug(slug);
  if (!rows.length) return null;
  return fetchCandidateDetail(rows[0].id);
}

/**
 * /candidato/<slug>/<segmento> — a eleição específica daquela pessoa.
 * Retorna null se o segmento não corresponder a nenhuma eleição dela, para a
 * rota chamar notFound() em vez de servir a eleição errada silenciosamente.
 */
export async function getCandidateBySlugAndSegment(slug: string, segment: string) {
  const opcoes = await getCandidateElections(slug);
  const alvo = opcoes.find((o) => o.segment === segment);
  if (!alvo) return null;
  return fetchCandidateDetail(alvo.candidateId);
}

/**
 * Notícias publicadas linkadas a um candidato ou a uma eleição (feed MVP,
 * curadoria manual via scripts/ingest-news.ts). Sempre status='published' —
 * a RLS já restringe a leitura pública a isso, o filtro aqui só documenta.
 */
export async function getNewsForCandidate(candidateId: string) {
  const { data } = await supabase
    .from("news_item_links")
    .select("news_item:news_items(id, title, source_name, source_url, published_at, summary)")
    .eq("candidate_id", candidateId)
    .eq("news_item.status", "published")
    .order("published_at", { foreignTable: "news_items", ascending: false })
    .limit(5);
  return (data ?? []).map((r) => r.news_item).filter((n): n is NonNullable<typeof n> => n !== null);
}

export async function getNewsForElection(electionId: string) {
  const { data } = await supabase
    .from("news_item_links")
    .select("news_item:news_items(id, title, source_name, source_url, published_at, summary)")
    .eq("election_id", electionId)
    .eq("news_item.status", "published")
    .order("published_at", { foreignTable: "news_items", ascending: false })
    .limit(8);
  return (data ?? []).map((r) => r.news_item).filter((n): n is NonNullable<typeof n> => n !== null);
}

export async function getCandidatesWithBio() {
  const { data } = await supabase
    .from("candidates")
    .select("id, name, slug, party, color, current_position, election:elections(state, type, year)")
    .not("bio", "is", null)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getPartyFunds() {
  const { data } = await supabase
    .from("party_fund_transfers")
    .select("*")
    .order("reference_year", { ascending: false })
    .order("amount", { ascending: false });
  return data ?? [];
}

export async function getDigitalAdsAggregate() {
  const { data } = await supabase
    .from("digital_ads")
    .select(`
      id,
      page_name,
      platform,
      spend_lower,
      spend_upper,
      impressions_lower,
      impressions_upper,
      delivery_start,
      candidate:candidates(id, name, party, color),
      election:elections(id, name, type, state)
    `)
    .order("spend_upper", { ascending: false, nullsFirst: false });
  return data ?? [];
}
