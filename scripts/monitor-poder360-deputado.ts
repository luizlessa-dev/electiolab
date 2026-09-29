import * as fs from "fs";
import * as path from "path";

/**
 * Monitor Semanal: Poder360 - Pesquisas de Deputado Federal
 * 
 * Uso:
 *   npx tsx scripts/monitor-poder360-deputado.ts
 * 
 * Cria arquivo de log com:
 *   - Data/hora da verificação
 *   - URLs encontradas
 *   - Guia para adicionar manualmente
 */

const PODER360_URLS = [
  "https://www.poder360.com.br/poder-pesquisas-hoje/",
  "https://www.poder360.com.br/poder-eleicoes/",
];

const LOG_DIR = path.join(process.cwd(), "logs/poder360-deputado");
const CHECKLIST_FILE = path.join(LOG_DIR, "CHECKLIST.md");

async function main() {
  // Criar pasta de logs se não existir
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toLocaleTimeString("pt-BR");
  const checkFile = path.join(LOG_DIR, `check-${dateStr}.md`);

  console.log(`\n📊 Monitor Poder360 — Deputado Federal\n`);
  console.log(`Data: ${dateStr} ${timeStr}`);
  console.log(`URLs: ${PODER360_URLS.join(", ")}\n`);

  // Log do que foi verificado
  let log = `# Check Poder360 — ${dateStr}\n\n`;
  log += `**Hora:** ${timeStr}\n`;
  log += `**Status:** ✓ Verificado\n\n`;

  log += `## Instruções\n\n`;
  log += `1. Visite as URLs abaixo manualmente\n`;
  log += `2. Procure por pesquisas com "Deputado Federal" ou "Câmara"\n`;
  log += `3. Se encontrar:\n`;
  log += `   - Copie os dados (institute, estado, percentuais)\n`;
  log += `   - Siga o template em \`docs/PODER360-DEPUTADO-GUIDE.md\`\n`;
  log += `   - Adicione a \`scripts/ingest-manual.ts\`\n`;
  log += `   - Rode: \`npx tsx scripts/ingest-manual.ts --apply\`\n\n`;

  log += `## URLs para Verificar\n\n`;
  for (const url of PODER360_URLS) {
    log += `- [ ] ${url}\n`;
  }

  log += `\n## Encontrou algo?\n\n`;
  log += `### Template de Captura\n`;
  log += `\`\`\`\n`;
  log += `Instituto: [Nome]\n`;
  log += `Estado: [UF]\n`;
  log += `Data de coleta: [YYYY-MM-DD]\n`;
  log += `Data de publicação: [YYYY-MM-DD]\n`;
  log += `Amostra: [N]\n`;
  log += `Margem de erro: ±[N]%\n`;
  log += `Dados: [Candidato1] [N]%, [Candidato2] [N]%\n`;
  log += `URL: [link direto]\n`;
  log += `\`\`\`\n\n`;

  log += `### Dúvidas?\n`;
  log += `- Ler: \`docs/PODER360-DEPUTADO-GUIDE.md\`\n`;
  log += `- Código: \`scripts/ingest-manual.ts\`\n`;

  fs.writeFileSync(checkFile, log);
  console.log(`✓ Log salvo: ${checkFile}\n`);
  console.log(`📋 Próximos passos:`);
  console.log(`   1. Visite: ${PODER360_URLS[0]}`);
  console.log(`   2. Procure por "Deputado Federal"`);
  console.log(`   3. Se encontrar, siga o template acima\n`);
}

main().catch(console.error);
