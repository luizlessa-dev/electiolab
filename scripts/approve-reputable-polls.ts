#!/usr/bin/env tsx
/**
 * approve-reputable-polls.ts
 *
 * Auto-approves poll_drafts (pending) from reputable institutes.
 * Validates anomalies via gate-poll-drafts logic before promoting to polls table.
 * Generates detailed report of approvals + flags.
 *
 * Usage:
 *   npx tsx scripts/approve-reputable-polls.ts --dry-run
 *   npx tsx scripts/approve-reputable-polls.ts --approve
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Whitelist de institutos reputados (alta confiabilidade)
const REPUTABLE_INSTITUTES = [
  // Big 5 + IPEC
  "QUAEST",
  "DATAFOLHA",
  "ATLASINTEL",
  "REAL TIME",
  "IPEC",
  "IPESPE",

  // Institutos regionais/especializados bem conhecidos
  "PARANÁ PESQUISAS",
  "GERP",
  "NEXUS",
  "VOX BRASIL",
  "BOAS IDEIAS",
  "PROJETA",
  "INDICE",
  "POLITEIA",
  "APPTIS",
  "NEOKEMP",
  "FOLHA",
  "IPSUS",

  // Variações e alternativas (Genial = Quaest)
  "GENIAL",
];

// Aliases/variações de institutos para normalization
const INSTITUTE_ALIASES: { [key: string]: string } = {
  "GENIAL/QUAEST": "QUAEST",
  "QUAEST PESQUISAS, CONSULTORIA": "QUAEST",
  "FOLHA/IPESPE": "IPESPE",
};

// Blacklist de institutos com qualidade contestada
const QUALITY_FLAGGED = [
  "INSTITUTO VERITA LTDA",
  "INSTITUTO VERITÁ",
  "VERITÁ",
  "VERITAS",
];

interface PollDraft {
  id: string;
  election_id: string;
  institute_name: string;
  fieldwork_end: string;
  scope: string;
  round: number;
  scenario_label: string | null;
  status: string;
  tse_protocolo: string | null;
  results: Array<{
    candidate_id: string;
    percentage: number;
  }>;
}

interface ApprovalResult {
  poll_id: string;
  status: "approved" | "flagged" | "rejected";
  reason?: string;
  institute: string;
  election: string;
  fieldwork_end: string;
}

async function validatePoll(draft: PollDraft): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Normalize institute name
  const normalizedName = Object.entries(INSTITUTE_ALIASES).reduce(
    (acc, [alias, canonical]) => {
      if (acc.toUpperCase().includes(alias.toUpperCase())) {
        return canonical;
      }
      return acc;
    },
    draft.institute_name
  );

  // Check 1: Institute reputation
  const isReputable = REPUTABLE_INSTITUTES.some((inst) =>
    normalizedName.toUpperCase().includes(inst.toUpperCase())
  );

  if (!isReputable) {
    const isQualityFlagged = QUALITY_FLAGGED.some((inst) =>
      normalizedName.toUpperCase().includes(inst.toUpperCase())
    );
    if (isQualityFlagged) {
      errors.push("⚠️ Instituto com qualidade contestada (Veritá)");
    } else {
      errors.push("❌ Instituto não reconhecido");
    }
  }

  // Check 2: Results sum validation
  if (draft.results && draft.results.length > 0) {
    const sum = draft.results.reduce((acc, r) => acc + r.percentage, 0);

    // Para pesquisa de 2º turno (head-to-head), soma deve estar perto de 100%
    // Para espontânea, pode ter abstenção/branco (70-100% é ok)
    // Para estimulada multi-candidato, deve estar perto de 100%

    const isHeadToHead = draft.scenario_label !== null;
    const isEspontanea = draft.scope?.toLowerCase().includes("espontânea");

    if (isHeadToHead) {
      if (sum > 105 || sum < 90) {
        errors.push(`⚠️ Soma 2º turno fora do esperado (${sum.toFixed(1)}%)`);
      }
    } else if (isEspontanea) {
      if (sum > 120 || sum < 50) {
        errors.push(`⚠️ Soma espontânea suspeita (${sum.toFixed(1)}%)`);
      }
    } else {
      if (sum > 110 || sum < 85) {
        errors.push(`⚠️ Soma estimulada fora do esperado (${sum.toFixed(1)}%)`);
      }
    }
  }

  // Check 3: Missing data
  if (!draft.fieldwork_end || !draft.election_id) {
    errors.push("❌ Dados críticos faltando (fieldwork_end, election_id)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function approveDraft(
  draft: PollDraft & { elections?: { type: string; state: string | null } }
): Promise<ApprovalResult> {
  const { valid, errors } = await validatePoll(draft);

  // Get election info (already joined)
  const election = draft.elections;
  const electionLabel = election
    ? `${election.type === "presidencial" ? "Pres" : "Gov"} ${election.state || "BR"}`
    : "Unknown";

  if (!valid) {
    return {
      poll_id: draft.id,
      status: "rejected",
      reason: errors.join(" | "),
      institute: draft.institute_name,
      election: electionLabel,
      fieldwork_end: draft.fieldwork_end,
    };
  }

  // Normalize name again
  const normalizedName = Object.entries(INSTITUTE_ALIASES).reduce(
    (acc, [alias, canonical]) => {
      if (acc.toUpperCase().includes(alias.toUpperCase())) {
        return canonical;
      }
      return acc;
    },
    draft.institute_name
  );

  const isQualityFlagged = QUALITY_FLAGGED.some((inst) =>
    normalizedName.toUpperCase().includes(inst.toUpperCase())
  );

  if (isQualityFlagged) {
    return {
      poll_id: draft.id,
      status: "flagged",
      reason: "⚠️ Instituto com qualidade contestada — revisar manualmente",
      institute: draft.institute_name,
      election: electionLabel,
      fieldwork_end: draft.fieldwork_end,
    };
  }

  return {
    poll_id: draft.id,
    status: "approved",
    institute: draft.institute_name,
    election: electionLabel,
    fieldwork_end: draft.fieldwork_end,
  };
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const isApprove = process.argv.includes("--approve");

  console.log(
    `\n📋 Auto-Approve Polls Script (${isDryRun ? "DRY-RUN" : "EXECUTE"})\n`
  );

  // Fetch pending polls (TIER 1+2 only) with election type
  const { data: drafts, error } = await supabase
    .from("poll_drafts")
    .select(
      `
      *,
      elections (type, state)
    `
    )
    .eq("status", "pending")
    .in("elections.type", ["presidencial", "governador"]) // TIER 1+2
    .order("fieldwork_end", { ascending: false })
    .limit(100);

  if (error) {
    console.error("❌ Error fetching drafts:", error);
    process.exit(1);
  }

  if (!drafts || drafts.length === 0) {
    console.log("✅ Nenhuma pesquisa pendente encontrada");
    return;
  }

  console.log(`📊 ${drafts.length} pesquisas pendentes encontradas\n`);

  // Validate and categorize
  const results: ApprovalResult[] = [];
  let approved = 0,
    flagged = 0,
    rejected = 0;

  for (const draft of drafts) {
    const result = await approveDraft(draft as PollDraft);
    results.push(result);

    if (result.status === "approved") approved++;
    else if (result.status === "flagged") flagged++;
    else rejected++;
  }

  // Print report
  console.log("━━━ APROVADAS (pronto pra publicar) ━━━");
  results
    .filter((r) => r.status === "approved")
    .forEach((r) => {
      console.log(`✅ ${r.election} · ${r.institute} · ${r.fieldwork_end}`);
    });

  console.log("\n━━━ SINALIZADAS (revisar manualmente) ━━━");
  results
    .filter((r) => r.status === "flagged")
    .forEach((r) => {
      console.log(`⚠️  ${r.election} · ${r.reason}`);
      console.log(`   ${r.institute} · ${r.fieldwork_end}\n`);
    });

  console.log("━━━ REJEITADAS (erros de dados) ━━━");
  results
    .filter((r) => r.status === "rejected")
    .forEach((r) => {
      console.log(`❌ ${r.election} · ${r.reason}`);
      console.log(`   ${r.institute} · ${r.fieldwork_end}\n`);
    });

  console.log(`\n📈 RESUMO`);
  console.log(`  ✅ Aprovadas:   ${approved}`);
  console.log(`  ⚠️  Sinalizadas: ${flagged}`);
  console.log(`  ❌ Rejeitadas:  ${rejected}`);
  console.log(`  ━━━━━━━━━━━━━━`);
  console.log(`  Total:        ${approved + flagged + rejected}\n`);

  if (isDryRun) {
    console.log("🔍 DRY-RUN: Nada foi aprovado. Use --approve pra executar.\n");
    return;
  }

  if (!isApprove) {
    console.log(
      "ℹ️  Use --approve pra aprovar as pesquisas acima. Aguardando...\n"
    );
    return;
  }

  // Execute approvals
  console.log("🚀 Aprovando pesquisas...\n");

  const approvedIds = results
    .filter((r) => r.status === "approved")
    .map((r) => r.poll_id);

  if (approvedIds.length > 0) {
    const { error: updateError } = await supabase
      .from("poll_drafts")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: "auto-approve-reputable-polls.ts",
      })
      .in("id", approvedIds);

    if (updateError) {
      console.error("❌ Error updating polls:", updateError);
      process.exit(1);
    }

    console.log(`✅ ${approvedIds.length} pesquisas aprovadas e prontas!\n`);
  }

  // Summary for manual review
  const flaggedIds = results
    .filter((r) => r.status === "flagged")
    .map((r) => r.poll_id);

  if (flaggedIds.length > 0) {
    console.log(`⚠️  ${flaggedIds.length} pesquisas aguardando revisão manual:`);
    flaggedIds.forEach((id) => {
      const result = results.find((r) => r.poll_id === id);
      console.log(`   - ${result?.election} (${id})`);
    });
    console.log("");
  }

  console.log(
    "📝 Próximo passo: Revisar pesquisas sinalizadas em /dashboard/drafts\n"
  );
}

main().catch(console.error);
