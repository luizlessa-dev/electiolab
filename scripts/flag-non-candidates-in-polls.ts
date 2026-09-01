#!/usr/bin/env npx tsx
/**
 * Marca, nas pesquisas publicadas, os resultados de quem não é candidato
 * registrado naquele cargo/UF.
 *
 * Fonte da verdade é o arquivo de candidaturas do TSE (consulta_cand_<ano>.zip),
 * NÃO `candidates.tse_last_situation_year`. O carimbo do banco já esteve errado
 * em 42 registros (ver supabase/migrations/20260831120500_fix_tse_stamp_matching.sql)
 * e o registro de 2º turno presidencial nunca recebe carimbo — usar o banco como
 * critério tirava candidato real de pesquisa publicada.
 *
 * O match é por (cargo, UF) + CPF, com nome como fallback. Cargo e UF importam:
 * quem registrou em outra corrida não vale como candidato nesta. Cabo Daciolo é
 * candidato a governador do AM — isso não faz dele presidenciável.
 *
 * Soft-delete: preenche poll_results.excluded_reason. A linha fica no banco como
 * registro do que o instituto publicou; as leituras públicas é que filtram.
 * Percentuais não são renormalizados.
 *
 * Uso:
 *   npx tsx scripts/flag-non-candidates-in-polls.ts                  # dry-run
 *   npx tsx scripts/flag-non-candidates-in-polls.ts --apply
 *   npx tsx scripts/flag-non-candidates-in-polls.ts --year=2026
 *   npx tsx scripts/flag-non-candidates-in-polls.ts --desde=2026-08-15
 *   npx tsx scripts/flag-non-candidates-in-polls.ts --limpar         # desmarca tudo do ano
 *
 * `--desde` filtra por publication_date. Sem ele, vale o ano inteiro.
 *
 * Reversível: `--limpar` zera as marcações do ano, e a checagem pode ser refeita
 * a qualquer momento — é derivada do arquivo do TSE, não de julgamento manual.
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APPLY = process.argv.includes("--apply");
const LIMPAR = process.argv.includes("--limpar");
const YEAR = parseInt(
  process.argv.find((a) => a.startsWith("--year="))?.split("=")[1] ?? "2026"
);
const DESDE = process.argv.find((a) => a.startsWith("--desde="))?.split("=")[1] ?? null;

const CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
fs.mkdirSync(CACHE_DIR, { recursive: true });

const TSE_ZIP_URL = (ano: number) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ano}.zip`;

const CARGOS: Record<string, string> = {
  PRESIDENTE: "presidente",
  GOVERNADOR: "governador",
  SENADOR: "senador",
  "DEPUTADO FEDERAL": "deputado_federal",
  "DEPUTADO ESTADUAL": "deputado_estadual",
  "DEPUTADO DISTRITAL": "deputado_distrital",
};

type TseCand = { sq: string; cargo: string; uf: string; nome: string; full: string; cpf: string };

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string | null | undefined): string[] {
  return normalize(s).split(" ").filter((t) => t.length > 2);
}

async function loadTse(ano: number): Promise<TseCand[]> {
  const cachePath = path.join(CACHE_DIR, `consulta_cand_${ano}.zip`);
  if (!fs.existsSync(cachePath)) {
    console.log(`⬇️  baixando ${TSE_ZIP_URL(ano)}`);
    const res = await fetch(TSE_ZIP_URL(ano));
    if (!res.ok) throw new Error(`TSE respondeu ${res.status}`);
    fs.writeFileSync(cachePath, Buffer.from(await res.arrayBuffer()));
  }
  const zip = new AdmZip(cachePath);
  const out: TseCand[] = [];
  for (const ent of zip.getEntries()) {
    const m = ent.entryName.match(new RegExp(`consulta_cand_${ano}_([A-Z]+)\\.csv$`));
    if (!m) continue;
    const arq = m[1];
    if (arq === "BR") continue; // agregado redundante dos arquivos por UF
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
      out.push({
        sq,
        cargo,
        uf: cargo === "presidente" ? "BR" : c[I("SG_UF")],
        nome: c[I("NM_URNA_CANDIDATO")],
        full: c[I("NM_CANDIDATO")],
        cpf: (c[I("NR_CPF_CANDIDATO")] ?? "").replace(/\D/g, ""),
      });
    }
  }
  return out;
}

type Corrida = { cpfs: Map<string, TseCand>; nomes: Map<string, TseCand>; todos: TseCand[] };

function indexar(cands: TseCand[]): Map<string, Corrida> {
  const idx = new Map<string, Corrida>();
  for (const t of cands) {
    const k = `${t.cargo}|${t.uf}`;
    let e = idx.get(k);
    if (!e) {
      e = { cpfs: new Map(), nomes: new Map(), todos: [] };
      idx.set(k, e);
    }
    e.todos.push(t);
    if (t.cpf) e.cpfs.set(t.cpf, t);
    e.nomes.set(normalize(t.nome), t);
    e.nomes.set(normalize(t.full), t);
  }
  return idx;
}

type Cand = { name: string; full_name: string | null; cpf: string | null };

/** CPF ou nome idêntico. Sem heurística — usado onde um erro é caro. */
function casarEstrito(corrida: Corrida | undefined, cand: Cand): TseCand | null {
  if (!corrida) return null;
  const cpf = (cand.cpf ?? "").replace(/\D/g, "");
  if (cpf && corrida.cpfs.has(cpf)) return corrida.cpfs.get(cpf)!;
  for (const n of [cand.name, cand.full_name]) {
    const k = normalize(n);
    if (k && corrida.nomes.has(k)) return corrida.nomes.get(k)!;
  }
  return null;
}

