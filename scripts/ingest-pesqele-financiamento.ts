#!/usr/bin/env npx tsx
/**
 * Coletor de financiamento de pesquisas eleitorais (TSE PesqEle).
 *
 * 100% determinístico — sem LLM, sem browser, sem sessão. Baixa os dois zips de
 * dados abertos irmãos do pesquisa_eleitoral_{ano}.zip e faz upsert em
 * pesqele_contratante / pesqele_pagante:
 *
 *   pesquisa_contratante_{ano}.zip  → quem encomendou a pesquisa e quanto pagou
 *   pesquisa_pagante_{ano}.zip      → quem efetivamente pagou
 *
 * Responde à pauta "quem banca qual pesquisa" — dado que NÃO está no
 * pesquisa_eleitoral.csv que o ingest-pesqele.ts já consome.
 *
 * Uso:
 *   npx tsx scripts/ingest-pesqele-financiamento.ts                # dry-run, 2026
 *   npx tsx scripts/ingest-pesqele-financiamento.ts --apply
 *   npx tsx scripts/ingest-pesqele-financiamento.ts --apply --year=2024
 *   npx tsx scripts/ingest-pesqele-financiamento.ts --apply --no-cache
 *
 * Cache local em /tmp/tse-cache/ (reusa se < 24h), mesmo padrão do ingest-pesqele.ts.
 *
 * NOTA: o CDN do TSE bloqueia curl (403 via Akamai) mas aceita o fetch do Node.
 * Se um dia passar a bloquear, o zip pode ser baixado pelo browser e colocado
 * manualmente no CACHE_DIR com o mesmo nome.
 */
