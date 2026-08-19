import { createClient } from "@supabase/supabase-js";

const url = "https://xoxztzologqeqbajlhya.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhveHp0em9sb2dxZXFiYWpsaHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjAzODcsImV4cCI6MjA5MTU5NjM4N30.tIBGfuP-A5KTB7JKwXU4ffiqSUhAp_CMYRLjvggXerY";

const client = createClient(url, anonKey);

async function main() {
  try {
    console.log("Buscando candidatos duplicados por tse_id...\n");

    const { data: candidates, error } = await client
      .from("candidates")
      .select("id, tse_id, name, is_active")
      .not("tse_id", "is", null);

    if (error) {
      console.error("Erro ao buscar candidatos:", error);
      process.exit(1);
    }

    // Agrupar por tse_id
    const groups: Record<string, any[]> = {};
    for (const candidate of candidates || []) {
      if (candidate.tse_id) {
        if (!groups[candidate.tse_id]) {
          groups[candidate.tse_id] = [];
        }
        groups[candidate.tse_id].push(candidate);
      }
    }

    // Filtrar apenas grupos com duplicatas
    const dups = Object.entries(groups)
      .filter(([_, candidates]) => candidates.length > 1)
      .sort((a, b) => b[1].length - a[1].length);

    console.log(`Total de grupos com duplicatas: ${dups.length}`);
    console.log(`Total de linhas excedentes: ${dups.reduce((sum, [_, cands]) => sum + (cands.length - 1), 0)}\n`);
    console.log("Detalhes:\n");

    let totalExcedentes = 0;
    dups.forEach(([tse_id, candidates], index) => {
      totalExcedentes += candidates.length - 1;
      console.log(`${index + 1}. TSE ID: ${tse_id}`);
      console.log(`   Count: ${candidates.length} (${candidates.length - 1} excedentes)`);
      console.log(`   Nomes: ${candidates.map((c) => c.name).join(" | ")}`);
      console.log(`   IDs: ${candidates.map((c) => c.id).join(" | ")}`);
      console.log(`   Status: ${candidates.map((c) => c.is_active ? "ativo" : "inativo").join(" | ")}`);
      console.log();
    });

    console.log(`\n=== RESUMO ===`);
    console.log(`Grupos duplicados: ${dups.length}`);
    console.log(`Linhas excedentes: ${totalExcedentes}`);
  } catch (err) {
    console.error("Erro:", err);
    process.exit(1);
  }
}

main();
