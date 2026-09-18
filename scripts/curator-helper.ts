#!/usr/bin/env npx tsx
/**
 * Curator Helper — Gera links e checklist para curadoria manual de pesquisas
 *
 * Uso:
 *   npx tsx scripts/curator-helper.ts --cargo senador --html curator-checklist.html
 *   npx tsx scripts/curator-helper.ts --cargo presidente --institute datafolha
 *   npx tsx scripts/curator-helper.ts --cargo governador --state sp
 */

import * as fs from "fs";

interface CuratorItem {
  date: string;
  uf: string;
  cargo: string;
  institute: string;
  sampleSize: number;
  searchUrl: string;
  priority: "⭐⭐⭐" | "⭐⭐" | "⭐" | "⚠️";
  status: "pendente" | "divulgando" | "pronto";
}

// Hardcoded data de Tier 4 (Senador) — pode expandir para outros cargos
const SENADOR_TIER4: CuratorItem[] = [
  // Datafolha — prioridade máxima
  {
    date: "2026-09-11",
    uf: "DF",
    cargo: "senador",
    institute: "DATAFOLHA",
    sampleSize: 910,
    searchUrl: "https://www.google.com/search?q=datafolha+senador+df+2026+resultado",
    priority: "⭐⭐⭐",
    status: "pronto",
  },
  {
    date: "2026-09-11",
    uf: "MG",
    cargo: "senador",
    institute: "DATAFOLHA",
    sampleSize: 1204,
    searchUrl: "https://www.google.com/search?q=datafolha+senador+minas+gerais+2026+resultado",
    priority: "⭐⭐⭐",
    status: "pronto",
  },
  {
    date: "2026-09-11",
    uf: "RJ",
    cargo: "senador",
    institute: "DATAFOLHA",
    sampleSize: 1204,
    searchUrl: "https://www.google.com/search?q=datafolha+senador+rio+janeiro+2026+resultado",
    priority: "⭐⭐⭐",
    status: "pronto",
  },
  {
    date: "2026-09-11",
    uf: "PE",
    cargo: "senador",
    institute: "DATAFOLHA",
    sampleSize: 1204,
    searchUrl: "https://www.google.com/search?q=datafolha+senador+pernambuco+2026+resultado",
    priority: "⭐⭐⭐",
    status: "pronto",
  },

  // Real Time — prioridade alta
  {
    date: "2026-09-13",
    uf: "SP",
    cargo: "senador",
    institute: "REAL TIME",
    sampleSize: 1600,
    searchUrl: "https://www.google.com/search?q=real+time+senador+sp+2026+resultado",
    priority: "⭐⭐",
    status: "pronto",
  },
  {
    date: "2026-09-13",
    uf: "RS",
    cargo: "senador",
    institute: "REAL TIME",
    sampleSize: 1600,
    searchUrl: "https://www.google.com/search?q=real+time+senador+rs+2026+resultado",
    priority: "⭐⭐",
    status: "pronto",
  },
  {
    date: "2026-09-13",
    uf: "BA",
    cargo: "senador",
    institute: "REAL TIME",
    sampleSize: 1600,
    searchUrl: "https://www.google.com/search?q=real+time+senador+bahia+2026+resultado",
    priority: "⭐⭐",
    status: "pronto",
  },
  {
    date: "2026-09-13",
    uf: "RJ",
    cargo: "senador",
    institute: "REAL TIME",
    sampleSize: 1600,
    searchUrl: "https://www.google.com/search?q=real+time+senador+rj+2026+resultado",
    priority: "⭐⭐",
    status: "pronto",
  },

  // Quaest
  {
    date: "2026-09-13",
    uf: "SP",
    cargo: "senador",
    institute: "QUAEST",
    sampleSize: 2000,
    searchUrl: "https://www.google.com/search?q=quaest+senador+sp+2026+resultado",
    priority: "⭐⭐",
    status: "pronto",
  },
  {
    date: "2026-09-13",
    uf: "RS",
    cargo: "senador",
    institute: "QUAEST",
    sampleSize: 1500,
    searchUrl: "https://www.google.com/search?q=quaest+senador+rs+2026+resultado",
    priority: "⭐⭐",
    status: "pronto",
  },
];

