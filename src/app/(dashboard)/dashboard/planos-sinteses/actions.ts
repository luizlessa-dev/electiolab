"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "../planos-trechos/is-admin";
import type { Database } from "@/types/database.types";

// Mesmo padrão de src/app/(dashboard)/dashboard/planos-trechos/actions.ts —
// Server Action com sessão real, não secret compartilhado, pra revisado_por
// gravar o e-mail de quem de fato aprovou.
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

export async function aprovarSintese(id: string) {
  const user = await requireAdmin();
  const sb = adminDb();
  const { error } = await sb
    .from("plano_sintese")
    .update({ status: "aprovado", revisado_por: user.email, revisado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/planos-sinteses");
}

export async function rejeitarSintese(id: string) {
  const user = await requireAdmin();
  const sb = adminDb();
  const { error } = await sb
    .from("plano_sintese")
    .update({ status: "rejeitado", revisado_por: user.email, revisado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/planos-sinteses");
}

export async function editarSintese(id: string, novoTexto: string) {
  await requireAdmin();
  const texto = novoTexto.trim();
  if (!texto) throw new Error("Texto não pode ficar vazio");
  const sb = adminDb();
  const { error } = await sb.from("plano_sintese").update({ texto }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/planos-sinteses");
}
