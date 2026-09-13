#!/usr/bin/env npx tsx
/**
 * Gera docs/candidatos-oficiais-2026.md a partir da view
 * candidatos_oficiais_2026 — roster confirmado (is_active=true) de
 * Governador/Senador 2026 por estado, resultado da revisão manual de 2026-09.
 *
 * Uso:
 *   npx tsx scripts/generate-candidatos-oficiais-doc.ts
 *
 * Rodar de novo sempre que a revisão de algum estado mudar, pra manter o
 * documento em sincronia com o banco.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length > 0) process.env[key.trim()] = rest.join("=").trim();
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CARGO_LABEL: Record<string, string> = {
  governador: "Governador",
  senador: "Senador",
};

async function main() {
  const { data, error } = await supabase
    .from("candidatos_oficiais_2026")
    .select("state, cargo, name, party")
    .order("state")
    .order("cargo")
    .order("name");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("view candidatos_oficiais_2026 veio vazia");

  const byState = new Map<string, Map<string, { name: string; party: string }[]>>();
  for (const row of data) {
    const state = row.state as string;
    const cargo = row.cargo as string;
    if (!byState.has(state)) byState.set(state, new Map());
    const cargoMap = byState.get(state)!;
    if (!cargoMap.has(cargo)) cargoMap.set(cargo, []);
    cargoMap.get(cargo)!.push({ name: row.name as string, party: (row.party as string) || "—" });
  }

  const states = [...byState.keys()].sort();
  const today = new Date().toISOString().slice(0, 10);

  let md = `# Candidatos oficiais 2026 — Governador e Senador\n\n`;
  md += `Roster confirmado (\`is_active = true\`) após revisão manual completa dos 26 estados + DF, concluída em 2026-09-13. Gerado em ${today} a partir da view \`candidatos_oficiais_2026\`.\n\n`;
  md += `**Uso**: antes de curar \`PENDING_POLLS\` em \`scripts/ingest-manual.ts\`, ou ao investigar um "candidato não resolvido" no log de ingestão, confira aqui se o nome da pesquisa bate com um candidato confirmado. O próprio script já filtra por \`is_active = true\` no match — um nome fora desta lista cai em "não resolvido" em vez de anexar dado a um candidato errado/excluído.\n\n`;
  md += `Para regenerar este documento: \`npx tsx scripts/generate-candidatos-oficiais-doc.ts\`.\n\n`;
  md += `---\n\n`;

  for (const state of states) {
    md += `## ${state}\n\n`;
    const cargoMap = byState.get(state)!;
    for (const cargo of ["governador", "senador"]) {
      const list = cargoMap.get(cargo);
      if (!list) continue;
      md += `### ${CARGO_LABEL[cargo]}\n\n`;
      for (const c of list) {
        md += `- ${c.name} — ${c.party}\n`;
      }
      md += `\n`;
    }
  }

  const outPath = path.join(process.cwd(), "docs", "candidatos-oficiais-2026.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, "utf-8");
  console.log(`✅ Gerado: ${outPath} (${data.length} candidatos, ${states.length} estados)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
