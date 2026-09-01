#!/usr/bin/env npx tsx
/**
 * Repara carimbos de candidatura do TSE gravados na eleição errada.
 *
 * Contexto (2026-08-31): `ingest-tse-candidaturas.ts` indexava os candidatos já
 * cadastrados em mapas GLOBAIS de tse_id/cpf. Como uma pessoa costuma ter um
 * registro por corrida (e às vezes CPF digitado errado), a linha do TSE de uma
 * corrida achava o registro da pessoa em OUTRA corrida e carimbava lá. Resultado:
 * 42 candidaturas 2026 no cargo errado, entre elas
 *
 *   - Alexandre Kalil: candidatura de GOVERNADOR/MG carimbada no registro de senador
 *   - Carlos Viana:    candidatura de SENADOR/MG carimbada no registro de governador
 *   - Renan Calheiros: recebeu a candidatura a GOVERNADOR/AL do Renan FILHO
 *                      (pai e filho estavam com o mesmo CPF no cadastro)
 *   - Augusto Cury:    recebeu a candidatura de DANIEL AUGUSTO CURY, dep. federal/SP
 *
 * O match já foi escopado por eleição no ingest. Este script limpa o passivo:
 * zera o carimbo dos registros cujo tse_id pertence a outra (cargo, UF) segundo o
 * arquivo oficial, pra que o re-ingest possa gravar a candidatura no registro certo.
 *
 * Também REPORTA (não altera) CPFs suspeitos: quando o CPF do registro pertence,
 * no arquivo do TSE, a uma pessoa de nome incompatível. Esses são corrigidos à mão.
 *
 * Uso:
 *   npx tsx scripts/fix-tse-candidate-stamps.ts            # dry-run
 *   npx tsx scripts/fix-tse-candidate-stamps.ts --apply    # grava
 *   npx tsx scripts/fix-tse-candidate-stamps.ts --year=2026
 *
 * Depois de aplicar, rode `ingest-tse-candidaturas.ts --apply` pra recarimbar.
 */

import { createClient } from "@supabase/supabase-js";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APPLY = process.argv.includes("--apply");
const YEAR = parseInt(
  process.argv.find((a) => a.startsWith("--year="))?.split("=")[1] ?? "2026"
);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

