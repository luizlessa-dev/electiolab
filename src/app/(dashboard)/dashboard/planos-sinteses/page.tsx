import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdmin } from "../planos-trechos/is-admin";
import { PlanosSintesesClient } from "./planos-sinteses-client";
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
  const [{ data: temas }, { data: sinteses }] = await Promise.all([
    sb.from("tema").select("id, slug, nome, ordem").order("ordem"),
    // plano_sintese é pequeno por natureza (no máximo candidatos × temas) —
    // não precisa de RPC de contagem como plano_trecho, um select cobre tudo.
    sb.from("plano_sintese").select("tema_id, status").range(0, 4999),
  ]);
  const counts = new Map<string, { pendentes: number; aprovados: number; rejeitados: number }>();
  for (const s of sinteses ?? []) {
    const c = counts.get(s.tema_id) ?? { pendentes: 0, aprovados: 0, rejeitados: 0 };
    if (s.status === "pendente") c.pendentes++;
    else if (s.status === "aprovado") c.aprovados++;
    else if (s.status === "rejeitado") c.rejeitados++;
    counts.set(s.tema_id, c);
  }
  return (temas ?? []).map((t) => ({
    ...t,
    pendentes: counts.get(t.id)?.pendentes ?? 0,
    aprovados: counts.get(t.id)?.aprovados ?? 0,
    rejeitados: counts.get(t.id)?.rejeitados ?? 0,
  }));
}

export type Sintese = {
  id: string;
  texto: string;
  texto_estendido: string;
  paginas_referencia: number[];
  status: Status;
  revisado_por: string | null;
  revisado_em: string | null;
};

export type CandidatoSintese = {
  candidato_id: string;
  candidato_nome: string;
  url_origem: string;
  sintese: Sintese;
  trechosFonte: { pagina: number; texto: string }[];
};

async function getTemaDetail(temaSlug: string, status: Status): Promise<{
  tema: { id: string; slug: string; nome: string; descricao_escopo: string };
  candidatos: CandidatoSintese[];
} | null> {
  const sb = admin();
  const { data: tema } = await sb.from("tema").select("id, slug, nome, descricao_escopo").eq("slug", temaSlug).maybeSingle();
  if (!tema) return null;

  const { data: sinteses } = await sb
    .from("plano_sintese")
    .select("id, plano_id, texto, texto_estendido, paginas_referencia, status, revisado_por, revisado_em")
    .eq("tema_id", tema.id)
    .eq("status", status)
    .range(0, 999);

  const planoIds = [...new Set((sinteses ?? []).map((s) => s.plano_id))];
  const [{ data: planos }, { data: trechos }] = await Promise.all([
    sb.from("plano_governo").select("id, candidato_id, url_origem").in("id", planoIds),
    sb
      .from("plano_trecho")
      .select("plano_id, pagina, texto")
      .eq("tema_id", tema.id)
      .in("plano_id", planoIds)
      .neq("status", "rejeitado")
      .order("pagina", { ascending: true })
      .range(0, 4999),
  ]);
  const candidatoIds = [...new Set((planos ?? []).map((p) => p.candidato_id))];
  const { data: candidatosRaw } = await sb.from("candidates").select("id, name").in("id", candidatoIds);

  const candidatoById = new Map((candidatosRaw ?? []).map((c) => [c.id, c]));
  const planoById = new Map((planos ?? []).map((p) => [p.id, p]));
  const trechosPorPlano = new Map<string, { pagina: number; texto: string }[]>();
  for (const t of trechos ?? []) {
    const arr = trechosPorPlano.get(t.plano_id) ?? [];
    arr.push({ pagina: t.pagina, texto: t.texto });
    trechosPorPlano.set(t.plano_id, arr);
  }

  const candidatos: CandidatoSintese[] = (sinteses ?? [])
    .map((s) => {
      const plano = planoById.get(s.plano_id);
      if (!plano) return null;
      const candidato = candidatoById.get(plano.candidato_id);
      return {
        candidato_id: plano.candidato_id,
        candidato_nome: candidato?.name ?? "?",
        url_origem: plano.url_origem,
        sintese: {
          id: s.id,
          texto: s.texto,
          texto_estendido: s.texto_estendido ?? s.texto,
          paginas_referencia: s.paginas_referencia ?? [],
          status: s.status as Status,
          revisado_por: s.revisado_por,
          revisado_em: s.revisado_em,
        },
        trechosFonte: trechosPorPlano.get(s.plano_id) ?? [],
      };
    })
    .filter((c): c is CandidatoSintese => c !== null)
    // Alfabético — mesma regra editorial da página pública, nunca por volume/relevância.
    .sort((a, b) => a.candidato_nome.localeCompare(b.candidato_nome, "pt-BR"));

  return { tema, candidatos };
}

export default async function PlanosSintesesPage({
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
    return <PlanosSintesesClient view={{ kind: "overview", temas: overview }} />;
  }

  const detail = await getTemaDetail(temaSlug, status);
  if (!detail) {
    redirect("/dashboard/planos-sinteses");
  }
  return <PlanosSintesesClient view={{ kind: "detail", ...detail, status }} />;
}
