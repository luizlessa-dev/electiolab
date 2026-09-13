import fs from "fs";

const data = JSON.parse(fs.readFileSync("/private/tmp/claude-501/-Users-luizlessa-electiolab/e12c1265-13fa-449d-92be-b15b00f91d57/scratchpad/atlas-parana.json", "utf-8"));

function normalize(instituto) {
  if (instituto.includes("ATLAS")) return "Atlas Intel";
  if (instituto.includes("PARANA")) return "Paraná Pesquisas";
  return instituto;
}

function electionName(uf, cargos) {
  if (cargos.includes("Presidente")) return "Presidencial 2026 - 1º Turno";
  if (cargos.includes("Governador") && cargos.includes("Senador")) {
    return `Governador, Senador ${uf} 2026 - 1º Turno`;
  }
  if (cargos.includes("Governador")) return `Governador ${uf} 2026 - 1º Turno`;
  if (cargos.includes("Senador")) return `Senador ${uf} 2026 - 1º Turno`;
  return `Eleição ${uf} 2026`;
}

function toFormat(protocolo) {
  if (!protocolo) return null;
  const digits = protocolo.replace(/[^A-Z0-9]/gi, "");
  const m = digits.match(/^([A-Z]{2})(\d{4,5})(\d{4})$/);
  return m ? `${m[1]}-${m[2]}/${m[3]}` : protocolo;
}

const entries = data.map((row) => ({
  institute_name: normalize(row.instituto),
  election_name: electionName(row.uf, row.cargos),
  publication_date: row.publication_date,
  fieldwork_end: row.fieldwork_end,
  sample_size: row.sample_size,
  margin_of_error: Math.round(100 / Math.sqrt(row.sample_size) * 10) / 10,
  methodology: "online",
  tse_protocolo: toFormat(row.protocolo),
  scope: row.uf !== "BR" ? row.uf : undefined,
  results: [],
}));

console.log("  // ─── Atlas Intel + Paraná Pesquisas (65 pesquisas seguras)");
console.log("  // Instituto muito confiável (audit ElectioLab 2026-09-12)");

for (const e of entries) {
  console.log("  {");
  console.log(`    institute_name: "${e.institute_name}",`);
  console.log(`    election_name: "${e.election_name}",`);
  console.log(`    publication_date: "${e.publication_date}",`);
  console.log(`    fieldwork_end: "${e.fieldwork_end}",`);
  console.log(`    sample_size: ${e.sample_size},`);
  console.log(`    margin_of_error: ${e.margin_of_error},`);
  console.log(`    methodology: "${e.methodology}",`);
  console.log(`    tse_protocolo: "${e.tse_protocolo}",`);
  if (e.scope) console.log(`    scope: "${e.scope}",`);
  console.log(`    results: [],`);
  console.log("  },");
}
