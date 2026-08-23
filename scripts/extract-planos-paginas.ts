#!/usr/bin/env npx tsx
/**
 * Extrai texto por página de cada PDF já baixado em `plano_governo` (etapa 2
 * de "Planos de governo") e grava em `plano_pagina`. Idempotente: pula plano
 * que já tem páginas extraídas, a menos que --force.
 *
 * Extração nativa via pdfjs-dist (não pdfplumber/pymupdf — ficou em Node pra
 * não introduzir um runtime Python só pra essa etapa, decisão de 2026-08-22).
 * Reconstrói parágrafo usando `hasEOL` de cada item de texto (fim de linha) +
 * o gap vertical entre linhas: gap bem maior que o típico da página vira
 * quebra de parágrafo (\n\n), gap normal vira só quebra de linha (\n). Isso
 * importa pra etapa 3, que corta trecho por parágrafo completo.
 *
 * Fallback OCR só quando a página não tem texto nativo (< 20 caracteres não-
 * espaço extraídos — heurística de "página é imagem escaneada"): rasteriza a
 * página com `pdftoppm` (poppler — precisa estar instalado, `brew install
 * poppler` no Mac) e roda tesseract.js em português. metodo='ocr' marca essas
 * páginas pra quem revisar na etapa 4 saber que o texto é uma leitura de
 * máquina, não exato.
 *
 * PDFs não estão no git (data/planos/ é gitignored) — só roda numa máquina
 * que já tenha rodado scripts/ingest-planos-governo.ts --apply localmente.
 *
 * Uso:
 *   npx tsx scripts/extract-planos-paginas.ts                    # dry-run: mostra páginas/OCR estimado, não grava
 *   npx tsx scripts/extract-planos-paginas.ts --apply             # extrai de verdade e grava em plano_pagina
 *   npx tsx scripts/extract-planos-paginas.ts --apply --force     # reextrai mesmo quem já tem páginas
 *   npx tsx scripts/extract-planos-paginas.ts --tse_id=280002542548 --apply  # só um candidato (teste)
 *
 * Dependências: pdfjs-dist, tesseract.js (já instaladas). Binário externo:
 * pdftoppm (poppler) — só usado no fallback OCR.
 */

import { createClient } from "@supabase/supabase-js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─────────────────────────────────────────────────────────────────
// Env loader (igual aos outros scripts/ingest-tse-*.ts)
// ─────────────────────────────────────────────────────────────────
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const TSE_ID_FILTER = process.argv.find((a) => a.startsWith("--tse_id="))?.split("=")[1];

const MIN_NATIVE_CHARS = 20;

const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
const OCR_CACHE_DIR = path.join(CACHE_DIR, "tesseract-lang");
const OCR_TMP_DIR = path.join(os.tmpdir(), "planos-ocr-tmp");
fs.mkdirSync(OCR_CACHE_DIR, { recursive: true });
fs.mkdirSync(OCR_TMP_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────
// Reconstrução de texto por página a partir dos items do pdfjs
// ─────────────────────────────────────────────────────────────────
type TextItem = { str: string; hasEOL: boolean; transform: number[] };

function reconstructText(items: TextItem[]): string {
  type Line = { text: string; y: number };
  const lines: Line[] = [];
  let buf = "";
  let bufY: number | null = null;

  for (const it of items) {
    if (typeof it.str !== "string") continue;
    if (bufY === null) bufY = it.transform[5];
    buf += it.str;
    if (it.hasEOL) {
      lines.push({ text: buf, y: bufY });
      buf = "";
      bufY = null;
    }
  }
  if (buf.trim()) lines.push({ text: buf, y: bufY ?? 0 });
  if (lines.length === 0) return "";

  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) gaps.push(Math.abs(lines[i - 1].y - lines[i].y));
  gaps.sort((a, b) => a - b);
  const gapTipico = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;

  let out = lines[0].text;
  for (let i = 1; i < lines.length; i++) {
    const gap = Math.abs(lines[i - 1].y - lines[i].y);
    out += gapTipico > 0 && gap > gapTipico * 1.4 ? "\n\n" : "\n";
    out += lines[i].text;
  }
  return sanitizeTexto(out);
}

