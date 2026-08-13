#!/usr/bin/env npx tsx
/**
 * Recalcula candidate_fefc como agregado de candidate_revenue (FEFC =
 * fonte_receita ILIKE '%FUNDO ESPECIAL%') e candidate_expense_paid, em vez
 * de baixar o ZIP de prestação de contas de novo (era o que
 * ingest-tse-extended.ts --only=fefc fazia — removido de lá, ver comentário
 * no topo daquele arquivo).
 *
 * Pré-requisito: rodar scripts/ingest-tse-prestacao-contas.ts --apply pro
 * ano desejado antes deste script — sem candidate_revenue/candidate_expense_paid
 * populadas, o agregado sai vazio.
 *
 * Uso:
 *   npx tsx scripts/refresh-candidate-fefc.ts --year=2026            # dry-run
 *   npx tsx scripts/refresh-candidate-fefc.ts --year=2026 --apply    # grava
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
const PAGE = 1000;

type FefcAgg = { received: number; spent: number; party: string | null };

async function main() {
  console.log(`\n💰 Refresh candidate_fefc a partir de candidate_revenue/candidate_expense_paid`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"} | Ano: ${YEAR}`);

  const agg = new Map<string, FefcAgg>();

  let receitasCount = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("candidate_revenue")
      .select("candidate_id, party_acronym, value_brl")
      .eq("election_year", YEAR)
      .ilike("fonte_receita", "%FUNDO ESPECIAL%")
      .not("candidate_id", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const cur = agg.get(row.candidate_id as string) ?? { received: 0, spent: 0, party: null };
      cur.received += Number(row.value_brl) || 0;
      cur.party = cur.party ?? (row.party_acronym as string | null);
      agg.set(row.candidate_id as string, cur);
    }
    receitasCount += data.length;
    if (data.length < PAGE) break;
  }
  console.log(`   📥 candidate_revenue (FEFC): ${receitasCount.toLocaleString("pt-BR")} linhas → ${agg.size} candidatos`);

  let despesasCount = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("candidate_expense_paid")
      .select("candidate_id, value_brl")
      .eq("election_year", YEAR)
      .not("candidate_id", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const cur = agg.get(row.candidate_id as string) ?? { received: 0, spent: 0, party: null };
      cur.spent += Number(row.value_brl) || 0;
      agg.set(row.candidate_id as string, cur);
    }
    despesasCount += data.length;
    if (data.length < PAGE) break;
  }
  console.log(`   📤 candidate_expense_paid: ${despesasCount.toLocaleString("pt-BR")} linhas → ${agg.size} candidatos no total`);

  const candidateIds = Array.from(agg.keys());
  const cpfByCandidate = new Map<string, string | null>();
  for (let i = 0; i < candidateIds.length; i += PAGE) {
    const { data, error } = await sb
      .from("candidates")
      .select("id, cpf")
      .in("id", candidateIds.slice(i, i + PAGE));
    if (error) throw error;
    for (const row of data ?? []) cpfByCandidate.set(row.id as string, row.cpf as string | null);
  }

  const rows = Array.from(agg.entries()).map(([candidateId, v]) => ({
    candidate_id: candidateId,
    cpf: cpfByCandidate.get(candidateId) ?? null,
    party_acronym: v.party,
    election_year: YEAR,
    amount_received: v.received,
    amount_spent: v.spent,
    source: "TSE",
  }));

  console.log(`   📊 ${rows.length} candidatos ${APPLY ? "atualizados" : "seriam atualizados"} em candidate_fefc`);

  if (APPLY && rows.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      await withRetry(async () => {
        const { error } = await sb.from("candidate_fefc").upsert(slice, { onConflict: "candidate_id,election_year" });
        if (error) throw new Error(error.message);
      }, "upsert candidate_fefc");
    }
    console.log(`   💾 ${rows.length} linhas gravadas`);
  }

  console.log("\n✅ Concluído");
  if (!APPLY) console.log("   (rodou em dry-run; use --apply pra gravar)");
}

main();
