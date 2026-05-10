#!/usr/bin/env npx tsx
/**
 * Fase 2 do roadmap reliability_score (ver docs/RELIABILITY-SCORE.md §3.2).
 *
 * Lê a view institute_accuracy_summary, aplica regras editoriais e atualiza
 * institutes.reliability_score quando há observações suficientes.
 *
 * Regras de atualização:
 *   - >=3 obs em janela 7d  → escreve suggested_reliability_score (1 - MAE_7d/8).
 *   - <3 obs                 → mantém score editorial existente; loga "skip".
 *   - Se score editorial difere do calculado em mais de 0.15 → marca para
 *     revisão manual (não atualiza), grava em reliability_score_basis.
 *
 * Privacidade do histórico:
 *   - Atualiza institutes.reliability_score E reliability_score_basis (texto
 *     curto: "MAE 3.2pp em 5 obs (auto 2026-05-09)").
 *   - Não destrói o valor anterior; o git log do seed serve como histórico.
 *
 * Uso:
 *   npx tsx scripts/apply-reliability-phase2.ts                  # dry-run
 *   npx tsx scripts/apply-reliability-phase2.ts --apply          # grava
 *   npx tsx scripts/apply-reliability-phase2.ts --apply --force  # ignora safeguard
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs"; import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("=");
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const SAFEGUARD_DELTA = 0.15; // se mudança > 0.15, exige --force

type SummaryRow = {
  institute_id: string;
  institute_name: string;
  institute_slug: string | null;
  observations_total: number;
  obs_within_7d: number;
  mae_7d: number | null;
  mae_overall: number | null;
  suggested_reliability_score: number | null;
};

type InstituteRow = {
  id: string;
  reliability_score: number | null;
  reliability_score_basis: string | null;
};

(async () => {
  console.log(`\n📊 Phase 2 — Reliability score auto-update`);
  console.log(`   Modo: ${APPLY ? (FORCE ? "✍️  APPLY --force" : "✍️  APPLY") : "🔍 DRY-RUN"}`);

  const { data: summary, error: e1 } = await sb
    .from("institute_accuracy_summary")
    .select("institute_id, institute_name, institute_slug, observations_total, obs_within_7d, mae_7d, mae_overall, suggested_reliability_score");
  if (e1) throw e1;

  const { data: institutes, error: e2 } = await sb
    .from("institutes")
    .select("id, reliability_score, reliability_score_basis");
  if (e2) throw e2;

  const instMap = new Map<string, InstituteRow>();
  for (const i of (institutes ?? []) as InstituteRow[]) instMap.set(i.id, i);

  console.log(`\n   Avaliando ${summary?.length ?? 0} institutos...\n`);

  let updated = 0, skipped = 0, flagged = 0, kept = 0;
  const updates: Array<{ id: string; score: number; basis: string }> = [];
  const flags: Array<{ name: string; current: number | null; suggested: number; delta: number }> = [];

  for (const s of (summary ?? []) as SummaryRow[]) {
    const inst = instMap.get(s.institute_id);
    if (!inst) continue;

    if (s.obs_within_7d < 3 || s.suggested_reliability_score === null) {
      skipped++;
      continue;
    }

    const suggested = Number(s.suggested_reliability_score);
    const current = inst.reliability_score;
    const delta = current !== null ? Math.abs(suggested - current) : null;

    if (current !== null && delta !== null && delta > SAFEGUARD_DELTA && !FORCE) {
      flagged++;
      flags.push({ name: s.institute_name, current, suggested, delta });
      console.log(`   ⚠️  ${s.institute_name.padEnd(28)} ${current?.toFixed(2)} → ${suggested.toFixed(2)}  (Δ ${delta.toFixed(2)} > ${SAFEGUARD_DELTA}; precisa --force)`);
      continue;
    }

    if (current !== null && Math.abs(suggested - current) < 0.005) {
      kept++; // já está perto, sem necessidade de update
      continue;
    }

    const basis = `MAE_7d=${Number(s.mae_7d).toFixed(2)}pp em ${s.obs_within_7d} obs (auto ${new Date().toISOString().slice(0, 10)})`;
    updates.push({ id: s.institute_id, score: suggested, basis });
    updated++;
    console.log(`   ✅  ${s.institute_name.padEnd(28)} ${current?.toFixed(2) ?? "—"} → ${suggested.toFixed(2)}  ${basis}`);
  }

  console.log(`\n   ${updated} a atualizar · ${kept} sem mudança · ${skipped} sem dados (<3 obs/7d) · ${flagged} flagged (Δ>${SAFEGUARD_DELTA})`);

  if (!APPLY) {
    console.log(`\n   🔍 DRY-RUN: nada gravado. Use --apply para persistir.`);
    if (flags.length) {
      console.log(`\n   ⚠️  ${flags.length} institutos com Δ grande:`);
      for (const f of flags) console.log(`      - ${f.name}: ${f.current?.toFixed(2)} → ${f.suggested.toFixed(2)} (Δ ${f.delta.toFixed(2)})`);
      console.log(`   Investigue antes de --force. Possível: poucas observações, eleição atípica, bug no MAE.`);
    }
    return;
  }

  // Apply
  for (const u of updates) {
    const { error } = await sb
      .from("institutes")
      .update({ reliability_score: u.score, reliability_score_basis: u.basis })
      .eq("id", u.id);
    if (error) console.error(`   ❌ ${u.id}: ${error.message}`);
  }
  console.log(`\n   💾 ${updates.length} institutes atualizados.`);
  if (flagged > 0 && !FORCE) {
    console.log(`   ⚠️  ${flagged} institutos pulados por safeguard. Re-rode com --force após investigar.`);
    process.exit(2);
  }
})();
