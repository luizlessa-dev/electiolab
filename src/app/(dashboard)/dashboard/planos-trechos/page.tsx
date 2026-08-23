import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdmin } from "./is-admin";
import { PlanosTrechosClient } from "./planos-trechos-client";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
type Status = "pendente" | "aprovado" | "rejeitado";

function admin() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

type TemaOverview = { id: string; slug: string; nome: string; ordem: number; pendentes: number };

async function getOverview(): Promise<TemaOverview[]> {
  const sb = admin();
  const [{ data: temas }, { data: counts }] = await Promise.all([
    sb.from("tema").select("id, slug, nome, ordem").order("ordem"),
    sb.rpc("get_plano_trecho_status_counts", { p_status: "pendente" }),
  ]);
  const countByTema = new Map((counts ?? []).map((c) => [c.tema_id, c.total]));
  return (temas ?? []).map((t) => ({ ...t, pendentes: Number(countByTema.get(t.id) ?? 0) }));
}

export type TrechoRow = {
  id: string;
  pagina: number;
  texto: string;
  status: Status;
  revisado_por: string | null;
  revisado_em: string | null;
  candidato_nome: string;
  url_origem: string;
};

async function getTemaDetail(temaSlug: string, status: Status, page: number) {
  const sb = admin();
  const { data: tema } = await sb.from("tema").select("id, slug, nome, descricao_escopo").eq("slug", temaSlug).maybeSingle();
  if (!tema) return null;

  const from = (page - 1) * PAGE_SIZE;
  const { data: trechos, count } = await sb
    .from("plano_trecho")
    .select("id, plano_id, pagina, texto, status, revisado_por, revisado_em", { count: "exact" })
    .eq("tema_id", tema.id)
    .eq("status", status)
    .order("pagina", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const planoIds = [...new Set((trechos ?? []).map((t) => t.plano_id))];
  const { data: planos } = await sb.from("plano_governo").select("id, candidato_id, url_origem").in("id", planoIds);
  const candidatoIds = [...new Set((planos ?? []).map((p) => p.candidato_id))];
  const { data: candidatos } = await sb.from("candidates").select("id, name").in("id", candidatoIds);

  const candidatoNomeById = new Map((candidatos ?? []).map((c) => [c.id, c.name]));
  const planoById = new Map((planos ?? []).map((p) => [p.id, p]));

  const rows: TrechoRow[] = (trechos ?? []).map((t) => {
    const plano = planoById.get(t.plano_id);
    return {
      id: t.id,
      pagina: t.pagina,
      texto: t.texto,
      status: t.status as Status,
      revisado_por: t.revisado_por,
      revisado_em: t.revisado_em,
      candidato_nome: (plano && candidatoNomeById.get(plano.candidato_id)) ?? "?",
      url_origem: plano?.url_origem ?? "",
    };
  });

  return { tema, rows, total: count ?? 0, page, pageSize: PAGE_SIZE };
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
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  if (!temaSlug) {
    const overview = await getOverview();
    return <PlanosTrechosClient view={{ kind: "overview", temas: overview }} />;
  }

  const detail = await getTemaDetail(temaSlug, status, page);
  if (!detail) {
    redirect("/dashboard/planos-trechos");
  }
  return <PlanosTrechosClient view={{ kind: "detail", ...detail, status }} />;
}
