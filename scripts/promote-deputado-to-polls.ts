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
  console.log(`\n🚀 Promovendo deputado de poll_drafts → polls\n`);

  // Buscar todos os poll_drafts de deputado
  const { data: drafts } = await sb
    .from("poll_drafts")
    .select("*")
    .in("source_kind", ["tier1-manual", "simulated", "tier2-presidencial"]);

  if (!drafts || drafts.length === 0) {
    console.log("❌ Nenhum draft encontrado");
    return;
  }

  console.log(`📊 Encontrados ${drafts.length} drafts`);

  let promoted = 0;
  for (const draft of drafts) {
    try {
      // Pegar instituo ID
      const { data: institute } = await sb
        .from("institutes")
        .select("id")
        .ilike("name", draft.institute_name)
        .limit(1)
        .single();

      if (!institute) {
        console.log(`⚠️  ${draft.institute_name}: institute não encontrado`);
        continue;
      }

      // Determinar tipo (deputado_federal ou presidente)
      const pollType = draft.source_kind === "tier2-presidencial" ? "presidente" : "deputado_federal";

      // Inserir em polls
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
            type: pollType,
            round: draft.round,
            source_url: draft.source_url,
            poll_type: draft.source_kind,
            scenario_label: draft.scenario_label,
            notes: draft.notes,
            // Resultados serão adicionados depois como poll_results
          }
        ])
        .select("id");

      if (error) {
        console.log(`❌ ${draft.institute_name} (${draft.scope}): ${error.message}`);
      } else {
        promoted++;
        console.log(`✓ ${draft.institute_name} | ${draft.scope}`);
      }
    } catch (err) {
      console.log(`❌ Erro: ${err}`);
    }
  }

  console.log(`\n✅ Promovidos: ${promoted}/${drafts.length}`);
})();
