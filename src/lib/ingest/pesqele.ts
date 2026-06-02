/**
 * Ingestão TSE PesqEle — Fase A.
 *
 * Baixa pesquisa_eleitoral_{ano}.zip do CDN do TSE, parseia o CSV (latin-1,
 * separador ponto-e-vírgula, com suporte a campos multi-linha entre aspas) e
 * faz upsert em pesqele_registry.
 *
 * Reutilizado por:
 *  - scripts/ingest-pesqele.ts  (dev/manual)
 *  - /api/cron/ingest-pesqele   (Vercel Cron diário)
 */
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import { createClient } from "@supabase/supabase-js";

const TSE_CDN =
  "https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_{year}.zip";

export type PesqeleIngestResult = {
  year: number;
  downloaded_bytes: number;
  csv_files: number;
  raw_rows: number;
  unique_protocols: number;
  upserted: number;
  errors: string[];
  missing_count: number | null;
};

function nulo(s?: string): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || ["#NULO#", "#NE#", "-1", "NÃO INFORMADO", "N/A"].includes(t)) return null;
  return t;
}

function parseBrDate(s?: string): string | null {
  const t = nulo(s);
  if (!t) return null;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

function parseBrTs(s?: string): string | null {
  const t = nulo(s);
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  return parseBrDate(t);
}

function parseNum(s?: string): number | null {
  const t = nulo(s);
  if (!t) return null;
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

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
      else if (c === "\n" || c === "\r") {
        if (field || row.length) { row.push(field); records.push(row); row = []; field = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else field += c;
    }
  }
  if (field || row.length) { row.push(field); records.push(row); }
  if (records.length < 2) return { header: [], rows: [] };
  return { header: records[0].map((c) => c.trim()), rows: records.slice(1).map((r) => r.map((c) => c.trim())) };
}

export async function ingestPesqele(
  year = 2026,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<PesqeleIngestResult> {
  const result: PesqeleIngestResult = {
    year,
    downloaded_bytes: 0,
    csv_files: 0,
    raw_rows: 0,
    unique_protocols: 0,
    upserted: 0,
    errors: [],
    missing_count: null,
  };

  const url = TSE_CDN.replace("{year}", String(year));

  // Download
  let buf: Buffer;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${url}`);
    buf = Buffer.from(await res.arrayBuffer());
    result.downloaded_bytes = buf.length;
  } catch (e: unknown) {
    result.errors.push(`Download falhou: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  // Parse CSV entries in zip
  const zip = new AdmZip(buf);
  const entries = zip.getEntries().filter((e) => e.entryName.toLowerCase().endsWith(".csv"));
  result.csv_files = entries.length;

  const all: Record<string, unknown>[] = [];
  for (const entry of entries) {
    const { header, rows } = parseCsv(entry.getData());
    if (!header.length) continue;
    const col = (name: string) => header.indexOf(name);
    const c = {
      proto: col("NR_PROTOCOLO_REGISTRO"), ano: col("AA_ELEICAO"),
      uf: col("SG_UF"), ue: col("NM_UE"), cnpj: col("NR_CNPJ_EMPRESA"),
      empresa: col("NM_EMPRESA"), fantasia: col("NM_EMPRESA_FANTASIA"),
      cargo: col("DS_CARGO"), ini: col("DT_INICIO_PESQUISA"),
      fim: col("DT_FIM_PESQUISA"), div: col("DT_DIVULGACAO"),
      reg: col("DT_REGISTRO"), qt: col("QT_ENTREVISTADO"),
      propria: col("ST_PESQUISA_PROPRIA"), conre: col("CD_CONRE"),
      estat: col("NM_ESTATISTICO_RESP"), vr: col("VR_PESQUISA"),
      met: col("DS_METODOLOGIA_PESQUISA"), amos: col("DS_PLANO_AMOSTRAL"),
    };
    if (c.proto < 0 || c.empresa < 0) continue;
    for (const r of rows) {
      const proto = nulo(r[c.proto]);
      if (!proto) continue;
      all.push({
        protocolo: proto,
        ano: parseNum(r[c.ano]) ?? year,
        uf: nulo(r[c.uf]) ?? "",
        municipio: nulo(r[c.ue]),
        cnpj_empresa: nulo(r[c.cnpj]),
        nome_empresa: nulo(r[c.empresa]) ?? "?",
        nome_fantasia: nulo(r[c.fantasia]),
        cargos: nulo(r[c.cargo]) ?? "",
        dt_inicio: parseBrDate(r[c.ini]),
        dt_fim: parseBrDate(r[c.fim]),
        dt_divulgacao: parseBrDate(r[c.div]),
        dt_registro: parseBrTs(r[c.reg]),
        qt_entrevistados: parseNum(r[c.qt]),
        pesquisa_propria: r[c.propria] === "S",
        cd_conre: nulo(r[c.conre]),
        nm_estatistico: nulo(r[c.estat]),
        vr_pesquisa: parseNum(r[c.vr]),
        ds_metodologia: nulo(r[c.met]),
        ds_plano_amostral: nulo(r[c.amos]),
      });
    }
  }
  result.raw_rows = all.length;

  // Dedupe
  const byProto = new Map<string, Record<string, unknown>>();
  for (const r of all) { const p = r.protocolo as string; if (!byProto.has(p)) byProto.set(p, r); }
  const dedup = [...byProto.values()];
  result.unique_protocols = dedup.length;

  // Upsert
  const sb = createClient(
    supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const BATCH = 500;
  let upserted = 0;
  for (let i = 0; i < dedup.length; i += BATCH) {
    const { error } = await sb.from("pesqele_registry").upsert(dedup.slice(i, i + BATCH), { onConflict: "protocolo" });
    if (error) { result.errors.push(error.message); break; }
    upserted += Math.min(BATCH, dedup.length - i);
  }
  result.upserted = upserted;

  // Count missing
  const { count } = await sb.from("pesqele_missing").select("protocolo", { count: "exact", head: true });
  result.missing_count = count;

  return result;
}
