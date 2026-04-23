#!/usr/bin/env npx tsx
/**
 * Script de ingestão manual de pesquisas eleitorais.
 *
 * Uso:
 *   npx tsx scripts/ingest-manual.ts
 *
 * Ou com dados inline:
 *   npx tsx scripts/ingest-manual.ts --file polls.json
 *
 * Configurar .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Carregar .env.local
const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ────────────────────────────────────────────────────
// PESQUISAS PENDENTES DE INGESTÃO
// Adicione novas pesquisas aqui antes de rodar o script
// ────────────────────────────────────────────────────
const PENDING_POLLS: Array<{
  institute_name: string;
  election_name: string;
  publication_date: string;
  fieldwork_start?: string;
  fieldwork_end: string;
  sample_size: number;
  margin_of_error?: number;
  methodology: "presencial" | "telefonica" | "online" | "mista";
  source_url?: string;
  results: { candidate_name: string; percentage: number }[];
}> = [
  // ─── Novos polls 2026 (abr/2026) ───────────────────
  {
    institute_name: "Futura Inteligência",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-04-14",
    fieldwork_start: "2026-04-07",
    fieldwork_end: "2026-04-11",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "mista",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/futura-inteligencia-presidente-abril-2026/",
    results: [
      { candidate_name: "Lula", percentage: 39.8 },
      { candidate_name: "Flavio Bolsonaro", percentage: 37.3 },
      { candidate_name: "Caiado", percentage: 4.8 },
      { candidate_name: "Zema", percentage: 2.9 },
      { candidate_name: "Renan Santos", percentage: 1.4 },
      { candidate_name: "Aldo Rebelo", percentage: 0.3 },
    ],
  },
  {
    institute_name: "MDA/CNT",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-04-12",
    fieldwork_start: "2026-04-08",
    fieldwork_end: "2026-04-10",
    sample_size: 2002,
    margin_of_error: 2.2,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poder-pesquisas/lula-lidera-todos-os-cenarios-de-1o-e-2o-turnos-diz-pesquisa-cnt-mda/",
    results: [
      { candidate_name: "Lula", percentage: 39.2 },
      { candidate_name: "Flavio Bolsonaro", percentage: 30.2 },
      { candidate_name: "Caiado", percentage: 4.6 },
      { candidate_name: "Zema", percentage: 3.3 },
      { candidate_name: "Renan Santos", percentage: 1.5 },
    ],
  },

  // ─── 2022 – 2º Turno (Lula x Bolsonaro) ──────────
  {
    institute_name: "Atlas Intel",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-15",
    fieldwork_start: "2022-10-13",
    fieldwork_end: "2022-10-14",
    sample_size: 5000,
    margin_of_error: 1.4,
    methodology: "online",
    results: [
      { candidate_name: "Lula", percentage: 52.4 },
      { candidate_name: "Bolsonaro", percentage: 47.6 },
    ],
  },
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-13",
    fieldwork_start: "2022-10-12",
    fieldwork_end: "2022-10-13",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "telefonica",
    results: [
      { candidate_name: "Lula", percentage: 52 },
      { candidate_name: "Bolsonaro", percentage: 48 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-16",
    fieldwork_start: "2022-10-14",
    fieldwork_end: "2022-10-15",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 53 },
      { candidate_name: "Bolsonaro", percentage: 47 },
    ],
  },
  {
    institute_name: "Ipec",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-19",
    fieldwork_start: "2022-10-17",
    fieldwork_end: "2022-10-18",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 54 },
      { candidate_name: "Bolsonaro", percentage: 46 },
    ],
  },
  {
    institute_name: "Ipespe",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-19",
    fieldwork_start: "2022-10-17",
    fieldwork_end: "2022-10-18",
    sample_size: 1500,
    margin_of_error: 2.5,
    methodology: "telefonica",
    results: [
      { candidate_name: "Lula", percentage: 53 },
      { candidate_name: "Bolsonaro", percentage: 47 },
    ],
  },
  {
    institute_name: "MDA/CNT",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-18",
    fieldwork_start: "2022-10-17",
    fieldwork_end: "2022-10-17",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "telefonica",
    results: [
      { candidate_name: "Lula", percentage: 53.5 },
      { candidate_name: "Bolsonaro", percentage: 46.5 },
    ],
  },
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-19",
    fieldwork_start: "2022-10-16",
    fieldwork_end: "2022-10-18",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 47 },
      { candidate_name: "Bolsonaro", percentage: 42 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-25",
    fieldwork_start: "2022-10-22",
    fieldwork_end: "2022-10-24",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 53 },
      { candidate_name: "Bolsonaro", percentage: 47 },
    ],
  },
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-28",
    fieldwork_start: "2022-10-26",
    fieldwork_end: "2022-10-28",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 52 },
      { candidate_name: "Bolsonaro", percentage: 48 },
    ],
  },
  {
    institute_name: "MDA/CNT",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-29",
    fieldwork_start: "2022-10-28",
    fieldwork_end: "2022-10-29",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "telefonica",
    results: [
      { candidate_name: "Lula", percentage: 51.1 },
      { candidate_name: "Bolsonaro", percentage: 48.9 },
    ],
  },
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-29",
    fieldwork_start: "2022-10-27",
    fieldwork_end: "2022-10-29",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 50.4 },
      { candidate_name: "Bolsonaro", percentage: 49.6 },
    ],
  },
];

async function main() {
  console.log("🗳️  ElectioLab — Ingestão Manual de Pesquisas\n");

  if (PENDING_POLLS.length === 0) {
    console.log("⚠️  Nenhuma pesquisa na fila. Edite PENDING_POLLS neste script.");
    await printStatus();
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const poll of PENDING_POLLS) {
    process.stdout.write(`📊 ${poll.institute_name} ${poll.publication_date}... `);

    // Resolver IDs
    const { data: election } = await supabase
      .from("elections")
      .select("id")
      .eq("name", poll.election_name)
      .single();
    if (!election) { console.log("❌ eleição não encontrada"); errors++; continue; }

    const { data: institute } = await supabase
      .from("institutes")
      .select("id")
      .eq("name", poll.institute_name)
      .single();
    if (!institute) { console.log("❌ instituto não encontrado"); errors++; continue; }

    // Deduplicar
    const { data: existing } = await supabase
      .from("polls")
      .select("id")
      .eq("election_id", election.id)
      .eq("institute_id", institute.id)
      .eq("fieldwork_end", poll.fieldwork_end)
      .maybeSingle();
    if (existing) { console.log("⏭️  já existe"); skipped++; continue; }

    // Inserir poll
    const { data: newPoll, error } = await supabase
      .from("polls")
      .insert({
        election_id: election.id,
        institute_id: institute.id,
        publication_date: poll.publication_date,
        fieldwork_start: poll.fieldwork_start ?? null,
        fieldwork_end: poll.fieldwork_end,
        sample_size: poll.sample_size,
        margin_of_error: poll.margin_of_error ?? null,
        confidence_level: 95,
        methodology: poll.methodology,
        scope: "nacional",
        poll_type: "estimulada",
        source_url: poll.source_url ?? null,
        is_verified: true,
      })
      .select("id")
      .single();

    if (error || !newPoll) { console.log(`❌ ${error?.message}`); errors++; continue; }

    // Inserir resultados
    for (const r of poll.results) {
      const { data: candidate } = await supabase
        .from("candidates")
        .select("id")
        .eq("election_id", election.id)
        .ilike("name", r.candidate_name)
        .maybeSingle();
      if (!candidate) { continue; }
      await supabase.from("poll_results").insert({
        poll_id: newPoll.id,
        candidate_id: candidate.id,
        percentage: r.percentage,
      });
    }

    console.log(`✅ inserida (id: ${newPoll.id})`);
    inserted++;
  }

  console.log(`\n📋 Resumo: ${inserted} inseridas · ${skipped} duplicadas · ${errors} erros`);
  await printStatus();
}

async function printStatus() {
  console.log("\n📡 Estado atual do banco:\n");
  const { data: elections } = await supabase
    .from("elections")
    .select("name, is_active")
    .order("year", { ascending: false });

  for (const e of elections ?? []) {
    const { count } = await supabase
      .from("polls")
      .select("*", { count: "exact", head: true })
      .eq("election_id",
        (await supabase.from("elections").select("id").eq("name", e.name).single()).data?.id
      );
    const { data: last } = await supabase
      .from("polls")
      .select("publication_date")
      .eq("election_id",
        (await supabase.from("elections").select("id").eq("name", e.name).single()).data?.id
      )
      .order("publication_date", { ascending: false })
      .limit(1)
      .single();

    const gap = last?.publication_date
      ? Math.floor((Date.now() - new Date(last.publication_date).getTime()) / 86400000)
      : null;

    const status = e.is_active
      ? gap !== null && gap > 14 ? "⚠️  ATUALIZAÇÃO NECESSÁRIA" : "✅ OK"
      : "🔒 encerrada";

    console.log(`  ${e.is_active ? "🟢" : "⚫"} ${e.name}`);
    console.log(`     ${count ?? 0} pesquisas · última: ${last?.publication_date ?? "—"} · ${gap !== null ? `${gap}d atrás` : "sem dados"} ${status}`);
  }
}

main().catch(console.error);
