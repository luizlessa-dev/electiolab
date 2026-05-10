/**
 * Queries para páginas históricas de eleição (`/eleicao-2018`, `/eleicao-2022`).
 *
 * Estratégia: faz uma única leitura paginada de `prior_election_results` para
 * o ano em questão e agrega por (candidato × cargo × UF) em memória. Cacheado
 * pelo ISR da rota chamadora (revalidate = 86400).
 */
import { createClient } from "@supabase/supabase-js";

export const HISTORIC_OFFICE_LABELS: Record<string, string> = {
  governador: "Governador",
  senador: "Senador",
  deputado_federal: "Deputado Federal",
  deputado_estadual: "Deputado Estadual",
  deputado_distrital: "Deputado Distrital",
  presidente: "Presidente",
};

const STATUS_RANK = ["eleito", "2t_disputou", "suplente", "renunciou", "cassado", "nao_eleito"];

export type HistoricResult = {
  candidate_id: string;
  candidate_name: string;
  candidate_slug: string;
  election_type: string;
  state: string;
  party: string;
  total_votes: number;
  result_status: string;
};

export type HistoricElectionData = {
  year: number;
  totalRows: number;
  byOffice: Record<string, HistoricResult[]>;
  byOfficeAndState: Record<string, Record<string, HistoricResult[]>>;
  electedCount: number;
};

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function getHistoricElectionData(year: number, stateFilter?: string): Promise<HistoricElectionData> {
  const sb = publicClient();
  const PAGE = 1000;
  const rows: Array<{
    candidate_id: string;
    election_type: string;
    state: string;
    party: string;
    total_votes: number;
    result_status: string;
    round: number;
    candidate: { name: string; slug: string } | { name: string; slug: string }[] | null;
  }> = [];

  for (let from = 0; from < 200_000; from += PAGE) {
    let q = sb
      .from("prior_election_results")
      .select("candidate_id, election_type, state, party, total_votes, result_status, round, candidate:candidates(name, slug)")
      .eq("year", year)
      .eq("round", 1)
      .range(from, from + PAGE - 1);
    if (stateFilter) q = q.eq("state", stateFilter);
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as typeof rows));
    if (data.length < PAGE) break;
  }

  // Agrega por (candidate_id, election_type, state) somando total_votes.
  const map = new Map<string, HistoricResult>();
  for (const r of rows) {
    const cand = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
    if (!cand?.slug) continue; // candidato sem perfil ativo — pula

    const key = `${r.candidate_id}|${r.election_type}|${r.state}`;
    const cur = map.get(key);
    if (cur) {
      cur.total_votes += r.total_votes ?? 0;
      // mantém o melhor status (eleito > 2t_disputou > ...)
      if (STATUS_RANK.indexOf(r.result_status) < STATUS_RANK.indexOf(cur.result_status)) {
        cur.result_status = r.result_status;
      }
    } else {
      map.set(key, {
        candidate_id: r.candidate_id,
        candidate_name: cand.name,
        candidate_slug: cand.slug,
        election_type: r.election_type,
        state: r.state,
        party: r.party ?? "",
        total_votes: r.total_votes ?? 0,
        result_status: r.result_status ?? "nao_eleito",
      });
    }
  }

  // Ordena por votos desc dentro de cargo
  const all = [...map.values()].sort((a, b) => b.total_votes - a.total_votes);

  const byOffice: Record<string, HistoricResult[]> = {};
  const byOfficeAndState: Record<string, Record<string, HistoricResult[]>> = {};
  let electedCount = 0;

  for (const r of all) {
    if (!byOffice[r.election_type]) byOffice[r.election_type] = [];
    byOffice[r.election_type].push(r);

    if (!byOfficeAndState[r.election_type]) byOfficeAndState[r.election_type] = {};
    if (!byOfficeAndState[r.election_type][r.state]) byOfficeAndState[r.election_type][r.state] = [];
    byOfficeAndState[r.election_type][r.state].push(r);

    if (r.result_status === "eleito") electedCount++;
  }

  return {
    year,
    totalRows: rows.length,
    byOffice,
    byOfficeAndState,
    electedCount,
  };
}

export function formatVotes(n: number): string {
  return n.toLocaleString("pt-BR");
}

export function statusLabel(s: string): string {
  switch (s) {
    case "eleito": return "Eleito";
    case "2t_disputou": return "Disputou 2º Turno";
    case "suplente": return "Suplente";
    case "renunciou": return "Renunciou";
    case "cassado": return "Cassado";
    default: return "Não Eleito";
  }
}
