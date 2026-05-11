#!/usr/bin/env npx tsx
/**
 * Fase A — descoberta automática de pesquisas via TSE PesqEle.
 *
 * Baixa pesquisa_eleitoral_{ano}.zip do TSE, parseia CSV por UF, faz upsert
 * em pesqele_registry. Sai com sumário de cobertura e fila de pesquisas
 * faltantes (existem no TSE mas não em polls).
 *
 * Uso:
 *   npx tsx scripts/ingest-pesqele.ts                # dry-run, ano 2026
 *   npx tsx scripts/ingest-pesqele.ts --apply
 *   npx tsx scripts/ingest-pesqele.ts --apply --year=2024
 *
 * Cache local em /tmp/tse-cache/pesquisa_eleitoral_{ano}.zip (reusa se < 24h).
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
const YEAR = parseInt(process.argv.find((a) => a.startsWith("--year="))?.split("=")[1] ?? "2026");

const URL = `https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_${YEAR}.zip`;
const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

async function downloadFresh(): Promise<Buffer> {
  const cachePath = path.join(CACHE_DIR, `pesquisa_eleitoral_${YEAR}.zip`);
  // Reusa se cache < 24h
  if (fs.existsSync(cachePath)) {
    const ageH = (Date.now() - fs.statSync(cachePath).mtimeMs) / 3600000;
    if (ageH < 24) {
      console.log(`📂 cache: pesquisa_eleitoral_${YEAR}.zip (${ageH.toFixed(1)}h, ${(fs.statSync(cachePath).size / 1024).toFixed(0)}KB)`);
      return fs.readFileSync(cachePath);
    }
  }
  console.log(`⬇️  ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(cachePath, buf);
  console.log(`✅ ${(buf.length / 1024).toFixed(0)}KB salvo`);
  return buf;
}

/**
 * CSV parser que respeita aspas e newlines internos.
 * DS_PLANO_AMOSTRAL contém textos longos multi-linha entre aspas — split
 * ingênuo por \n quebra esses campos. Implementação stateful char-by-char.
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
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ";") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field || row.length) {
          row.push(field);
          records.push(row);
          row = []; field = "";
        }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else field += c;
    }
  }
  if (field || row.length) { row.push(field); records.push(row); }

  if (records.length < 2) return { header: [], rows: [] };
  return {
    header: records[0].map((c) => c.trim()),
    rows: records.slice(1).map((r) => r.map((c) => c.trim())),
  };
}

const NULO = (s?: string): string | null => {
  if (!s) return null;
  const t = s.trim();
  if (!t || ["#NULO#", "#NE#", "-1", "NÃO INFORMADO", "N/A"].includes(t)) return null;
  return t;
};

function parseBrDate(s?: string): string | null {
  const t = NULO(s); if (!t) return null;
  // "2026-02-02 00:00:00" → "2026-02-02"
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // "09/05/2026" → "2026-05-09"
  const d = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (d) return `${d[3]}-${d[2]}-${d[1]}`;
  return null;
}

function parseBrTimestamp(s?: string): string | null {
  const t = NULO(s); if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  return parseBrDate(t);
}

function parseNumber(s?: string): number | null {
  const t = NULO(s); if (!t) return null;
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

(async () => {
  console.log(`\n📊 Ingest TSE PesqEle ${YEAR}`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);

  const buf = await downloadFresh();
  const zip = new AdmZip(buf);
  const entries = zip.getEntries().filter((e) => e.entryName.toLowerCase().endsWith(".csv"));
  console.log(`   📁 ${entries.length} CSVs no zip`);

  const all: Record<string, unknown>[] = [];
  for (const entry of entries) {
    const { header, rows } = parseCsv(entry.getData());
    if (!header.length) continue;
    const col = (name: string) => header.indexOf(name);
    const cIdx = {
      proto: col("NR_PROTOCOLO_REGISTRO"),
      ano: col("AA_ELEICAO"),
      uf: col("SG_UF"),
      ue: col("NM_UE"),
      cnpj: col("NR_CNPJ_EMPRESA"),
      empresa: col("NM_EMPRESA"),
      fantasia: col("NM_EMPRESA_FANTASIA"),
      cargo: col("DS_CARGO"),
      ini: col("DT_INICIO_PESQUISA"),
      fim: col("DT_FIM_PESQUISA"),
      div: col("DT_DIVULGACAO"),
      reg: col("DT_REGISTRO"),
      qt: col("QT_ENTREVISTADO"),
      propria: col("ST_PESQUISA_PROPRIA"),
      conre: col("CD_CONRE"),
      estat: col("NM_ESTATISTICO_RESP"),
      vr: col("VR_PESQUISA"),
      met: col("DS_METODOLOGIA_PESQUISA"),
      amos: col("DS_PLANO_AMOSTRAL"),
    };
    if (cIdx.proto < 0 || cIdx.empresa < 0) continue;
    for (const r of rows) {
      const proto = NULO(r[cIdx.proto]);
      if (!proto) continue;
      all.push({
        protocolo: proto,
        ano: parseNumber(r[cIdx.ano]) ?? YEAR,
        uf: NULO(r[cIdx.uf]) ?? "",
        municipio: NULO(r[cIdx.ue]),
        cnpj_empresa: NULO(r[cIdx.cnpj]),
        nome_empresa: NULO(r[cIdx.empresa]) ?? "?",
        nome_fantasia: NULO(r[cIdx.fantasia]),
        cargos: NULO(r[cIdx.cargo]) ?? "",
        dt_inicio: parseBrDate(r[cIdx.ini]),
        dt_fim: parseBrDate(r[cIdx.fim]),
        dt_divulgacao: parseBrDate(r[cIdx.div]),
        dt_registro: parseBrTimestamp(r[cIdx.reg]),
        qt_entrevistados: parseNumber(r[cIdx.qt]),
        pesquisa_propria: r[cIdx.propria] === "S",
        cd_conre: NULO(r[cIdx.conre]),
        nm_estatistico: NULO(r[cIdx.estat]),
        vr_pesquisa: parseNumber(r[cIdx.vr]),
        ds_metodologia: NULO(r[cIdx.met]),
        ds_plano_amostral: NULO(r[cIdx.amos]),
      });
    }
  }
  console.log(`   📈 ${all.length} linhas brutas parseadas`);

  // Dedupe por protocolo (CSV pode ter múltiplas linhas por mesma pesquisa
  // — uma por município no plano amostral). Mantém a primeira ocorrência.
  const byProto = new Map<string, Record<string, unknown>>();
  for (const r of all) {
    const p = r.protocolo as string;
    if (!byProto.has(p)) byProto.set(p, r);
  }
  const dedup = [...byProto.values()];
  console.log(`   🔀 ${dedup.length} pesquisas únicas (após dedupe por protocolo)`);

  if (APPLY) {
    const BATCH = 500;
    let n = 0;
    for (let i = 0; i < dedup.length; i += BATCH) {
      const slice = dedup.slice(i, i + BATCH);
      const { error } = await sb.from("pesqele_registry").upsert(slice, { onConflict: "protocolo" });
      if (error) { console.error("  ❌", error.message); break; }
      n += slice.length;
    }
    console.log(`   💾 ${n}/${dedup.length} upserted em pesqele_registry`);
  }

  // Sumário de cobertura
  console.log(`\n--- pesqele_coverage (top piores) ---`);
  const { data: cov } = await sb.from("pesqele_coverage").select("*").limit(20);
  for (const c of cov ?? []) {
    const pct = String(c.coverage_pct).padStart(5);
    console.log(`  ${c.uf.padEnd(3)} ${(c.cargo as string).padEnd(12)} ${pct}%  (${c.on_electiolab}/${c.total_tse})`);
  }

  // Top pesquisas faltantes (mais recentes)
  console.log(`\n--- pesqele_missing top 15 mais recentes ---`);
  const { data: miss } = await sb
    .from("pesqele_missing")
    .select("uf, cargos, instituto, fieldwork_end, days_since_fieldwork, sample_size")
    .order("fieldwork_end", { ascending: false })
    .limit(15);
  for (const m of miss ?? []) {
    const c = (m.cargos as string).slice(0, 30);
    console.log(`  ${m.uf}  ${m.fieldwork_end}  (${m.days_since_fieldwork}d)  n=${m.sample_size}  ${(m.instituto as string).slice(0, 25).padEnd(25)} cargo: ${c}`);
  }

  const totalMissing = miss ? (await sb.from("pesqele_missing").select("protocolo", { count: "exact", head: true })).count : 0;
  console.log(`\n📋 Total faltante: ${totalMissing} pesquisas registradas no TSE mas não em polls.`);
})();
