#!/usr/bin/env npx tsx
/**
 * Guarda contra regressão: falha (exit 1) se algum `candidates.slug` ativo
 * cobrir mais de uma pessoa.
 *
 * A causa histórica era `scripts/ingest-tse-candidaturas.ts` gerando slug
 * único só DENTRO da própria eleição — corrigido, mas nada no schema garante
 * isso hoje (não dá para expressar como unique index simples: slug repetido é
 * LEGÍTIMO para a MESMA pessoa em eleições diferentes, ex. Lula tem slug
 * "lula" em 2026 1º e 2º turno). Ver scripts/lib/candidate-slug.ts e
 * scripts/fix-slugs-homonimos.ts (correção one-off já aplicada ao histórico).
 *
 * Rodado no CI logo após o ingest diário do TSE
 * (.github/workflows/ingest-tse-candidaturas.yml) — se accusar colisão, o job
 * falha e a issue automática de "cron failure" já existente abre sozinha.
 *
 * Uso: npx tsx scripts/check-slug-collisions.ts
 */
import { createClient } from "@supabase/supabase-js";
import { pessoaKey } from "./lib/candidate-slug";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const rows: Array<{ id: string; slug: string; cpf: string | null; tse_id: string | null; name: string | null }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("candidates")
      .select("id,slug,cpf,tse_id,name")
      .eq("is_active", true)
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`candidates: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }

  const porSlug = new Map<string, typeof rows>();
  for (const r of rows) {
    const g = porSlug.get(r.slug);
    if (g) g.push(r);
    else porSlug.set(r.slug, [r]);
  }

  const colisoes = [...porSlug.entries()].filter(([, g]) => new Set(g.map(pessoaKey)).size > 1);

  if (!colisoes.length) {
    console.log(`✅ ${rows.length} candidatos ativos com slug, 0 colisões entre pessoas diferentes.`);
    return;
  }

  console.error(`❌ ${colisoes.length} slug(s) cobrindo mais de uma pessoa:\n`);
  for (const [slug, g] of colisoes) {
    console.error(`   /candidato/${slug}:`);
    for (const r of g) console.error(`      ${r.name} (cpf=${r.cpf ?? "—"} tse_id=${r.tse_id ?? "—"})`);
  }
  console.error("\nRodar: npx tsx scripts/fix-slugs-homonimos.ts --apply");
  process.exit(1);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
