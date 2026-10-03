import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Tier2Poll {
  id: string;
  institute: string;
  position: string;
  state: string;
  fieldwork_end: string;
  publication_date: string;
  sample_size: number;
  margin_of_error: number;
  notes: string;
}

// Parseia notas tipo "1º turno: Lula 37%, Flávio 34%" e extrai candidatos + %
function parseNotes(notes: string): Array<{ candidate: string; percentage: number }> {
  const results: Array<{ candidate: string; percentage: number }> = [];
  
  // Busca padrão: "Lula 37%", "Flávio 34%"
  const pattern = /(\w+[\w\s]*?)\s+(\d+(?:\.\d+)?)\%/g;
  let match;
  
  while ((match = pattern.exec(notes)) !== null) {
    results.push({
      candidate: match[1].trim(),
      percentage: parseFloat(match[2])
    });
  }
  
  return results;
}

async function importTier2() {
  console.log(`\n📥 Import Tier 2 Presidencial\n`);

  const data = JSON.parse(fs.readFileSync("data/tier2-pesquisas-2026.json", "utf-8"));
  
  const institutes = Object.keys(data).filter(k => k !== "metadata");
  let totalPolls = 0;
  let imported = 0;
  let skipped = 0;

  for (const institute of institutes) {
    const polls: Tier2Poll[] = data[institute];
    
    if (Array.isArray(polls)) for (const poll of polls) {
      totalPolls++;
      
      if (!poll.notes) {
        console.log(`⚠️  Skip (sem notas): ${institute}`);
        skipped++;
        continue;
      }

      const candidates = parseNotes(poll.notes);
      if (candidates.length === 0) {
        console.log(`⚠️  Skip (não parseable): ${institute} - "${poll.notes.slice(0,40)}..."`);
        skipped++;
        continue;
      }

      // Criar poll_draft para cada candidato
      for (const cand of candidates) {
        const pollDraft = {
          election_id: null, // Será preenchido depois
          institute_name: poll.institute,
          candidate: cand.candidate,
          candidate_slug: cand.candidate.toLowerCase().replace(/\s+/g, "-"),
          office: "presidente",
          scope: "BR",
          percentage: cand.percentage,
          margin_of_error: poll.margin_of_error,
          fieldwork_end: poll.fieldwork_end,
          publication_date: poll.publication_date,
          sample_size: poll.sample_size,
          methodology: "mista",
          source_kind: "tier2-presidencial",
          status: "approved",
          notes: poll.notes
        };
        
        console.log(`✓ ${poll.institute} | ${cand.candidate} ${cand.percentage}%`);
        imported++;
      }
    }
  }

  console.log(`\n📊 Summary: ${imported}/${totalPolls} (skipped: ${skipped})`);
}

importTier2().catch(console.error);