/**
 * Identidade da MESMA pessoa em outra corrida. Só CPF ou nome civil completo
 * (NM_CANDIDATO) — nome de urna colide entre homônimos: "Alvaro Dias" casa o
 * senador do PR com um candidato a governador do RN que é outra pessoa. Sem
 * prova de identidade, o motivo fica em "sem_registro_tse", que é verdadeiro
 * nos dois casos.
 */
function casarIdentidade(corrida: Corrida, cand: Cand): TseCand | null {
  const cpf = (cand.cpf ?? "").replace(/\D/g, "");
  if (cpf && corrida.cpfs.has(cpf)) return corrida.cpfs.get(cpf)!;
  const civil = normalize(cand.full_name);
  if (!civil || civil.split(" ").length < 3) return null;
  return corrida.todos.find((t) => normalize(t.full) === civil) ?? null;
}

/**
 * Acha a candidatura da pessoa NESTA corrida, ou null se ela não concorre a isso.
 *
 * Deliberadamente permissivo: aqui um erro de match marca candidato real como
 * não-candidato e o tira de pesquisa publicada. Errar pra "manter" é barato;
 * errar pra "remover" não é. Por isso o fallback por token roda mesmo com nome
 * de uma palavra só — o pool é uma corrida (dezenas de nomes), e exigir
 * unicidade dentro dela já segura o grosso da ambiguidade.
 */
function casar(corrida: Corrida | undefined, cand: Cand): TseCand | null {
  if (!corrida) return null;
  const estrito = casarEstrito(corrida, cand);
  if (estrito) return estrito;

  const meus = tokens(cand.name);
  if (meus.length === 0) return null;
  const candidatos = corrida.todos.filter((t) => {
    const deles = new Set([...tokens(t.nome), ...tokens(t.full)]);
    return meus.every((tk) => deles.has(tk));
  });
  // Ambíguo (dois "Silva" na mesma corrida) não conta como match.
  return candidatos.length === 1 ? candidatos[0] : null;
}

type Row = {
  id: string;
  excluded_reason: string | null;
  candidates: { name: string; full_name: string | null; cpf: string | null } | null;
  polls: {
    publication_date: string;
    elections: { type: string; state: string | null; year: number } | null;
  } | null;
};