function generateHtml(items: CuratorItem[]): string {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ElectioLab — Curator Helper</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f9fafb;
      color: #1f2937;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      color: #111827;
    }
    .subtitle {
      color: #6b7280;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat {
      background: white;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    thead {
      background: #f3f4f6;
      border-bottom: 2px solid #e5e7eb;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #374151;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tbody tr:hover {
      background: #f9fafb;
    }
    .priority {
      font-size: 16px;
      text-align: center;
    }
    .date { color: #6b7280; font-size: 13px; }
    .institute { font-weight: 500; }
    .uf {
      display: inline-block;
      background: #e0e7ff;
      color: #3730a3;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
    }
    .search-btn {
      display: inline-block;
      background: #0066cc;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .search-btn:hover {
      background: #0052a3;
    }
    .status-ready { color: #059669; font-weight: 500; }
    .status-pending { color: #d97706; font-weight: 500; }
    .footer {
      margin-top: 32px;
      padding: 16px;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      font-size: 13px;
      color: #92400e;
    }
    .instructions {
      background: white;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      margin-bottom: 24px;
      font-size: 13px;
      line-height: 1.6;
    }
    .instructions h3 { margin-bottom: 8px; color: #111827; font-size: 14px; }
    .instructions ol { margin-left: 20px; }
    .instructions li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🗳️ ElectioLab — Curator Helper</h1>
    <p class="subtitle">Checklist para curadoria manual de pesquisas</p>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${items.length}</div>
        <div class="stat-label">Total Pesquisas</div>
      </div>
      <div class="stat">
        <div class="stat-value">${items.filter(i => i.status === "pronto").length}</div>
        <div class="stat-label">Prontas</div>
      </div>
      <div class="stat">
        <div class="stat-value">${items.filter(i => i.institute === "DATAFOLHA").length}</div>
        <div class="stat-label">Datafolha</div>
      </div>
      <div class="stat">
        <div class="stat-value">${items.reduce((sum, i) => sum + i.sampleSize, 0).toLocaleString()}</div>
        <div class="stat-label">Amostra Total</div>
      </div>
    </div>

    <div class="instructions">
      <h3>📋 Como Usar:</h3>
      <ol>
        <li><strong>Clique no link de busca</strong> (coluna "Buscar") para abrir a pesquisa no Google</li>
        <li><strong>Encontre o resultado</strong> no site do instituto ou matéria de imprensa</li>
        <li><strong>Anote os candidatos e percentuais</strong> (copie para um editor de texto)</li>
        <li><strong>Preencha TEMPLATE_SENADOR_INGEST.ts</strong> com os dados</li>
        <li><strong>Rode</strong> <code>npx tsx scripts/ingest-manual.ts</code> para ingerir</li>
      </ol>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 60px;">Prioridade</th>
          <th style="width: 80px;">Data</th>
          <th style="width: 50px;">Estado</th>
          <th>Instituto</th>
          <th style="width: 70px;">Amostra</th>
          <th style="width: 140px;">Status</th>
          <th style="width: 140px;">Ação</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) =>
              `
        <tr>
          <td class="priority">${item.priority}</td>
          <td class="date">${item.date}</td>
          <td><span class="uf">${item.uf}</span></td>
          <td class="institute">${item.institute}</td>
          <td>${item.sampleSize.toLocaleString()}</td>
          <td class="status-${item.status === "pronto" ? "ready" : "pending"}">
            ${item.status === "pronto" ? "✅ Pronto" : "⏳ Divulgando"}
          </td>
          <td>
            <a href="${item.searchUrl}" target="_blank" class="search-btn">🔍 Buscar</a>
          </td>
        </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <div class="footer">
      <strong>💡 Dica:</strong> Abra os links em abas novas (Cmd+Click ou Ctrl+Click).
      Reúna todos os dados primeiro, depois preencha o template de uma vez.
    </div>
  </div>
</body>
</html>`;
  return html;
}

function generateMarkdown(items: CuratorItem[]): string {
  let md = `# Curadoria de Pesquisas — Checklist\n\n`;
  md += `Data gerada: ${new Date().toLocaleString("pt-BR")}\n`;
  md += `Total: ${items.length} pesquisas\n\n`;

  md += `## Prioridade Máxima (⭐⭐⭐)\n\n`;
  for (const item of items.filter((i) => i.priority === "⭐⭐⭐")) {
    md += `- [ ] **${item.institute}** — Senador ${item.uf} (${item.date}, n=${item.sampleSize})\n`;
    md += `  🔗 ${item.searchUrl}\n\n`;
  }

  md += `## Prioridade Alta (⭐⭐)\n\n`;
  for (const item of items.filter((i) => i.priority === "⭐⭐")) {
    md += `- [ ] **${item.institute}** — Senador ${item.uf} (${item.date}, n=${item.sampleSize})\n`;
    md += `  🔗 ${item.searchUrl}\n\n`;
  }

  return md;
}

async function main() {
  const args = process.argv.slice(2);

  let format = "html";
  let output = undefined;
  let cargo = "senador";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--html") format = "html";
    else if (args[i] === "--markdown") format = "markdown";
    else if (args[i] === "--output" && args[i + 1]) output = args[++i];
    else if (args[i] === "--cargo" && args[i + 1]) cargo = args[++i];
  }

  // Selecionar dados por cargo
  let items = SENADOR_TIER4;
  if (cargo === "senador") items = SENADOR_TIER4;

  // Gerar conteúdo
  let content: string;
  let extension: string;

  if (format === "markdown") {
    content = generateMarkdown(items);
    extension = "md";
  } else {
    content = generateHtml(items);
    extension = "html";
  }

  // Determinar nome do arquivo
  if (!output) {
    output = `curator-${cargo}-checklist.${extension}`;
  }

  // Escrever arquivo
  fs.writeFileSync(output, content);

  console.log(`\n✅ Checklist gerado: ${output}`);
  console.log(`   Abrir com: open ${output}`);
  console.log(`\n📊 Resumo:`);
  console.log(`   Total: ${items.length} pesquisas`);
  console.log(`   Datafolha: ${items.filter((i) => i.institute === "DATAFOLHA").length}`);
  console.log(`   Prioridade ⭐⭐⭐: ${items.filter((i) => i.priority === "⭐⭐⭐").length}`);
  console.log(`   Prioridade ⭐⭐: ${items.filter((i) => i.priority === "⭐⭐").length}\n`);
}

main().catch(console.error);