// Achado em produção (2026-08-22): 99,5% das páginas nativas vinham com um
// carimbo de número de página renderizado numa fonte decorativa cujos glifos
// mapeiam pra caracteres de controle Unicode em vez de texto
// real — sujeira estrutural, não pontual, presente em quase toda página de
// quase todo PDF. Remove em qualquer posição (não só no início), já que não
// há como saber se essa fonte quebrada reaparece em outro lugar da página.
function sanitizeTexto(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    const isControl = (code <= 0x1f && code !== 0x0a) || code === 0x7f;
    if (!isControl) out += ch;
  }
  return out.trim();
}

// ─────────────────────────────────────────────────────────────────
// Extração nativa (rápida, sem OCR) — usada tanto no dry-run quanto no apply
// ─────────────────────────────────────────────────────────────────
type PageDraft = { numero: number; nativeTexto: string; needsOcr: boolean };

async function extractNativeText(pdfPath: string): Promise<PageDraft[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, verbosity: 0 }).promise;
  const drafts: PageDraft[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const texto = reconstructText(content.items as TextItem[]);
    const needsOcr = texto.replace(/\s/g, "").length < MIN_NATIVE_CHARS;
    drafts.push({ numero: i, nativeTexto: texto, needsOcr });
  }
  return drafts;
}

// ─────────────────────────────────────────────────────────────────
// OCR (só chamado no --apply, pra página sem texto nativo)
// ─────────────────────────────────────────────────────────────────
let ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

async function getOcrWorker() {
  if (!ocrWorker) {
    console.log("   🔤 Inicializando worker de OCR (tesseract, português)…");
    ocrWorker = await createWorker("por", 1, { cachePath: OCR_CACHE_DIR });
  }
  return ocrWorker;
}

async function ocrPage(pdfPath: string, numero: number): Promise<string> {
  const worker = await getOcrWorker();
  const prefixBase = `${path.basename(pdfPath, ".pdf")}-page${String(numero).padStart(4, "0")}`;
  const prefix = path.join(OCR_TMP_DIR, prefixBase);
  execFileSync("pdftoppm", ["-png", "-r", "200", "-f", String(numero), "-l", String(numero), pdfPath, prefix]);

  // pdftoppm decide o padding do sufixo numérico com base no total de páginas
  // do PDF, não dá pra prever o nome exato — busca pelo prefixo.
  const generated = fs.readdirSync(OCR_TMP_DIR).find((f) => f.startsWith(prefixBase));
  if (!generated) throw new Error(`pdftoppm não gerou PNG pra página ${numero} de ${pdfPath}`);
  const pngPath = path.join(OCR_TMP_DIR, generated);

  const { data } = await worker.recognize(pngPath);
  fs.unlinkSync(pngPath);
  return sanitizeTexto(data.text);
}

