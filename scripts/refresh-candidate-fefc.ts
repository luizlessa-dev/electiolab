#!/usr/bin/env npx tsx
/**
 * Recalcula candidate_fefc como agregado de candidate_revenue (FEFC =
 * fonte_receita ILIKE '%FUNDO ESPECIAL%') e candidate_expense_paid, em vez
 * de baixar o ZIP de prestação de contas de novo (era o que
 * ingest-tse-extended.ts --only=fefc fazia — removido de lá, ver comentário
 * no topo daquele arquivo).
 *
 * A agregação roda inteira dentro da função SQL `refresh_candidate_fefc`
 * (migration 20260813090000) via RPC — não em paginação client-side. Medido
 * em 2026-08-13: `fonte_receita ilike '%FUNDO ESPECIAL%'` contra
 * candidate_revenue (~662k linhas de 2022) faz sequential scan de ~10s;
 * paginar isso do Node em lotes de 1000 multiplicava o custo por ~663
 * páginas e estourava o statement_timeout do PostgREST (~8s) já na primeira
 * chamada. A função roda como 1 query só, com `set statement_timeout` próprio.
 *
 * Pré-requisito: rodar scripts/ingest-tse-prestacao-contas.ts --apply pro
 * ano desejado antes deste script — sem candidate_revenue/candidate_expense_paid
 * populadas, o agregado sai vazio (a função ainda roda, só não atualiza nada).
 *
 * Sem modo dry-run "de verdade": a única forma de saber quantas linhas
 * seriam afetadas é rodar a mesma agregação, então dry-run só explica o que
 * --apply faria em vez de rodar a query duas vezes.
 *
 * Uso:
 *   npx tsx scripts/refresh-candidate-fefc.ts --year=2026            # explica o que --apply faria
 *   npx tsx scripts/refresh-candidate-fefc.ts --year=2026 --apply    # roda e grava
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { withRetry } from "./lib/tse-csv";

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
  console.error("❌ Faltam env vars Supabase em .env.local");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes("--apply");
const YEAR = parseInt(process.argv.find((a) => a.startsWith("--year="))?.split("=")[1] ?? "2026");

async function main() {
  console.log(`\n💰 Refresh candidate_fefc a partir de candidate_revenue/candidate_expense_paid`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"} | Ano: ${YEAR}`);

  if (!APPLY) {
    console.log("   (dry-run: use --apply pra rodar a agregação de verdade e gravar)");
    return;
  }

  const count = await withRetry(async () => {
    const { data, error } = await sb.rpc("refresh_candidate_fefc", { p_year: YEAR });
    if (error) throw new Error(error.message);
    return data as number;
  }, "rpc refresh_candidate_fefc");

  console.log(`   💾 ${count.toLocaleString("pt-BR")} candidatos atualizados em candidate_fefc`);
  console.log("\n✅ Concluído");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