const TSE_ZIP_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ano}.zip`;

// Mesmo mapeamento de cargos do ingest — só os que o electiolab acompanha.
const CARGOS: Record<string, string> = {
  PRESIDENTE: "presidente",
  GOVERNADOR: "governador",
  SENADOR: "senador",
  "DEPUTADO FEDERAL": "deputado_federal",
  "DEPUTADO ESTADUAL": "deputado_estadual",
  "DEPUTADO DISTRITAL": "deputado_distrital",
};

type TseCand = { cargo: string; uf: string; nome: string; full: string; cpf: string };

function normalize(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadTseMap(ano: number): Promise<Map<string, TseCand>> {
  const cachePath = path.join(CACHE_DIR, `consulta_cand_${ano}.zip`);
  if (!fs.existsSync(cachePath)) {
    console.log(`⬇️  baixando ${TSE_ZIP_URL(ano)}`);
    const res = await fetch(TSE_ZIP_URL(ano));
    if (!res.ok) throw new Error(`TSE respondeu ${res.status}`);
    fs.writeFileSync(cachePath, Buffer.from(await res.arrayBuffer()));
  }
  const zip = new AdmZip(cachePath);
  const map = new Map<string, TseCand>();
  for (const ent of zip.getEntries()) {
    const m = ent.entryName.match(new RegExp(`consulta_cand_${ano}_([A-Z]+)\\.csv$`));
    if (!m) continue;
    const arq = m[1];
    // BR.csv é agregado redundante dos arquivos por UF; BRASIL.csv traz PRESIDENTE.
    if (arq === "BR") continue;
    const lines = iconv.decode(ent.getData(), "latin1").split("\n");
    const hdr = lines[0].split(";").map((s) => s.replace(/"/g, ""));
    const I = (n: string) => hdr.indexOf(n);
    for (const l of lines.slice(1)) {
      const c = l.split(";").map((s) => s.replace(/"/g, ""));
      const cargo = CARGOS[c[I("DS_CARGO")]];
      if (!cargo) continue;
      if (arq === "BRASIL" && cargo !== "presidente") continue;
      const sq = c[I("SQ_CANDIDATO")];
      if (!sq) continue;
      map.set(sq, {
        cargo,
        uf: cargo === "presidente" ? "BR" : c[I("SG_UF")],
        nome: c[I("NM_URNA_CANDIDATO")],
        full: c[I("NM_CANDIDATO")],
        cpf: (c[I("NR_CPF_CANDIDATO")] ?? "").replace(/\D/g, ""),
      });
    }
  }
  return map;
}

type Cand = {
  id: string;
  name: string;
  full_name: string | null;
  cpf: string | null;
  tse_id: string | null;
  tse_last_situation_year: number | null;
  elections: { type: string; state: string | null; year: number } | null;
};

async function main() {
  console.log(
    `▶️  Reparo de carimbos TSE ${YEAR} — modo: ${APPLY ? "APPLY (grava)" : "DRY RUN (não grava)"}`
  );

  const tse = await loadTseMap(YEAR);
  console.log(`📊 candidaturas ${YEAR} no arquivo oficial: ${tse.size}`);

  const PAGE = 1000;
  const cands: Cand[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("candidates")
      .select(
        "id, name, full_name, cpf, tse_id, tse_last_situation_year, elections(type, state, year)"
      )
      .not("tse_id", "is", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    cands.push(...((data ?? []) as unknown as Cand[]));
    if (!data || data.length < PAGE) break;
  }
  const alvo = cands.filter((c) => c.elections?.year === YEAR);
  console.log(`👥 candidatos ${YEAR} com tse_id: ${alvo.length}`);

  const errados: Array<{ c: Cand; t: TseCand }> = [];
  const cpfSuspeito: Array<{ c: Cand; t: TseCand }> = [];

  for (const c of alvo) {
    const t = tse.get(c.tse_id!);
    if (!t) continue; // tse_id de outro ano (2022/2024) — legado, não é carimbo errado
    const uf = c.elections!.state ?? "BR";
    if (t.cargo !== c.elections!.type || t.uf !== uf) errados.push({ c, t });
  }

  // CPF que, no arquivo do TSE, pertence a alguém de nome incompatível.
  const porCpf = new Map<string, TseCand>();
  for (const t of tse.values()) if (t.cpf) porCpf.set(t.cpf, t);
  for (const c of alvo) {
    const cpf = (c.cpf ?? "").replace(/\D/g, "");
    if (!cpf) continue;
    const t = porCpf.get(cpf);
    if (!t) continue;
    const meus = new Set([
      ...normalize(c.name).split(" "),
      ...normalize(c.full_name ?? "").split(" "),
    ]);
    const deles = new Set([
      ...normalize(t.nome).split(" "),
      ...normalize(t.full).split(" "),
    ]);
    const comum = [...deles].filter((tok) => tok.length > 2 && meus.has(tok));
    if (comum.length === 0) cpfSuspeito.push({ c, t });
  }

  console.log(`\n🔧 carimbos na eleição errada: ${errados.length}`);
  for (const { c, t } of errados) {
    const uf = c.elections!.state ?? "BR";
    console.log(
      `   ${c.name.padEnd(26)} registro=${`${c.elections!.type}/${uf}`.padEnd(22)} ` +
        `tse_id ${c.tse_id} é de ${t.cargo}/${t.uf} (${t.nome})`
    );
  }

  console.log(`\n⚠️  CPF de pessoa incompatível: ${cpfSuspeito.length} (não alterado — revisar à mão)`);
  for (const { c, t } of cpfSuspeito) {
    console.log(`   ${c.name.padEnd(26)} cpf=${c.cpf} pertence a ${t.full} (${t.cargo}/${t.uf})`);
  }

  if (!APPLY) {
    console.log(`\n💡 Rode com --apply pra zerar os ${errados.length} carimbos errados.`);
    console.log(`   Depois: npx tsx scripts/ingest-tse-candidaturas.ts --apply`);
    return;
  }

  let ok = 0;
  for (const { c } of errados) {
    const { error } = await supabase
      .from("candidates")
      .update({
        tse_id: null,
        tse_last_situation: null,
        tse_last_situation_year: null,
        tse_last_situation_detail: null,
      })
      .eq("id", c.id);
    if (error) {
      console.error(`   ✖ ${c.name}: ${error.message}`);
      continue;
    }
    ok++;
  }
  console.log(`\n✅ ${ok}/${errados.length} carimbos zerados.`);
  console.log(`   Agora rode: npx tsx scripts/ingest-tse-candidaturas.ts --apply`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
