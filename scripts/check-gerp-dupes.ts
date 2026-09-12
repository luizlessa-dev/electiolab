#!/usr/bin/env npx tsx
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

async function main() {
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

  // 1. Buscar o ID do instituto GERP
  const { data: institutes } = await supabase
    .from("institutes")
    .select("id, name")
    .ilike("name", "%GERP%");

  if (!institutes || institutes.length === 0) {
    console.log("❌ Instituto GERP não encontrado");
    process.exit(1);
  }

  const gerpId = institutes[0].id;
  console.log(`✅ Instituto GERP encontrado: id=${gerpId}`);

  // 2. Buscar a eleição Presidencial 2026
  const { data: elections } = await supabase
    .from("elections")
    .select("id, name")
    .like("name", "Presidencial%");

  if (!elections || elections.length === 0) {
    console.log("❌ Eleição Presidencial não encontrada");
    process.exit(1);
  }

  const presidentialId = elections[0].id;
  console.log(`✅ Eleição Presidencial encontrada: id=${presidentialId}`);

  // 3. Contar registros GERP de 21/05/2026 na eleição Presidencial
  const { data: polls, error } = await supabase
    .from("polls")
    .select("id, fieldwork_end, created_at")
    .eq("institute_id", gerpId)
    .eq("election_id", presidentialId)
    .eq("fieldwork_end", "2026-05-21");

  if (error) {
    console.log(`❌ Erro: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n📊 Registros GERP de 21/05/2026 (Presidencial): ${polls.length}`);

  if (polls.length > 1) {
    console.log("⚠️  DUPLICATAS ENCONTRADAS!");
    for (const p of polls) {
      console.log(`   ID: ${p.id} | Criado em: ${p.created_at}`);
    }
  } else if (polls.length === 1) {
    console.log("✅ Apenas 1 registro (OK)");
  } else {
    console.log("❌ Nenhum registro encontrado");
  }
}

main().catch(console.error);
