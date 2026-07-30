#!/usr/bin/env tsx
/**
 * promote-approved-polls.ts
 *
 * Promove poll_drafts (status='approved') → polls + poll_results.
 * Aplica a mesma lógica de fuzzy-match de institute/candidate do endpoint manual.
 *
 * Usage:
 *   npx tsx scripts/promote-approved-polls.ts --dry-run
 *   npx tsx scripts/promote-approved-polls.ts --promote
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function normalize(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function squash(s: string): string {
  return normalize(s).replace(/\s+/g, "");
}

async function resolveInstitute(
  instituteRawName: string
): Promise<{ id: string; name: string } | null> {
  const { data: institutes } = await supabase
    .from("institutes")
    .select("id, name");

  if (!institutes) return null;

  const target = normalize(instituteRawName);
  const targetSquashed = squash(instituteRawName);

  for (const inst of institutes) {
    const ni = normalize(inst.name);
    const niSquashed = squash(inst.name);

    // Substring match (com/sem espaços)
    if (
      ni.includes(target) ||
      target.includes(ni) ||
      niSquashed.includes(targetSquashed) ||
      targetSquashed.includes(niSquashed)
    ) {
      return { id: inst.id, name: inst.name };
    }

    // Token match (≥3 chars)
    const ta = new Set(target.split(" ").filter((t) => t.length >= 3));
    const tb = new Set(ni.split(" ").filter((t) => t.length >= 3));
    let shared = 0;
    for (const t of ta) if (tb.has(t)) shared++;
    const minSize = Math.min(ta.size, tb.size);
    if (shared >= 2 || (minSize > 0 && shared === minSize)) {
      return { id: inst.id, name: inst.name };
    }
  }

  return null;
}

async function resolveCandidates(
  electionId: string,
  results: Array<{ name: string; pct: number }>
): Promise<{
  resolved: Array<{ candidate_id: string; percentage: number }>;
  missing: string[];
}> {
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, full_name")
    .eq("election_id", electionId)
    .eq("is_active", true);

  const resolved: Array<{ candidate_id: string; percentage: number }> = [];
  const missing: string[] = [];

  for (const r of results) {
    const target = normalize(r.name);
    let matched: string | null = null;

    if (candidates) {
      for (const c of candidates) {
        const cn = normalize(c.name);
        const cfn = c.full_name ? normalize(c.full_name) : "";

        if (cn.includes(target) || target.includes(cn) || cfn.includes(target)) {
          matched = c.id;
          break;
        }
      }
    }

    if (matched) {
      resolved.push({ candidate_id: matched, percentage: r.pct });
    } else {
      missing.push(r.name);
    }
  }

  return { resolved, missing };
}

async function promoteDraft(draft: any): Promise<{
  status: "promoted" | "failed";
  reason?: string;
  pollId?: string;
}> {
  // Resolve institute
  const institute = await resolveInstitute(draft.institute_name);
  if (!institute) {
    return {
      status: "failed",
      reason: `Instituto não encontrado: ${draft.institute_name}`,
    };
  }

  // Resolve candidates
  const results = Array.isArray(draft.results)
    ? draft.results
    : JSON.parse(draft.results || "[]");
  const { resolved, missing } = await resolveCandidates(
    draft.election_id,
    results
  );

  if (missing.length > 0) {
    return {
      status: "failed",
      reason: `Candidatos não encontrados: ${missing.join(", ")}`,
    };
  }

  if (resolved.length === 0) {
    return {
      status: "failed",
      reason: "Nenhum candidato resolvido",
    };
  }

  // Create poll (nota: source_url/source_kind/tse_protocolo são apenas em poll_drafts)
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      election_id: draft.election_id,
      institute_id: institute.id,
      fieldwork_start: draft.fieldwork_start,
      fieldwork_end: draft.fieldwork_end,
      publication_date: draft.publication_date || draft.fieldwork_end,
      sample_size: draft.sample_size,
      margin_of_error: draft.margin_of_error,
      methodology: draft.methodology,
      scope: draft.scope,
      round: draft.round,
      scenario_label: draft.scenario_label,
    })
    .select("id")
    .single();

  if (pollError || !poll) {
    return {
      status: "failed",
      reason: `Erro ao criar poll: ${pollError?.message}`,
    };
  }

  // Create poll_results
  const pollResults = resolved.map((r) => ({
    poll_id: poll.id,
    candidate_id: r.candidate_id,
    percentage: r.percentage,
  }));

  const { error: resultsError } = await supabase
    .from("poll_results")
    .insert(pollResults);

  if (resultsError) {
    return {
      status: "failed",
      reason: `Erro ao criar poll_results: ${resultsError.message}`,
    };
  }

  // Mark draft as imported
  const { error: updateError } = await supabase
    .from("poll_drafts")
    .update({
      status: "imported",
      promoted_poll_id: poll.id,
      reviewed_by: "promote-approved-polls.ts",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", draft.id);

  if (updateError) {
    return {
      status: "failed",
      reason: `Erro ao atualizar draft: ${updateError.message}`,
    };
  }

  return {
    status: "promoted",
    pollId: poll.id,
  };
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const isPromote = process.argv.includes("--promote");

  console.log(
    `\n📤 Promote Approved Polls (${isDryRun ? "DRY-RUN" : "EXECUTE"})\n`
  );

  // Fetch approved polls
  const { data: drafts, error } = await supabase
    .from("poll_drafts")
    .select("*")
    .eq("status", "approved")
    .order("fieldwork_end", { ascending: false });

  if (error) {
    console.error("❌ Error fetching approved drafts:", error);
    process.exit(1);
  }

  if (!drafts || drafts.length === 0) {
    console.log("✅ Nenhuma pesquisa em status 'approved' para promover\n");
    return;
  }

  console.log(`📊 ${drafts.length} pesquisas aprovadas encontradas\n`);

  let promoted = 0,
    failed = 0;

  for (const draft of drafts) {
    const result = await promoteDraft(draft);

    if (result.status === "promoted") {
      promoted++;
      console.log(
        `✅ Promovida: ${draft.institute_name} · ${draft.fieldwork_end}`
      );
    } else {
      failed++;
      console.log(
        `❌ Falha: ${draft.institute_name} · ${result.reason}`
      );
    }
  }

  console.log(`\n📈 RESUMO`);
  console.log(`  ✅ Promovidas: ${promoted}`);
  console.log(`  ❌ Falhas:     ${failed}`);
  console.log(`  ━━━━━━━━━━━━━`);
  console.log(`  Total:        ${promoted + failed}\n`);

  if (isDryRun) {
    console.log(
      "🔍 DRY-RUN: Nada foi promovido. Use --promote pra executar.\n"
    );
    return;
  }

  if (!isPromote) {
    console.log(
      "ℹ️  Use --promote pra promover as pesquisas acima. Aguardando...\n"
    );
    return;
  }

  console.log(
    `✨ ${promoted} pesquisas agora estão em polls! Páginas vão atualizar em ~1h (cache).\n`
  );
}

main().catch(console.error);
