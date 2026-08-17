#!/usr/bin/env npx tsx
/**
 * purge-wikipedia-polls.ts
 *
 * Remove definitivamente todo dado de proveniência Wikipedia do banco.
 *
 * Decisão editorial (17/08/2026): a Wikipedia não é usada em momento nenhum —
 * nem como validação de número, nem como sinal de descoberta. O papel de
 * descoberta é do `pesqele_registry` (registro oficial do TSE), que é fonte
 * estritamente melhor: 1.717 pesquisas com protocolo, instituto e metodologia.
 *
 * Também remove as 3 linhas seed plantadas à mão em `pesqele_registry`
 * (TSE-2026-001/002/003), que não vieram do CSV do TSE.
 *
 * SEMPRE grava um backup JSON antes de apagar. A deleção é reversível a partir
 * dele (poll_results saem por CASCADE e são incluídos no backup).
 *
 * Ordem importa: poll_drafts.promoted_poll_id referencia polls SEM cascade,
 * então os drafts saem primeiro.
 *
 * Uso:
 *   npx tsx scripts/purge-wikipedia-polls.ts              # dry-run
 *   npx tsx scripts/purge-wikipedia-polls.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APPLY = process.argv.includes("--apply");
const SEED_PROTOCOLOS = ["TSE-2026-001", "TSE-2026-002", "TSE-2026-003"];

async function main() {
  console.log(`\n🧹 Purga de dado Wikipedia — modo ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  // ── Levantamento ───────────────────────────────────────────────────────────
  const { data: wikiPolls, error: e1 } = await sb
    .from("polls")
    .select("*")
    .eq("source_kind", "wikipedia");
  if (e1) throw new Error(`polls: ${e1.message}`);

  const pollIds = (wikiPolls ?? []).map((p) => p.id);

  const { data: wikiResults, error: e2 } = pollIds.length
    ? await sb.from("poll_results").select("*").in("poll_id", pollIds)
    : { data: [], error: null };
  if (e2) throw new Error(`poll_results: ${e2.message}`);

  const { data: wikiDrafts, error: e3 } = await sb
    .from("poll_drafts")
    .select("*")
    .eq("source_kind", "wikipedia");
  if (e3) throw new Error(`poll_drafts: ${e3.message}`);

  const { data: seedRegistry, error: e4 } = await sb
    .from("pesqele_registry")
    .select("*")
    .in("protocolo", SEED_PROTOCOLOS);
  if (e4) throw new Error(`pesqele_registry: ${e4.message}`);

  console.log(`  polls (source_kind=wikipedia) ....... ${wikiPolls?.length ?? 0}`);
  console.log(`  poll_results desses polls ........... ${wikiResults?.length ?? 0}`);
  console.log(`  poll_drafts (wikipedia) ............. ${wikiDrafts?.length ?? 0}`);
  console.log(`  pesqele_registry (linhas seed) ...... ${seedRegistry?.length ?? 0}`);

  const draftsPorStatus = (wikiDrafts ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`    por status: ${JSON.stringify(draftsPorStatus)}`);

  // ── Backup ─────────────────────────────────────────────────────────────────
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `purge-wikipedia-${stamp}.json`);

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        gerado_em: new Date().toISOString(),
        motivo: "Purga de proveniência Wikipedia + linhas seed do pesqele_registry",
        polls: wikiPolls,
        poll_results: wikiResults,
        poll_drafts: wikiDrafts,
        pesqele_registry_seed: seedRegistry,
      },
      null,
      2
    )
  );
  console.log(`\n  💾 backup: ${path.relative(process.cwd(), backupPath)}`);

  if (!APPLY) {
    console.log(`\n  Dry-run — nada foi apagado. Rode com --apply para executar.\n`);
    return;
  }

  // ── Deleção ────────────────────────────────────────────────────────────────
  // 1º drafts: promoted_poll_id referencia polls sem ON DELETE CASCADE.
  if (wikiDrafts?.length) {
    const { error } = await sb.from("poll_drafts").delete().eq("source_kind", "wikipedia");
    if (error) throw new Error(`delete poll_drafts: ${error.message}`);
    console.log(`  ✅ ${wikiDrafts.length} poll_drafts apagados`);
  }

  // 2º polls: poll_results saem por CASCADE.
  if (pollIds.length) {
    const { error } = await sb.from("polls").delete().eq("source_kind", "wikipedia");
    if (error) throw new Error(`delete polls: ${error.message}`);
    console.log(
      `  ✅ ${pollIds.length} polls apagados (+${wikiResults?.length ?? 0} poll_results por cascade)`
    );
  }

  // 3º linhas seed do registry.
  if (seedRegistry?.length) {
    const { error } = await sb
      .from("pesqele_registry")
      .delete()
      .in("protocolo", SEED_PROTOCOLOS);
    if (error) throw new Error(`delete pesqele_registry: ${error.message}`);
    console.log(`  ✅ ${seedRegistry.length} linhas seed do pesqele_registry apagadas`);
  }

  console.log(`\n  Backup preservado em ${path.relative(process.cwd(), backupPath)}\n`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
