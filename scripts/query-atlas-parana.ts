#!/usr/bin/env npx tsx
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  // Fetch all rows from pesqele_missing, paginating properly
  const PAGE = 1000;
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("pesqele_missing")
      .select("protocolo, uf, cargos, instituto, fieldwork_end, publication_date, sample_size, days_since_fieldwork")
      .order("fieldwork_end", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }

    const page = (data ?? []) as any[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  // Filter for Atlas Intel and Paraná Pesquisas that are recent and ready
  const atlasParana = rows.filter((r) => {
    const inst = (r.instituto || "").toLowerCase();
    return (inst.includes("atlas") || inst.includes("parana")) && 
           r.days_since_fieldwork !== null && 
           r.days_since_fieldwork >= 0 && 
           r.days_since_fieldwork <= 30;
  });

  console.log(`Total found: ${atlasParana.length}`);
  console.log(JSON.stringify(atlasParana, null, 2));
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
