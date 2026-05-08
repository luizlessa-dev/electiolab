#!/usr/bin/env npx tsx
/**
 * Ingest votações da Câmara dos Deputados → legislative_votes.
 *
 * Estratégia descoberta:
 *   - /votacoes lista metadados em janelas de até 3 meses
 *   - /votacoes/{id}/votos só retorna dados se a votação foi nominal
 *     (a maioria das votações de "Aprovada" são voz, e retornam dados:[])
 *   - Iteramos votações 2024+2025+2026 e verificamos quais têm votos > 0
 *   - Filtramos por nossos deputados (match por nome via /deputados)
 *
 * Uso:
 *   npx tsx scripts/ingest-camara-votes.ts            # dry run
 *   npx tsx scripts/ingest-camara-votes.ts --apply    # grava no banco
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const APPLY = process.argv.includes("--apply");
const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Janelas trimestrais, mais recentes primeiro
const WINDOWS: Array<[string, string]> = [
  ["2026-01-01", "2026-03-31"],
  ["2025-10-01", "2025-12-31"],
  ["2025-07-01", "2025-09-30"],
  ["2025-04-01", "2025-06-30"],
  ["2025-01-01", "2025-03-31"],
  ["2024-10-01", "2024-12-31"],
  ["2024-07-01", "2024-09-30"],
];

const BASE = "https://dadosabertos.camara.leg.br/api/v2";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeVoto(s: string): string {
  const v = (s || "").trim();
  if (v === "Sim") return "Sim";
  if (v === "Não" || v === "Nao") return "Não";
  if (v.startsWith("Absten")) return "Abstenção";
  if (v.startsWith("Obstru")) return "Obstrução";
  return "Ausente";
}

function topicAndImportance(desc: string): { topic: string; importance: number } {
  const e = desc.toLowerCase();
  if (/aborto|criminaliza/.test(e)) return { topic: "direitos", importance: 5 };
  if (/marco temporal|indígen/.test(e)) return { topic: "povos indígenas", importance: 5 };
  if (/imposto|tributári|reforma tributária/.test(e)) return { topic: "tributário", importance: 5 };
  if (/aposentadoria|previdência/.test(e)) return { topic: "previdência", importance: 4 };
  if (/educação|ensino/.test(e)) return { topic: "educação", importance: 3 };
  if (/saúde|sus/.test(e)) return { topic: "saúde", importance: 4 };
  if (/segurança pública|polícia/.test(e)) return { topic: "segurança", importance: 4 };
  if (/ambient|clima|amazon/.test(e)) return { topic: "meio ambiente", importance: 4 };
  if (/eleitoral|partid|tse/.test(e)) return { topic: "eleitoral", importance: 5 };
  if (/anistia/.test(e)) return { topic: "anistia", importance: 5 };
  if (/medida provis/.test(e)) return { topic: "MPs", importance: 3 };
  if (/pec |emenda à constituição/.test(e)) return { topic: "PECs", importance: 4 };
  return { topic: "geral", importance: 2 };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return await res.json();
}

type Votacao = {
  id: string;
  data: string;
  dataHoraRegistro?: string;
  descricao: string;
  siglaOrgao?: string;
  aprovacao?: number;
};

type Voto = {
  tipoVoto: string;
  dataRegistroVoto: string;
  deputado_: { id: number; nome: string; siglaUf: string; siglaPartido: string };
};

async function main() {
  console.log(`▶️  Câmara votos — ${APPLY ? "APPLY" : "DRY RUN"}`);

  // 1. Carrega nossos candidates (índice por nome)
  const { data: candidates, error: ce } = await supabase
    .from("candidates")
    .select("id, name, full_name");
  if (ce) {
    console.error(ce);
    process.exit(1);
  }
  const candIdx = new Map<string, string>();
  for (const c of candidates ?? []) {
    if (c.full_name) candIdx.set(normalize(c.full_name as string), c.id as string);
    if (c.name) candIdx.set(normalize(c.name as string), c.id as string);
  }
  console.log(`👥 Candidatos no index: ${candIdx.size} chaves`);

  // 2. Itera janelas e detecta votações nominais
  const inserts: Array<{
    candidate_id: string;
    vote_date: string;
    bill_title: string;
    bill_id: string | null;
    vote: string;
    topic: string;
    importance: number;
    source: string;
  }> = [];
  const matched = new Set<string>();

  for (const [start, end] of WINDOWS) {
    console.log(`\n📅 Janela ${start} → ${end}`);

    // Lista até 100 votações de plenário; ordenadas por data desc
    let pagina = 1;
    const todasVotacoes: Votacao[] = [];
    while (pagina <= 4) {
      // até 4*100 = 400 por janela
      // Filter PLEN aplicado server-side não funciona consistentemente — filtra client-side
      const url = `${BASE}/votacoes?dataInicio=${start}&dataFim=${end}&itens=100&pagina=${pagina}&ordem=DESC&ordenarPor=dataHoraRegistro`;
      const j = (await fetchJson(url)) as { dados?: Votacao[] } | null;
      const lote = (j?.dados ?? []).filter((v) => v.siglaOrgao === "PLEN");
      todasVotacoes.push(...lote);
      if ((j?.dados?.length ?? 0) < 100) break;
      pagina++;
      await SLEEP(150);
    }
    console.log(`  📋 ${todasVotacoes.length} votações de plenário`);

    let nominais = 0;
    for (const v of todasVotacoes) {
      // Skip "Mantida"/"Retirada de pauta" sem voto
      const d = v.descricao || "";
      if (
        /retirada de pauta|adiada|mantida|prejudicad|encerrad/i.test(d) ||
        d.length < 20
      ) {
        continue;
      }

      const votosUrl = `${BASE}/votacoes/${v.id}/votos`;
      const vj = (await fetchJson(votosUrl)) as { dados?: Voto[] } | null;
      const votos = vj?.dados ?? [];
      await SLEEP(100); // rate limiting

      if (votos.length === 0) continue;
      nominais++;

      const { topic, importance } = topicAndImportance(d);
      for (const voto of votos) {
        const key1 = normalize(voto.deputado_.nome);
        const cid = candIdx.get(key1);
        if (!cid) continue;

        if (!matched.has(cid)) matched.add(cid);
        inserts.push({
          candidate_id: cid,
          vote_date: v.data,
          bill_title: d.slice(0, 500),
          bill_id: v.id,
          vote: normalizeVoto(voto.tipoVoto),
          topic,
          importance,
          source: "camara_dadosabertos",
        });
      }
    }
    console.log(`  ✓ ${nominais} nominais, ${inserts.length} entries acumuladas`);
  }

  console.log(
    `\n📈 ${inserts.length} votos | ${matched.size} deputados/senadores na nossa base`
  );

  if (inserts.length === 0 || !APPLY) {
    if (!APPLY) console.log("\n💡 Rode com --apply pra gravar.");
    return;
  }

  // 3. Limpa votos camara anteriores e insere
  console.log(`💾 Limpando + inserindo…`);
  await supabase
    .from("legislative_votes")
    .delete()
    .eq("source", "camara_dadosabertos");

  let inserted = 0;
  for (let i = 0; i < inserts.length; i += 200) {
    const batch = inserts.slice(i, i + 200);
    const { error: ie } = await supabase.from("legislative_votes").insert(batch);
    if (ie) console.error(`  batch ${i}:`, ie.message);
    else inserted += batch.length;
  }
  console.log(`✅ ${inserted} inseridos.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
