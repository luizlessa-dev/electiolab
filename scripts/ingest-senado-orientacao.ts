#!/usr/bin/env npx tsx
/**
 * Ingere a orientação de bancada do Senado (API oficial) em `senado_orientacao` (projeto TF).
 * Contexto e regras: docs/BASTIDORES-POS-ELEICAO.md §8.2; normalização em src/lib/senado-orientacao.ts.
 *
 * - Chave: `sequencialVotacao` da API = `senado_votacao.id_sve`. Votação que ainda não está em
 *   `senado_votacao` é pulada e relatada (a FK exigiria o id); rodar de novo depois da carga do Senado.
 * - Só orientação de liderança com voto reconhecido (Sim/Não/Liberado/Obstrução) é gravada.
 * - Idempotente: upsert por (id_sve, sigla_partido). Rodar de novo só atualiza o que mudou.
 *
 * Uso:
 *   npx tsx scripts/ingest-senado-orientacao.ts                 # dry-run (padrão), de 2019 ao ano atual
 *   npx tsx scripts/ingest-senado-orientacao.ts --apply         # grava no TF
 *   npx tsx scripts/ingest-senado-orientacao.ts --from=2025     # só a partir de um ano (ingestão incremental)
 *
 * No dry-run imprime também o alinhamento de alguns senadores calculado em memória pela MESMA regra
 * da view mv_senador_alinhamento (migration 20261003150000): depois de aplicar, os dois têm que bater.
 *
 * Env (.env.local): TF_SUPABASE_URL, TF_SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import {
  alinhamento,
  parseVotacoes,
  type LinhaOrientacao,
  type OrientacaoNormalizada,
  type VotacaoApi,
} from "../src/lib/senado-orientacao";

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

const TF_URL = process.env.TF_SUPABASE_URL;
const TF_KEY = process.env.TF_SUPABASE_SERVICE_ROLE_KEY;
if (!TF_URL || !TF_KEY) {
  console.error("❌ Faltam TF_SUPABASE_URL ou TF_SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const ANO_ATUAL = new Date().getFullYear();
const DE = Number(process.argv.find((a) => a.startsWith("--from="))?.split("=")[1] ?? 2019);
const tf = createClient(TF_URL, TF_KEY);

const API = "https://legis.senado.leg.br/dadosabertos/plenario/votacao/orientacaoBancada";
// Senadores usados na conferência com a view: Renan Calheiros, Jader Barbalho, Cid Gomes, Irajá, Renan Filho.
const CONFERENCIA = [70, 35, 5973, 5385, 5207];

async function get<T>(url: string, tentativas = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      if (i >= tentativas) throw new Error(`${url}: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function todasAsPaginas<T>(
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

async function main() {
  console.log(`🔎 orientação de bancada do Senado, ${DE}–${ANO_ATUAL} (${APPLY ? "APPLY" : "dry-run"})\n`);

  const idsNoTf = new Set(
    (await todasAsPaginas<{ id_sve: number }>((a, b) => tf.from("senado_votacao").select("id_sve").order("id_sve").range(a, b))).map(
      (r) => r.id_sve,
    ),
  );
  console.log(`📥 ${idsNoTf.size} votações em senado_votacao (TF)\n`);

  const gravar: LinhaOrientacao[] = [];
  const desconhecidos = new Map<string, number>();
  let semVotacaoNoTf = 0;

  for (let ano = DE; ano <= ANO_ATUAL; ano++) {
    const { votacoes } = await get<{ votacoes: VotacaoApi[] }>(`${API}/${ano}0101/${ano}1231`);
    const r = parseVotacoes(votacoes);
    const naoNoTf = new Set(r.linhas.filter((l) => !idsNoTf.has(l.id_sve)).map((l) => l.id_sve));
    const ok = r.linhas.filter((l) => idsNoTf.has(l.id_sve));
    gravar.push(...ok);
    semVotacaoNoTf += naoNoTf.size;
    for (const [k, n] of r.rotulosDesconhecidos) desconhecidos.set(k, (desconhecidos.get(k) ?? 0) + n);
    console.log(
      `  ${ano}: ${votacoes.length} votações na API, ${r.votacoesComOrientacao} com orientação (${Math.round((100 * r.votacoesComOrientacao) / Math.max(votacoes.length, 1))}%) → ${ok.length} linhas` +
        (naoNoTf.size ? ` | ${naoNoTf.size} votações fora do TF` : "") +
        (r.votoVazioOuDesconhecido ? ` | ${r.votoVazioOuDesconhecido} sem voto` : ""),
    );
  }

  const porOrientacao = new Map<string, number>();
  for (const l of gravar) porOrientacao.set(l.orientacao, (porOrientacao.get(l.orientacao) ?? 0) + 1);
  console.log(`\n✓ ${gravar.length} linhas prontas: ${[...porOrientacao].map(([k, n]) => `${k}=${n}`).join(" ")}`);
  if (semVotacaoNoTf) console.log(`⚠ ${semVotacaoNoTf} votações com orientação ainda não estão em senado_votacao (carga do Senado atrasada); rodar de novo depois`);
  if (desconhecidos.size) {
    console.log(`⚠ rótulos de liderança desconhecidos (não gravados; acrescentar em src/lib/senado-orientacao.ts):`);
    for (const [k, n] of [...desconhecidos].sort((a, b) => b[1] - a[1])) console.log(`   • "${k}" × ${n}`);
  }

  // Conferência: alinhamento em memória, pela regra da view, para comparar depois de aplicada.
  const orient = new Map<string, OrientacaoNormalizada>(gravar.map((l) => [`${l.id_sve}|${l.sigla_partido}`, l.orientacao]));
  console.log("\n── Alinhamento calculado em memória (compare com mv_senador_alinhamento depois de aplicar) ──");
  for (const cod of CONFERENCIA) {
    const rows = await todasAsPaginas<{ id_sve: number; sigla_partido: string | null; voto: string; nome_parlamentar: string }>((a, b) =>
      tf.from("senado_voto").select("id_sve, sigla_partido, voto, nome_parlamentar").eq("cod_parlamentar", cod).order("id_sve").range(a, b),
    );
    if (!rows.length) continue;
    // só votação nominal: as secretas não têm voto individual
    const { data: nominais } = await tf.from("senado_votacao").select("id_sve").eq("secreta", false).in("id_sve", rows.map((r) => r.id_sve).slice(0, 900));
    const nom = new Set((nominais ?? []).map((r) => r.id_sve));
    const a = alinhamento(
      rows.filter((r) => nom.has(r.id_sve)).map((r) => ({ idSve: r.id_sve, partido: r.sigla_partido, voto: r.voto, data: "" })),
      orient,
    );
    console.log(`  ${String(cod).padStart(5)} ${rows[0].nome_parlamentar.padEnd(18)} ${a.votacoes} votações com orientação, ${a.alinhados} alinhadas → ${a.pct ?? "—"}%`);
  }

  if (!APPLY) {
    console.log("\n💡 Rode com --apply para gravar.");
    return;
  }

  const agora = new Date().toISOString();
  let gravados = 0;
  for (let i = 0; i < gravar.length; i += 500) {
    const lote = gravar.slice(i, i + 500).map((l) => ({ ...l, ingested_at: agora }));
    const { error } = await tf.from("senado_orientacao").upsert(lote, { onConflict: "id_sve,sigla_partido" });
    if (error) throw new Error(`senado_orientacao: ${error.message}`);
    gravados += lote.length;
  }
  console.log(`\n✅ ${gravados} linhas gravadas em senado_orientacao`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