// ─────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`▶️  Extração de páginas — modo: ${APPLY ? "APPLY (extrai e grava)" : "DRY RUN (só lista)"}`);

  const { data: planos, error } = await supabase
    .from("plano_governo")
    .select("id, candidato_id, caminho_arquivo, ano");
  if (error) throw error;
  if (!planos || planos.length === 0) {
    console.log("Nenhum plano em `plano_governo` — rode scripts/ingest-planos-governo.ts primeiro.");
    return;
  }

  const { data: candidatos } = await supabase
    .from("candidates")
    .select("id, name, tse_id")
    .in("id", planos.map((p) => p.candidato_id));
  const candidatoById = new Map((candidatos ?? []).map((c) => [c.id as string, c]));

  let alvo = planos;
  if (TSE_ID_FILTER) {
    const ids = new Set((candidatos ?? []).filter((c) => c.tse_id === TSE_ID_FILTER).map((c) => c.id as string));
    alvo = alvo.filter((p) => ids.has(p.candidato_id));
    if (alvo.length === 0) {
      console.error(`❌ Nenhum plano encontrado pra tse_id=${TSE_ID_FILTER}`);
      process.exit(1);
    }
  }

  if (!FORCE) {
    // Paginado: select() sem .range() corta em 1000 linhas (default do
    // PostgREST/Supabase) — `plano_pagina` já passou de 1.605 linhas. Mesma
    // classe de bug achada em ingest-tse-candidaturas.ts e
    // classify-planos-trechos.ts (2026-08-22/23); aqui não chegou a duplicar
    // porque o upsert() abaixo já é por (plano_id, numero), mas reprocessaria
    // OCR à toa em planos já feitos.
    const PAGE_SIZE = 1000;
    const extraidoSet = new Set<string>();
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page, error: pageErr } = await supabase
        .from("plano_pagina")
        .select("plano_id")
        .range(from, from + PAGE_SIZE - 1);
      if (pageErr) throw pageErr;
      for (const r of page ?? []) extraidoSet.add(r.plano_id as string);
      if (!page || page.length < PAGE_SIZE) break;
    }
    const antes = alvo.length;
    alvo = alvo.filter((p) => !extraidoSet.has(p.id));
    if (antes !== alvo.length) {
      console.log(`⏭️  ${antes - alvo.length} plano(s) já têm páginas extraídas, pulando (use --force pra refazer).`);
    }
  }

  console.log(`\n📚 ${alvo.length} plano(s) a processar.`);

  let totalPaginas = 0;
  let totalOcr = 0;

  for (const plano of alvo) {
    const cand = candidatoById.get(plano.candidato_id as string);
    const label = cand ? `${cand.name} (tse_id=${cand.tse_id})` : (plano.candidato_id as string);

    if (!plano.caminho_arquivo || !fs.existsSync(plano.caminho_arquivo as string)) {
      console.warn(
        `   ⚠️  ${label}: arquivo não encontrado em disco (${plano.caminho_arquivo ?? "sem caminho_arquivo"}) — rode ingest-planos-governo.ts nesta máquina primeiro.`
      );
      continue;
    }
    const pdfPath = plano.caminho_arquivo as string;

    const drafts = await extractNativeText(pdfPath);
    const ocrCount = drafts.filter((d) => d.needsOcr).length;
    totalPaginas += drafts.length;
    totalOcr += ocrCount;
    console.log(`   ${label}: ${drafts.length} páginas${ocrCount > 0 ? `, ${ocrCount} sem texto nativo (OCR estimado)` : ""}`);

    if (!APPLY) continue;

    if (FORCE) {
      const { error: delErr } = await supabase.from("plano_pagina").delete().eq("plano_id", plano.id);
      if (delErr) {
        console.error(`      ❌ erro ao limpar páginas antigas: ${delErr.message}`);
        continue;
      }
    }

    const rows: { plano_id: string; numero: number; texto: string; metodo: "nativo" | "ocr" }[] = [];
    for (const d of drafts) {
      if (!d.needsOcr) {
        rows.push({ plano_id: plano.id, numero: d.numero, texto: d.nativeTexto, metodo: "nativo" });
      } else {
        console.log(`      🔍 OCR página ${d.numero}/${drafts.length}…`);
        const texto = await ocrPage(pdfPath, d.numero);
        rows.push({ plano_id: plano.id, numero: d.numero, texto, metodo: "ocr" });
      }
    }

    const { error: insErr } = await supabase.from("plano_pagina").upsert(rows, { onConflict: "plano_id,numero" });
    if (insErr) {
      console.error(`      ❌ ${label}: ${insErr.message}`);
    } else {
      console.log(`      ✅ ${label}: ${rows.length} páginas gravadas.`);
    }
  }

  console.log(
    `\n📊 Total: ${totalPaginas} páginas em ${alvo.length} plano(s)${totalOcr > 0 ? ` — ${totalOcr} via OCR` : ""}.`
  );
  if (!APPLY) {
    console.log(`💡 Rode com --apply pra extrair de verdade e gravar em \`plano_pagina\`.`);
  }

  if (ocrWorker) await ocrWorker.terminate();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
