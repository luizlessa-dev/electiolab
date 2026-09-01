/**
 * Backfill de `candidates.slug` para candidatos ativos que têm pesquisa
 * vinculada mas estão sem slug — ou seja, páginas com conteúdo real
 * (/candidato/[slug]) que simplesmente não existem no site nem no sitemap.
 *
 *   npx tsx scripts/backfill-slugs-candidatos.ts            # dry-run (padrão)
 *   npx tsx scripts/backfill-slugs-candidatos.ts --apply    # grava
 *
 * Diferença deliberada em relação a scripts/ingest-tse-candidaturas.ts: lá a
 * unicidade do slug é verificada por `${election.id}:${slug}`, mas a URL
 * /candidato/[slug] é global. É por isso que existem ~400 slugs repetidos na
 * base, com um único registro alcançável por URL. Aqui a unicidade é global.
 *
 * Desempate por UF da eleição (julio-cesar-pi) em vez de sufixo numérico
 * (julio-cesar-2): a URL fica legível e o sufixo diz alguma coisa.
 */
import { createClient } from "@supabase/supabase-js";

const APLICAR = process.argv.includes("--apply");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

/** Mesma implementação de scripts/ingest-tse-candidaturas.ts, para os slugs
 *  novos saírem no mesmo formato dos ~19,9k que já existem. */
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Alvo = {
  id: string;
  name: string | null;
  election: { year: number | null; type: string | null; state: string | null } | null;
};

async function main() {
  console.log(APLICAR ? "⚠️  MODO APPLY — grava no banco\n" : "🔍 DRY-RUN — nada será gravado\n");

  // 1. Todos os slugs já em uso, para garantir unicidade global.
  const emUso = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("candidates")
      .select("slug")
      .not("slug", "is", null)
      .range(from, from + 999);
    if (error) throw new Error(`slugs existentes: ${error.message}`);
    const page = data ?? [];
    for (const r of page) if (r.slug) emUso.add(r.slug);
    if (page.length < 1000) break;
  }
  console.log(`slugs já em uso: ${emUso.size}`);

  // 2. Candidatos ativos, com pesquisa, sem slug.
  // Paginado: poll_results tem ~1,8k linhas e o PostgREST corta em 1000. Sem
  // isso o script enxergava só os primeiros 1000 e "encontrava" 6 alvos.
  const idsComPesquisa = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("poll_results")
      .select("candidate_id")
      .not("candidate_id", "is", null)
      .order("candidate_id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`poll_results: ${error.message}`);
    const page = data ?? [];
    for (const r of page) if (r.candidate_id) idsComPesquisa.add(r.candidate_id as string);
    if (page.length < 1000) break;
  }

  const semSlug: Alvo[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("candidates")
      .select("id,name,election:elections(year,type,state)")
      .eq("is_active", true)
      .is("slug", null)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`candidates: ${error.message}`);
    const page = (data ?? []) as unknown as Alvo[];
    semSlug.push(...page);
    if (page.length < 1000) break;
  }

  const alvos = semSlug.filter((c) => idsComPesquisa.has(c.id));
  console.log(`candidatos ativos, com pesquisa e sem slug: ${alvos.length}\n`);

  // 3. Registros de eleição passada são caso de deduplicação, não de slug:
  //    criar slug para eles publicaria uma segunda página da mesma pessoa.
  const doAnoCorrente = alvos.filter((c) => c.election?.year === 2026);
  const anteriores = alvos.filter((c) => c.election?.year !== 2026);

  if (anteriores.length) {
    console.log(`⏭️  ${anteriores.length} de eleição anterior — PULADOS (ver relatório de duplicatas):`);
    for (const c of anteriores) {
      console.log(`   ${c.name} (${c.election?.year} ${c.election?.type})`);
    }
    console.log();
  }

  // 4. Gera slug único global, desempatando por UF.
  const plano: Array<{ id: string; name: string; slug: string; nota: string }> = [];
  for (const c of doAnoCorrente) {
    if (!c.name) {
      console.log(`⚠️  ${c.id} sem name — pulado`);
      continue;
    }
    const base = slugify(c.name);
    if (!base) {
      console.log(`⚠️  ${c.id} ("${c.name}") gera slug vazio — pulado`);
      continue;
    }

    let slug = base;
    let nota = "";
    const uf = c.election?.state?.toLowerCase();

    if (emUso.has(slug)) {
      if (uf && !emUso.has(`${base}-${uf}`)) {
        slug = `${base}-${uf}`;
        nota = `colisão com "${base}" → desempate por UF`;
      } else {
        let n = 2;
        while (emUso.has(`${base}-${n}`)) n++;
        slug = `${base}-${n}`;
        nota = `colisão com "${base}" → sufixo numérico`;
      }
    }

    emUso.add(slug);
    plano.push({ id: c.id, name: c.name, slug, nota });
  }

  console.log(`=== ${plano.length} slugs a gravar ===`);
  for (const p of plano) {
    console.log(`  ${p.name.padEnd(28)} → ${p.slug}${p.nota ? `   (${p.nota})` : ""}`);
  }

  if (!APLICAR) {
    console.log("\n🔍 dry-run: nada gravado. Rode com --apply para aplicar.");
    return;
  }

  let ok = 0;
  for (const p of plano) {
    // Guarda de corrida: só grava se o slug ainda estiver nulo.
    const { error } = await supabase
      .from("candidates")
      .update({ slug: p.slug })
      .eq("id", p.id)
      .is("slug", null);
    if (error) {
      console.error(`❌ ${p.name}: ${error.message}`);
      continue;
    }
    ok++;
  }
  console.log(`\n✅ ${ok}/${plano.length} slugs gravados.`);
  console.log("Revalide o sitemap: POST /api/revalidate?path=ALL");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
