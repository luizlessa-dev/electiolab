#!/usr/bin/env npx tsx
/**
 * Auto-ingestão de pesquisas eleitorais via Wikipedia (pt).
 *
 * Percorre o mapeamento WIKI_MAP (election_id → página + índice de tabela),
 * extrai os dados com o parser determinístico de extract-wikipedia-polls.ts
 * e insere em poll_drafts com status="pending" para revisão humana.
 *
 * Uso:
 *   npx tsx scripts/auto-ingest-wikipedia.ts            # dry-run
 *   npx tsx scripts/auto-ingest-wikipedia.ts --apply    # grava no banco
 *   npx tsx scripts/auto-ingest-wikipedia.ts --apply --election-id=<uuid>  # só uma
 *   npx tsx scripts/auto-ingest-wikipedia.ts --apply --type=presidente     # só um tipo
 *   npx tsx scripts/auto-ingest-wikipedia.ts --apply --type=governador --state=SP
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Env ──────────────────────────────────────────────────────────────────────
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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Args ──────────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes("--apply");
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const FILTER_ID = arg("election-id");
const FILTER_TYPE = arg("type");
const FILTER_STATE = arg("state");
const WRITE_REPORT = process.argv.includes("--report");

// ── Mapeamento election_id → Wikipedia ───────────────────────────────────────
//
// Estrutura de cada entrada:
//   page:    título da página Wikipedia (sem URL prefix)
//   tables:  array de { tableIndex, round, scope, seats? }
//            tableIndex = índice da wikitable na página (0 = primeira)
//            round = 1 ou 2
//            scope = "1t" | "2t"
//            seats = número de cadeiras (Senado 2026 = 2; afeta gate --seats)
//
// Convenção de páginas Wikipedia para eleições estaduais 2026:
//   governador 1T: tableIndex=0 é consistente em todos os estados
//   senador:       tableIndex varia por estado (estados com 2T gov têm mais
//                  tabelas intermediárias) — mapeamento manual necessário,
//                  use --list para descobrir: npx tsx scripts/extract-wikipedia-polls.ts
//                  --page="<título>" --list
//   presidente:    página diferente ("Pesquisas_de_opinião_para_a_eleição_presidencial_
//                  no_Brasil_em_2026") com 70+ tabelas por cenário/mês — não suportado
//                  neste script; curar manualmente via ingest-manual.ts.

type WikiTable = {
  tableIndex: number;
  round: 1 | 2;
  scope: "1t" | "2t";
  seats?: number;
};

type WikiEntry = {
  electionId: string;
  type: "presidente" | "governador" | "senador";
  state: string | null;
  page: string;
  tables: WikiTable[];
};

const WIKI_MAP: WikiEntry[] = [
  // ── PRESIDENCIAL ─────────────────────────────────────────────────────────
  // NÃO SUPORTADO AUTOMATICAMENTE: página "Pesquisas_de_opinião_para_a_eleição_
  // presidencial_no_Brasil_em_2026" tem 70+ tabelas (uma por cenário/mês).
  // Curar via ingest-manual.ts ou extract-wikipedia-polls.ts com --table=N específico.

  // ── GOVERNADORES ─────────────────────────────────────────────────────────
  {
    electionId: "573fdb59-eae3-40c7-bec9-70ce961332fc",
    type: "governador", state: "AC",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Acre",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "ed76cff3-424e-4edb-8e09-4c6ab218f5e6",
    type: "governador", state: "AL",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Alagoas",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "2c164a84-dd67-44eb-b47f-d0f5d5c09d65",
    type: "governador", state: "AM",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Amazonas",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "a0c01762-0715-42bb-bf10-83bdf41f2b0c",
    type: "governador", state: "AP",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Amapá",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "b5defdb3-8247-4722-8447-3aeb97635bf2",
    type: "governador", state: "BA",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_na_Bahia",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "8a5ddaed-9e6b-4626-95e7-e84522c4287d",
    type: "governador", state: "CE",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Ceará",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "648e62a2-eb61-4757-ae54-3b8d421fc8d2",
    type: "governador", state: "DF",
    page: "Pesquisas_eleitorais_para_a_eleição_distrital_de_2026_no_Distrito_Federal",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "ef207d99-2ec5-434e-aa6d-e960865f0bb9",
    type: "governador", state: "ES",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Espírito_Santo",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "cb3067e3-7f98-47e3-99b3-aa13c30a768a",
    type: "governador", state: "GO",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Goiás",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "a286718c-92e6-4838-880e-8edfeaf94351",
    type: "governador", state: "MA",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Maranhão",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "ce047ca5-9962-4c94-95dd-f400a1994d03",
    type: "governador", state: "MG",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Minas_Gerais",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "e6f1b08d-aa8e-45ed-b973-19dc8469c341",
    type: "governador", state: "MS",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Mato_Grosso_do_Sul",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "83003ec6-3319-473d-869a-3ec765b6b377",
    type: "governador", state: "MT",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Mato_Grosso",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "be63d720-45a8-4ff0-830b-93f3f135a2c3",
    type: "governador", state: "PA",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Pará",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "fd349384-7c24-4d63-b950-309228d37386",
    type: "governador", state: "PB",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_na_Paraíba",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "0cffd39e-1922-49fc-819b-7d9c7829f127",
    type: "governador", state: "PE",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Pernambuco",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "86e1fa19-0d18-4dce-81af-cd6e708583bd",
    type: "governador", state: "PI",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Piauí",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "a6b2223a-f66d-4658-a33e-3db587fa66db",
    type: "governador", state: "PR",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Paraná",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "4d5eaa69-74ec-4eda-8a43-d64c68af0412",
    type: "governador", state: "RJ",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Rio_de_Janeiro",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "18a8b0ce-11cf-4a1c-a43d-93b0559e8177",
    type: "governador", state: "RN",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Rio_Grande_do_Norte",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "55e062ad-9fb2-437f-8bfc-0679caaecd06",
    type: "governador", state: "RO",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Rondônia",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "b8ac195f-5666-44b7-9446-f42359ed1684",
    type: "governador", state: "RR",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Roraima",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "0f54b587-5a85-44e8-abe2-3c61939f08de",
    type: "governador", state: "RS",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Rio_Grande_do_Sul",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "d443a43c-19b5-4ee2-87ad-8e7ccc092140",
    type: "governador", state: "SC",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Santa_Catarina",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "09ef8dd4-a40f-4ae4-9b5a-f456113f0831",
    type: "governador", state: "SE",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_Sergipe",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "8bda2fee-4c66-48f5-803a-703bec52a5cd",
    type: "governador", state: "SP",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_em_São_Paulo",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },
  {
    electionId: "70d2bd8f-7fd5-4428-aad9-8ee67b25a7f3",
    type: "governador", state: "TO",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Tocantins",
    tables: [{ tableIndex: 0, round: 1, scope: "1t" }],
  },

  // ── SENADORES ────────────────────────────────────────────────────────────
  // tableIndex varia por estado — confirmar via:
  //   npx tsx scripts/extract-wikipedia-polls.ts --page="<página>" --list
  //   npx tsx scripts/extract-wikipedia-polls.ts --page="<página>" --tableIndex=N
  // e verificar os nomes dos candidatos (senadores ≠ governadores).
  // Senado 2026 = 2 cadeiras por UF → seats: 2 (soma ~200% é normal).
  // Adicionar novos estados aqui conforme Wikipedia criar tabelas de pesquisa.
  {
    electionId: "09f99790-d38d-4daa-aaf8-f4ad4b3f62cc",
    type: "senador", state: "RJ",
    page: "Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Rio_de_Janeiro",
    tables: [{ tableIndex: 2, round: 1, scope: "1t", seats: 2 }],
  },
  // SP, MG, GO, SC, PE, RS, BA, PR, CE: sem tabela de Senado no Wikipedia em jun/2026.
  // Re-checar mensalmente com --list na página estadual.
];

// ── Wikipedia parser (inline — replica extract-wikipedia-polls.ts) ────────────

function stripTags(s: string): string {
  return s
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/\.mw-parser-output[^{]*\{[^}]*\}/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&#160;/g, " ")
    .replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&").replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ").trim();
}

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const dd = (n: number) => String(n).padStart(2, "0");
function iso(d: number, m: number, y: number): string | null {
  if (!d || !m || !y) return null;
  return `${y}-${dd(m)}-${dd(d)}`;
}
const INFERRED_YEAR = 2026; // ano da eleição; usado quando a data não traz o ano explícito

// Abreviações de mês usadas em alguns estados (ex: PA usa "Mai", "Jun", "Abr")
const MONTH_ABBR: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

function parseDates(raw: string): { start: string | null; end: string | null } {
  const s = raw.toLowerCase().replace(/[º°]/g, "").replace(/\s+/g, " ").trim();
  const y = parseInt(s.match(/\b(20\d{2})\b/)?.[1] ?? String(INFERRED_YEAR));

  // Formato "D–D/Mmm/YYYY" ou "D–D/Mmm" (ex: PA: "20–24/Mai/2026")
  const slashFmt = s.match(/(\d{1,2})[–\-](\d{1,2})\/([a-z]{3})/);
  if (slashFmt) {
    const d1 = parseInt(slashFmt[1]); const d2 = parseInt(slashFmt[2]);
    const mon = MONTH_ABBR[slashFmt[3]];
    if (mon) return { start: iso(d1, mon, y), end: iso(d2, mon, y) };
  }
  // Formato "D/Mmm" dia único com barra (ex: "5/Jun")
  const slashSingle = s.match(/(\d{1,2})\/([a-z]{3})/);
  if (slashSingle) {
    const d1 = parseInt(slashSingle[1]); const mon = MONTH_ABBR[slashSingle[2]];
    if (mon) { const v = iso(d1, mon, y); return { start: v, end: v }; }
  }

  const monthsIn = [...s.matchAll(/(\d{1,2})\s+de\s+([a-zç]+)/g)].map((m) => ({ d: parseInt(m[1]), mon: MONTHS[m[2]] }));
  const bareDays = [...s.matchAll(/(\d{1,2})\s+[ae]\s+(\d{1,2})\s+de\s+([a-zç]+)/g)];
  if (bareDays.length) {
    const g = bareDays[0]; const d1 = parseInt(g[1]); const d2 = parseInt(g[2]); const mon = MONTHS[g[3]];
    return { start: iso(d1, mon, y), end: iso(d2, mon, y) };
  }
  if (monthsIn.length >= 2 && monthsIn[0].mon && monthsIn[1].mon) {
    return { start: iso(monthsIn[0].d, monthsIn[0].mon, y), end: iso(monthsIn[1].d, monthsIn[1].mon, y) };
  }
  if (monthsIn.length === 1 && monthsIn[0].mon) {
    const v = iso(monthsIn[0].d, monthsIn[0].mon, y);
    return { start: v, end: v };
  }
  return { start: null, end: null };
}
function parsePct(raw: string): number | null {
  const t = raw.replace("%", "").replace(/\./g, "").replace(",", ".").trim();
  if (!t || t === "-" || t === "—" || t === "–" || t === "?" || /^n[/.]?d/i.test(t)) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}
function cleanCandidate(raw: string): string {
  return raw.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}
const INSTITUTE_ALIASES: Record<string, string> = {
  "100% cidades/futura": "Futura Inteligência",
  "100% cidades": "Futura Inteligência",
};
const aliasInstitute = (raw: string): string => INSTITUTE_ALIASES[raw.trim().toLowerCase()] ?? raw;
const META_RE = /contratante|pesquisa|instituto|^data|datas|amostr|margem|^cen\.?$|cen[áa]rio/i;
const IGNORE_RE = /outros|brancos?|nulos?|indecis|absten|absor|lideran|diferen|n[ãa]o sabe|^—$|^-$/i;

function parseTable(tableHtml: string): string[][] {
  const trs = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const grid: (string | null)[][] = [];
  trs.forEach((tr, ri) => {
    const cellMatches = [...tr.matchAll(/<(t[hd])\b([^>]*)>([\s\S]*?)<\/\1>/g)];
    if (!grid[ri]) grid[ri] = [];
    let col = 0;
    for (const cm of cellMatches) {
      const attrs = cm[2];
      const colspan = parseInt(/colspan="?(\d+)/.exec(attrs)?.[1] ?? "1");
      const rowspan = parseInt(/rowspan="?(\d+)/.exec(attrs)?.[1] ?? "1");
      const text = stripTags(cm[3]);
      while (grid[ri][col] != null) col++;
      for (let c = 0; c < colspan; c++) {
        for (let r = 0; r < rowspan; r++) {
          if (!grid[ri + r]) grid[ri + r] = [];
          grid[ri + r][col + c] = text;
        }
      }
      col += colspan;
    }
  });
  const width = Math.max(...grid.map((r) => r.length));
  return grid.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
}

type PollRow = {
  institute: string; _raw_institute: string;
  fieldwork_start: string | null; fieldwork_end: string | null;
  sample_size: number | null; margin_of_error: number | null;
  scenario: string | null;
  results: { name: string; pct: number; party: string }[];
  _sum: number;
};

const WIKI_USER_AGENT = "ElectioLab/1.0 (luiz@electiolab.com; https://electiolab.com)";

async function fetchWikiTable(page: string, tableIndex: number, attempt = 1): Promise<PollRow[]> {
  const url = `https://pt.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json&formatversion=2`;
  const res = await fetch(url, { headers: { "User-Agent": WIKI_USER_AGENT } });
  if (res.status === 429 || !res.headers.get("content-type")?.includes("json")) {
    if (attempt <= 3) {
      await new Promise((r) => setTimeout(r, 3000 * attempt));
      return fetchWikiTable(page, tableIndex, attempt + 1);
    }
    throw new Error(`Wikipedia rate limit após ${attempt} tentativas`);
  }
  const json = await res.json() as { parse?: { text?: string }; error?: { info: string } };
  if (json.error) throw new Error(`Wikipedia API: ${json.error.info}`);
  const html = json.parse?.text;
  if (!html) throw new Error(`Página não encontrada: ${page}`);

  const tables = [...html.matchAll(/<table[^>]*wikitable[^>]*>[\s\S]*?<\/table>/g)].map((m) => m[0]);
  if (tableIndex >= tables.length) {
    throw new Error(`Tabela ${tableIndex} não existe. Página tem ${tables.length} wikitable(s).`);
  }

  const g = parseTable(tables[tableIndex]);
  const isDataRow = (r: string[]) => r.some((c) =>
    /\bde\s+20\d{2}\b/.test(c) ||
    /\d{1,2}\s+a\s+\d{1,2}\s+de\s+[a-zç]+/i.test(c) ||
    /\d{1,2}\s+e\s+\d{1,2}\s+de\s+[a-zç]+/i.test(c) ||
    /\d{1,2}\s+de\s+[a-zç]+\s+a\s+\d{1,2}[º°]?\s+de\s+[a-zç]+/i.test(c) ||
    /^\d{1,2}[º°]?\s+de\s+[a-zç]+$/i.test(c.trim()) ||
    /\d{1,2}[–\-]\d{1,2}\/[a-z]{3}/i.test(c),        // formato PA: "20–24/Mai/2026"
  );
  const dataStart = g.findIndex((r) => isDataRow(r));
  if (dataStart < 0) return [];

  const headerRows = g.slice(0, dataStart);
  const width = g[0].length;
  const colLabel: string[] = [];
  for (let c = 0; c < width; c++) {
    let label = "";
    for (const hr of headerRows) if (hr[c] && hr[c].trim()) label = hr[c].trim();
    colLabel[c] = label;
  }
  const colKind: ("institute"|"dates"|"sample"|"margin"|"scenario"|"ignore"|"candidate")[] = colLabel.map((l) => {
    if (/data/i.test(l)) return "dates";
    if (/amostr/i.test(l)) return "sample";
    if (/margem/i.test(l)) return "margin";
    if (/^cen\.?$|cen[áa]rio/i.test(l)) return "scenario";
    if (/contratante|instituto|^pesquisa/i.test(l)) return "institute";
    if (IGNORE_RE.test(l) || !l) return "ignore";
    return "candidate";
  });

  const out: PollRow[] = [];
  for (const row of g.slice(dataStart)) {
    if (row.filter(Boolean).length < 3) continue;
    let institute = "", datesRaw = "", sample: number | null = null, margin: number | null = null, scenario = "";
    const results: { name: string; pct: number; party: string }[] = [];
    for (let c = 0; c < width; c++) {
      const cell = row[c] ?? "";
      switch (colKind[c]) {
        case "institute": institute = cell.replace(/\s*\d+\s*$/, "").trim(); break;
        case "dates": datesRaw = cell; break;
        case "sample": { const n = parseInt(cell.replace(/[^\d]/g, "")); sample = Number.isFinite(n) ? n : null; break; }
        case "margin": { const m = parsePct(cell); margin = m; break; }
        case "scenario": scenario = cell; break;
        case "candidate": {
          const pct = parsePct(cell);
          if (pct != null) {
            const party = (colLabel[c].match(/\(([^)]+)\)/)?.[1] ?? "").trim();
            results.push({ name: cleanCandidate(colLabel[c]), pct, party });
          }
          break;
        }
      }
    }
    if (!institute || !results.length) continue;
    const { start, end } = parseDates(datesRaw);
    out.push({
      institute: aliasInstitute(institute), _raw_institute: institute,
      fieldwork_start: start, fieldwork_end: end,
      sample_size: sample, margin_of_error: margin,
      scenario: scenario.trim() ? (/^\d+$/.test(scenario.trim()) ? `Cenário ${scenario.trim()}` : scenario.trim()) : null,
      results, _sum: +(results.reduce((a, r) => a + r.pct, 0)).toFixed(1),
    });
  }
  return out;
}

// ── Ingestão no banco ─────────────────────────────────────────────────────────

type IngestResult = {
  entry: WikiEntry;
  table: WikiTable;
  extracted: number;
  inserted: number;
  skipped: number;
  errors: string[];   // erros reais (falhas de rede, parsing)
  infos: string[];    // avisos não-bloqueantes (ex: fallback de índice)
  wikiUrl: string;
  notFound: boolean;
};

async function ingestEntry(entry: WikiEntry, table: WikiTable): Promise<IngestResult> {
  const wikiUrl = `https://pt.wikipedia.org/wiki/${encodeURIComponent(entry.page)}`;
  const result: IngestResult = {
    entry, table, extracted: 0, inserted: 0, skipped: 0, errors: [], infos: [], wikiUrl, notFound: false,
  };

  let polls: PollRow[];
  let resolvedTableIndex = table.tableIndex;
  try {
    polls = await fetchWikiTable(entry.page, resolvedTableIndex);
    // Fallback: se table 0 retorna 0 resultados, tenta table 1 e table 2.
    // Alguns estados (ex: SP) têm tabelas de resumo/cabeçalho antes dos dados principais.
    if (polls.length === 0 && resolvedTableIndex === 0) {
      for (const fallback of [1, 2]) {
        await new Promise((res) => setTimeout(res, 300));
        const candidate = await fetchWikiTable(entry.page, fallback).catch(() => []);
        if (candidate.length > 0) {
          polls = candidate;
          resolvedTableIndex = fallback;
          result.infos.push(`tableIndex ajustado: 0 → ${fallback}`);
          break;
        }
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("não encontrada") || msg.includes("não existe") || msg.includes("missingtitle")) {
      result.notFound = true;
    }
    result.errors.push(msg);
    return result;
  }

  // Filtra pesquisas sem data de campo — não há como identificar quando ocorreram.
  polls = polls.filter((p) => !!p.fieldwork_end);

  result.extracted = polls.length;
  if (!APPLY || polls.length === 0) return result;

  for (const p of polls) {
    const draft = {
      election_id: entry.electionId,
      institute_name: p.institute,
      fieldwork_start: p.fieldwork_start ?? null,
      fieldwork_end: p.fieldwork_end,
      publication_date: p.fieldwork_end,
      sample_size: p.sample_size ?? null,
      margin_of_error: p.margin_of_error ?? null,
      round: table.round,
      scope: table.scope,
      scenario_label: p.scenario ?? null,
      results: p.results,
      source_url: wikiUrl,
      source_kind: "wikipedia",
      status: "pending",
      raw_row: p,
    };
    const { error } = await sb.from("poll_drafts").upsert(draft, {
      onConflict: "election_id,institute_name,fieldwork_end,scope,round,scenario_label",
      ignoreDuplicates: true,
    });
    if (error) result.errors.push(`${p.institute} ${p.fieldwork_end}: ${error.message}`);
    else result.inserted++;
  }
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const entries = WIKI_MAP.filter((e) => {
    if (FILTER_ID && e.electionId !== FILTER_ID) return false;
    if (FILTER_TYPE && e.type !== FILTER_TYPE) return false;
    if (FILTER_STATE && e.state !== FILTER_STATE.toUpperCase()) return false;
    return true;
  });

  console.log(`\n🗳️  Auto-ingestão Wikipedia — ElectioLab`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN (passe --apply para gravar)"}`);
  console.log(`   Entradas: ${entries.length} eleições × tabelas`);
  console.log(`   Data: ${new Date().toISOString().slice(0, 10)}\n`);

  const results: IngestResult[] = [];
  let totalExtracted = 0, totalInserted = 0, totalErrors = 0, totalNotFound = 0;

  for (const entry of entries) {
    for (const table of entry.tables) {
      const label = `${entry.type.toUpperCase()} ${entry.state ?? "BR"} R${table.round}`;
      process.stdout.write(`  ${label.padEnd(22)} `);
      const r = await ingestEntry(entry, table);
      results.push(r);

      if (r.notFound) {
        console.log(`⬜ página não existe na Wikipedia`);
        totalNotFound++;
      } else if (r.errors.length && r.extracted === 0) {
        console.log(`❌ ${r.errors[0]}`);
        totalErrors++;
      } else {
        const tag = r.extracted === 0 ? "⬛ 0 pesquisas" : APPLY ? `✅ ${r.inserted} inseridas / ${r.extracted} extraídas` : `📋 ${r.extracted} pesquisas (dry-run)`;
        const suffix = [
          r.errors.length ? ` ⚠️ ${r.errors.length} erros` : "",
          r.infos.length ? ` (${r.infos.join("; ")})` : "",
        ].join("").trim();
        console.log(tag + (suffix ? " " + suffix : ""));
        totalExtracted += r.extracted;
        totalInserted += r.inserted;
        if (r.errors.length) totalErrors++;
      }

      // Pausa entre requisições para respeitar o rate limit da API Wikipedia
      await new Promise((res) => setTimeout(res, 1200));
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`  Extraídas:     ${totalExtracted} pesquisas`);
  if (APPLY) console.log(`  Inseridas:     ${totalInserted} novos drafts`);
  console.log(`  Não encontradas: ${totalNotFound} páginas`);
  if (totalErrors) console.log(`  ⚠️  Com erro:   ${totalErrors} entradas`);
  console.log(`${"─".repeat(50)}`);

  if (!APPLY && totalExtracted > 0) {
    console.log(`\n  Rode com --apply para gravar ${totalExtracted} pesquisas em poll_drafts.`);
  }
  if (APPLY && totalInserted > 0) {
    console.log(`\n  ✅ ${totalInserted} drafts pendentes em /dashboard/drafts para revisão.`);
  }

  // Relatório Markdown opcional
  if (WRITE_REPORT) {
    const lines = [
      `# Auto-ingestão Wikipedia — ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `| Eleição | Tabela | Extraídas | Inseridas | Status |`,
      `|---|---|---|---|---|`,
    ];
    for (const r of results) {
      const label = `${r.entry.type} ${r.entry.state ?? "BR"} R${r.table.round}`;
      const status = r.notFound ? "Página inexistente" : r.errors.length && !r.extracted ? `Erro: ${r.errors[0].slice(0, 60)}` : "OK";
      lines.push(`| ${label} | ${r.table.tableIndex} | ${r.extracted} | ${r.inserted} | ${status} |`);
    }
    const outPath = path.join(os.homedir(), "Desktop", "ELECTIOLAB-WIKI-INGEST.md");
    fs.writeFileSync(outPath, lines.join("\n"));
    console.log(`\n  📝 Relatório: ${outPath}`);
  }
})();
