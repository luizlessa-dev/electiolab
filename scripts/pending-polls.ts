#!/usr/bin/env npx tsx
/**
 * Fila de curadoria de pesquisas — worklist do operador.
 *
 * Lê a view `pesqele_missing` (pesquisas registradas no TSE que ainda NÃO têm
 * resultados no banco) e produz uma lista PRIORIZADA do que vale curar
 * manualmente via scripts/ingest-manual.ts.
 *
 * Por que manual e não automático:
 *   O TSE registra apenas metadados (instituto, amostra, metodologia) — NUNCA
 *   os percentuais. Os resultados saem em fonte primária (release do instituto)
 *   e são curados com source_url para manter a proveniência auditável.
 *
 * Cruza com o calendário de divulgação do agenciasertao.com (espelho do
 * registro do TSE que expõe a data prevista de divulgação de cada pesquisa —
 * o TSE exige só um prazo mínimo entre registro e divulgação, então dá pra
 * saber de antemão se ainda não é hora de procurar a matéria de imprensa).
 * Isso evita gastar busca em pesquisa que sabidamente ainda não saiu.
 *
 * Uso:
 *   npx tsx scripts/pending-polls.ts                 # imprime worklist no terminal
 *   npx tsx scripts/pending-polls.ts --md            # + grava worklist em Markdown no Desktop
 *   npx tsx scripts/pending-polls.ts --days 45       # janela de recência (default 30)
 *   npx tsx scripts/pending-polls.ts --skip-agenda   # pula o cruzamento com agenciasertao.com
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { normalizeInstituteName } from "../src/lib/candidate-fuzzy-match";

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
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Args ───────────────────────────────────────────────────────────────────────
const WRITE_MD = process.argv.includes("--md");
const SKIP_AGENDA = process.argv.includes("--skip-agenda");
const DAYS = (() => {
  const i = process.argv.indexOf("--days");
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : 30;
})();

// ── Agenda de divulgação (agenciasertao.com) ────────────────────────────────────

type AgendaEntry = { disclosure: string; uf: string; institute: string };

/**
 * Busca pesquisas "registradas, ainda não divulgadas" pro cargo dado (todas as
 * UFs de uma vez — omitir `uf` já agrega o Brasil inteiro nesse endpoint).
 * Faz a paginação (a API pagina em 30 itens fixos, ignora per_page).
 */
