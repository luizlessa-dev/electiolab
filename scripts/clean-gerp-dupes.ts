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
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

  // IDs a deletar (manter o primeiro, deletar o segundo)
  const toDelete = [
    "8e2ec013-4645-473d-a648-239048185a65", // 2026-07-17 segunda cópia
    "bf9f8b06-94df-4fc1-bbde-6708a439fa8a", // 2026-08-10 segunda cópia
    "8d215bde-83de-455e-ab8f-9bde0bc25f03", // 2026-07-07 segunda cópia
  ];

  console.log("🗑️  Deletando duplicatas GERP...\n");
  for (const id of toDelete) {
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(`❌ Erro ao deletar ${id}: ${error.message}`);
    } else {
      console.log(`✅ Deletado: ${id}`);
    }
  }

  console.log("\n✅ Limpeza concluída!");
}

main().catch(console.error);
