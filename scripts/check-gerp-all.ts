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
    .select("id, name")
    .ilike("name", "%GERP%");

  if (!institutes) {
    console.log("❌ Erro ao buscar GERP");
    process.exit(1);
  }

  const gerpId = institutes[0].id;
  const { data: elections } = await supabase
    .from("elections")
    .select("id, name");

  // Contabilizar por eleição
  console.log(`📊 Total de registros GERP por eleição:\n`);
  
  for (const election of elections || []) {
    const { data: polls } = await supabase
      .from("polls")
      .select("id, fieldwork_end")
      .eq("institute_id", gerpId)
      .eq("election_id", election.id);
    
    if (polls && polls.length > 0) {
      console.log(`  ${election.name}: ${polls.length} registros`);
      // Agrupar por fieldwork_end para detectar duplicatas
      const grouped: Record<string, number> = {};
      for (const p of polls) {
        grouped[p.fieldwork_end] = (grouped[p.fieldwork_end] || 0) + 1;
      }
      for (const [date, count] of Object.entries(grouped)) {
        if (count > 1) {
          console.log(`    ⚠️  ${date}: ${count} cópias`);
        }
      }
    }
  }
}

main().catch(console.error);
