#!/usr/bin/env npx tsx
/**
 * Extrator DETERMINÍSTICO de pesquisas das tabelas da Wikipedia (pt).
 *
 * Ao contrário do WebFetch (que usa LLM e embaralha candidato↔número), este
 * script baixa o HTML cru via API do MediaWiki e parseia a tabela por POSIÇÃO
 * DE COLUNA. O número que sai é literalmente o da célula. Zero invenção.
 *
 * Uso:
 *   npx tsx scripts/extract-wikipedia-polls.ts \
 *     --page="Pesquisas_eleitorais_para_a_eleição_estadual_de_2026_no_Rio_de_Janeiro" \
 *     --table=0 --out=tmp/wiki/rj-gov-1t.json
 *
 *   --table=N  índice da wikitable (0 = 1ª). Liste com --list.
 *   --list     só mostra as tabelas e seus cabeçalhos, sem extrair.
 *
 * Saída: JSON no formato que import-poll-drafts.ts consome
 *   [{ institute, fieldwork_start, fieldwork_end, sample_size,
 *      margin_of_error, scenario, results:[{name,pct}], _sum, _raw_institute }]
 */
import * as fs from "fs";

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const has = (k: string) => process.argv.includes(`--${k}`);

const PAGE = arg("page");
const TABLE = parseInt(arg("table") ?? "0");
const OUT = arg("out");
const YEAR_DEFAULT = parseInt(arg("year") ?? "0");
const SCENARIO_PREFIX = arg("scenario-prefix") ?? "";  // ex: "1T-T5" → cenários viram "1T-T5 Cenário 1"
if (!PAGE) { console.error("Faltou --page=<título wiki>"); process.exit(1); }

// ---------- util ----------
function stripTags(s: string): string {
  return s
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")    // notas de rodapé [1]
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // blocos <style> embutidos
    .replace(/\.mw-parser-output[^{]*\{[^}]*\}/g, "") // CSS inline (ex.: tooltip "Cen.")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&").replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ").trim();
}
const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  // abreviações (página presidencial usa "29 Mai - 30 Mai")
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};
const dd = (n: number) => String(n).padStart(2, "0");
function iso(d: number, m: number, y: number): string | null {
  if (!d || !m || !y) return null;
  return `${y}-${dd(m)}-${dd(d)}`;
}
// Constante fora da função para não criar Date() por chamada
const _TODAY_MS = Date.now();
/** Quando não há ano explícito, tenta defaultY mas recua 1 se a data ficaria >150d no futuro
 *  (cobre eleição em outubro/2026 mas evita atribuir Dez-2025 como Dez-2026). */
function resolveYear(month: number, day: number, defaultY: number): number {
  if (!defaultY) return 0;
  const candidate = Date.UTC(defaultY, month - 1, day);
  const daysAhead = (candidate - _TODAY_MS) / 86_400_000;
  return daysAhead > 150 ? defaultY - 1 : defaultY;
}

/** Parseia datas de campo: "1° a 3 de junho de 2026", "29 de março a 4 de abril de 2026",
 *  "2 de maio de 2026", "29 Mai - 30 Mai" (página presidencial — sem ano na célula). */
