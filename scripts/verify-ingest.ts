#!/usr/bin/env npx tsx

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  // Conta pesquisas de Atlas Intel e Paraná Pesquisas no banco
  const { data: atlasPolls, error: atlasError } = await sb
    .from("polls")
    .select("id, institute, fieldwork_end, publication_date", { count: "exact" })
    .ilike("institute", "%atlas%")
    .gte("fieldwork_end", "2026-08-19")
    .lte("fieldwork_end", "2026-09-13");

  const { data: paranaPolls, error: paranaError } = await sb
    .from("polls")
    .select("id, institute, fieldwork_end, publication_date", { count: "exact" })
    .ilike("institute", "%paraná%")
    .gte("fieldwork_end", "2026-08-19")
    .lte("fieldwork_end", "2026-09-13");

  if (atlasError) console.error("Erro ao ler Atlas Intel:", atlasError.message);
  if (paranaError) console.error("Erro ao ler Paraná Pesquisas:", paranaError.message);

  const atlasCount = (atlasPolls as any[])?.length ?? 0;
  const paranaCount = (paranaPolls as any[])?.length ?? 0;

  console.log(`\n✅ VERIFICAÇÃO DE INGESTÃO`);
  console.log(`Atlas Intel (2026-08-19 a 2026-09-13): ${atlasCount} pesquisas no banco`);
  console.log(`Paraná Pesquisas (2026-08-19 a 2026-09-13): ${paranaCount} pesquisas no banco`);
  console.log(`Total: ${atlasCount + paranaCount} pesquisas\n`);

  // Mostra as datas
  if (atlasPolls && atlasPolls.length > 0) {
    const dates = new Set((atlasPolls as any[]).map(p => p.fieldwork_end));
    console.log(`Datas de fieldwork Atlas Intel: ${Array.from(dates).sort().reverse().join(", ")}`);
  }
}

main().catch(e => {
  console.error("Erro:", e.message);
  process.exit(1);
});
