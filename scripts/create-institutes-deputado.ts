import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const envFile = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("=");
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  console.log(`\n📋 Criando institutos faltantes...\n`);

  const newInstitutes = [
    { name: "ElectioLab Simulador", slug: "electiolab-simulador" },
    { name: "VOX BRASIL", slug: "vox-brasil" },
  ];

  for (const inst of newInstitutes) {
    const { data: exists } = await sb
      .from("institutes")
      .select("id")
      .ilike("name", inst.name)
      .limit(1)
      .maybeSingle();

    if (exists) {
      console.log(`✓ ${inst.name} já existe`);
      continue;
    }

    const { error } = await sb
      .from("institutes")
      .insert([inst]);

    if (error) {
      console.log(`❌ ${inst.name}: ${error.message}`);
    } else {
      console.log(`✓ ${inst.name} criado`);
    }
  }

  console.log();
})();
