#!/usr/bin/env npx tsx
/**
 * Ingest TSE candidaturas — popula candidates com dados oficiais do TSE.
 *
 * Estratégia:
 *   1. Baixa CSVs bulk do TSE (consulta_cand) para os anos {2022, 2024}
 *      — cobre presidente, governador, senador, deputado federal/estadual (2022)
 *      e prefeitos/vereadores (2024). 2026 ainda não tem candidaturas registradas.
 *   2. Indexa por nome normalizado (sem acentos, lower).
 *   3. Faz match com candidates da nossa base (que ainda não tem full_name)
 *      preferindo o registro mais recente.
 *   4. Upsert: full_name, profession, education, birth_date, tse_id, photo_url.
 *
 * Uso:
 *   npx tsx scripts/ingest-tse-candidaturas.ts             # dry-run, mostra matches
 *   npx tsx scripts/ingest-tse-candidaturas.ts --apply     # grava no banco
 *
 * Dependências:
 *   npm i -D adm-zip iconv-lite @types/adm-zip
 */

import { createClient } from "@supabase/supabase-js";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─────────────────────────────────────────────────────────────────
// Env loader
// ─────────────────────────────────────────────────────────────────
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
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const APPLY = process.argv.includes("--apply");

// ─────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────
const ANOS = [2024, 2022]; // mais recente primeiro
const TSE_ZIP_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ano}.zip`;
const TSE_BENS_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_${ano}.zip`;

// Cache local pra não baixar de novo a cada execução
const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacríticos combinantes
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ") // remove pontuação (DR. → DR)
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length >= 2);
}

// Aliases manuais — apelidos políticos comuns que TSE não tem com o nome curto
const ALIASES: Record<string, string> = {
  "dr daniel": "daniel santos",
  "dr furlan": "antonio furlan",
  "ratinho jr": "carlos roberto massa junior",
  "ratinho junior": "carlos roberto massa junior",
  "lula": "luiz inacio lula da silva",
  "bolsonaro": "jair messias bolsonaro",
  "ciro": "ciro ferreira gomes",
  "ciro gomes": "ciro ferreira gomes",
  "haddad": "fernando haddad",
  "tarcisio": "tarcisio gomes de freitas",
  "zema": "romeu zema neto",
  "caiado": "ronaldo ramos caiado",
  "kalil": "alexandre kalil",
  "alexandre kalil": "alexandre kalil",
  "kim kataguiri": "fabio kim kataguiri",
  "felipe davila": "luiz felipe d avila",
  "felipe d avila": "luiz felipe d avila",
  "magno malta": "magno pereira malta",
  "professora dorinha": "maria auxiliadora seabra rezende",
  "ratinho-jr": "carlos roberto massa junior",
  "garotinho": "anthony william matheus de oliveira",
  "anthony garotinho": "anthony william matheus de oliveira",
  // Adições
  "rafa luz": "bombeiro rafa luz",
  "manuela davila": "manuela pucci d avila",
  "manuela d avila": "manuela pucci d avila",
  "jhc": "joao henrique caldas",
  "tonny kerley": "tonny kerley de alencar rodrigues",
  "ben mendes": "benedito de lira",
  "marcos rotta": "marcos jose rotta",
  "fabio mitidieri": "fabio henrique mitidieri",
  "michelle bolsonaro": "michelle de paula firmo reinaldo bolsonaro",
  "carlos bolsonaro": "carlos nantes bolsonaro",
  "flavio bolsonaro": "flavio nantes bolsonaro",
};

function parseDateBR(s: string): string | null {
  // dd/mm/yyyy → yyyy-mm-dd
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function clean(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/^"|"$/g, "").trim();
  if (!t || t === "#NULO#" || t === "#NE#" || t === "-1" || t === "NÃO INFORMADO") return null;
  return t;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) =>
      w.length <= 2 && ["da", "de", "do", "das", "dos", "e"].includes(w)
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");
}