async function main() {
  console.log(
    `▶️  Checagem de candidatura em pesquisas ${YEAR}` +
      (DESDE ? ` (publicadas a partir de ${DESDE})` : "") +
      ` — modo: ${APPLY ? "APPLY (grava)" : "DRY RUN (não grava)"}`
  );

  if (LIMPAR) {
    if (!APPLY) {
      console.log("💡 --limpar precisa de --apply.");
      return;
    }
    const { data, error } = await supabase
      .from("poll_results")
      .update({ excluded_reason: null, excluded_at: null })
      .not("excluded_reason", "is", null)
      .select("id");
    if (error) throw error;
    console.log(`✅ ${data?.length ?? 0} marcações removidas.`);
    return;
  }

  const idx = indexar(await loadTse(YEAR));
  console.log(`📊 corridas no arquivo do TSE: ${idx.size}`);

  const PAGE = 500;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("poll_results")
      .select(
        "id, excluded_reason, candidates(name, full_name, cpf), polls!inner(publication_date, elections!inner(type, state, year))"
      )
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < PAGE) break;
  }

  const escopo = rows.filter(
    (r) =>
      r.polls?.elections?.year === YEAR &&
      (!DESDE || (r.polls?.publication_date ?? "") >= DESDE)
  );
  console.log(`🗳️  linhas de resultado no escopo: ${escopo.length}`);

  const marcar: Array<{
    id: string;
    motivo: string;
    nome: string;
    corrida: string;
    onde: string | null;
  }> = [];
  const semCorrida = new Set<string>();

  for (const r of escopo) {
    const el = r.polls!.elections!;
    const uf = el.state ?? "BR";
    const chave = `${el.type}|${uf}`;
    const corrida = idx.get(chave);
    if (!corrida) {
      // Corrida inteira ausente do arquivo do TSE: é falha de cobertura, não
      // prova de que ninguém concorre. Não marca nada — seria apagar a corrida toda.
      semCorrida.add(chave);
      continue;
    }
    const c = r.candidates;
    if (!c) continue;
    if (casar(corrida, c)) continue;

    // Registrou em outra corrida? Muda só o motivo — em ambos os casos a pessoa
    // não está na urna deste cargo/UF.
    //
    // Aqui o match é ESTRITO (CPF ou nome idêntico), ao contrário da checagem
    // acima. O fallback por token varreria as 109 corridas e acharia coincidência
    // fácil: "Rebelo" casava com LUTH REBELO em deputado estadual/PA e Aldo
    // Rebelo — que não consta em lugar nenhum do arquivo 2026 — saía rotulado
    // como "registrado em outro cargo". O rótulo é informação pro leitor; não
    // pode sair de palpite.
    let motivo = "sem_registro_tse";
    let onde: TseCand | null = null;
    for (const [k, outra] of idx) {
      if (k === chave) continue;
      const achou = casarIdentidade(outra, c);
      if (achou) {
        motivo = "registrado_outro_cargo";
        onde = achou;
        break;
      }
    }
    marcar.push({
      id: r.id,
      motivo,
      nome: c.name,
      corrida: `${el.type}/${uf}`,
      onde: onde ? `${onde.cargo}/${onde.uf}` : null,
    });
  }

  if (semCorrida.size > 0) {
    console.log(
      `\n⚠️  corridas sem cobertura no arquivo do TSE (ignoradas, nada marcado): ${[...semCorrida].join(", ")}`
    );
  }

  const porPessoa = new Map<string, { n: number; motivo: string; onde: string | null }>();
  for (const m of marcar) {
    const k = `${m.nome} (${m.corrida})`;
    const e = porPessoa.get(k) ?? { n: 0, motivo: m.motivo, onde: m.onde };
    e.n++;
    porPessoa.set(k, e);
  }

  console.log(`\n🚫 linhas a marcar: ${marcar.length} — ${porPessoa.size} pessoas`);
  for (const [k, v] of [...porPessoa].sort((a, b) => b[1].n - a[1].n)) {
    const nota = v.onde ? `registrado em ${v.onde}` : "não consta no arquivo do TSE";
    console.log(`   ${String(v.n).padStart(3)}x  ${k.padEnd(44)} ${nota}`);
  }

  const jaMarcadas = escopo.filter((r) => r.excluded_reason).length;
  console.log(`\n   (já marcadas antes desta rodada: ${jaMarcadas})`);

  if (!APPLY) {
    console.log(`\n💡 Rode com --apply pra gravar.`);
    return;
  }

  const agora = new Date().toISOString();
  let ok = 0;
  for (const grupo of ["sem_registro_tse", "registrado_outro_cargo"]) {
    const ids = marcar.filter((m) => m.motivo === grupo).map((m) => m.id);
    for (let i = 0; i < ids.length; i += 100) {
      const lote = ids.slice(i, i + 100);
      const { error } = await supabase
        .from("poll_results")
        .update({ excluded_reason: grupo, excluded_at: agora })
        .in("id", lote);
      if (error) {
        console.error(`   ✖ lote ${grupo}: ${error.message}`);
        continue;
      }
      ok += lote.length;
    }
  }
  console.log(`\n✅ ${ok}/${marcar.length} linhas marcadas.`);
  console.log(
    `   Recalcule as médias: POST <project>/functions/v1/recalculate-averages?all=true`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
