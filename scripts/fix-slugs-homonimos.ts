#!/usr/bin/env npx tsx
/**
 * Correção one-off: dá slug próprio a pessoas que hoje dividem o mesmo slug
 * com um homônimo.
 *
 * `scripts/ingest-tse-candidaturas.ts` garantia unicidade de slug só DENTRO da
 * mesma eleição (`${election.id}:${slug}`), enquanto a URL /candidato/[slug] é
 * global — dois homônimos em eleições diferentes (ex.: dois "Serginho", um
 * deputado estadual SC, outro deputado federal SP) recebiam o mesmo slug e só
 * um ficava alcançável. Já corrigido na origem (ver import de
 * scripts/lib/candidate-slug.ts nesse arquivo); este script conserta o
 * histórico já gravado com o bug. Medido em 2026-09-01: 386 slugs cobrindo
 * mais de uma pessoa, 446 pessoas sem URL própria.
 *
 * Quem fica com o slug "nu" quando duas pessoas colidem: prioridade de cargo
 * (presidente > governador > senador > deputado), não a pessoa que a rota
 * serve hoje. Isso troca o dono do slug em 2 casos — "ciro" e "augusto-cury" —
 * porque a rota hoje desempata por ano (2026 > 2022) e serve um deputado
 * estadual de 2026 em vez do presidenciável de 2022. O relatório abaixo lista
 * essas trocas à parte, antes de gravar.
 *
 * Uso:
 *   npx tsx scripts/fix-slugs-homonimos.ts            # dry-run (padrão)
 *   npx tsx scripts/fix-slugs-homonimos.ts --apply    # grava
 *
 * Depois de aplicar: POST /api/revalidate?path=ALL — o sitemap ganha ~440
 * URLs novas e /candidato/<slug> passa a servir outra pessoa nos 2 casos de
 * troca de dono.
 */
import { createClient } from "@supabase/supabase-js";
import { escolherSlugUnico, ordenarPorPrioridade, pessoaKey, type EleicaoRef } from "./lib/candidate-slug";

const APLICAR = process.argv.includes("--apply");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

type Linha = {
  id: string;
  slug: string;
  cpf: string | null;
  tse_id: string | null;
  name: string | null;
  election: EleicaoRef | null;
};

/**
 * Mesmo desempate de src/lib/queries.ts (resolveCandidateRowsBySlug): year
 * DESC, round DESC, prioridade de cargo, id ASC. É quem /candidato/<slug>
 * serve HOJE — usado só para detectar e destacar os casos em que o dono do
 * slug muda (o desempate deste script é por cargo primeiro, não por ano).
 */
const TYPE_PRIORITY_ATUAL: Record<string, number> = {
  presidente: 5, governador: 4, senador: 3,
  deputado_federal: 2, deputado_estadual: 1, deputado_distrital: 1,
};

function donoAtual(grupo: Linha[]): Linha {
  return [...grupo].sort((a, b) => {
    const ea = a.election;
    const eb = b.election;
    return (
      (eb?.year ?? 0) - (ea?.year ?? 0) ||
      (eb?.round ?? 0) - (ea?.round ?? 0) ||
      (TYPE_PRIORITY_ATUAL[eb?.type ?? ""] ?? 0) - (TYPE_PRIORITY_ATUAL[ea?.type ?? ""] ?? 0) ||
      a.id.localeCompare(b.id)
    );
  })[0];
}

async function main() {
  console.log(APLICAR ? "⚠️  MODO APPLY — grava no banco\n" : "🔍 DRY-RUN — nada será gravado\n");

  const rows: Linha[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("candidates")
      .select("id,slug,cpf,tse_id,name,election:elections(type,state,year,round)")
      .eq("is_active", true)
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`candidates: ${error.message}`);
    const page = (data ?? []).map((r) => ({
      ...r,
      election: (Array.isArray(r.election) ? r.election[0] : r.election) ?? null,
    })) as Linha[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  console.log(`candidatos ativos com slug: ${rows.length}`);

  const emUso = new Set(rows.map((r) => r.slug));

  const porSlug = new Map<string, Linha[]>();
  for (const r of rows) {
    const g = porSlug.get(r.slug);
    if (g) g.push(r);
    else porSlug.set(r.slug, [r]);
  }

  type Renome = { id: string; name: string; de: string; para: string };
  const renomes: Renome[] = [];
  const trocasDeDono: Array<{ slug: string; antes: string; depois: string }> = [];

  for (const [slug, grupo] of porSlug) {
    if (new Set(grupo.map(pessoaKey)).size <= 1) continue; // sem colisão de pessoa

    const ordenado = ordenarPorPrioridade(grupo);
    const dono = pessoaKey(ordenado[0]);

    const atual = donoAtual(grupo);
    if (pessoaKey(atual) !== dono) {
      trocasDeDono.push({ slug, antes: atual.name ?? "?", depois: ordenado[0].name ?? "?" });
    }

    // Uma pessoa pode ter mais de uma linha sob o mesmo slug colidido (ex.:
    // dois turnos dela). Todas as linhas dela recebem o MESMO slug novo.
    const novoSlugPorPessoa = new Map<string, string>();
    for (const r of ordenado) {
      const p = pessoaKey(r);
      if (p === dono) continue;
      let novo = novoSlugPorPessoa.get(p);
      if (!novo) {
        novo = escolherSlugUnico(slug, r.election, emUso);
        emUso.add(novo);
        novoSlugPorPessoa.set(p, novo);
      }
      renomes.push({ id: r.id, name: r.name ?? "(sem nome)", de: slug, para: novo });
    }
  }

  console.log(`slugs colidindo entre pessoas diferentes: ${porSlug.size ? [...porSlug.values()].filter((g) => new Set(g.map(pessoaKey)).size > 1).length : 0}`);
  console.log(`linhas a renomear: ${renomes.length}\n`);

  if (trocasDeDono.length) {
    console.log(`⚠️  ${trocasDeDono.length} slug(s) trocam de dono — /candidato/<slug> passa a servir outra pessoa:`);
    for (const t of trocasDeDono) {
      console.log(`   /candidato/${t.slug}: "${t.antes}" (servido hoje) → "${t.depois}" (prioridade de cargo)`);
    }
    console.log();
  }

  console.log("=== renomeações ===");
  for (const r of renomes) {
    console.log(`  ${r.name.padEnd(28)} /candidato/${r.de.padEnd(20)} → /candidato/${r.para}`);
  }

  if (!APLICAR) {
    console.log("\n🔍 dry-run: nada gravado. Rode com --apply para aplicar.");
    return;
  }

  let ok = 0;
  for (const r of renomes) {
    // Guarda de corrida: só grava se o slug ainda for o mesmo que geramos o
    // plano em cima. Se outro processo já mudou, pula em vez de sobrescrever.
    const { error } = await supabase
      .from("candidates")
      .update({ slug: r.para })
      .eq("id", r.id)
      .eq("slug", r.de);
    if (error) {
      console.error(`❌ ${r.name}: ${error.message}`);
      continue;
    }
    ok++;
  }
  console.log(`\n✅ ${ok}/${renomes.length} slugs gravados.`);
  console.log("Revalide o sitemap: POST /api/revalidate?path=ALL");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
