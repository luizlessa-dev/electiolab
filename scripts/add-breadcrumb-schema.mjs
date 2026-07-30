import fs from "fs";
import path from "path";

const STATE_MAP = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul", MT: "Mato Grosso",
  PA: "Pará", PB: "Paraíba", PE: "Pernambuco", PI: "Piauí", PR: "Paraná",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima",
  RS: "Rio Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins"
};

function getBreadcrumbSchema(uf, stateName) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
      { "@type": "ListItem", position: 2, name: "Eleições 2026", item: "https://electiolab.com/eleicoes" },
      { "@type": "ListItem", position: 3, name: `Governador ${stateName} 2026`, item: `https://electiolab.com/eleicoes-governador-${uf.toLowerCase()}-2026` }
    ]
  };
}

function addBreadcrumbToPage(content, uf, stateName) {
  const breadcrumbSchema = getBreadcrumbSchema(uf, stateName);
  const breadcrumbScript = `<script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(${JSON.stringify(breadcrumbSchema)}) }}
      />`;

  const firstScriptMatch = content.match(/      <script\s+type="application\/ld\+json"/);
  if (!firstScriptMatch) return content;

  const insertPoint = content.indexOf(firstScriptMatch[0]) + firstScriptMatch[0].length;
  const endScriptTag = content.indexOf("/>", insertPoint) + 2;
  const afterFirstScript = content.indexOf("\n", endScriptTag);

  return content.slice(0, afterFirstScript + 1) + breadcrumbScript + content.slice(afterFirstScript + 1);
}

const markettingDir = "src/app/(marketing)";
const statePages = fs.readdirSync(markettingDir).filter(d => d.startsWith("eleicoes-governador-") && d.endsWith("-2026"));

console.log(`📍 Encontradas ${statePages.length} páginas`);

let updated = 0;
statePages.forEach((dir) => {
  const match = dir.match(/eleicoes-governador-([a-z]+)-2026/);
  if (!match) return;

  const uf = match[1].toUpperCase();
  const stateName = STATE_MAP[uf];
  if (!stateName) return;

  const pagePath = path.join(markettingDir, dir, "page.tsx");
  const content = fs.readFileSync(pagePath, "utf-8");

  if (content.includes('"BreadcrumbList"')) {
    console.log(`✓ ${uf}`);
    return;
  }

  fs.writeFileSync(pagePath, addBreadcrumbToPage(content, uf, stateName), "utf-8");
  console.log(`✅ ${uf}`);
  updated++;
});

console.log(`\n✅ ${updated} páginas atualizadas`);
