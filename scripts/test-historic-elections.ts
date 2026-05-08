#!/usr/bin/env npx tsx
import * as fs from "fs"; import * as path from "path";
const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("="); if (idx > 0) { const k = line.slice(0, idx).trim(); const v = line.slice(idx + 1).trim().replace(/^"|"$/g, ""); if (k && !process.env[k]) process.env[k] = v; }
}
import { getHistoricElectionData } from "../src/lib/queries/historic-elections";

(async () => {
  for (const year of [2018, 2022]) {
    const data = await getHistoricElectionData(year);
    console.log(`\n${year}: ${data.totalRows} linhas, ${data.electedCount} eleitos`);
    for (const [office, list] of Object.entries(data.byOffice)) {
      const states = Object.keys(data.byOfficeAndState[office]).length;
      console.log(`  ${office}: ${list.length} candidatos em ${states} UFs`);
      const top3 = list.slice(0, 3).map((r) => `${r.candidate_name}(${r.state}, ${r.total_votes.toLocaleString("pt-BR")})`).join("  |  ");
      console.log(`    top3: ${top3}`);
    }
  }
})();
