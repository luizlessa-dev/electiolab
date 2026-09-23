#!/usr/bin/env npx tsx
/**
 * Ingest perfil do eleitorado por município — TSE Dados Abertos, dataset
 * "Eleitorado - Atual" (fonte: perfil_eleitorado_ATUAL.zip).
 *
 * O arquivo original é um cross-tab de contagem por município × zona ×
 * gênero × faixa etária × escolaridade × raça/cor × etc (11M+ linhas,
 * 2.3GB descompactado). Este script agrega por (uf, município) somando
 * QT_ELEITORES/QT_ELEITORES_BIOMETRIA/QT_ELEITORES_DEFICIENCIA/
 * QT_ELEITORES_NOME_SOCIAL em memória durante o streaming — nunca guarda
 * as 11M linhas cruas.
 *
 * Uso:
 *   npx tsx scripts/ingest-eleitorado.ts            # dry-run
 *   npx tsx scripts/ingest-eleitorado.ts --apply
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

const TSE_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado/perfil_eleitorado_ATUAL.zip";
const ZIP_NAME = "perfil_eleitorado_ATUAL.zip";
// O TSE usa ANO_ELEICAO=9999 como sentinela pro dataset "Atual" — gravamos
// o ano civil real da extração (DT_GERACAO), não o sentinela.
const YEAR = new Date().getFullYear();

type Agg = {
  uf: string;
  municipio_tse_code: string;
  municipio_nome: string;
  total_eleitores: number;
  total_biometria: number;
  total_deficiencia: number;
  total_nome_social: number;
};

function n(v: string | undefined): number {
  if (!v) return 0;
  const x = parseInt(v, 10);
  return isNaN(x) ? 0 : x;
}

(async () => {
  console.log(`\n🗳️  Eleitorado por município — TSE "Atual"`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);

  const zipPath = await downloadCachedStream(TSE_URL, ZIP_NAME);
  const members = listZipMembers(zipPath).filter((m) => m.toLowerCase().endsWith(".csv"));
  console.log(`   📦 ${members.length} arquivo(s) CSV no zip`);

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
      if (!uf || !codMun) continue;

      const key = `${uf}|${codMun}`;
      const cur = aggMap.get(key) ?? {
        uf,
        municipio_tse_code: codMun,
        municipio_nome: nomeMun ?? "",
        total_eleitores: 0,
        total_biometria: 0,
        total_deficiencia: 0,
        total_nome_social: 0,
      };
      cur.total_eleitores += n(row["QT_ELEITORES"]);
      cur.total_biometria += n(row["QT_ELEITORES_BIOMETRIA"]);
      cur.total_deficiencia += n(row["QT_ELEITORES_DEFICIENCIA"]);
      cur.total_nome_social += n(row["QT_ELEITORES_NOME_SOCIAL"]);
      aggMap.set(key, cur);

      if (lineCount % 2_000_000 === 0) {
        console.log(`      ${lineCount.toLocaleString("pt-BR")} linhas lidas…`);
      }
    }
    console.log(`      ${lineCount.toLocaleString("pt-BR")} linhas processadas`);
  }

  const records = Array.from(aggMap.values()).map((r) => ({ year: YEAR, source: "TSE", ...r }));
  const totalEleitores = records.reduce((s, r) => s + r.total_eleitores, 0);
  console.log(
    `\n📊 ${totalLines.toLocaleString("pt-BR")} linhas → ${records.length} municípios agregados`,
  );
  console.log(`   👥 total de eleitores somado: ${totalEleitores.toLocaleString("pt-BR")}`);

  if (!APPLY) {
    console.log("\n(dry-run — nada gravado; rode com --apply para gravar)");
    return;
  }

  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);
    await withRetry(async () => {
      const { error } = await sb
        .from("electorate_profile")
        .upsert(slice, { onConflict: "year,uf,municipio_tse_code" });
      if (error) throw error;
    }, `upsert electorate_profile [${i}]`);
    written += slice.length;
  }
  console.log(`💾 electorate_profile: ${written}/${records.length} gravados`);
  console.log("\n✅ Concluído");
})();
