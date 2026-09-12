import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function generateReport() {
  console.log("Gerando relatório de cobertura...\n");

  const PAGE_SIZE = 1000;

  // 1. Contar de polls (ingeridas) filtrando por 2026 apenas
  const { count: totalIngested } = await sb
    .from("polls")
    .select("*", { count: "exact", head: true });

  const ingestedByType: Record<string, number> = {
    Presidencial: 0,
    Senador: 0,
    Governador: 0,
    "Deputado Federal": 0,
  };

  for (let offset = 0; offset < (totalIngested || 0); offset += PAGE_SIZE) {
    const { data } = await sb
      .from("polls")
      .select("elections!inner(name)")
      .range(offset, offset + PAGE_SIZE - 1);

    if (data) {
      for (const row of data) {
        const electionName = (row.elections as any)?.name || "";
        // Filter only 2026
        if (!electionName.includes("2026")) continue;

        if (electionName.includes("Presidencial")) {
          ingestedByType["Presidencial"]++;
        } else if (electionName.includes("Senador")) {
          ingestedByType["Senador"]++;
        } else if (electionName.includes("Governador")) {
          ingestedByType["Governador"]++;
        } else if (electionName.includes("Deputado")) {
          ingestedByType["Deputado Federal"]++;
        }
      }
    }
  }

  // 2. Contar pendências por cargo (pesqele_missing) - todas são 2026
  const { count: totalPending } = await sb
    .from("pesqele_missing")
    .select("*", { count: "exact", head: true });

  const pendingByType: Record<string, number> = {
    Presidencial: 0,
    Senador: 0,
    Governador: 0,
    "Deputado Federal": 0,
  };

  for (let offset = 0; offset < (totalPending || 0); offset += PAGE_SIZE) {
    const { data } = await sb
      .from("pesqele_missing")
      .select("cargos")
      .range(offset, offset + PAGE_SIZE - 1);

    if (data) {
      for (const row of data) {
        const cargo = row.cargos || "";
        if (cargo.includes("Presidente")) {
          pendingByType["Presidencial"]++;
        } else if (cargo.includes("Senador")) {
          pendingByType["Senador"]++;
        } else if (cargo.includes("Governador")) {
          pendingByType["Governador"]++;
        } else if (cargo.includes("Deputado")) {
          pendingByType["Deputado Federal"]++;
        }
      }
    }
  }

  // 3. Senador da view separada
  const { count: senadorPending } = await sb
    .from("pesqele_missing_senador")
    .select("*", { count: "exact", head: true });

  pendingByType["Senador"] += (senadorPending || 0);

  // Calcular
  const report: Array<[string, number, number, string]> = [];
  let totalIngestedSum = 0;
  let totalTseSum = 0;

  for (const type of ["Presidencial", "Senador", "Governador", "Deputado Federal"]) {
    const ingested = ingestedByType[type];
    const pending = pendingByType[type];
    const totalTse = ingested + pending;
    const coverage =
      totalTse === 0 ? "N/A" : ((ingested / totalTse) * 100).toFixed(1) + "%";

    totalIngestedSum += ingested;
    totalTseSum += totalTse;

    report.push([type, ingested, totalTse, coverage]);
  }

  const overallCoverage =
    totalTseSum === 0 ? "N/A" : ((totalIngestedSum / totalTseSum) * 100).toFixed(1) + "%";

  // Exibir
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         COBERTURA FINAL DE PESQUISAS ELEITORAIS 2026           ║");
  console.log("║                    ElectioLab vs TSE                          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log(
    "Tipo de Eleição".padEnd(20) +
    " | " +
    "Ingeridas".padEnd(12) +
    " | " +
    "Total TSE".padEnd(12) +
    " | " +
    "Cobertura"
  );
  console.log("-".repeat(67));

  for (const [type, ingested, total, coverage] of report) {
    console.log(
      type.padEnd(20) +
      " | " +
      String(ingested).padEnd(12) +
      " | " +
      String(total).padEnd(12) +
      " | " +
      coverage
    );
  }

  console.log("-".repeat(67));
  console.log(
    "TOTAL".padEnd(20) +
    " | " +
    String(totalIngestedSum).padEnd(12) +
    " | " +
    String(totalTseSum).padEnd(12) +
    " | " +
    overallCoverage
  );

  console.log("\n─ Informações de dados:");
  console.log(`  • Data do relatório: ${new Date().toISOString().split("T")[0]}`);
  console.log(`  • Pesquisas ingeridas (2026): ${totalIngestedSum}`);
  console.log(`  • Pesquisas faltando (2026): ${totalTseSum - totalIngestedSum}`);
  console.log(
    "\n─ Metodologia:"
  );
  console.log(
    "  • Ingeridas = linhas em tabela 'polls' de eleições 2026"
  );
  console.log(
    "  • Faltando = registros nas views 'pesqele_missing' e 'pesqele_missing_senador'"
  );
  console.log(
    "  • Total TSE = ingeridas + faltando"
  );
}

generateReport().catch(console.error);
