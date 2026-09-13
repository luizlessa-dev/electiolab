#!/usr/bin/env npx tsx
/**
 * Monitor de releases TSE — rastreia pesquisas aguardando divulgação.
 *
 * Executa a cada 6h e consulta a view `pesqele_missing` do banco de dados,
 * contando quantas pesquisas ainda não foram divulgadas pelo TSE.
 *
 * Uso:
 *   npx tsx scripts/monitor-tse-releases.ts
 *
 * Para cron, adicione à .env ou .github/workflows:
 *   0 */6 * * * npx tsx scripts/monitor-tse-releases.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

// ── Config ───────────────────────────────────────────────────────────────────
const MONITOR_INTERVAL = 6 * 60 * 60 * 1000; // 6 horas em ms

// ── Types ────────────────────────────────────────────────────────────────────
type MissingRow = {
  protocolo: string;
  uf: string;
  cargos: string;
  instituto: string;
  fieldwork_end: string;
  sample_size: number | null;
  days_since_fieldwork: number | null;
};

// ── Query ────────────────────────────────────────────────────────────────────
/**
 * Paginação explícita: PostgREST corta em 1000 linhas por padrão.
 * Busca todas as linhas da view pesqele_missing.
 */
async function fetchAllPendingPolls(): Promise<MissingRow[]> {
  const PAGE = 1000;
  const rows: MissingRow[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("pesqele_missing")
      .select("protocolo, uf, cargos, instituto, fieldwork_end, sample_size, days_since_fieldwork")
      .order("fieldwork_end", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error(`❌ Erro ao consultar pesqele_missing: ${error.message}`);
      throw error;
    }

    const page = (data ?? []) as MissingRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  return rows;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function monitor() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 🕐 Verificação de pesquisas aguardando TSE...`);

  try {
    const allRows = await fetchAllPendingPolls();
    const totalPending = allRows.length;

    // Conta por tier de prioridade
    const presidencialCount = allRows.filter((r) => /presidente/i.test(r.cargos)).length;
    const governadorCount = allRows.filter((r) => /governador/i.test(r.cargos)).length;
    const senadorCount = allRows.filter((r) => /senador/i.test(r.cargos)).length;

    console.log(`✅ ${totalPending} pesquisas aguardando divulgação pelo TSE`);
    console.log(`   • Presidencial: ${presidencialCount}`);
    console.log(`   • Governador: ${governadorCount}`);
    console.log(`   • Senador: ${senadorCount}`);
    console.log(`⏰ Próxima verificação em 6h\n`);

    // Log estruturado para monitoramento (útil em CI/CD ou observabilidade)
    return {
      timestamp,
      totalPending,
      breakdown: {
        presidencial: presidencialCount,
        governador: governadorCount,
        senador: senadorCount,
      },
      nextCheckIn: "6 horas",
    };
  } catch (error) {
    console.error(`❌ Erro fatal:`, error);
    process.exit(1);
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────
monitor().then((result) => {
  // Retorna dados estruturados para CI/CD parsing
  if (process.env.CI || process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  }
});
