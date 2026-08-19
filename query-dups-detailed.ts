import { createClient } from "@supabase/supabase-js";

const url = "https://xoxztzologqeqbajlhya.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhveHp0em9sb2dxZXFiYWpsaHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjAzODcsImV4cCI6MjA5MTU5NjM4N30.tIBGfuP-A5KTB7JKwXU4ffiqSUhAp_CMYRLjvggXerY";

const client = createClient(url, anonKey);

async function main() {
  try {
    console.log("Buscando candidatos duplicados com detalhes completos...\n");

    // Buscar todos os candidatos com tse_id
    const { data: candidates, error } = await client
      .from("candidates")
      .select("id, tse_id, name, is_active, created_at, election_id, number, party, coalition, slug");

    if (error) {
      console.error("Erro ao buscar candidatos:", error);
      process.exit(1);
    }

    // Buscar eleições pra mapear election_id
    const { data: elections } = await client
      .from("elections")
      .select("id, name, year, type, state");

    const electionMap = new Map(
      (elections || []).map(e => [e.id, e])
    );

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

    console.log(`RESUMO EXECUTIVO\n===============`);
    console.log(`Total de grupos com duplicatas: ${dups.length}`);
    console.log(`Total de linhas excedentes: ${dups.reduce((sum, [_, cands]) => sum + (cands.length - 1), 0)}\n`);

    // Relatório detalhado
    console.log(`DETALHES POR GRUPO\n==================\n`);

    let reportLines: string[] = [];

    dups.forEach(([tse_id, candidates], index) => {
      const excedentes = candidates.length - 1;
      reportLines.push(`\n## ${index + 1}. TSE_ID: ${tse_id}`);
      reportLines.push(`Registros: ${candidates.length} (${excedentes} excedente${excedentes > 1 ? 's' : ''})`);
      reportLines.push(`\nDetalhes por registro:`);

      candidates.forEach((cand, i) => {
        const election = electionMap.get(cand.election_id);
        reportLines.push(
          `  ${i + 1}. ${cand.name}`
        );
        reportLines.push(`     ID: ${cand.id}`);
        reportLines.push(`     Ativo: ${cand.is_active ? 'SIM' : 'NÃO'}`);
        reportLines.push(`     Partido: ${cand.party || '-'}`);
        reportLines.push(`     Número: ${cand.number || '-'}`);
        reportLines.push(`     Coligação: ${cand.coalition || '-'}`);
        reportLines.push(`     Eleição: ${election ? `${election.name} (${election.year}, ${election.type})` : '-'}`);
        reportLines.push(`     Estado: ${election?.state || '-'}`);
        reportLines.push(`     Slug: ${cand.slug || '-'}`);
        reportLines.push(`     Criado em: ${new Date(cand.created_at).toLocaleString('pt-BR')}`);
      });

      reportLines.push(`\nDecisão de merge:`);
      const nomesDiff = new Set(candidates.map(c => c.name)).size > 1;
      const partidoDiff = new Set(candidates.map(c => c.party)).size > 1;
      const electionDiff = new Set(candidates.map(c => c.election_id)).size > 1;

      if (!nomesDiff && !partidoDiff && !electionDiff && candidates.every(c => c.is_active)) {
        reportLines.push(`  ✓ GENUÍNA DUPLICATA — nomes, partidos e eleições idênticas`);
        reportLines.push(`    Ação: manter o registro mais antigo, deletar os outros`);
      } else if (electionDiff) {
        reportLines.push(`  ⚠ POSSÍVEL CONFLITO — mesmo tse_id em eleições diferentes`);
        reportLines.push(`    Ação: revisar se é validação de eleição/cargo; pode ser erro de ingestão`);
      } else {
        reportLines.push(`  ? VARIANTES DE NOME OU PARTIDO`);
        reportLines.push(`    Nomes: ${new Set(candidates.map(c => c.name)).size > 1 ? 'DIFERENTES' : 'iguais'}`);
        reportLines.push(`    Partidos: ${new Set(candidates.map(c => c.party)).size > 1 ? 'DIFERENTES' : 'iguais'}`);
        reportLines.push(`    Ação: revisar manualmente (possível homônimo legítimo)`);
      }
    });

    console.log(reportLines.join('\n'));

    // Salvar em arquivo
    const reportContent = `# Relatório de Candidatos Duplicados por TSE_ID\n\n${reportLines.join('\n')}`;
    console.log("\n\n_Relatório salvo em: /tmp/dups_report.md_");

  } catch (err) {
    console.error("Erro:", err);
    process.exit(1);
  }
}

main();