async function fetchUpcomingAgenda(office: "presidente" | "governador" | "senador"): Promise<Map<string, AgendaEntry>> {
  const map = new Map<string, AgendaEntry>();
  for (let page = 1; page <= 20; page++) {
    const url = `https://agenciasertao.com/eleicoes/pesquisas.php?data=lista&office=${office}&mode=upcoming&page=${page}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) break;
    const json = (await res.json()) as { rows?: Array<{ protocol: string; disclosure: string; uf: string; institute: string }>; pages?: number };
    for (const row of json.rows ?? []) {
      map.set(row.protocol, { disclosure: row.disclosure, uf: row.uf, institute: row.institute });
    }
    if (!json.pages || page >= json.pages) break;
  }
  return map;
}

/** Une os mapas de Presidente + Governador; falha em silêncio (rede fora do ar não deve travar a fila). */
async function fetchDisclosureAgenda(): Promise<Map<string, AgendaEntry>> {
  try {
    const [presidente, governador, senador] = await Promise.all([
      fetchUpcomingAgenda("presidente"),
      fetchUpcomingAgenda("governador"),
      fetchUpcomingAgenda("senador"),
    ]);
    const merged = new Map<string, AgendaEntry>();
    presidente.forEach((v, k) => merged.set(k, v));
    governador.forEach((v, k) => merged.set(k, v));
    senador.forEach((v, k) => merged.set(k, v));
    return merged;
  } catch (e) {
    console.error(`⚠️  agenciasertao.com indisponível (${(e as Error).message}) — seguindo sem cruzamento de agenda.`);
    return new Map();
  }
}

// ── Config de priorização ──────────────────────────────────────────────────────

/** Tokens de institutos reputados (busca no nome legal/fantasia do TSE) */
const REPUTABLE_TOKENS = [
  "datafolha", "quaest", "atlas", "poderdata", "poder data", "ipespe", "ipec",
  "parana pesquisas", "real time", "mda", "nexus", "futura", "vox brasil",
  "gerp", "meio", "ideia", "fsb", "verita", "seculus", "neokemp", "vetor",
  "indice", "datatempo", "datafolha", "genial",
];

/** Maiores colégios eleitorais — governador prioritário */
const MAJOR_STATES = ["SP", "MG", "RJ", "RS", "BA", "PR", "PE", "CE", "GO", "PA", "SC", "DF"];

/**
 * Institutos com qualidade contestada (pesquisas suspensas pela Justiça Eleitoral
 * por vícios metodológicos em 2026). Sinalizados mas não removidos — decisão do operador.
 */
const SUSPECT_TOKENS = ["verita"];

function isSuspect(instituto: string): boolean {
  const norm = instituto.toLowerCase();
  return SUSPECT_TOKENS.some((t) => norm.includes(t));
}

type MissingRow = {
  protocolo: string;
  uf: string;
  cargos: string;
  instituto: string;
  fieldwork_end: string;
  publication_date: string | null;
  sample_size: number | null;
  days_since_fieldwork: number | null;
};

function isReputable(instituto: string): boolean {
  const norm = instituto.toLowerCase();
  return REPUTABLE_TOKENS.some((t) => norm.includes(t));
}

function isPresidente(cargos: string): boolean {
  return /presidente/i.test(cargos);
}

function isGovernador(cargos: string): boolean {
  return /governador/i.test(cargos);
}

function isSenador(cargos: string): boolean {
  return /senador/i.test(cargos);
}

/** URL de busca sugerida para achar os resultados em fonte primária */
function suggestSource(row: MissingRow): string {
  const inst = normalizeInstituteName(row.instituto);
  const cargo = isPresidente(row.cargos)
    ? "presidente"
    : isGovernador(row.cargos)
    ? `governador ${row.uf}`
    : isSenador(row.cargos)
    ? `senador ${row.uf}`
    : row.uf;
  const q = encodeURIComponent(`${inst} pesquisa ${cargo} ${row.fieldwork_end?.slice(0, 7)} 2026 resultado`);
  return `https://www.google.com/search?q=${q}`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

/**
 * Paginação explícita: PostgREST corta em 1000 linhas por padrão e as views
 * têm mais que isso. Sem isso a fila truncava em silêncio e reportava "1000
 * totais" como se fosse o universo completo.
 */
async function fetchAllRows(view: string): Promise<MissingRow[]> {
  const PAGE = 1000;
  const rows: MissingRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(view)
      .select("protocolo, uf, cargos, instituto, fieldwork_end, publication_date, sample_size, days_since_fieldwork")
      .order("fieldwork_end", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error(`❌ erro ao ler ${view}:`, error.message);
      process.exit(1);
    }

    const page = (data ?? []) as MissingRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

async function main() {
  const rows = await fetchAllRows("pesqele_missing");
  // Pendência de Senador é rastreada numa view separada: pesqele_missing exclui
  // um protocolo assim que QUALQUER poll o referencia (mesmo só de Governador),
  // então o gap de Senador em registros "Governador, Senador" combinados fica
  // invisível ali — ver migration 20260901220000_pesqele_missing_senador.sql.
  const senadorRows = await fetchAllRows("pesqele_missing_senador");

  // Filtra: recência (campo terminou nos últimos DAYS dias e não no futuro)
  const filterRecent = (list: MissingRow[]) =>
    list.filter((r) => {
      const d = r.days_since_fieldwork;
      return d !== null && d >= 0 && d <= DAYS;
    });
  const recent = filterRecent(rows);
  const recentSenador = filterRecent(senadorRows);

  // Classifica em tiers
  const tier1: MissingRow[] = []; // Presidente, n>=1500
  const tier2: MissingRow[] = []; // Governador major-state reputável, n>=1000
  const tier3: MissingRow[] = []; // Demais governadores reputáveis recentes
  const tier4: MissingRow[] = []; // Senador reputável, n>=800 (view separada)

  for (const r of recent) {
    const n = r.sample_size ?? 0;
    if (isPresidente(r.cargos) && n >= 1500 && isReputable(r.instituto)) {
      tier1.push(r);
    } else if (isGovernador(r.cargos) && MAJOR_STATES.includes(r.uf) && n >= 1000 && isReputable(r.instituto)) {
      tier2.push(r);
    } else if (isGovernador(r.cargos) && isReputable(r.instituto) && n >= 800) {
      tier3.push(r);
    }
  }
  for (const r of recentSenador) {
    const n = r.sample_size ?? 0;
    if (isReputable(r.instituto) && n >= 800) {
      tier4.push(r);
    }
  }

  // Cruza com a agenda de divulgação (agenciasertao.com) e põe pesquisas ainda
  // não divulgadas por último dentro de cada tier — não vale gastar busca nelas.
  const agenda = SKIP_AGENDA ? new Map<string, AgendaEntry>() : await fetchDisclosureAgenda();
  const isPending = (r: MissingRow) => agenda.has(r.protocolo);
  const sortByAgenda = (list: MissingRow[]) =>
    [...list].sort((a, b) => Number(isPending(a)) - Number(isPending(b)));
  const tier1Sorted = sortByAgenda(tier1);
  const tier2Sorted = sortByAgenda(tier2);
  const tier3Sorted = sortByAgenda(tier3);
  const tier4Sorted = sortByAgenda(tier4);

  const fmtRow = (r: MissingRow, cargoLabel?: string) => {
    const inst = normalizeInstituteName(r.instituto);
    const cargo = cargoLabel ?? (isPresidente(r.cargos) ? "Presidente" : `Gov. ${r.uf}`);
    const flag = isSuspect(r.instituto) ? " ⚠️ qualidade contestada" : "";
    const pending = agenda.get(r.protocolo);
    const pendingTag = pending ? ` ⏳ previsão ${pending.disclosure}` : "";
    return `  ${r.fieldwork_end}  n=${String(r.sample_size ?? "?").padStart(5)}  ${inst.slice(0, 28).padEnd(28)}  ${cargo}${flag}${pendingTag}`;
  };

  // ── Terminal ──
  console.log(`\n🗳️  Fila de Curadoria — ElectioLab`);
  console.log(`   Fonte: view pesqele_missing (registros TSE sem resultado no banco)`);
  console.log(`   Janela: últimos ${DAYS} dias · ${recent.length} pendências recentes de ${rows.length} totais`);
  console.log(`   Senador (view separada, ver migration pesqele_missing_senador): ${recentSenador.length} pendências recentes de ${senadorRows.length} totais`);
  if (!SKIP_AGENDA) {
    console.log(`   Agenda de divulgação (agenciasertao.com): ${agenda.size} pesquisas registradas mas ainda não divulgadas`);
  }
  console.log();

  const dueCounts = [tier1Sorted, tier2Sorted, tier3Sorted, tier4Sorted].map((t) => t.filter((r) => !isPending(r)).length);

  console.log(`━━━ TIER 1 · PRESIDENCIAL (${tier1Sorted.length}, ${dueCounts[0]} prontas pra buscar) — máxima prioridade ━━━`);
  if (tier1Sorted.length === 0) console.log(`  ✅ Nenhuma pendência presidencial recente de instituto reputado.`);
  for (const r of tier1Sorted) console.log(fmtRow(r));

  console.log(`\n━━━ TIER 2 · GOVERNADOR (estados-chave) (${tier2Sorted.length}, ${dueCounts[1]} prontas pra buscar) ━━━`);
  if (tier2Sorted.length === 0) console.log(`  ✅ Nenhuma pendência de governador em estado-chave.`);
  for (const r of tier2Sorted) console.log(fmtRow(r));

  console.log(`\n━━━ TIER 3 · GOVERNADOR (demais estados) (${tier3Sorted.length}, ${dueCounts[2]} prontas pra buscar) ━━━`);
  for (const r of tier3Sorted.slice(0, 20)) console.log(fmtRow(r));
  if (tier3Sorted.length > 20) console.log(`  … +${tier3Sorted.length - 20} outras`);

  console.log(`\n━━━ TIER 4 · SENADOR (${tier4Sorted.length}, ${dueCounts[3]} prontas pra buscar) — cargo antes invisível na fila ━━━`);
  if (tier4Sorted.length === 0) console.log(`  ✅ Nenhuma pendência de Senador recente de instituto reputado.`);
  for (const r of tier4Sorted.slice(0, 20)) console.log(fmtRow(r, `Sen. ${r.uf}`));
  if (tier4Sorted.length > 20) console.log(`  … +${tier4Sorted.length - 20} outras`);

  console.log(`\n📋 Total priorizado: ${tier1Sorted.length + tier2Sorted.length + tier3Sorted.length + tier4Sorted.length} pesquisas (${dueCounts[0] + dueCounts[1] + dueCounts[2] + dueCounts[3]} já prontas pra buscar, resto aguardando divulgação)`);
  console.log(`   Curar via: edite PENDING_POLLS em scripts/ingest-manual.ts e rode npx tsx scripts/ingest-manual.ts`);

  // ── Markdown (opcional) ──
  if (WRITE_MD) {
    const lines: string[] = [];
    lines.push(`# ElectioLab — Fila de Curadoria de Pesquisas`);
    lines.push(``);
    lines.push(`> Gerado a partir da view \`pesqele_missing\` (registros oficiais do TSE sem resultado curado).`);
    lines.push(`> O TSE registra só metadados — os percentuais vêm de fonte primária com \`source_url\`.`);
    lines.push(``);
    lines.push(`Janela: últimos ${DAYS} dias · ${recent.length} pendências recentes.`);
    lines.push(``);
    lines.push(`⚠️ = instituto com pesquisas suspensas pela Justiça Eleitoral em 2026 (qualidade contestada) — avaliar antes de curar.`);
    lines.push(`⏳ = registrada no TSE mas ainda não divulgada, segundo agenciasertao.com (data prevista na coluna Status) — não vale buscar ainda.`);
    lines.push(``);

    const section = (title: string, list: MissingRow[], cargoLabelFn?: (r: MissingRow) => string) => {
      lines.push(`## ${title} (${list.length})`);
      lines.push(``);
      if (list.length === 0) {
        lines.push(`_Nenhuma pendência._`);
        lines.push(``);
        return;
      }
      lines.push(`| Campo (fim) | Instituto | Cargo | n | Protocolo TSE | Status | Buscar resultado |`);
      lines.push(`|---|---|---|---|---|---|---|`);
      for (const r of list) {
        const inst = normalizeInstituteName(r.instituto) + (isSuspect(r.instituto) ? " ⚠️" : "");
        const cargo = cargoLabelFn ? cargoLabelFn(r) : isPresidente(r.cargos) ? "Presidente" : `Gov. ${r.uf}`;
        const pending = agenda.get(r.protocolo);
        const status = pending ? `⏳ previsão ${pending.disclosure}` : "pronta pra buscar";
        lines.push(
          `| ${r.fieldwork_end} | ${inst} | ${cargo} | ${r.sample_size ?? "?"} | \`${r.protocolo}\` | ${status} | [buscar](${suggestSource(r)}) |`
        );
      }
      lines.push(``);
    };

    section("TIER 1 · Presidencial — máxima prioridade", tier1Sorted);
    section("TIER 2 · Governador (estados-chave)", tier2Sorted);
    section("TIER 3 · Governador (demais estados)", tier3Sorted);
    section("TIER 4 · Senador — cargo antes invisível na fila", tier4Sorted, (r) => `Sen. ${r.uf}`);

    const outPath = path.join(os.homedir(), "Desktop", "ELECTIOLAB-FILA-CURADORIA.md");
    fs.writeFileSync(outPath, lines.join("\n"));
    console.log(`\n📝 Worklist gravada em: ${outPath}`);
  }
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
