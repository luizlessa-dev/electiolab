/**
 * Acesso server-side a `politicians` / `politician_links` (ElectioLab).
 *
 * Usa a service role (`supabaseAdmin`) porque o anon só lê id/slug/display_name
 * de `politicians` e nada de `politician_links` (CPF não sai pela API pública).
 * Importar só de Server Components e rotas; nunca de código que vai ao browser.
 *
 * Erro de banco propaga (não vira "não achei"): em ISR isso mantém a página
 * anterior em cache em vez de gravar um 404 falso por 7 dias.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Politico = {
  id: string;
  slug: string;
  displayName: string;
  /** 11 dígitos. Não exibir; serve só para ligar ao TF. */
  cpf: string;
};

type LinhaPolitico = { id: string; slug: string; display_name: string; cpf: string };

const toPolitico = (r: LinhaPolitico): Politico => ({
  id: r.id,
  slug: r.slug,
  displayName: r.display_name,
  cpf: r.cpf,
});

export async function getPoliticoBySlug(slug: string): Promise<Politico | null> {
  const { data, error } = await supabaseAdmin
    .from("politicians")
    .select("id, slug, display_name, cpf")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toPolitico(data as LinhaPolitico) : null;
}

/** A pessoa por trás de uma linha de `candidates` (vínculo exato por CPF, nunca por nome). */
export async function getPoliticoByCandidateId(candidateId: string): Promise<Politico | null> {
  const { data, error } = await supabaseAdmin
    .from("politician_links")
    .select("politician:politicians(id, slug, display_name, cpf)")
    .eq("system", "candidates")
    .eq("external_id", candidateId)
    .maybeSingle();
  if (error) throw error;
  const p = (data as { politician: LinhaPolitico | LinhaPolitico[] | null } | null)?.politician;
  const linha = Array.isArray(p) ? p[0] : p;
  return linha ? toPolitico(linha) : null;
}

/** Ids das linhas de `candidates` ligadas a esta pessoa. */
export async function getCandidateIdsDaPessoa(politicoId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("politician_links")
    .select("external_id")
    .eq("politician_id", politicoId)
    .eq("system", "candidates");
  if (error) throw error;
  return (data ?? []).map((r) => (r as { external_id: string }).external_id);
}
