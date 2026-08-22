#!/usr/bin/env npx tsx
/**
 * Ingest planos de governo — baixa o PDF de "Proposta de Governo" de cada
 * candidato (PRESIDENTE ou GOVERNADOR) 2026, calcula hash SHA-256, salva em
 * disco e registra em `plano_governo`. Idempotente: se o hash bater com o
 * que já está gravado pro candidato, pula o download/gravação.
 *
 * Estendido em 2026-08-22 pra cobrir GOVERNADOR (26 estados + DF), além de
 * PRESIDENTE (etapa 1 original). `plano_governo` não precisou de coluna nova
 * — cargo e UF já são rastreáveis via candidato_id → candidates.election_id
 * → elections(type, state). A diferença real entre os dois cargos é onde
 * cada um vive nos arquivos do TSE: PRESIDENTE só existe no recurso nacional
 * (_BRASIL.csv / ZIP de proposta "BR"); GOVERNADOR vive nos arquivos por UF
 * (_<UF>.csv / ZIP de proposta por UF) — por isso GOVERNADOR exige --uf.
 *
 * Fonte: dataset "Candidatos - 2026" do Portal de Dados Abertos do TSE
 * (dadosabertos.tse.jus.br). Dois arquivos:
 *   1. consulta_cand_2026.zip — mesma fonte que scripts/ingest-tse-candidaturas.ts
 *      usa, aqui só pra filtrar por cargo (DS_CARGO) e pegar SQ_CANDIDATO. Não
 *      filtra por DS_SITUACAO_CANDIDATURA = "APTO" — esse valor é de
 *      contagem/apuração, não de registro deferido; o dry-run mostra a
 *      distribuição real de situações encontrada pra decidir o filtro certo
 *      antes de qualquer --apply.
 *   2. proposta_governo_2026_<UF>.zip — um PDF por candidato. Presidente só
 *      existe no recurso nacional (mesmo padrão do consulta_cand, onde
 *      PRESIDENTE só aparece em _BRASIL.csv) — mas não consegui confirmar de
 *      antemão se o TSE nomeia esse recurso "BR" ou "BRASIL" (o ambiente que
 *      escreveu este script não tem acesso de rede ao TSE). O script tenta os
 *      dois nomes em sequência e loga qual funcionou. Confirmado em produção:
 *      é "BR". Governador usa a UF diretamente (proposta_governo_2026_MG.zip
 *      etc.), sem essa ambiguidade.
 *
 * A convenção de nome do PDF dentro do ZIP também não pôde ser confirmada
 * antes de rodar — o script lista todas as entradas do ZIP e tenta casar por
 * SQ_CANDIDATO no nome do arquivo. Se não achar, avisa e NÃO adivinha.
 *
 * Uso:
 *   npx tsx scripts/ingest-planos-governo.ts                              # dry-run PRESIDENTE
 *   npx tsx scripts/ingest-planos-governo.ts --apply                      # PRESIDENTE: baixa, salva em data/planos/, grava no banco
 *   npx tsx scripts/ingest-planos-governo.ts --cargo=governador --uf=MG   # dry-run GOVERNADOR de uma UF
 *   npx tsx scripts/ingest-planos-governo.ts --cargo=governador --uf=ALL  # dry-run GOVERNADOR nas 27 UFs, uma por vez
 *   npx tsx scripts/ingest-planos-governo.ts --cargo=governador --uf=MG --apply
 *   npx tsx scripts/ingest-planos-governo.ts --year=2026                  # default 2026
 *
 * Dependências: adm-zip, iconv-lite, pdf-lib (já instaladas)
 */

import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─────────────────────────────────────────────────────────────────
// Env loader (igual aos outros scripts/ingest-tse-*.ts)
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
const CARGO = (process.argv.find((a) => a.startsWith("--cargo="))?.split("=")[1] ?? "presidente").toLowerCase();
const UF_ARG = process.argv.find((a) => a.startsWith("--uf="))?.split("=")[1]?.toUpperCase();

