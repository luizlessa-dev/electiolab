import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdmin } from "./is-admin";
import { PlanosTrechosClient } from "./planos-trechos-client";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

type Status = "pendente" | "aprovado" | "rejeitado";

function admin() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

type TemaOverview = {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  pendentes: number;
  aprovados: number;
  rejeitados: number;
};

async function getOverview(): Promise<TemaOverview[]> {
  const sb = admin();
  const [{ data: temas }, { data: pendentes }, { data: aprovados }, { data: rejeitados }] = await Promise.all([
    sb.from("tema").select("id, slug, nome, ordem").order("ordem"),
    sb.rpc("get_plano_trecho_status_counts", { p_status: "pendente" }),
    sb.rpc("get_plano_trecho_status_counts", { p_status: "aprovado" }),
    sb.rpc("get_plano_trecho_status_counts", { p_status: "rejeitado" }),
  ]);
  const toMap = (rows: typeof pendentes) => new Map((rows ?? []).map((c) => [c.tema_id, Number(c.total)]));
  const pendentesByTema = toMap(pendentes);
  const aprovadosByTema = toMap(aprovados);
  const rejeitadosByTema = toMap(rejeitados);
  return (temas ?? []).map((t) => ({
    ...t,
    pendentes: pendentesByTema.get(t.id) ?? 0,
    aprovados: aprovadosByTema.get(t.id) ?? 0,
    rejeitados: rejeitadosByTema.get(t.id) ?? 0,
  }));
}

export type Trecho = {
  id: string;
  pagina: number;
  texto: string;
  status: Status;
  revisado_por: string | null;
  revisado_em: string | null;
};

export type CandidatoBlock = {
  candidato_id: string;
  candidato_nome: string;
  photo_url: string | null;
  url_origem: string;
  trechos: Trecho[];
};

// Sem paginação por trecho — agrupa por candidato (mais parecido com a
// página pública final: tema → bloco por candidato). Volume por tema hoje é
// no máximo ~350 trechos (bem abaixo dos 1000 do cap do PostgREST); .range()
// explícito documenta esse teto em vez de confiar no limite implícito.
async function getTemaDetail(temaSlug: string, status: Status): Promise<{
  tema: { id: string; slug: string; nome: string; descricao_escopo: string };
  blocks: CandidatoBlock[];
} | null> {
  const sb = admin();
  const { data: tema } = await sb.from("tema").select("id, slug, nome, descricao_escopo").eq("slug", temaSlug).maybeSingle();
  if (!tema) return null;

  const { data: trechos } = await sb
    .from("plano_trecho")
    .select("id, plano_id, pagina, texto, status, revisado_por, revisado_em")
    .eq("tema_id", tema.id)
    .eq("status", status)
    .order("pagina", { ascending: true })
    .range(0, 999);

  const planoIds = [...new Set((trechos ?? []).map((t) => t.plano_id))];
  const { data: planos } = await sb.from("plano_governo").select("id, candidato_id, url_origem").in("id", planoIds);
  const candidatoIds = [...new Set((planos ?? []).map((p) => p.candidato_id))];
  const { data: candidatos } = await sb.from("candidates").select("id, name, photo_url").in("id", candidatoIds);

  const candidatoById = new Map((candidatos ?? []).map((c) => [c.id, c]));
  const planoById = new Map((planos ?? []).map((p) => [p.id, p]));

  const blockByCandidato = new Map<string, CandidatoBlock>();
  for (const t of trechos ?? []) {
    const plano = planoById.get(t.plano_id);
    if (!plano) continue;
    const candidato = candidatoById.get(plano.candidato_id);
    let block = blockByCandidato.get(plano.candidato_id);
    if (!block) {
      block = {
        candidato_id: plano.candidato_id,
        candidato_nome: candidato?.name ?? "?",
        photo_url: candidato?.photo_url ?? null,
        url_origem: plano.url_origem,
        trechos: [],
      };
      blockByCandidato.set(plano.candidato_id, block);
    }
    block.trechos.push({
      id: t.id,
      pagina: t.pagina,
      texto: t.texto,
      status: t.status as Status,
      revisado_por: t.revisado_por,
      revisado_em: t.revisado_em,
    });
  }

  // Alfabético — mesma regra editorial da página pública, nunca por volume/relevância.
  const blocks = [...blockByCandidato.values()].sort((a, b) =>
    a.candidato_nome.localeCompare(b.candidato_nome, "pt-BR")
  );

  return { tema, blocks };
}

export default async function PlanosTrechosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const temaSlug = typeof sp.tema === "string" ? sp.tema : undefined;
  const status = (typeof sp.status === "string" ? sp.status : "pendente") as Status;

  if (!temaSlug) {
    const overview = await getOverview();
    return <PlanosTrechosClient view={{ kind: "overview", temas: overview }} />;
  }

  const detail = await getTemaDetail(temaSlug, status);
  if (!detail) {
    redirect("/dashboard/planos-trechos");
  }
  return <PlanosTrechosClient view={{ kind: "detail", ...detail, status }} />;
}