import { createClient } from "@supabase/supabase-js";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("="); if (idx > 0) {
    const k = line.slice(0, idx).trim(); const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
const APPLY = process.argv.includes("--apply");
const NO_CACHE = process.argv.includes("--no-cache");
const YEAR = parseInt(process.argv.find((a) => a.startsWith("--year="))?.split("=")[1] ?? "2026");

const CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral";
const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

async function download(nome: string): Promise<Buffer> {
  const cachePath = path.join(CACHE_DIR, `${nome}.zip`);
  if (!NO_CACHE && fs.existsSync(cachePath)) {
    const ageH = (Date.now() - fs.statSync(cachePath).mtimeMs) / 3600000;
    if (ageH < 24) {
      console.log(`📂 cache: ${nome}.zip (${ageH.toFixed(1)}h, ${(fs.statSync(cachePath).size / 1024).toFixed(0)}KB)`);
      return fs.readFileSync(cachePath);
    }
  }
  const url = `${CDN}/${nome}.zip`;
  console.log(`⬇️  ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(cachePath, buf);
  console.log(`✅ ${(buf.length / 1024).toFixed(0)}KB salvo`);
  return buf;
}

/**
 * CSV parser stateful, respeita aspas e newlines internos.
 * Mesma implementação do ingest-pesqele.ts — os campos de texto do TSE têm
 * quebra de linha dentro das aspas e split ingênuo por \n corrompe o registro.
 */
function parseCsv(buf: Buffer): { header: string[]; rows: string[][] } {
  const text = iconv.decode(buf, "latin1");
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ";") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); records.push(row); row = []; field = ""; }
      else if (c !== "\r") field += c;
    }
  }
  if (field || row.length) { row.push(field); records.push(row); }
  const nonEmpty = records.filter((r) => r.some((f) => f.trim() !== ""));
  return { header: nonEmpty[0] ?? [], rows: nonEmpty.slice(1) };
}

/** "#NULO#" e vazio viram null. */
function txt(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return !s || s === "#NULO#" ? null : s;
}

/** Valores do TSE vêm no formato brasileiro: "95877,00" → 95877.00 */
function num(v: string | undefined): number | null {
  const s = txt(v);
  if (s === null) return null;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrai e concatena TODOS os CSVs do zip, deduplicando por chave primária.
 *
 * Não dá pra confiar só no _BRASIL.csv: o layout do TSE muda por ano. Em 2026
 * o _BRASIL.csv é superset de todas as UFs, mas em 2022 o _BRASIL.csv de
 * pagantes vem VAZIO (só cabeçalho) e os dados moram nos arquivos por UF —
 * incluindo um _BR.csv (âmbito nacional) que é diferente de _BRASIL.csv.
 * Ler tudo e deduplicar cobre os dois layouts sem perder linha.
 */
function csvTodos(
  zipBuf: Buffer,
  prefixo: string,
  chave: (row: string[], idx: (nome: string) => number) => string,
): { header: string[]; rows: string[][] } {
  const zip = new AdmZip(zipBuf);
  const entries = zip.getEntries().filter((e) => {
    const n = path.basename(e.entryName);
    return n.startsWith(`${prefixo}_${YEAR}_`) && n.endsWith(".csv");
  });
  if (!entries.length) throw new Error(`nenhum CSV ${prefixo}_${YEAR}_*.csv no zip`);

  let header: string[] = [];
  const vistos = new Set<string>();
  const rows: string[][] = [];
  for (const e of entries) {
    const { header: h, rows: r } = parseCsv(e.getData());
    if (!header.length) header = h;
    const idx = (nome: string) => header.indexOf(nome);
    for (const row of r) {
      const k = chave(row, idx);
      if (vistos.has(k)) continue;
      vistos.add(k);
      rows.push(row);
    }
  }
  console.log(`   ${entries.length} CSVs lidos → ${rows.length} linhas únicas`);
  return { header, rows };
}

/** Upsert em lotes — o payload inteiro estoura o limite de request do PostgREST. */
async function upsertEmLotes(tabela: string, linhas: Record<string, unknown>[], onConflict: string) {
  const TAM = 500;
  let gravadas = 0;
  for (let i = 0; i < linhas.length; i += TAM) {
    const lote = linhas.slice(i, i + TAM);
    const { error } = await sb.from(tabela).upsert(lote, { onConflict });
    if (error) throw new Error(`upsert ${tabela} lote ${i / TAM + 1}: ${error.message}`);
    gravadas += lote.length;
    process.stdout.write(`\r   ${tabela}: ${gravadas}/${linhas.length}`);
  }
  process.stdout.write("\n");
  return gravadas;
}

async function main() {
  console.log("━".repeat(70));
  console.log(`💰 PesqEle — financiamento de pesquisas (contratantes e pagantes) · ${YEAR}`);
  console.log("━".repeat(70));
  console.log(`Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN (use --apply pra gravar)"}\n`);

  // ---------- CONTRATANTES ----------
  const cZip = await download(`pesquisa_contratante_${YEAR}`);
  const { header: cH, rows: cR } = csvTodos(cZip, "pesquisa_contratante", (row, idx) =>
    `${row[idx("NR_PROTOCOLO_REGISTRO")]}|${row[idx("CD_CONTRATANTE")]}`);
  const ci = (nome: string) => cH.indexOf(nome);

  const contratantes = cR
    .map((r) => ({
      protocolo: txt(r[ci("NR_PROTOCOLO_REGISTRO")]),
      ano: parseInt(r[ci("AA_ELEICAO")] ?? String(YEAR)),
      cd_contratante: parseInt(r[ci("CD_CONTRATANTE")] ?? ""),
      cpf_cnpj: txt(r[ci("NR_CPF_CNPJ_CONTRATANTE")]),
      nome: txt(r[ci("NM_CONTRATANTE")]),
      vr_pago: num(r[ci("VR_PAGO_CONTRATANTE")]),
      is_pagante: txt(r[ci("ST_CONTRATANTE_PAGANTE")]) === "S",
      origem_recurso: txt(r[ci("DS_ORIGEM_RECURSO")]),
    }))
    .filter((x) => x.protocolo && x.nome && Number.isFinite(x.cd_contratante));

  // ---------- PAGANTES ----------
  const pZip = await download(`pesquisa_pagante_${YEAR}`);
  const { header: pH, rows: pR } = csvTodos(pZip, "pesquisa_pagante", (row, idx) =>
    `${row[idx("NR_PROTOCOLO_REGISTRO")]}|${row[idx("CD_CONTRATANTE")]}|${row[idx("NR_CPF_CNPJ_PAGANTE")]}`);
  const pi = (nome: string) => pH.indexOf(nome);

  const pagantes = pR
    .map((r) => ({
      protocolo: txt(r[pi("NR_PROTOCOLO_REGISTRO")]),
      ano: parseInt(r[pi("AA_ELEICAO")] ?? String(YEAR)),
      cd_contratante: parseInt(r[pi("CD_CONTRATANTE")] ?? ""),
      cpf_cnpj: txt(r[pi("NR_CPF_CNPJ_PAGANTE")]),
      nome: txt(r[pi("NM_PAGANTE")]),
      origem_recurso: txt(r[pi("DS_ORIGEM_RECURSO")]),
    }))
    .filter((x) => x.protocolo && x.nome && x.cpf_cnpj && Number.isFinite(x.cd_contratante));

  // ---------- SUMÁRIO ----------
  const protos = new Set(contratantes.map((c) => c.protocolo));
  const comValor = contratantes.filter((c) => (c.vr_pago ?? 0) > 0);
  const total = comValor.reduce((s, c) => s + (c.vr_pago ?? 0), 0);
  const fundoPartidario = contratantes.filter((c) => c.origem_recurso === "Fundo Partidário");

  console.log(`\n📊 Contratantes: ${contratantes.length} linhas · ${protos.size} pesquisas distintas`);
  console.log(`   com valor pago > 0: ${comValor.length} (R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`);
  console.log(`   origem "Fundo Partidário": ${fundoPartidario.length}`);
  console.log(`📊 Pagantes: ${pagantes.length} linhas`);

  const topContratantes = Object.entries(
    comValor.reduce<Record<string, number>>((acc, c) => {
      const k = `${c.nome} (${c.cpf_cnpj ?? "s/doc"})`;
      acc[k] = (acc[k] ?? 0) + (c.vr_pago ?? 0);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);

  console.log(`\n🏆 Top 10 contratantes por valor pago:`);
  for (const [nome, v] of topContratantes) {
    console.log(`   R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }).padStart(14)}  ${nome}`);
  }

  if (!APPLY) {
    console.log(`\n🔍 DRY-RUN — nada gravado. Rode com --apply pra persistir.`);
    console.log("━".repeat(70));
    return;
  }

  console.log(`\n✍️  Gravando...`);
  const nC = await upsertEmLotes("pesqele_contratante", contratantes, "protocolo,cd_contratante");
  const nP = await upsertEmLotes("pesqele_pagante", pagantes, "protocolo,cd_contratante,cpf_cnpj");

  // Quantas pesquisas de financiamento ainda não têm o registro correspondente
  // em pesqele_registry (ordem de ingestão pode divergir).
  const { count: orfaos } = await sb
    .from("pesqele_contratante")
    .select("protocolo", { count: "exact", head: true })
    .eq("ano", YEAR);

  console.log(`\n✅ ${nC} contratantes e ${nP} pagantes gravados (${orfaos ?? "?"} linhas de contratante em ${YEAR}).`);
  console.log(`   Consulte a view: select * from pesqele_financiamento where ano = ${YEAR};`);
  console.log("━".repeat(70));
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