if (CARGO !== "presidente" && CARGO !== "governador") {
  console.error(`❌ --cargo inválido: "${CARGO}". Use "presidente" ou "governador".`);
  process.exit(1);
}
if (CARGO === "governador" && !UF_ARG) {
  console.error(`❌ --cargo=governador exige --uf=<UF> (ex.: --uf=MG) ou --uf=ALL pra rodar as 27.`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────
const TSE_CAND_ZIP_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ano}.zip`;
const TSE_PROPOSTA_ZIP_URL = (ano: number, uf: string) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/proposta_governo/proposta_governo_${ano}_${uf}.zip`;
// Nomes candidatos pro recurso nacional — não confirmado, ver comentário no topo.
const PROPOSTA_NACIONAL_UF_CANDIDATES = ["BR", "BRASIL"];
// 26 estados + DF — usado só quando --cargo=governador --uf=ALL.
const ALL_UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
const OUT_DIR = path.join(process.cwd(), "data", "planos", String(YEAR));
fs.mkdirSync(CACHE_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────
// Helpers (mesmo padrão de scripts/ingest-tse-candidaturas.ts)
// ─────────────────────────────────────────────────────────────────
function clean(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/^"|"$/g, "").trim();
  if (!t || t === "#NULO#" || t === "#NE#" || t === "-1" || t === "NÃO INFORMADO") return null;
  return t;
}

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

async function tryDownloadCached(
  candidates: { url: string; cacheName: string }[]
): Promise<{ buf: Buffer; url: string } | null> {
  for (const c of candidates) {
    try {
      const buf = await downloadCached(c.url, c.cacheName);
      return { buf, url: c.url };
    } catch (e) {
      console.warn(`   ⚠️  ${c.url} falhou: ${e instanceof Error ? e.message : e}`);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Candidaturas — PRESIDENTE ou GOVERNADOR, a partir do consulta_cand oficial
// (não da tabela `candidates`, que mistura shortlist editorial com dados TSE
// reais e tem linhas duplicadas/inconsistentes entre 1º/2º turno).
// ─────────────────────────────────────────────────────────────────
type CandidaturaRow = {
  sq_candidato: string;
  nome: string;
  nome_urna: string;
  numero: string | null;
  partido: string | null;
  situacao: string | null;
};

function parseCandidaturaCsv(buf: Buffer, dsCargo: string): CandidaturaRow[] {
  const text = iconv.decode(buf, "latin1");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(";").map((h) => h.replace(/^"|"$/g, "").trim());
  const idx = (col: string) => header.indexOf(col);
  const iCargo = idx("DS_CARGO");
  const iSq = idx("SQ_CANDIDATO");
  const iNome = idx("NM_CANDIDATO");
  const iUrna = idx("NM_URNA_CANDIDATO");
  const iNum = idx("NR_CANDIDATO");
  const iPart = idx("SG_PARTIDO");
  const iSit = idx("DS_SITUACAO_CANDIDATURA");

  const rows: CandidaturaRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length < header.length) continue;
    if (clean(cols[iCargo]) !== dsCargo) continue;
    const sq = clean(cols[iSq]);
    const nome = clean(cols[iNome]);
    if (!sq || !nome) continue;
    const situacao = iSit >= 0 ? clean(cols[iSit]) : null;
    rows.push({
      sq_candidato: sq,
      nome,
      nome_urna: clean(cols[iUrna]) ?? nome,
      numero: clean(cols[iNum]),
      partido: clean(cols[iPart]),
      situacao,
    });
  }
  return rows;
}

// cargo: "presidente" (só existe em _BRASIL.csv, recurso nacional) ou
// "governador" (vive nos CSVs por UF, ex.: consulta_cand_2026_MG.csv).
async function loadCandidaturas(ano: number, cargo: string, uf?: string): Promise<CandidaturaRow[]> {
  const buf = await downloadCached(TSE_CAND_ZIP_URL(ano), `consulta_cand_${ano}.zip`);
  const zip = new AdmZip(buf);
  const dsCargo = cargo.toUpperCase();
  const entryPattern = cargo === "presidente" ? /_brasil\.csv$/i : new RegExp(`_${uf}\\.csv$`, "i");
  for (const entry of zip.getEntries()) {
    if (!entryPattern.test(entry.entryName)) continue;
    console.log(`  📄 ${entry.entryName}`);
    return parseCandidaturaCsv(entry.getData(), dsCargo);
  }
  const esperado = cargo === "presidente" ? "*_BRASIL.csv" : `*_${uf}.csv`;
  throw new Error(`Não achei ${esperado} dentro de consulta_cand — formato do ZIP mudou ou UF inválida?`);
}

// ─────────────────────────────────────────────────────────────────
// Match contra `candidates` já populada (por scripts/ingest-tse-candidaturas.ts).
// Este script NÃO cria candidato novo — só liga plano_governo a quem já existe.
// ─────────────────────────────────────────────────────────────────
async function loadCandidatoIdByTseId(ano: number, cargo: string, uf?: string): Promise<Map<string, string>> {
  let query = supabase.from("elections").select("id, name").eq("year", ano).eq("type", cargo);
  if (uf) query = query.eq("state", uf);
  const { data: elections, error: eErr } = await query;
  if (eErr) throw eErr;
  if (!elections || elections.length === 0) {
    throw new Error(`Não achei eleição '${cargo}' pra ${ano}${uf ? ` (${uf})` : ""}`);
  }

  // Busca em TODAS as linhas de eleição (1º e 2º turno), não só 1º turno:
  // achado em produção (2026-08-22, presidencial) — o tse_id de alguns
  // candidatos (ex. Lula, Zema) está desatualizado na linha de 1º turno e só
  // está correto na linha duplicada de 2º turno (efeito colateral de
  // re-execuções passadas de ingest-tse-candidaturas.ts com CSVs de datas
  // diferentes). Como o plano de governo é um dado do candidato, não da
  // corrida, casar por tse_id em qualquer linha resolve sem precisar mexer em
  // `candidates`. Governador 2026 só tem round=1 cadastrado até agora, então
  // isso é no-op ali, mas mantém o mesmo comportamento se/quando 2º turno for
  // adicionado.
  const { data: candidatos, error: cErr } = await supabase
    .from("candidates")
    .select("id, tse_id")
    .in("election_id", elections.map((e) => e.id))
    .not("tse_id", "is", null);
  if (cErr) throw cErr;

  const map = new Map<string, string>();
  for (const c of candidatos ?? []) {
    if (!c.tse_id) continue;
    if (map.has(c.tse_id as string)) {
      console.warn(`   ⚠️  tse_id=${c.tse_id} aparece em mais de uma linha de candidates — usando a última encontrada.`);
    }
    map.set(c.tse_id as string, c.id as string);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────
// PDF por candidato dentro do ZIP de proposta de governo — casa por
// SQ_CANDIDATO no nome do arquivo. Loga todas as entradas achadas pra
// facilitar ajuste se a convenção real de nome for diferente.
// ─────────────────────────────────────────────────────────────────
function findPdfEntry(zip: AdmZip, sqCandidato: string) {
  const entries = zip.getEntries().filter((e) => e.entryName.toLowerCase().endsWith(".pdf"));
  return entries.find((e) => e.entryName.includes(sqCandidato));
}

// ─────────────────────────────────────────────────────────────────
// Run — uma passada completa pra um (cargo, uf). uf é undefined pra
// presidente (nacional); obrigatório pra governador.
// ─────────────────────────────────────────────────────────────────
async function processCargoUf(cargo: string, uf?: string) {
  const label = uf ? `${cargo.toUpperCase()} (${uf})` : cargo.toUpperCase();
  console.log(`\n▶️  ${label} ${YEAR} — modo: ${APPLY ? "APPLY (baixa e grava)" : "DRY RUN (só lista)"}`);

  const [candidaturas, candidatoIdByTseId] = await Promise.all([
    loadCandidaturas(YEAR, cargo, uf),
    loadCandidatoIdByTseId(YEAR, cargo, uf),
  ]);

  const porSituacao = new Map<string, number>();
  for (const p of candidaturas) {
    const k = p.situacao ?? "(vazio)";
    porSituacao.set(k, (porSituacao.get(k) ?? 0) + 1);
  }
  console.log(`\n👥 ${label} no consulta_cand ${YEAR}: ${candidaturas.length} linhas. Distribuição por DS_SITUACAO_CANDIDATURA:`);
  for (const [sit, n] of [...porSituacao.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${sit}: ${n}`);
  }

  // Presidente: recurso nacional, nome "BR" ou "BRASIL" (ver comentário no
  // topo do arquivo). Governador: ZIP de proposta é direto por UF, sem essa
  // ambiguidade.
  const propostaTargets =
    cargo === "presidente"
      ? PROPOSTA_NACIONAL_UF_CANDIDATES.map((u) => ({
          url: TSE_PROPOSTA_ZIP_URL(YEAR, u),
          cacheName: `proposta_governo_${YEAR}_${u}.zip`,
        }))
      : [{ url: TSE_PROPOSTA_ZIP_URL(YEAR, uf!), cacheName: `proposta_governo_${YEAR}_${uf}.zip` }];

  const proposta = await tryDownloadCached(propostaTargets);

  if (!proposta) {
    console.error(
      `\n❌ Não consegui baixar o ZIP de proposta de governo de ${label} (tentei: ${propostaTargets
        .map((t) => t.url)
        .join(", ")}).`
    );
    if (cargo === "presidente") {
      console.error(
        `   Confirme o nome certo do recurso em https://dadosabertos.tse.jus.br/dataset/candidatos-${YEAR} e ajuste PROPOSTA_NACIONAL_UF_CANDIDATES neste script.`
      );
    }
    return;
  }
  console.log(`\n✅ ZIP de proposta de governo: ${proposta.url}`);

  const zip = new AdmZip(proposta.buf);
  const pdfEntries = zip.getEntries().filter((e) => e.entryName.toLowerCase().endsWith(".pdf"));
  console.log(`📄 ${pdfEntries.length} PDFs no ZIP.`);

  // Cross-referência: quem tem PDF anexado no ZIP é, na prática, quem tem
  // candidatura registrada com plano de governo — sinal mais direto que
  // DS_SITUACAO_CANDIDATURA (que aqui reflete estado de apuração, não de
  // deferimento do registro).
  console.log(`\n📋 Todos os ${cargo.toUpperCase()} encontrados (situação real do TSE, sem filtro):`);
  type Plan = { sq: string; nome: string; candidatoId: string; entryName: string };
  const plans: Plan[] = [];
  for (const p of candidaturas) {
    const candidatoId = candidatoIdByTseId.get(p.sq_candidato);
    const entry = findPdfEntry(zip, p.sq_candidato);
    const temPdf = entry ? "📄 tem PDF" : "— sem PDF";
    console.log(
      `   ${p.nome_urna} (${p.partido ?? "?"}${p.numero ? ` ${p.numero}` : ""}) — situação=${p.situacao ?? "(vazio)"} — ${temPdf} — SQ_CANDIDATO=${p.sq_candidato} — candidato_id=${candidatoId ?? "❌ NÃO ENCONTRADO em `candidates`"}`
    );
    if (candidatoId && entry) {
      plans.push({ sq: p.sq_candidato, nome: p.nome_urna, candidatoId, entryName: entry.entryName });
    }
  }

  const pdfsSemMatch = pdfEntries.filter(
    (e) => !candidaturas.some((p) => e.entryName.includes(p.sq_candidato))
  );
  if (pdfsSemMatch.length > 0) {
    console.log(`\n⚠️  ${pdfsSemMatch.length} PDF(s) no ZIP sem candidato ${cargo.toUpperCase()} correspondente no consulta_cand:`);
    for (const e of pdfsSemMatch) console.log(`   ${e.entryName}`);
  }

  console.log(`\n🔗 Planos que seriam gravados (candidato_id resolvido + PDF encontrado): ${plans.length}`);
  for (const plan of plans) console.log(`   ${plan.nome} → ${plan.entryName}`);

  if (!APPLY) {
    console.log(`\n💡 Rode com --apply para baixar, salvar em ${OUT_DIR}/ e gravar em \`plano_governo\` (${plans.length} candidatos).`);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { data: existing } = await supabase
    .from("plano_governo")
    .select("candidato_id, hash")
    .eq("ano", YEAR);
  const hashByCandidatoId = new Map((existing ?? []).map((r) => [r.candidato_id as string, r.hash as string]));

  console.log(`\n💾 Processando ${plans.length} planos…`);
  for (const plan of plans) {
    const entry = zip.getEntries().find((e) => e.entryName === plan.entryName)!;
    const pdfBuf = entry.getData();
    const hash = createHash("sha256").update(pdfBuf).digest("hex");

    if (hashByCandidatoId.get(plan.candidatoId) === hash) {
      console.log(`   ⏭️  ${plan.nome}: hash igual ao já gravado, pulando.`);
      continue;
    }

    const filePath = path.join(OUT_DIR, `${plan.sq}.pdf`);
    fs.writeFileSync(filePath, pdfBuf);

    let numPaginas: number | null = null;
    try {
      const pdfDoc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
      numPaginas = pdfDoc.getPageCount();
    } catch (e) {
      console.warn(`   ⚠️  ${plan.nome}: não consegui contar páginas (${e instanceof Error ? e.message : e})`);
    }

    const { error } = await supabase.from("plano_governo").upsert(
      {
        candidato_id: plan.candidatoId,
        ano: YEAR,
        url_origem: proposta.url,
        hash,
        data_download: new Date().toISOString(),
        num_paginas: numPaginas,
        caminho_arquivo: filePath,
      },
      { onConflict: "candidato_id,ano" }
    );

    if (error) {
      console.error(`   ❌ ${plan.nome}: ${error.message}`);
    } else {
      console.log(`   ✅ ${plan.nome}: ${numPaginas ?? "?"} páginas, salvo em ${filePath}`);
    }
  }
}

async function main() {
  if (CARGO === "governador" && UF_ARG === "ALL") {
    console.log(`▶️  GOVERNADOR ${YEAR} — rodando as ${ALL_UFS.length} UFs em sequência (${APPLY ? "APPLY" : "DRY RUN"})`);
    for (const uf of ALL_UFS) {
      await processCargoUf("governador", uf);
    }
    return;
  }
  await processCargoUf(CARGO, CARGO === "governador" ? UF_ARG : undefined);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
