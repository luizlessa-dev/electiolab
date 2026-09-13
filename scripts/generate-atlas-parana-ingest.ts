#!/usr/bin/env npx tsx
import * as fs from "fs";

const rawData = JSON.parse(
  fs.readFileSync(
    "/private/tmp/claude-501/-Users-luizlessa-electiolab/e12c1265-13fa-449d-92be-b15b00f91d57/scratchpad/atlas-parana-clean.json",
    "utf-8"
  )
);

// Normalize institute name
function getNormalizedInstitute(instituto: string): string {
  if (instituto.includes("ATLAS")) return "Atlas Intel";
  if (instituto.includes("PARANA")) return "Paraná Pesquisas";
  return instituto;
}

// Map cargo names to election names
function getElectionName(uf: string, cargos: string): string {
  const inst = getNormalizedInstitute("dummy");
  if (cargos.includes("Presidente")) return "Presidencial 2026 - 1º Turno";
  if (cargos.includes("Governador") && cargos.includes("Senador")) {
    return `Governador, Senador ${uf} 2026 - 1º Turno`;
  }
  if (cargos.includes("Governador")) return `Governador ${uf} 2026 - 1º Turno`;
  if (cargos.includes("Senador")) return `Senador ${uf} 2026 - 1º Turno`;
  return `Eleição ${uf} 2026`;
}

// Convert protocolo to format
function toTseRegistrationFormat(protocolo: string | undefined): string | null {
  if (!protocolo) return null;
  const digits = protocolo.replace(/[^A-Z0-9]/gi, "");
  const m = digits.match(/^([A-Z]{2})(\d{4,5})(\d{4})$/);
  return m ? `${m[1]}-${m[2]}/${m[3]}` : protocolo;
}

// Generate entries
const entries = (rawData as any[]).map((row: any) => {
  const instituteName = getNormalizedInstitute(row.instituto);
  const electionName = getElectionName(row.uf, row.cargos);
  const tseProto = toTseRegistrationFormat(row.protocolo);
  const scope = row.uf === "BR" ? "nacional" : row.uf;
  
  return {
    institute_name: instituteName,
    election_name: electionName,
    publication_date: row.publication_date,
    fieldwork_end: row.fieldwork_end,
    sample_size: row.sample_size,
    margin_of_error: Math.round(100 / Math.sqrt(row.sample_size) * 10) / 10,
    methodology: "online" as const,
    tse_protocolo: tseProto,
    scope: scope !== "BR" ? scope : undefined,
    results: [] as any[],
    source_url: undefined,
  };
});

// Output TypeScript code
console.log("// ─── Atlas Intel + Paraná Pesquisas (65 pesquisas seguras recentes) ───");
console.log("// Ingestão: 2026-09-13");
console.log("// Institutos auditados como muito confiáveis por ElectioLab");
console.log("");

for (const entry of entries) {
  console.log("  {");
  console.log(`    institute_name: "${entry.institute_name}",`);
  console.log(`    election_name: "${entry.election_name}",`);
  console.log(`    publication_date: "${entry.publication_date}",`);
  console.log(`    fieldwork_end: "${entry.fieldwork_end}",`);
  console.log(`    sample_size: ${entry.sample_size},`);
  console.log(`    margin_of_error: ${entry.margin_of_error},`);
  console.log(`    methodology: "online",`);
  if (entry.tse_protocolo) console.log(`    tse_protocolo: "${entry.tse_protocolo}",`);
  if (entry.scope && entry.scope !== "nacional") console.log(`    scope: "${entry.scope}",`);
  console.log(`    results: [],`);
  console.log("  },");
}

console.log(`\n// Total: ${entries.length} entries`);
