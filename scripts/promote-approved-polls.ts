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
import type { Database } from "../src/types/database.types";

type PollDraft = Database["public"]["Tables"]["poll_drafts"]["Row"];

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// poll_drafts.tse_protocolo vem cru de pesqele_registry.protocolo (ex.:
// "BR033172026"). polls.tse_registration exige o formato canônico
// UF-NNNNN/AAAA (constraint polls_tse_registration_formato, ver migration
// 20260817140000) — sem essa conversão, todo draft com protocolo TSE falha
// a promoção com "violates check constraint".
function toTseRegistrationFormat(protocolo: string | null): string | null {
  if (!protocolo) return null;
  const m = protocolo.match(/^([A-Z]{2})(\d{4,5})(\d{4})$/);
  return m ? `${m[1]}-${m[2]}/${m[3]}` : protocolo;
}

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
  electionId: string | null,
  results: Array<{ name: string; pct: number }>
): Promise<{
  resolved: Array<{ candidate_id: string; percentage: number }>;
  missing: string[];
}> {
  // .eq() rejects `null` at the type level (SQL `=` never matches NULL —
  // callers wanting that would use `.is()`), but a null electionId here is
  // a real possibility (poll_drafts.election_id is nullable). Casting
  // preserves the original behavior: the query runs with whatever value
  // electionId has, unresolved candidates end up in `missing`, and
  // promoteDraft() reports failure — same outcome as before this file had
  // real types.
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, full_name")
    .eq("election_id", electionId as string)
    .eq("is_active", true);

  const resolved: Array<{ candidate_id: string; percentage: number }> = [];
  const missing: string[] = [];

  for (const r of results) {
    const target = normalize(r.name);
    let matched: string | null = null;

    if (candidates) {
      // Passo 1: match exato primeiro. Sem isso, "Flávio Bolsonaro" casava
      // com o candidato "Bolsonaro"/"Jair Bolsonaro" via target.includes(cn)
      // (sobrenome comum é substring do nome completo do candidato errado) —
      // achado ao vivo em 2026-08-19 promovendo pesquisas presidenciais reais,
      // que gravaram % do Flávio no Jair. Match exato evita a ambiguidade
      // sempre que o nome usado no draft bate 1:1 com name/full_name.
      for (const c of candidates) {
        const cn = normalize(c.name);
        const cfn = c.full_name ? normalize(c.full_name) : "";
        if (cn === target || cfn === target) {
          matched = c.id;
          break;
        }
      }

      // Passo 2: fallback pro heurístico de substring original, só quando
      // não há match exato — cobre casos como target="Luiz Inácio Lula da
      // Silva" contra candidato name="Lula" (target.includes(cn)).
      if (!matched) {
        for (const c of candidates) {
          const cn = normalize(c.name);
          const cfn = c.full_name ? normalize(c.full_name) : "";
          if (cn.includes(target) || target.includes(cn) || cfn.includes(target)) {
            matched = c.id;
            break;
          }
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

/**
 * Proveniências que NÃO podem virar resultado publicado.
 *
 * A Wikipedia serve como sinal de *descoberta* (aquela pesquisa existe), nunca
 * como *validação* do número. Em 30/07/2026 52 drafts de Wikipedia foram
 * promovidos e, como a promoção descartava source_url, viraram linhas sem
 * fonte nenhuma em `polls` — invisíveis a qualquer checagem de proveniência.
 * Ver docs/ELECTIOLAB-AUDIT-2026-08.md §5.1.
 */
const PROVENIENCIA_BLOQUEADA = new Set(["wikipedia"]);

async function promoteDraft(draft: PollDraft, dryRun: boolean): Promise<{
  status: "promoted" | "failed";
  reason?: string;
  pollId?: string;
}> {
  if (draft.source_kind && PROVENIENCIA_BLOQUEADA.has(draft.source_kind)) {
    return {
      status: "failed",
      reason: `Proveniência bloqueada: ${draft.source_kind} — resultado precisa de fonte primária (release do instituto, imprensa ou TSE)`,
    };
  }

  // Resolve institute
  const institute = await resolveInstitute(draft.institute_name);
  if (!institute) {
    return {
      status: "failed",
      reason: `Instituto não encontrado: ${draft.institute_name}`,
    };
  }

  // Resolve candidates
  // draft.results is jsonb (Json), normally already decoded to an array by
  // Supabase, but historically some rows stored it as a raw JSON string —
  // the Array.isArray guard covers both shapes. JSON.parse() coerces its
  // argument to a string internally regardless of static type, so the `as
  // string` cast here doesn't change what runs, only what typechecks.
  const results: Array<{ name: string; pct: number }> = Array.isArray(draft.results)
    ? (draft.results as Array<{ name: string; pct: number }>)
    : JSON.parse((draft.results as string) || "[]");
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

  // --dry-run parava aqui só de nome: promoteDraft() sempre executou os
  // inserts de verdade (poll + poll_results) e marcava o draft como
  // 'imported', independente da flag — só o print final do main() mudava.
  // Descoberto ao vivo em 2026-08-19 promovendo 6 pesquisas reais em modo
  // "dry-run". A partir daqui simula sem tocar o banco.
  if (dryRun) {
    return { status: "promoted", pollId: "(dry-run — nada foi gravado)" };
  }

  // Create poll. source_url/source_kind/tse_protocolo são propagados do draft:
  // antes eram descartados aqui, o que apagava a proveniência na promoção e
  // deixava a linha em `polls` indistinguível de dado sem fonte.
  // election_id/fieldwork_end/sample_size são nullable em poll_drafts mas
  // obrigatórios em polls — valida explicitamente em vez de deixar o insert
  // falhar na constraint NOT NULL do banco com um erro genérico. `round` tem
  // default no banco (Insert opcional), então só entra no insert se vier
  // preenchido — mandar `null` explícito pisaria no default.
  if (!draft.election_id) {
    return { status: "failed", reason: "poll_draft sem election_id" };
  }
  if (!draft.fieldwork_end) {
    return { status: "failed", reason: "poll_draft sem fieldwork_end" };
  }
  if (!draft.sample_size) {
    return { status: "failed", reason: "poll_draft sem sample_size" };
  }

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
      ...(draft.round != null ? { round: draft.round } : {}),
      scenario_label: draft.scenario_label,
      source_url: draft.source_url,
      source_kind: draft.source_kind,
      tse_registration: toTseRegistrationFormat(draft.tse_protocolo),
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
    const result = await promoteDraft(draft, isDryRun);

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
