#!/usr/bin/env npx tsx
/**
 * Verifica, SÓ COM LEITURA e em memória, o que a rota por pessoa (ROTA_POLITICIANS=1)
 * faria em cada URL, antes de ligar a flag em produção:
 *
 *  1. Cada slug de candidatura: serve a linha X (mesmo desempate da página); X é de uma
 *     pessoa cujo slug é outro? Então redireciona. O destino não pode redirecionar de novo
 *     (cadeia) nem voltar ao ponto de partida (laço).
 *  2. Cada slug de pessoa: tem página (linha de candidates com o slug, candidaturas por
 *     vínculo, ou parlamentar no TF)? Senão seria 404.
 *
 * Uso: npx tsx scripts/check-rota-politicians.ts
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ElectioLab, só leitura).
 * O relatório completo (com CPFs de ninguém: só slugs) vai para o tmp do sistema.
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}
const el = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fetchAll<T>(
  pagina: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await pagina(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

type Cand = { id: string; slug: string | null; tse_id: string | null; cpf: string | null; is_active: boolean | null; election: unknown };

async function main() {
  // Import dinâmico: queries.ts cria o client Supabase ao ser carregado, e o .env.local já foi lido acima.
  const { rankCandidateRows } = await import("../src/lib/queries");
  const [cands, links, pols] = await Promise.all([
    fetchAll<Cand>((a, b) =>
      el
        .from("candidates")
        .select("id, slug, tse_id, cpf, is_active, election:elections(id, name, type, state, year, round)")
        .order("id")
        .range(a, b),
    ),
    fetchAll<{ politician_id: string; system: string; external_id: string }>((a, b) =>
      el.from("politician_links").select("politician_id, system, external_id").order("id").range(a, b),
    ),
    fetchAll<{ id: string; slug: string }>((a, b) => el.from("politicians").select("id, slug").order("id").range(a, b)),
  ]);

  const slugDaPessoa = new Map(pols.map((p) => [p.id, p.slug]));
  const pessoaDaLinha = new Map<string, string>(); // candidate id -> politician id
  const candidaturasDaPessoa = new Map<string, string[]>();
  for (const l of links) {
    if (l.system !== "candidates") continue;
    pessoaDaLinha.set(l.external_id, l.politician_id);
    candidaturasDaPessoa.set(l.politician_id, [...(candidaturasDaPessoa.get(l.politician_id) ?? []), l.external_id]);
  }
  const tfPorPessoa = new Set(links.filter((l) => l.system === "tf_parlamentar").map((l) => l.politician_id));

  // Linha que /candidato/<slug> serve: ativas primeiro; sem nenhuma ativa, o histórico (igual a resolveCandidateRowsBySlug).
  const porSlug = new Map<string, Cand[]>();
  for (const c of cands) if (c.slug) porSlug.set(c.slug, [...(porSlug.get(c.slug) ?? []), c]);
  const servidaPor = (slug: string): Cand | null => {
    const rows = porSlug.get(slug) ?? [];
    if (!rows.length) return null;
    const ativas = rows.filter((r) => r.is_active);
    const id = rankCandidateRows(ativas.length ? ativas : rows)[0].id;
    return rows.find((r) => r.id === id) ?? null;
  };
  const slugDe = (c: Cand): string | undefined => {
    const pid = pessoaDaLinha.get(c.id);
    return pid ? slugDaPessoa.get(pid) : undefined;
  };

  // 1. redirecionamentos
  let semPessoa = 0, semRedirect = 0, redireciona = 0;
  const problemas: Array<{ de: string; para: string; motivo: string }> = [];
  const redirecionamentos: Array<{ de: string; para: string; linha: string }> = [];
  for (const slug of porSlug.keys()) {
    const servida = servidaPor(slug);
    if (!servida) continue;
    const alvo = slugDe(servida);
    if (!alvo) { semPessoa++; continue; }
    if (alvo === slug) { semRedirect++; continue; }
    redireciona++;
    redirecionamentos.push({ de: slug, para: alvo, linha: servida.id });
    // segundo salto: a página do slug de destino redireciona de novo?
    const servidaDestino = servidaPor(alvo);
    if (servidaDestino) {
      const alvo2 = slugDe(servidaDestino);
      if (alvo2 && alvo2 !== alvo) problemas.push({ de: slug, para: alvo, motivo: `cadeia: ${alvo} → ${alvo2}` });
    }
  }
  // as linhas sem slug próprio nunca têm URL: não entram aqui

  // 2. todo slug de pessoa tem página?
  let viaCandidates = 0, viaVinculo = 0, soTf = 0;
  const sem404: string[] = [];
  for (const p of pols) {
    if (porSlug.has(p.slug)) viaCandidates++;
    else if ((candidaturasDaPessoa.get(p.id) ?? []).length) viaVinculo++;
    else if (tfPorPessoa.has(p.id)) soTf++;
    else sem404.push(p.slug);
  }

  console.log("── 1. Slugs de candidatura (rota atual) ──");
  console.log(`  slugs distintos: ${porSlug.size}`);
  console.log(`  servem uma pessoa sem mudar de slug: ${semRedirect}`);
  console.log(`  REDIRECIONAM para o slug da pessoa: ${redireciona}`);
  console.log(`  linha servida sem pessoa ligada (sem CPF): ${semPessoa}`);
  console.log(`  problemas (cadeia ou laço): ${problemas.length}`);
  for (const x of problemas.slice(0, 10)) console.log(`   • ${x.de} → ${x.para} (${x.motivo})`);
  console.log("── 2. Slugs de pessoa ──");
  console.log(`  total: ${pols.length} | já servidos por candidates: ${viaCandidates} | serão servidos por vínculo (hoje 404): ${viaVinculo} | só TF (hoje 404): ${soTf}`);
  console.log(`  sem página nenhuma (continuariam 404): ${sem404.length}`);
  for (const s of sem404.slice(0, 10)) console.log(`   • ${s}`);

  const arq = path.join(os.tmpdir(), "check-rota-politicians.json");
  fs.writeFileSync(arq, JSON.stringify({ redirecionamentos, problemas, sem404 }, null, 2));
  console.log(`\n📝 detalhe: ${arq}`);
  if (problemas.length || sem404.length) process.exitCode = 1;
}
main().catch((e) => { console.error(e); process.exit(1); });