function parseDates(raw: string): { start: string | null; end: string | null } {
  const s = raw.toLowerCase().replace(/[º°]/g, "").replace(/\s+/g, " ").trim();
  const y = parseInt(s.match(/\b(20\d{2})\b/)?.[1] ?? "0");
  const defaultY = y || YEAR_DEFAULT;

  // caso abreviado "DD Mês [YYYY]" (página presidencial: "29 Mai - 30 Mai", "1 Jun 2026 - 3 Jun 2026")
  // O padrão exige ≥3 letras para o mês, excluindo "de"(2) e "a"(1)
  const abbrev = [...s.matchAll(/(\d{1,2})\s+([a-zç]{3,9})(?:\s+(20\d{2}))?/g)]
    .map((m) => {
      const mon = MONTHS[m[2]];
      const d = parseInt(m[1]);
      const ey = m[3] ? parseInt(m[3]) : 0;
      return { d, mon, y: ey || resolveYear(mon ?? 1, d, defaultY) };
    })
    .filter((x) => x.mon);
  if (abbrev.length >= 2) return { start: iso(abbrev[0].d, abbrev[0].mon, abbrev[0].y), end: iso(abbrev[abbrev.length - 1].d, abbrev[abbrev.length - 1].mon, abbrev[abbrev.length - 1].y) };
  if (abbrev.length === 1) { const v = iso(abbrev[0].d, abbrev[0].mon, abbrev[0].y); return { start: v, end: v }; }

  // caso forma longa "D de MMMM [de YYYY]"
  const monthsIn = [...s.matchAll(/(\d{1,2})\s+de\s+([a-zç]+)/g)].map((m) => ({ d: parseInt(m[1]), mon: MONTHS[m[2]] }));
  const bareDays = [...s.matchAll(/(\d{1,2})\s+[ae]\s+(\d{1,2})\s+de\s+([a-zç]+)/g)];
  // "D a D de MMMM [de YYYY]" ou "D e D de MMMM [de YYYY]"
  if (bareDays.length) {
    const g = bareDays[0]; const d1 = parseInt(g[1]); const d2 = parseInt(g[2]); const mon = MONTHS[g[3]];
    return { start: iso(d1, mon, defaultY), end: iso(d2, mon, defaultY) };
  }
  // "D de MMMM a D de MMMM [de YYYY]"
  if (monthsIn.length >= 2 && monthsIn[0].mon && monthsIn[1].mon) {
    return { start: iso(monthsIn[0].d, monthsIn[0].mon, defaultY), end: iso(monthsIn[1].d, monthsIn[1].mon, defaultY) };
  }
  // dia único "D de MMMM [de YYYY]"
  if (monthsIn.length === 1 && monthsIn[0].mon) {
    const v = iso(monthsIn[0].d, monthsIn[0].mon, defaultY);
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
// Aliases de instituto: nomes que a Wikipedia usa → nome canônico em `institutes`.
const INSTITUTE_ALIASES: Record<string, string> = {
  "100% cidades/futura": "Futura Inteligência",
  "100% cidades": "Futura Inteligência",
  "futura/apex": "Futura/Apex",  // página presidencial — já existe no banco
};
const aliasInstitute = (raw: string): string => INSTITUTE_ALIASES[raw.trim().toLowerCase()] ?? raw;

const META_RE = /contratante|pesquisa|instituto|^data|datas|amostr|margem|^cen\.?$|cen[áa]rio/i;
const IGNORE_RE = /outros|brancos?|nulos?|indecis|absten|absor|lideran|diferen|n[ãa]o sabe|^—$|^-$/i;

// ---------- expandir tabela em grid (resolve rowspan/colspan) ----------
function parseTable(tableHtml: string): string[][] {
  const trs = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const grid: (string | null)[][] = [];
  const pending: { text: string; left: number }[][] = []; // rowspans carregados
  trs.forEach((tr, ri) => {
    const cellMatches = [...tr.matchAll(/<(t[hd])\b([^>]*)>([\s\S]*?)<\/\1>/g)];
    if (!grid[ri]) grid[ri] = [];
    let col = 0;
    const place = (text: string) => { while (grid[ri][col] != null) col++; grid[ri][col] = text; };
    // primeiro, despeja rowspans pendentes desta linha
    (pending[ri] ?? []).forEach(() => {}); // placeholder; tratamos abaixo via carry
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
  // normaliza largura
  const width = Math.max(...grid.map((r) => r.length));
  return grid.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
}

// ---------- main ----------
(async () => {
  const api = `https://pt.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(PAGE)}&prop=text&format=json&formatversion=2`;
  const res = await fetch(api);
  const json = (await res.json()) as { parse?: { text?: string } };
  const html = json.parse?.text;
  if (!html) { console.error("Página não encontrada ou sem conteúdo."); process.exit(1); }

  const tables = [...html.matchAll(/<table[^>]*wikitable[^>]*>[\s\S]*?<\/table>/g)].map((m) => m[0]);
  if (has("list")) {
    tables.forEach((t, i) => {
      const g = parseTable(t);
      const headerRow = g.find((r) => r.some((c) => META_RE.test(c))) ?? g[0];
      console.log(`\n[tabela ${i}] ${g.length} linhas`);
      console.log("  cabeçalho:", headerRow.filter(Boolean).slice(0, 8).join(" | "));
    });
    return;
  }

  const g = parseTable(tables[TABLE]);
  // zona de cabeçalho = linhas iniciais sem dado; 1ª linha de dados = tem célula com "%" ou data "de 20XX"
  // linha de dados = tem uma DATA de campo ("... de 20XX"); cabeçalhos não têm ano (inclusive "Margem de erro (%pt)")
  const isDataRow = (r: string[]) => r.some((c) =>
    /\bde\s+20\d{2}\b/.test(c) ||                                         // "... de 20XX"
    /\d{1,2}\s+a\s+\d{1,2}\s+de\s+[a-zç]+/i.test(c) ||                    // "D a D de mês"
    /\d{1,2}\s+e\s+\d{1,2}\s+de\s+[a-zç]+/i.test(c) ||                    // "D e D de mês" (dias não-consecutivos, sem ano)
    /\d{1,2}\s+de\s+[a-zç]+\s+a\s+\d{1,2}[º°]?\s+de\s+[a-zç]+/i.test(c) ||// "D de mês a D de mês" (sem ano)
    /^\d{1,2}[º°]?\s+de\s+[a-zç]+$/i.test(c.trim()) ||                    // "D de mês" único (sem ano)
    /\d{1,2}\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i.test(c),// "DD Mês" abreviado (página presidencial)
  );
  const dataStart = g.findIndex((r) => isDataRow(r));
  const headerRows = g.slice(0, dataStart);
  const width = g[0].length;
  const colLabel: string[] = [];
  for (let c = 0; c < width; c++) {
    let label = "";
    for (const hr of headerRows) if (hr[c] && hr[c].trim()) label = hr[c].trim();
    colLabel[c] = label;
  }
  // classifica colunas
  const colKind: ("institute" | "dates" | "sample" | "margin" | "scenario" | "ignore" | "candidate")[] = colLabel.map((l) => {
    // ordem importa: "Datas de Pesquisa" contém "Pesquisa" → testar data ANTES de instituto
    if (/data/i.test(l)) return "dates";
    if (/amostr/i.test(l)) return "sample";
    if (/margem/i.test(l)) return "margin";
    if (/^cen\.?$|cen[áa]rio/i.test(l)) return "scenario";
    if (/contratante|instituto|^pesquisa/i.test(l)) return "institute";
    if (IGNORE_RE.test(l) || !l) return "ignore";
    return "candidate";
  });

  const out: unknown[] = [];
  for (const row of g.slice(dataStart)) {
    if (row.filter(Boolean).length < 3) continue;
    let institute = "", datesRaw = "", sample: number | null = null, margin: number | null = null, scenario = "";
    const results: { name: string; pct: number; party: string }[] = [];
    for (let c = 0; c < width; c++) {
      const cell = row[c] ?? "";
      switch (colKind[c]) {
        case "institute": institute = cell.replace(/\s*\[\s*\d+\s*\]/g, "").replace(/\s*\d+\s*$/, "").trim(); break;
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
    const sum = +(results.reduce((a, r) => a + r.pct, 0)).toFixed(1);
    out.push({
      institute: aliasInstitute(institute), _raw_institute: institute,
      fieldwork_start: start, fieldwork_end: end,
      sample_size: sample, margin_of_error: margin,
      scenario: scenario.trim() ? (/^\d+$/.test(scenario.trim()) ? `Cenário ${scenario.trim()}` : scenario.trim()) : null,
      results, _sum: sum, _dates_raw: datesRaw,
    });
  }

  // Auto-numerar cenários quando o mesmo (instituto, data) aparece múltiplas vezes
  // (página presidencial não tem coluna "Cen." — cada tabela é um cenário/combinação de candidatos)
  type PollEntry = { institute: string; fieldwork_end: string | null; scenario: string | null; [k: string]: unknown };
  const polls = out as PollEntry[];
  const keyCounts = new Map<string, number>();
  for (const p of polls) {
    const k = `${p.institute}|${p.fieldwork_end}`;
    if (!p.scenario) keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
  }
  const keyIdx = new Map<string, number>();
  for (const p of polls) {
    if (!p.scenario) {
      const k = `${p.institute}|${p.fieldwork_end}`;
      if ((keyCounts.get(k) ?? 1) > 1) {
        const n = (keyIdx.get(k) ?? 0) + 1;
        keyIdx.set(k, n);
        const label = n === 1 ? "Cenário 1" : `Cenário ${n}`;
        p.scenario = SCENARIO_PREFIX ? `${SCENARIO_PREFIX} ${label}` : label;
      } else if (SCENARIO_PREFIX) {
        p.scenario = SCENARIO_PREFIX;
      }
    }
  }

  const jsonOut = JSON.stringify(out, null, 2);
  if (OUT) { fs.writeFileSync(OUT, jsonOut); console.error(`✅ ${out.length} pesquisas → ${OUT}`); }
  else console.log(jsonOut);
})();
