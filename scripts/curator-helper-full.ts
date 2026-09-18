#!/usr/bin/env npx tsx
/**
 * Curator Helper FULL — Gera checklist com TODAS as pesquisas de Senador (Tier 4)
 *
 * Extrai automaticamente de pending-polls.ts e cria HTML + Markdown
 *
 * Uso:
 *   npx tsx scripts/curator-helper-full.ts
 *   npx tsx scripts/curator-helper-full.ts --markdown
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

interface CuratorItem {
  date: string;
  uf: string;
  institute: string;
  sampleSize: number;
  priority: "⭐⭐⭐" | "⭐⭐" | "⭐";
  searchUrl: string;
}

// Env
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

async function fetchSenadorMissing(): Promise<CuratorItem[]> {
  const items: CuratorItem[] = [];

  // Reputados
  const REPUTABLE = [
    "datafolha",
    "quaest",
    "atlas",
    "real time",
    "ipespe",
    "mda",
    "nexus",
    "poderdata",
    "vox brasil",
  ];

  // Fetch pesqele_missing_senador (view específica para senador)
  const { data: missing, error } = await sb.from("pesqele_missing_senador").select(
    "protocolo, uf, instituto, fieldwork_end, sample_size"
  );

  if (error) {
    console.error("❌ Erro ao buscar pesqele_missing_senador:", error);
    return [];
  }

  for (const row of missing || []) {
    const inst = (row.instituto || "").toLowerCase();
    const isReputable = REPUTABLE.some((t) => inst.includes(t));

    // Prioridade
    let priority: "⭐⭐⭐" | "⭐⭐" | "⭐" = "⭐";
    if (isReputable) {
      if (inst.includes("datafolha")) priority = "⭐⭐⭐";
      else if (["quaest", "real time", "atlas"].some((t) => inst.includes(t)))
        priority = "⭐⭐";
    }

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      `${row.instituto} senador ${row.uf} 2026 resultado`
    )}`;

    items.push({
      date: row.fieldwork_end ? row.fieldwork_end.split("T")[0] : "",
      uf: row.uf || "??",
      institute: row.instituto || "???",
      sampleSize: row.sample_size || 0,
      priority,
      searchUrl,
    });
  }

  return items.sort((a, b) => {
    // Ordenar por prioridade, depois por data (mais recente primeiro)
    const priOrder = { "⭐⭐⭐": 0, "⭐⭐": 1, "⭐": 2 };
    if (priOrder[a.priority] !== priOrder[b.priority]) {
      return priOrder[a.priority] - priOrder[b.priority];
    }
    return (b.date || "").localeCompare(a.date || "");
  });
}

function generateHtml(items: CuratorItem[]): string {
  const datafolha = items.filter((i) => i.priority === "⭐⭐⭐").length;
  const tier2 = items.filter((i) => i.priority === "⭐⭐").length;
  const tier3 = items.filter((i) => i.priority === "⭐").length;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ElectioLab — Curator Helper (FULL)</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f9fafb;
      color: #1f2937;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
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
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
      font-size: 28px;
      font-weight: bold;
      color: #0066cc;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .filters {
      margin-bottom: 24px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .filter-btn:hover {
      background: #f3f4f6;
    }
    .filter-btn.active {
      background: #0066cc;
      color: white;
      border-color: #0066cc;
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
      position: sticky;
      top: 0;
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
      width: 60px;
    }
    .date { color: #6b7280; font-size: 13px; width: 90px; }
    .institute { font-weight: 500; max-width: 200px; }
    .uf {
      display: inline-block;
      background: #e0e7ff;
      color: #3730a3;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
      width: 50px;
      text-align: center;
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
      white-space: nowrap;
    }
    .search-btn:hover {
      background: #0052a3;
    }
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
    .progress {
      margin-bottom: 24px;
      padding: 12px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .progress-bar {
      height: 24px;
      background: #e5e7eb;
      border-radius: 4px;
      display: flex;
      overflow: hidden;
    }
    .progress-segment {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: 600;
    }
    .progress-datafolha { background: #059669; }
    .progress-tier2 { background: #f59e0b; }
    .progress-tier3 { background: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🗳️ ElectioLab — Curator Helper (FULL)</h1>
    <p class="subtitle">Checklist completo para curadoria de Senador 2026</p>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${items.length}</div>
        <div class="stat-label">Total Pesquisas</div>
      </div>
      <div class="stat">
        <div class="stat-value">${datafolha}</div>
        <div class="stat-label">Datafolha (⭐⭐⭐)</div>
      </div>
      <div class="stat">
        <div class="stat-value">${tier2}</div>
        <div class="stat-label">Reputados (⭐⭐)</div>
      </div>
      <div class="stat">
        <div class="stat-value">${tier3}</div>
        <div class="stat-label">Demais (⭐)</div>
      </div>
      <div class="stat">
        <div class="stat-value">${items.reduce((sum, i) => sum + i.sampleSize, 0).toLocaleString()}</div>
        <div class="stat-label">Amostra Total</div>
      </div>
    </div>

    <div class="progress">
      <div class="progress-bar">
        <div class="progress-segment progress-datafolha" style="flex: ${datafolha}">
          ${datafolha > 0 ? "⭐⭐⭐" : ""}
        </div>
        <div class="progress-segment progress-tier2" style="flex: ${tier2}">
          ${tier2 > 0 ? "⭐⭐" : ""}
        </div>
        <div class="progress-segment progress-tier3" style="flex: ${tier3}">
          ${tier3 > 0 ? "⭐" : ""}
        </div>
      </div>
    </div>

    <div class="instructions">
      <h3>📋 Como Usar:</h3>
      <ol>
        <li><strong>Ordene por prioridade:</strong> comece com Datafolha (⭐⭐⭐)</li>
        <li><strong>Clique no link de busca</strong> (coluna "Buscar") para abrir no Google</li>
        <li><strong>Encontre o resultado</strong> no site do instituto ou matéria de imprensa</li>
        <li><strong>Anote os candidatos e percentuais</strong></li>
        <li><strong>Preencha scripts/ingest-manual.ts</strong> com os dados</li>
        <li><strong>Rode</strong> <code>npx tsx scripts/ingest-manual.ts</code> para ingerir</li>
      </ol>
    </div>

    <table>
      <thead>
        <tr>
          <th class="priority">Prioridade</th>
          <th class="date">Data Campo</th>
          <th class="uf">Estado</th>
          <th>Instituto</th>
          <th style="width: 70px;">Amostra</th>
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
      <strong>💡 Dica:</strong> Abra os links em abas novas (Cmd+Click).
      Reúna todos os dados antes de preencher o template.
      <br><br>
      <strong>📊 Meta:</strong> com ${datafolha} Datafolha + ${Math.floor(tier2 / 2)} Real Time/Quaest = ~${Math.floor((datafolha + Math.floor(tier2 / 2)) * 4)}% ↑ cobertura Senador
    </div>
  </div>
</body>
</html>`;
  return html;
}

async function main() {
  console.log("📊 Buscando pesquisas de Senador pendentes...\n");

  const items = await fetchSenadorMissing();

  if (items.length === 0) {
    console.error("❌ Nenhuma pesquisa encontrada");
    process.exit(1);
  }

  console.log(`✅ Encontradas ${items.length} pesquisas\n`);

  const format = process.argv.includes("--markdown") ? "markdown" : "html";
  const ext = format === "markdown" ? "md" : "html";
  const output = `curator-senador-full.${ext}`;

  let content: string;
  if (format === "markdown") {
    content = `# Curadoria de Pesquisas — Senador 2026 (COMPLETO)\n\nData: ${new Date().toLocaleString(
      "pt-BR"
    )}\nTotal: ${items.length} pesquisas\n\n`;
    content += `## Datafolha (⭐⭐⭐ Máxima Prioridade)\n\n`;
    for (const item of items.filter((i) => i.priority === "⭐⭐⭐")) {
      content += `- [ ] **${item.institute}** — Senador ${item.uf} (${item.date}, n=${item.sampleSize})\n`;
      content += `  🔗 ${item.searchUrl}\n\n`;
    }
    content += `## Reputados (⭐⭐)\n\n`;
    for (const item of items.filter((i) => i.priority === "⭐⭐")) {
      content += `- [ ] **${item.institute}** — Senador ${item.uf} (${item.date}, n=${item.sampleSize})\n`;
      content += `  🔗 ${item.searchUrl}\n\n`;
    }
    content += `## Demais (⭐)\n\n`;
    for (const item of items.filter((i) => i.priority === "⭐")) {
      content += `- [ ] **${item.institute}** — Senador ${item.uf} (${item.date}, n=${item.sampleSize})\n\n`;
    }
  } else {
    content = generateHtml(items);
  }

  fs.writeFileSync(output, content);

  console.log(`✅ Checklist gerado: ${output}`);
  console.log(`   Abrir: open ${output}\n`);
  console.log(`📊 Resumo:`);
  console.log(`   Total: ${items.length} pesquisas`);
  console.log(`   Datafolha (⭐⭐⭐): ${items.filter((i) => i.priority === "⭐⭐⭐").length}`);
  console.log(`   Reputados (⭐⭐): ${items.filter((i) => i.priority === "⭐⭐").length}`);
  console.log(`   Demais (⭐): ${items.filter((i) => i.priority === "⭐").length}\n`);
}

main().catch(console.error);