// ─────────────────────────────────────────────────────────────────
// Download TSE bulk
// ─────────────────────────────────────────────────────────────────
async function downloadCached(url: string, cacheName: string): Promise<Buffer> {
  const cachePath = path.join(CACHE_DIR, cacheName);
  if (fs.existsSync(cachePath)) {
    console.log(`📦 Cache hit: ${cachePath}`);
    return fs.readFileSync(cachePath);
  }
  console.log(`⬇️  Baixando ${url}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(cachePath, buf);
  console.log(`✅ ${(buf.length / 1024 / 1024).toFixed(1)}MB salvo em cache`);
  return buf;
}

const downloadZip = (ano: number) =>
  downloadCached(TSE_ZIP_URL(ano), `consulta_cand_${ano}.zip`);
const downloadBensZip = (ano: number) =>
  downloadCached(TSE_BENS_URL(ano), `bem_candidato_${ano}.zip`);

// ─────────────────────────────────────────────────────────────────
// Net worth — soma dos bens declarados por sq_candidato
// ─────────────────────────────────────────────────────────────────
function parseBensCsv(buf: Buffer): Map<string, number> {
  const text = iconv.decode(buf, "latin1");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return new Map();
  const header = lines[0].split(";").map((h) => h.replace(/^"|"$/g, "").trim());
  const iSq = header.indexOf("SQ_CANDIDATO");
  const iValor = header.indexOf("VR_BEM_CANDIDATO");
  if (iSq < 0 || iValor < 0) return new Map();

  const sums = new Map<string, number>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length < header.length) continue;
    const sq = (cols[iSq] ?? "").replace(/^"|"$/g, "").trim();
    const valStr = (cols[iValor] ?? "").replace(/^"|"$/g, "").trim().replace(",", ".");
    const val = parseFloat(valStr);
    if (!sq || isNaN(val)) continue;
    sums.set(sq, (sums.get(sq) ?? 0) + val);
  }
  return sums;
}

async function loadAllBens(): Promise<Map<string, number>> {
  const all = new Map<string, number>();
  for (const ano of ANOS) {
    let buf: Buffer;
    try {
      buf = await downloadBensZip(ano);
    } catch (e) {
      console.warn(`⚠️  Bens skip ${ano}:`, e instanceof Error ? e.message : e);
      continue;
    }
    const zip = new AdmZip(buf);
    for (const entry of zip.getEntries()) {
      if (!entry.entryName.toLowerCase().endsWith(".csv")) continue;
      if (/_brasil\.csv$/i.test(entry.entryName)) continue;
      const sums = parseBensCsv(entry.getData());
      for (const [sq, v] of sums) {
        // Como ANOS=[2024,2022], 2024 carrega primeiro e vence; 2022 só preenche
        if (!all.has(sq)) all.set(sq, v);
      }
    }
    console.log(`  💰 Bens ${ano}: ${all.size} candidatos com declaração`);
  }
  return all;
}

// ─────────────────────────────────────────────────────────────────
// Parse CSV
// ─────────────────────────────────────────────────────────────────
type TseRow = {
  ano: number;
  uf: string;
  cargo: string;
  sq_candidato: string;
  nome: string;
  nome_urna: string;
  cpf: string;
  partido: string;
  num_candidato: string;
  dt_nascimento: string | null;
  ocupacao: string | null;
  grau_instrucao: string | null;
  id_eleicao: string;
  situacao: string | null;
  situacao_detalhe: string | null;
};

function parseCsvBuffer(buf: Buffer, ano: number): TseRow[] {
  const text = iconv.decode(buf, "latin1");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(";").map((h) => h.replace(/^"|"$/g, "").trim());
  const idx = (col: string) => header.indexOf(col);

  const iAno = idx("ANO_ELEICAO");
  const iUF = idx("SG_UF");
  const iCargo = idx("DS_CARGO");
  const iSq = idx("SQ_CANDIDATO");
  const iNome = idx("NM_CANDIDATO");
  const iUrna = idx("NM_URNA_CANDIDATO");
  const iCpf = idx("NR_CPF_CANDIDATO");
  const iPart = idx("SG_PARTIDO");
  const iNum = idx("NR_CANDIDATO");
  const iNasc = idx("DT_NASCIMENTO");
  const iOcup = idx("DS_OCUPACAO");
  const iGrau = idx("DS_GRAU_INSTRUCAO");
  const iEleicao = idx("CD_ELEICAO");
  const iSit = idx("DS_SITUACAO_CANDIDATURA");
  const iSitDetalhe = idx("DS_DETALHE_SITUACAO_CAND");

  const rows: TseRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length < header.length) continue;
    const get = (j: number) => clean(cols[j]) ?? "";
    rows.push({
      ano,
      uf: get(iUF),
      cargo: get(iCargo),
      sq_candidato: get(iSq),
      nome: get(iNome),
      nome_urna: get(iUrna),
      cpf: get(iCpf),
      partido: get(iPart),
      num_candidato: get(iNum),
      dt_nascimento: parseDateBR(get(iNasc)),
      ocupacao: clean(cols[iOcup]),
      grau_instrucao: clean(cols[iGrau]),
      id_eleicao: get(iEleicao),
      situacao: iSit >= 0 ? clean(cols[iSit]) : null,
      situacao_detalhe: iSitDetalhe >= 0 ? clean(cols[iSitDetalhe]) : null,
    });
  }
  return rows;
}

async function loadAllRows(): Promise<TseRow[]> {
  const all: TseRow[] = [];
  for (const ano of ANOS) {
    let buf: Buffer;
    try {
      buf = await downloadZip(ano);
    } catch (e) {
      console.warn(`⚠️  Skip ${ano}:`, e instanceof Error ? e.message : e);
      continue;
    }
    const zip = new AdmZip(buf);
    for (const entry of zip.getEntries()) {
      if (!entry.entryName.toLowerCase().endsWith(".csv")) continue;
      // Pular o BRASIL.csv (agregado, gigante — UFs cobrem tudo).
      if (/_brasil\.csv$/i.test(entry.entryName)) {
        console.log(`  ⏭️  skip ${entry.entryName} (agregado)`);
        continue;
      }
      console.log(`  📄 ${entry.entryName}`);
      const rows = parseCsvBuffer(entry.getData(), ano);
      // push em chunks pra não estourar stack
      for (let i = 0; i < rows.length; i += 5000) {
        all.push(...rows.slice(i, i + 5000));
      }
    }
  }
  console.log(`📊 Total de linhas TSE: ${all.length.toLocaleString("pt-BR")}`);
  return all;
}

// ─────────────────────────────────────────────────────────────────
// Build index name → best row
// ─────────────────────────────────────────────────────────────────
type Candidate = {
  id: string;
  name: string;
  full_name: string | null;
  party: string | null;
  bio: string | null;
  birth_date: string | null;
  profession: string | null;
  education: string | null;
  tse_id: string | null;
  photo_url: string | null;
  state: string | null;
};

function buildIndex(rows: TseRow[]): Map<string, TseRow[]> {
  const idx = new Map<string, TseRow[]>();
  for (const r of rows) {
    if (!r.nome) continue;
    const keys = new Set<string>();
    keys.add(normalize(r.nome));
    if (r.nome_urna) keys.add(normalize(r.nome_urna));
    for (const k of keys) {
      const arr = idx.get(k);
      if (arr) arr.push(r);
      else idx.set(k, [r]);
    }
  }
  return idx;
}

/**
 * Fuzzy match: dado o nome do candidato (e UF target opcional), procura no TSE
 * candidatos cujo conjunto de tokens contenha TODOS os tokens do candidato OU
 * vice-versa. Útil pra "Cleitinho" matchar "CLEITINHO AZEVEDO".
 */
function fuzzyMatch(
  candidateName: string,
  rows: TseRow[],
  targetUf: string | null
): TseRow[] {
  const want = tokens(candidateName);
  if (want.length === 0) return [];
  const matches: TseRow[] = [];
  for (const r of rows) {
    // Hard filter só por UF; cargo deixa pra pickBest decidir
    if (targetUf && r.uf !== targetUf) continue;
    const have = new Set([...tokens(r.nome), ...tokens(r.nome_urna)]);
    // todos os tokens do candidato presentes no TSE
    if (want.every((t) => have.has(t))) {
      matches.push(r);
    }
  }
  return matches;
}

const HIGH_OFFICE = new Set([
  "PRESIDENTE",
  "GOVERNADOR",
  "VICE-GOVERNADOR",
  "SENADOR",
  "DEPUTADO FEDERAL",
  "DEPUTADO ESTADUAL",
  "DEPUTADO DISTRITAL",
]);
const CARGO_RANK: Record<string, number> = {
  PRESIDENTE: 9,
  GOVERNADOR: 8,
  SENADOR: 7,
  "DEPUTADO FEDERAL": 6,
  "DEPUTADO ESTADUAL": 5,
  "DEPUTADO DISTRITAL": 5,
  "VICE-GOVERNADOR": 4,
  PREFEITO: 3,
  "VICE-PREFEITO": 2,
  VEREADOR: 1,
};

/**
 * Aceita só matches plausíveis. Retorna null se nenhum row TSE bate com confiança.
 *
 * Regras:
 * - presidenciáveis (state=null): tenta primeiro cargo=PRESIDENTE; se vazio
 *   E o full_name (passado como candidateName) for 3+ palavras, aceita qualquer
 *   cargo nacionalmente (ex: Caiado/Zema nunca foram presidentes mas aparecem
 *   como pré-candidatos 2026).
 * - estaduais (state=UF): exige mesmo UF.
 *   - 1 palavra (apelido): só HIGH_OFFICE (gov/sen/dep federal)
 *   - 2+ palavras: aceita qualquer cargo (incl. prefeito 2024)
 */
function pickBest(
  rows: TseRow[],
  targetUf: string | null,
  candidateName: string
): TseRow | null {
  const wordCount = candidateName.trim().split(/\s+/).length;
  let pool: TseRow[];

  if (targetUf === null) {
    pool = rows.filter((r) => r.cargo === "PRESIDENTE");
    if (pool.length === 0 && wordCount >= 2) {
      // fallback: qualquer cargo, qualquer UF (presidenciáveis que nunca foram
      // candidatos a presidente, ex: Caiado, Zema, Eduardo Leite). Exige 2+
      // palavras pra evitar match enganoso de "Lula" → vereador "Lula".
      pool = rows.slice();
    }
  } else {
    pool = rows.filter((r) => r.uf === targetUf);
    if (wordCount < 2) {
      pool = pool.filter((r) => HIGH_OFFICE.has(r.cargo));
    }
  }

  if (pool.length === 0) return null;

  // Cargo domina o score (presidente > gov > sen > dep > prefeito > vereador).
  // Ano só desempata. Evita matchar Eduardo Leite (gov RS 2022) com prefeito SP 2024.
  const score = (r: TseRow) => (CARGO_RANK[r.cargo] ?? 0) * 10000 + r.ano;
  return pool.slice().sort((a, b) => score(b) - score(a))[0];
}

// ─────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`▶️  TSE ingest — modo: ${APPLY ? "APPLY (grava)" : "DRY RUN (não grava)"}`);

  // 1. Carrega dados TSE
  const rows = await loadAllRows();
  if (rows.length === 0) {
    console.error("❌ Sem dados TSE carregados.");
    process.exit(1);
  }
  const idx = buildIndex(rows);
  console.log(`🔎 Index: ${idx.size.toLocaleString("pt-BR")} chaves de nome`);

  // 1b. Carrega bens declarados
  const bensBySq = await loadAllBens();
  console.log(`💰 Bens carregados: ${bensBySq.size.toLocaleString("pt-BR")} candidatos`);

  // 2. Carrega candidatos da nossa base (sem full_name OU sem profession)
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select(
      "id, name, full_name, party, bio, birth_date, profession, education, tse_id, photo_url, net_worth, cpf, election:elections(state)"
    )
    .eq("is_active", true);

  if (error) {
    console.error("❌ Erro lendo candidates:", error);
    process.exit(1);
  }

  const flat: (Candidate & { net_worth: number | null; cpf: string | null })[] = (candidates ?? []).map(
    (c: Record<string, unknown>) => ({
      id: c.id as string,
      name: c.name as string,
      full_name: c.full_name as string | null,
      party: c.party as string | null,
      bio: c.bio as string | null,
      birth_date: c.birth_date as string | null,
      profession: c.profession as string | null,
      education: c.education as string | null,
      tse_id: c.tse_id as string | null,
      photo_url: c.photo_url as string | null,
      net_worth: (c.net_worth as number | null) ?? null,
      cpf: (c.cpf as string | null) ?? null,
      state: ((c.election as { state?: string } | null)?.state) ?? null,
    })
  );

  console.log(`👥 Candidatos na base: ${flat.length}`);

  // 3. Match
  let matched = 0;
  let updated = 0;
  let skipped = 0;
  const updates: Array<{ id: string; patch: Record<string, unknown>; debug: string }> = [];

  for (const c of flat) {
    const candidates: TseRow[] = [];
    const baseName = normalize(c.full_name ?? c.name);
    const aliasName = ALIASES[normalize(c.name)] ?? ALIASES[baseName];

    const keys = new Set<string>();
    keys.add(baseName);
    keys.add(normalize(c.name));
    if (aliasName) keys.add(aliasName);

    for (const k of keys) {
      if (!k) continue;
      const found = idx.get(k);
      if (found) candidates.push(...found);
    }

    // Fallback: fuzzy token-subset match
    if (candidates.length === 0) {
      const fuzzy = fuzzyMatch(c.full_name ?? c.name, rows, c.state);
      candidates.push(...fuzzy);
    }
    if (candidates.length === 0) {
      skipped++;
      continue;
    }
    const best = pickBest(candidates, c.state, c.full_name ?? c.name);
    if (!best) {
      skipped++;
      continue;
    }
    matched++;

    const patch: Record<string, unknown> = {};
    if (!c.full_name && best.nome) patch.full_name = titleCase(best.nome);
    if (!c.birth_date && best.dt_nascimento) patch.birth_date = best.dt_nascimento;
    if (!c.profession && best.ocupacao) patch.profession = titleCase(best.ocupacao);
    if (!c.education && best.grau_instrucao) patch.education = best.grau_instrucao;
    if (!c.tse_id && best.sq_candidato) patch.tse_id = best.sq_candidato;
    if (!c.cpf && best.cpf && /^\d{11}$/.test(best.cpf)) patch.cpf = best.cpf;
    // Situação da candidatura mais recente — sempre atualiza pra refletir registro mais novo
    if (best.situacao) {
      patch.tse_last_situation = best.situacao;
      patch.tse_last_situation_year = best.ano;
      if (best.situacao_detalhe) patch.tse_last_situation_detail = best.situacao_detalhe;
    }
    // Foto oficial TSE — formato: /img/{cd_eleicao}/{sq_candidato}/{UF}
    if (!c.photo_url && best.sq_candidato && best.id_eleicao && best.uf) {
      patch.photo_url = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${best.id_eleicao}/${best.sq_candidato}/${best.uf}`;
    }
    // Patrimônio declarado (somatório dos bens)
    if (!c.net_worth && best.sq_candidato) {
      const nw = bensBySq.get(best.sq_candidato);
      if (nw && nw > 0) patch.net_worth = nw;
    }

    if (Object.keys(patch).length === 0) continue;
    updates.push({
      id: c.id,
      patch,
      debug: `${c.name} (${c.state ?? "-"}) ← ${best.cargo} ${best.uf} ${best.ano} [${best.partido}] sq=${best.sq_candidato}`,
    });
  }

  console.log(`\n📈 Estatísticas:`);
  console.log(`   matches: ${matched}`);
  console.log(`   updates pendentes: ${updates.length}`);
  console.log(`   sem match: ${skipped}`);

  if (updates.length === 0) {
    console.log("Nada a fazer.");
    return;
  }

  // Sample
  console.log(`\n🔬 Amostra (primeiros 10):`);
  for (const u of updates.slice(0, 10)) {
    console.log(`   ${u.debug}`);
    console.log(`      patch: ${JSON.stringify(u.patch)}`);
  }

  if (!APPLY) {
    console.log(`\n💡 Rode com --apply para gravar (${updates.length} updates).`);
    return;
  }

  console.log(`\n💾 Aplicando ${updates.length} updates…`);
  for (const u of updates) {
    const { error: ue } = await supabase.from("candidates").update(u.patch).eq("id", u.id);
    if (ue) {
      console.error(`   ❌ ${u.id}:`, ue.message);
    } else {
      updated++;
    }
  }
  console.log(`✅ ${updated} candidatos atualizados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
