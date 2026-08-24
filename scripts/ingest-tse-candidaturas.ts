#!/usr/bin/env npx tsx
/**
 * Ingest TSE candidaturas — popula/atualiza candidates com dados oficiais do TSE
 * para todos os cargos que o electiolab acompanha, ano 2026: Presidente,
 * Governador (27), Senador (27), Deputado Federal (27), Deputado Estadual (26)
 * e Deputado Distrital (1, só DF) — mesmo escopo de `elections`.
 *
 * Reescrito em 2026-08-13: a versão anterior só fazia UPDATE via match fuzzy de
 * nome contra candidates pré-existentes (funcionava quando a base já vinha com
 * um shortlist curado). Esta versão faz upsert direto por tse_id/cpf, com
 * fallback de match por nome escopado à própria eleição, casando cada
 * candidatura com a election_id certa via (cargo, UF).
 *
 * Escopo ampliado no mesmo dia pra incluir os 3 cargos de Deputado — decisão
 * de produto: candidatos famosos concorrendo a deputado geram mais engajamento
 * que só as corridas majoritárias. Isso multiplica o volume por ~50x (335 →
 * ~16.600 candidaturas), mas o ZIP fonte continua o mesmo de 2,5MB (só muda
 * quais cargos filtramos pra dentro) — parser em memória continua adequado.
 *
 * Achado importante: candidatos a PRESIDENTE só aparecem no CSV agregado
 * `_BRASIL.csv` do TSE (não em nenhum arquivo por UF) — o script anterior e o
 * ingest-tse-extended.ts pulam esse arquivo inteiro como "agregado redundante"
 * e por isso nunca capturavam presidenciáveis. Aqui só pulamos BRASIL.csv para
 * cargos que já vêm por UF (evita duplicar) e extraímos PRESIDENTE dele.
 *
 * Fora do escopo por decisão (não são candidaturas votadas separadamente):
 * VICE-GOVERNADOR, VICE-PRESIDENTE, 1º/2º SUPLENTE (de senador) — correm na
 * chapa do titular, não aparecem na urna como nome próprio.
 *
 * Uso:
 *   npx tsx scripts/ingest-tse-candidaturas.ts             # dry-run, mostra diffs
 *   npx tsx scripts/ingest-tse-candidaturas.ts --apply     # grava no banco
 *   npx tsx scripts/ingest-tse-candidaturas.ts --year=2026 # default 2026
 *
 * Dependências: adm-zip, iconv-lite (já instaladas)
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
const YEAR = parseInt(process.argv.find((a) => a.startsWith("--year="))?.split("=")[1] ?? "2026");

// ─────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────
const TSE_ZIP_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ano}.zip`;
const TSE_BENS_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_${ano}.zip`;

const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

const TRACKED_CARGOS = new Set([
  "PRESIDENTE",
  "GOVERNADOR",
  "SENADOR",
  "DEPUTADO FEDERAL",
  "DEPUTADO ESTADUAL",
  "DEPUTADO DISTRITAL",
]);
// Cargos por UF (tudo exceto PRESIDENTE, que só existe no agregado _BRASIL.csv)
const PER_UF_CARGOS = new Set(
  [...TRACKED_CARGOS].filter((c) => c !== "PRESIDENTE")
);

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function clean(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/^"|"$/g, "").trim();
  if (!t || t === "#NULO#" || t === "#NE#" || t === "-1" || t === "NÃO INFORMADO") return null;
  return t;
}

function parseDateBR(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
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

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length >= 2);
}

// Apelidos políticos que o TSE não registra com o nome curto usado no shortlist
// curado de `candidates` (ex: "Lula", "Ciro", "Tarcisio" sem sobrenome completo).
const ALIASES: Record<string, string> = {
  "lula": "luiz inacio lula da silva",
  "bolsonaro": "jair messias bolsonaro",
  "ciro": "ciro ferreira gomes",
  "haddad": "fernando haddad",
  "tarcisio": "tarcisio gomes de freitas",
  "zema": "romeu zema neto",
  "caiado": "ronaldo ramos caiado",
  "kalil": "alexandre kalil",
  "ratinho": "carlos roberto massa junior",
  "ratinho jr": "carlos roberto massa junior",
  "flavio": "flavio bolsonaro",
  "flavio bolsonaro": "flavio nantes bolsonaro",
  "renan": "renan santos",
  "rebelo": "aldo rebelo",
  "soraya": "soraya thronicke",
  "simone tebet": "simone nassar tebet",
};

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

// ─────────────────────────────────────────────────────────────────
// Bens — soma dos valores declarados por sq_candidato
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

async function loadBens(ano: number): Promise<Map<string, number>> {
  const sums = new Map<string, number>();
  let buf: Buffer;
  try {
    buf = await downloadCached(TSE_BENS_URL(ano), `bem_candidato_${ano}.zip`);
  } catch (e) {
    console.warn(`⚠️  Bens indisponível pra ${ano}:`, e instanceof Error ? e.message : e);
    return sums;
  }
  const zip = new AdmZip(buf);
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.toLowerCase().endsWith(".csv")) continue;
    if (/_brasil\.csv$/i.test(entry.entryName)) continue; // presidente não declara bens aqui separado; cobertura futura se necessário
    for (const [sq, v] of parseBensCsv(entry.getData())) {
      sums.set(sq, (sums.get(sq) ?? 0) + v);
    }
  }
  console.log(`💰 Bens ${ano}: ${sums.size.toLocaleString("pt-BR")} candidatos com declaração`);
  return sums;
}

// ─────────────────────────────────────────────────────────────────
// Candidaturas — só PRESIDENTE / GOVERNADOR / SENADOR
// ─────────────────────────────────────────────────────────────────
type TseRow = {
  uf: string | null; // null pra presidente
  cargo: string;
  sq_candidato: string;
  nome: string;
  nome_urna: string;
  cpf: string | null;
  partido: string | null;
  num_candidato: string | null;
  dt_nascimento: string | null;
  ocupacao: string | null;
  grau_instrucao: string | null;
  situacao: string | null;
  situacao_detalhe: string | null;
};

function parseCandCsv(buf: Buffer, opts: { onlyCargos: Set<string> }): TseRow[] {
  const text = iconv.decode(buf, "latin1");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(";").map((h) => h.replace(/^"|"$/g, "").trim());
  const idx = (col: string) => header.indexOf(col);

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
  const iSit = idx("DS_SITUACAO_CANDIDATURA");
  const iSitDetalhe = idx("DS_DETALHE_SITUACAO_CAND");

  const rows: TseRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length < header.length) continue;
    const cargo = clean(cols[iCargo]);
    if (!cargo || !opts.onlyCargos.has(cargo)) continue;

    const sq = clean(cols[iSq]);
    const nome = clean(cols[iNome]);
    if (!sq || !nome) continue;

    rows.push({
      uf: cargo === "PRESIDENTE" ? null : clean(cols[iUF]),
      cargo,
      sq_candidato: sq,
      nome,
      nome_urna: clean(cols[iUrna]) ?? nome,
      cpf: clean(cols[iCpf]),
      partido: clean(cols[iPart]),
      num_candidato: clean(cols[iNum]),
      dt_nascimento: parseDateBR(clean(cols[iNasc])),
      ocupacao: clean(cols[iOcup]),
      grau_instrucao: clean(cols[iGrau]),
      situacao: iSit >= 0 ? clean(cols[iSit]) : null,
      situacao_detalhe: iSitDetalhe >= 0 ? clean(cols[iSitDetalhe]) : null,
    });
  }
  return rows;
}

async function loadCandidaturas(ano: number): Promise<TseRow[]> {
  const buf = await downloadCached(TSE_ZIP_URL(ano), `consulta_cand_${ano}.zip`);
  const zip = new AdmZip(buf);
  const rows: TseRow[] = [];

  for (const entry of zip.getEntries()) {
    if (!entry.entryName.toLowerCase().endsWith(".csv")) continue;
    const isBrasil = /_brasil\.csv$/i.test(entry.entryName);
    if (isBrasil) {
      // Único lugar onde PRESIDENTE aparece — GOVERNADOR/SENADOR aqui seriam
      // duplicata do que já vem no CSV de cada UF.
      console.log(`  📄 ${entry.entryName} (só PRESIDENTE)`);
      rows.push(...parseCandCsv(entry.getData(), { onlyCargos: new Set(["PRESIDENTE"]) }));
      continue;
    }
    console.log(`  📄 ${entry.entryName}`);
    rows.push(...parseCandCsv(entry.getData(), { onlyCargos: PER_UF_CARGOS }));
  }
  console.log(`📊 Candidaturas relevantes (${[...TRACKED_CARGOS].join("/")}): ${rows.length}`);
  return rows;
}

// ─────────────────────────────────────────────────────────────────
// Elections lookup
// ─────────────────────────────────────────────────────────────────
type ElectionRef = { id: string; type: string; state: string | null; name: string };

async function loadElectionsMap(ano: number): Promise<Map<string, ElectionRef>> {
  const { data, error } = await supabase
    .from("elections")
    .select("id, name, year, type, state")
    .eq("year", ano)
    .eq("is_active", true);
  if (error) throw error;

  const map = new Map<string, ElectionRef>();
  for (const e of data ?? []) {
    const key = e.type === "presidente" ? "presidente" : `${e.type}:${e.state}`;
    // Presidente tem 2 rows (1º/2º turno) — candidatura se registra uma vez só,
    // usa a de 1º turno como election_id canônico.
    if (e.type === "presidente" && !String(e.name).includes("1º Turno")) continue;
    map.set(key, { id: e.id as string, type: e.type as string, state: e.state as string | null, name: e.name as string });
  }
  return map;
}

const CARGO_TO_ELECTION_TYPE: Record<string, string> = {
  GOVERNADOR: "governador",
  SENADOR: "senador",
  "DEPUTADO FEDERAL": "deputado_federal",
  "DEPUTADO ESTADUAL": "deputado_estadual",
  "DEPUTADO DISTRITAL": "deputado_distrital",
};

function electionKeyFor(row: TseRow): string {
  if (row.cargo === "PRESIDENTE") return "presidente";
  const type = CARGO_TO_ELECTION_TYPE[row.cargo];
  return `${type}:${row.uf}`;
}

// ─────────────────────────────────────────────────────────────────
// Match por nome dentro da mesma eleição — fallback quando tse_id/cpf não
// batem. candidates já vem pré-populada por corrida (shortlist curado, muitos
// sem tse_id/cpf ainda), então casar só por nome dentro do pool pequeno de uma
// eleição (poucas dezenas de candidatos) é seguro — bem mais que o fuzzy match
// global por UF/cargo que a versão anterior fazia contra a base inteira.
function findByName(
  pool: Record<string, unknown>[],
  row: TseRow,
  claimed: Set<string>
): Record<string, unknown> | undefined {
  const normFull = normalize(row.nome);
  const normUrna = normalize(row.nome_urna);
  const nameKeys = new Set([normFull, normUrna]);
  const alias = ALIASES[normFull] ?? ALIASES[normUrna];
  if (alias) nameKeys.add(alias);

  for (const c of pool) {
    if (claimed.has(c.id as string)) continue;
    const cName = normalize((c.name as string) ?? "");
    const cFull = normalize((c.full_name as string) ?? "");
    const cKeys = new Set([cName, cFull]);
    const cAlias = ALIASES[cName] ?? ALIASES[cFull];
    if (cAlias) cKeys.add(cAlias);
    for (const k of nameKeys) {
      if (k && cKeys.has(k)) return c;
    }
  }

  // Fuzzy: nome curto do shortlist ("Lula", "Zema") é subconjunto de tokens do TSE
  const tseTokens = new Set([...tokens(row.nome), ...tokens(row.nome_urna)]);
  for (const c of pool) {
    if (claimed.has(c.id as string)) continue;
    const cTokens = tokens((c.name as string) ?? "");
    if (cTokens.length === 0) continue;
    if (cTokens.every((t) => tseTokens.has(t))) return c;
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`▶️  TSE candidaturas ${YEAR} — modo: ${APPLY ? "APPLY (grava)" : "DRY RUN (não grava)"}`);

  const [rows, bensBySq, electionsMap] = await Promise.all([
    loadCandidaturas(YEAR),
    loadBens(YEAR),
    loadElectionsMap(YEAR),
  ]);

  console.log(`🗳️  Eleições ${YEAR} carregadas: ${electionsMap.size} (esperado: 27 gov + 27 sen + 1 presidente = 55)`);

  // Paginado: select() sem .range() corta em 1000 linhas (default do
  // PostgREST/Supabase) — com 16.900+ candidatos já cadastrados, um select
  // sem paginação faz o script "esquecer" a maior parte da base e tratar
  // candidatos existentes como novos (achado em 2026-08-22, quase duplicou a
  // base inteira num --apply).
  const PAGE_SIZE = 1000;
  const existing: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page, error } = await supabase
      .from("candidates")
      .select(
        "id, tse_id, cpf, name, full_name, birth_date, profession, education, net_worth, photo_url, election_id, slug"
      )
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    existing.push(...(page ?? []));
    if (!page || page.length < PAGE_SIZE) break;
  }

  console.log(`👥 Candidatos já cadastrados: ${existing.length}`);

  const byTseId = new Map<string, Record<string, unknown>>();
  const byCpf = new Map<string, Record<string, unknown>>();
  const byElection = new Map<string, Record<string, unknown>[]>();
  for (const c of existing ?? []) {
    if (c.tse_id) byTseId.set(c.tse_id as string, c);
    if (c.cpf) byCpf.set(c.cpf as string, c);
    if (c.election_id) {
      const arr = byElection.get(c.election_id as string) ?? [];
      arr.push(c);
      byElection.set(c.election_id as string, arr);
    }
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Array<{ id: string; patch: Record<string, unknown> }> = [];
  let unmatched = 0;
  let matchedByName = 0;
  const claimed = new Set<string>();

  // Slug é único por (slug, election_id) — não globalmente. Semeia com o que já
  // existe no banco pra não colidir com a constraint real na hora do insert.
  const usedSlugs = new Set<string>();
  for (const c of existing ?? []) {
    if (c.slug && c.election_id) usedSlugs.add(`${c.election_id}:${c.slug}`);
  }

  for (const row of rows) {
    const key = electionKeyFor(row);
    const election = electionsMap.get(key);
    if (!election) {
      unmatched++;
      continue;
    }

    let current =
      byTseId.get(row.sq_candidato) ?? (row.cpf ? byCpf.get(row.cpf) : undefined);
    if (!current) {
      current = findByName(byElection.get(election.id) ?? [], row, claimed);
      if (current) matchedByName++;
    }
    if (current) claimed.add(current.id as string);
    const netWorth = bensBySq.get(row.sq_candidato);

    const tseFields: Record<string, unknown> = {
      tse_id: row.sq_candidato,
      tse_last_situation: row.situacao,
      tse_last_situation_year: YEAR,
      tse_last_situation_detail: row.situacao_detalhe,
    };

    if (current) {
      const patch: Record<string, unknown> = { ...tseFields };
      if (!current.election_id) patch.election_id = election.id;
      if (!current.cpf && row.cpf) patch.cpf = row.cpf;
      if (!current.full_name && row.nome) patch.full_name = titleCase(row.nome);
      if (!current.birth_date && row.dt_nascimento) patch.birth_date = row.dt_nascimento;
      if (!current.profession && row.ocupacao) patch.profession = titleCase(row.ocupacao);
      if (!current.education && row.grau_instrucao) patch.education = row.grau_instrucao;
      if (!current.net_worth && netWorth && netWorth > 0) patch.net_worth = netWorth;
      if (!current.photo_url) {
        patch.photo_url = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${YEAR}/${row.sq_candidato}/${row.uf ?? "BR"}`;
      }
      toUpdate.push({ id: current.id as string, patch });
    } else {
      let slug = slugify(row.nome_urna);
      let n = 2;
      while (usedSlugs.has(`${election.id}:${slug}`)) slug = `${slugify(row.nome_urna)}-${n++}`;
      usedSlugs.add(`${election.id}:${slug}`);

      toInsert.push({
        ...tseFields,
        election_id: election.id,
        name: titleCase(row.nome_urna),
        full_name: titleCase(row.nome),
        party: row.partido,
        number: row.num_candidato ? parseInt(row.num_candidato) : null,
        cpf: row.cpf,
        birth_date: row.dt_nascimento,
        profession: row.ocupacao ? titleCase(row.ocupacao) : null,
        education: row.grau_instrucao,
        net_worth: netWorth && netWorth > 0 ? netWorth : null,
        photo_url: `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${YEAR}/${row.sq_candidato}/${row.uf ?? "BR"}`,
        slug,
        is_active: true,
      });
    }
  }

  console.log(`\n📈 Estatísticas:`);
  console.log(`   novos candidatos:      ${toInsert.length}`);
  console.log(`   atualizações:          ${toUpdate.length}`);
  console.log(`     (match por nome:     ${matchedByName})`);
  console.log(`   sem election_id (bug): ${unmatched}`);

  console.log(`\n🔬 Amostra de novos (até 10):`);
  for (const c of toInsert.slice(0, 10)) {
    console.log(`   ${c.name} (${c.party}) — election_id=${c.election_id} slug=${c.slug}`);
  }

  if (!APPLY) {
    console.log(`\n💡 Rode com --apply para gravar (${toInsert.length} inserts, ${toUpdate.length} updates).`);
    return;
  }

  console.log(`\n💾 Gravando…`);
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const slice = toInsert.slice(i, i + BATCH);
    const { error: ie } = await supabase.from("candidates").insert(slice);
    if (ie) {
      console.error(`❌ Insert batch ${i}:`, ie.message);
      break;
    }
    inserted += slice.length;
  }
  console.log(`✅ ${inserted}/${toInsert.length} candidatos criados.`);

  let updated = 0;
  for (const u of toUpdate) {
    const { error: ue } = await supabase.from("candidates").update(u.patch).eq("id", u.id);
    if (ue) {
      console.error(`   ❌ ${u.id}:`, ue.message);
    } else {
      updated++;
    }
  }
  console.log(`✅ ${updated}/${toUpdate.length} candidatos atualizados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
