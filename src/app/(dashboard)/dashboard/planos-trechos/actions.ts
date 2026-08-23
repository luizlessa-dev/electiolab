"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "./is-admin";
import type { Database } from "@/types/database.types";

// Diferente do padrão de dashboard/drafts (API route + INGEST_SECRET_KEY
// compartilhado, desconectado da sessão — por isso `reviewed_by` nunca é
// preenchido lá, ver auditoria de 2026-08-23): Server Action roda com a
// mesma sessão da página, então dá pra gravar revisado_por = e-mail real de
// quem clicou, não um segredo que qualquer um com o token poderia usar.
async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    throw new Error("Não autorizado");
  }
  return user;
}

function adminDb() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function aprovarTrecho(id: string) {
  const user = await requireAdmin();
  const sb = adminDb();
  const { error } = await sb
    .from("plano_trecho")
    .update({ status: "aprovado", revisado_por: user.email, revisado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/planos-trechos");
}

export async function rejeitarTrecho(id: string) {
  const user = await requireAdmin();
  const sb = adminDb();
  const { error } = await sb
    .from("plano_trecho")
    .update({ status: "rejeitado", revisado_por: user.email, revisado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/planos-trechos");
}

// Edição não muda status por si — é um ajuste de recorte (spec: "eu aprovo,
// rejeito ou edito"), decisão de aprovar/rejeitar continua sendo um clique
// separado, mesmo depois de editar.
export async function editarTrecho(id: string, novoTexto: string) {
  await requireAdmin();
  const texto = novoTexto.trim();
  if (!texto) throw new Error("Texto não pode ficar vazio");
  const sb = adminDb();
  const { error } = await sb.from("plano_trecho").update({ texto }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/planos-trechos");
}
