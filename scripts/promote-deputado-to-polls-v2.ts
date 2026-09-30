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
  console.log(`\n🚀 Promovendo deputado para polls\n`);

  const { data: drafts } = await sb
    .from("poll_drafts")
    .select("*")
    .in("source_kind", ["tier1-manual", "simulated", "tier2-presidencial"]);

  if (!drafts || drafts.length === 0) {
    console.log("❌ Nenhum draft");
    return;
  }

  console.log(`📊 ${drafts.length} drafts encontrados\n`);

  let promoted = 0;
  for (const draft of drafts) {
    try {
      const { data: institute } = await sb
        .from("institutes")
        .select("id")
        .ilike("name", draft.institute_name)
        .limit(1)
        .maybeSingle();

      if (!institute) {
        console.log(`⚠️  ${draft.institute_name}: não encontrado`);
        continue;
      }

      const type = draft.source_kind === "tier2-presidencial" ? "presidente" : "deputado_federal";

      const { error } = await sb
        .from("polls")
        .insert([
          {
            election_id: draft.election_id,
            institute_id: institute.id,
            publication_date: draft.publication_date,
            fieldwork_start: draft.fieldwork_start,
            fieldwork_end: draft.fieldwork_end,
            sample_size: draft.sample_size,
            margin_of_error: draft.margin_of_error,
            methodology: draft.methodology,
            scope: draft.scope,
            type: type,
            round: draft.round,
            source_url: draft.source_url,
            poll_type: draft.source_kind,
            scenario_label: draft.scenario_label,
            source_kind: draft.source_kind,
            raw_data: draft.results
          }
        ]);

      if (error) {
        console.log(`❌ ${draft.institute_name}: ${error.message}`);
      } else {
        promoted++;
        console.log(`✓ ${draft.institute_name.padEnd(25)} | ${draft.scope || "BR"}`);
      }
    } catch (err) {
      console.log(`❌ ${draft.institute_name}: ${err}`);
    }
  }

  console.log(`\n✅ Promovidos: ${promoted}/${drafts.length}\n`);
})();
