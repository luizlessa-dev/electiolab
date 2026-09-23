#!/usr/bin/env npx tsx
/**
 * Ingest comparecimento e abstenção por município — TSE Dados Abertos,
 * grupo "Comparecimento e Abstenção" (fonte:
 * perfil_comparecimento_abstencao_{ano}.zip). Um dataset por ano eleitoral
 * concluído — 2026 só existirá depois do pleito de 04/10/2026, por isso
 * não entra na lista default.
 *
 * Mesma lógica de ingest-eleitorado.ts: o arquivo original é um cross-tab
 * por município × zona × demografia (17M+ linhas/ano, ~2.5GB só o arquivo
 * nacional de 2022). Agrega por (ano, turno, uf, município) somando
 * QT_APTOS/QT_COMPARECIMENTO/QT_ABSTENCAO — nunca guarda a granularidade
 * demográfica bruta.
 *
 * Uso:
 *   npx tsx scripts/ingest-comparecimento.ts                 # dry-run, todos os anos
 *   npx tsx scripts/ingest-comparecimento.ts --apply --year=2022
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import {
  downloadCachedStream,
  listZipMembers,
  streamZipCsvRows,
  withRetry,
} from "./lib/tse-csv";

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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const APPLY = process.argv.includes("--apply");
const YEAR_ARG = process.argv.find((a) => a.startsWith("--year="))?.split("=")[1];
const ANOS = YEAR_ARG ? [parseInt(YEAR_ARG, 10)] : [2012, 2014, 2016, 2018, 2020, 2022, 2024];

const TSE_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_${ano}.zip`;

type Agg = {
  round: number;
  uf: string;
  municipio_tse_code: string;
  municipio_nome: string;
  total_aptos: number;
  total_comparecimento: number;
  total_abstencao: number;
};

function n(v: string | undefined): number {
  if (!v) return 0;
  const x = parseInt(v, 10);
  return isNaN(x) ? 0 : x;
}

async function ingestYear(ano: number) {
  console.log(`\n━━━ Ano ${ano} ━━━`);
  let zipPath: string;
  try {
    zipPath = await downloadCachedStream(TSE_URL(ano), `perfil_comparecimento_abstencao_${ano}.zip`);
  } catch (e) {
    console.warn(`⚠️  Skip ${ano}: ${(e as Error).message}`);
    return;
  }

  const members = listZipMembers(zipPath).filter(
    (m) => m.toLowerCase().endsWith(".csv") && !/_brasil\.csv$/i.test(m),
  );
  console.log(`   📦 ${members.length} arquivo(s) CSV por UF no zip`);

  const aggMap = new Map<string, Agg>();
  let totalLines = 0;

  for (const member of members) {
    console.log(`   📥 streaming ${member}…`);
    let lineCount = 0;
    for await (const row of streamZipCsvRows(zipPath, member)) {
      lineCount++;
      totalLines++;
      const uf = row["SG_UF"];
      const codMun = row["CD_MUNICIPIO"];
      const nomeMun = row["NM_MUNICIPIO"];
      const round = n(row["NR_TURNO"]) || 1;
      if (!uf || !codMun) continue;

      const key = `${round}|${uf}|${codMun}`;
      const cur = aggMap.get(key) ?? {
        round,
        uf,
        municipio_tse_code: codMun,
        municipio_nome: nomeMun ?? "",
        total_aptos: 0,
        total_comparecimento: 0,
        total_abstencao: 0,
      };
      cur.total_aptos += n(row["QT_APTOS"]);
      cur.total_comparecimento += n(row["QT_COMPARECIMENTO"]);
      cur.total_abstencao += n(row["QT_ABSTENCAO"]);
      aggMap.set(key, cur);

      if (lineCount % 2_000_000 === 0) {
        console.log(`      ${lineCount.toLocaleString("pt-BR")} linhas lidas…`);
      }
    }
    console.log(`      ${lineCount.toLocaleString("pt-BR")} linhas processadas`);
  }

  const records = Array.from(aggMap.values()).map((r) => ({ year: ano, source: "TSE", ...r }));
  const totalAptos = records.reduce((s, r) => s + r.total_aptos, 0);
  console.log(
    `   📊 ${ano}: ${totalLines.toLocaleString("pt-BR")} linhas → ${records.length} linhas agregadas (aptos somados: ${totalAptos.toLocaleString("pt-BR")})`,
  );

  if (!APPLY) return;

  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);
    await withRetry(async () => {
      const { error } = await sb
        .from("turnout_by_municipality")
        .upsert(slice, { onConflict: "year,round,uf,municipio_tse_code" });
      if (error) throw error;
    }, `upsert turnout_by_municipality [${ano}/${i}]`);
    written += slice.length;
  }
  console.log(`   💾 turnout_by_municipality: ${written}/${records.length} gravados`);
}

(async () => {
  console.log(`\n🗳️  Comparecimento e Abstenção por município — TSE`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`   Anos: ${ANOS.join(", ")}`);

  for (const ano of ANOS) {
    await ingestYear(ano);
  }

  console.log("\n✅ Concluído");
})();
