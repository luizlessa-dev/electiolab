#!/usr/bin/env npx tsx
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

async function main() {
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

  const { data: institutes } = await supabase
    .from("institutes")
    .select("id")
    .ilike("name", "%GERP%");

  if (!institutes) process.exit(1);
  const gerpId = institutes[0].id;

  const { data: elections } = await supabase
    .from("elections")
    .select("id")
    .eq("name", "Presidencial 2026 - 1º Turno");

  if (!elections) process.exit(1);
  const electionId = elections[0].id;

  // Buscar as duplicatas
  const dupesDates = ["2026-07-17", "2026-08-10", "2026-07-07"];
  for (const date of dupesDates) {
    const { data: polls } = await supabase
      .from("polls")
      .select("id, created_at")
      .eq("institute_id", gerpId)
      .eq("election_id", electionId)
      .eq("fieldwork_end", date);

    if (polls && polls.length > 1) {
      console.log(`\n📅 ${date}: ${polls.length} cópias`);
      for (const p of polls) {
        console.log(`   ID: ${p.id}`);
        console.log(`   Criado: ${new Date(p.created_at).toLocaleString('pt-BR')}`);
      }
    }
  }
}

main().catch(console.error);
