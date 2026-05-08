#!/usr/bin/env npx tsx
/**
 * Ingest votações do Senado Federal (dados abertos) → legislative_votes.
 *
 * Estratégia:
 *   1. Lista senadores em exercício via /senador/lista/atual.json
 *   2. Faz match com nossos candidates (full_name normalizado)
 *   3. Para cada match, baixa /senador/{codigo}/votacoes.json
 *   4. Filtra ao recente (2024+) e tópicos relevantes
 *   5. Upsert em legislative_votes (idempotente via bill_id)
 *
 * Uso:
 *   npx tsx scripts/ingest-senado-votes.ts            # dry run
 *   npx tsx scripts/ingest-senado-votes.ts --apply
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

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Heurística simples de "importância": PECs e projetos com palavras-chave
function topicAndImportance(ementa: string): { topic: string; importance: number } {
  const e = ementa.toLowerCase();
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
  return { topic: "geral", importance: 2 };
}

async function fetchSenadores(): Promise<
  Array<{ codigo: string; nome: string; nomeParlamentar: string; uf: string; partido: string }>
> {
  const res = await fetch("https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json", {
    headers: { Accept: "application/json" },
  });
  const j = await res.json();
  const arr = j?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ?? [];
  return arr.map((p: { IdentificacaoParlamentar?: Record<string, string> }) => {
    const ip = p.IdentificacaoParlamentar ?? {};
    return {
      codigo: ip.CodigoParlamentar ?? "",
      nome: ip.NomeCompletoParlamentar ?? ip.NomeParlamentar ?? "",
      nomeParlamentar: ip.NomeParlamentar ?? "",
      uf: ip.UfParlamentar ?? "",
      partido: ip.SiglaPartidoParlamentar ?? "",
    };
  });
}

type Vote = {
  codigoSessao: string;
  ementa: string;
  identificacao: string;
  data: string;
  voto: string;
};

async function fetchVotes(codigo: string): Promise<Vote[]> {
  const res = await fetch(
    `https://legis.senado.leg.br/dadosabertos/senador/${codigo}/votacoes.json`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return [];
  const j = await res.json();
  let arr = j?.VotacaoParlamentar?.Parlamentar?.Votacoes?.Votacao ?? [];
  if (!Array.isArray(arr)) arr = [arr];
  return arr.map((v: Record<string, unknown>) => {
    const sessao = (v.SessaoPlenaria ?? {}) as Record<string, string>;
    const materia = (v.Materia ?? {}) as Record<string, string>;
    return {
      codigoSessao: sessao.CodigoSessao ?? "",
      ementa: materia.Ementa ?? "",
      identificacao: materia.DescricaoIdentificacao ?? "",
      data: sessao.DataSessao ?? "",
      voto: normalizeVoto(((v.SiglaDescricaoVoto as string | undefined) ?? "")),
    };
  });
}

function normalizeVoto(s: string): string {
  const v = s.trim().toLowerCase();
  if (v === "sim" || v === "s") return "Sim";
  if (v === "não" || v === "nao" || v === "n") return "Não";
  if (v.startsWith("absten")) return "Abstenção";
  if (v.startsWith("ausen")) return "Ausente";
  if (v.startsWith("obstru")) return "Obstrução";
  return "Ausente"; // fallback (cobre "P-NRV" não-registro, "Lider", etc)
}

async function main() {
  console.log(`▶️  Senado votes — modo: ${APPLY ? "APPLY" : "DRY RUN"}`);

  // Carrega nossos candidates
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("id, name, full_name")
    .eq("is_active", true);
  if (error) { console.error(error); process.exit(1); }

  const cIdx = new Map<string, string>(); // nome → candidate.id
  for (const c of candidates ?? []) {
    if (c.full_name) cIdx.set(normalize(c.full_name), c.id as string);
    if (c.name) cIdx.set(normalize(c.name as string), c.id as string);
  }

  // Carrega senadores em exercício
  const senadores = await fetchSenadores();
  console.log(`👥 Senadores ativos: ${senadores.length}`);

  // Match
  const matches: Array<{ codigo: string; candidate_id: string; nome: string }> = [];
  for (const s of senadores) {
    const keys = [normalize(s.nome), normalize(s.nomeParlamentar)];
    for (const k of keys) {
      const cid = cIdx.get(k);
      if (cid) {
        if (!matches.find((m) => m.candidate_id === cid)) {
          matches.push({ codigo: s.codigo, candidate_id: cid, nome: s.nomeParlamentar });
        }
        break;
      }
    }
  }
  console.log(`🎯 Match: ${matches.length} senadores na nossa base`);

  let totalInserts = 0;
  for (const m of matches) {
    process.stdout.write(`  ${m.nome} (${m.codigo})… `);
    const votes = await fetchVotes(m.codigo);
    // Recent + relevant: 2023+, tópico ≠ "geral"
    const filtered = votes
      .filter((v) => v.data && v.data >= "2023-01-01")
      .filter((v) => v.ementa)
      .map((v) => ({ ...v, ...topicAndImportance(v.ementa) }))
      .sort((a, b) => b.importance - a.importance || b.data.localeCompare(a.data))
      .slice(0, 8);

    if (filtered.length === 0) {
      console.log("∅ sem votos relevantes");
      continue;
    }

    const rows = filtered.map((v) => ({
      candidate_id: m.candidate_id,
      vote_date: v.data,
      bill_title: v.ementa.slice(0, 500),
      bill_id: v.identificacao || null,
      vote: v.voto,
      topic: v.topic,
      importance: v.importance,
      source: "senado_dadosabertos",
    }));

    if (APPLY) {
      // Limpa votos prévios do mesmo source pra esse candidate
      await supabase
        .from("legislative_votes")
        .delete()
        .eq("candidate_id", m.candidate_id)
        .eq("source", "senado_dadosabertos");
      const { error: ie } = await supabase.from("legislative_votes").insert(rows);
      if (ie) {
        console.log(`❌ ${ie.message}`);
        continue;
      }
    }
    totalInserts += rows.length;
    console.log(`${rows.length} votos`);
    await SLEEP(200);
  }

  console.log(`\n📈 ${totalInserts} votos ${APPLY ? "inseridos" : "candidatos a inserir"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
