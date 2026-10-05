#!/usr/bin/env npx tsx
/**
 * Marca o resultado de 2026 (eleito, 2º turno, suplente, não eleito) nos perfis de
 * candidato, a partir da apuração oficial já coletada no schema `apuracao`.
 *
 * Grava em `prior_election_results` (year=2026), a mesma tabela do bloco "Histórico
 * eleitoral" do perfil — o selo do topo do perfil lê dela também.
 *
 * Só entra disputa que o TSE FINALIZOU (`andamento = 'f'`). Antes disso o TSE não marca
 * situação no proporcional, e no majoritário ela ainda pode mudar.
 *
 * Casamento perfil ↔ candidato da apuração por `candidates.tse_id = votacao_candidato.sqcand`
 * (o SQ_CANDIDATO do TSE). Sem tse_id casado, o candidato é pulado e contado no relatório.
 *
 * Idempotente: para cada perfil tocado, apaga as linhas year=2026 / round / source deste
 * script e grava de novo. Rodar de novo atualiza (UF que finalizou depois, sub judice
 * julgado, 2º turno) sem duplicar. Não toca nas linhas de 2018/2022/2024.
 *
 * Uso:
 *   npx tsx scripts/marcar-eleitos-2026.ts                     # dry-run (só relatório)
 *   npx tsx scripts/marcar-eleitos-2026.ts --apply             # grava
 *   npx tsx scripts/marcar-eleitos-2026.ts --apply --revalidar # grava e revalida as
 *                                                              # páginas dos eleitos/2º turno
 *   --turno=2   só o 2º turno (padrão: todos os turnos oficiais coletados)
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
      if (k && !k.startsWith("#") && !process.env[k]) process.env[k] = v;
    }
  }
}

const APPLY = process.argv.includes("--apply");
const REVALIDAR = process.argv.includes("--revalidar");
const TURNO = process.argv.find((a) => a.startsWith("--turno="))?.split("=")[1];

const ANO = 2026;
const SOURCE = "TSE apuração 2026";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://electiolab.com";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (APPLY && !SERVICE_KEY) {
  console.error("❌ --apply precisa de SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}
const KEY = SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const pub = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const apu = createClient(SUPABASE_URL, KEY, {
  auth: { persistSession: false },
  db: { schema: "apuracao" as never },
});

/** Código de cargo do TSE → `prior_election_results.election_type` (mesmo mapa de
 * `ingest-tse-prior-results.ts`). */
const CARGO: Record<number, string> = {
  1: "presidente",
  3: "governador",
  5: "senador",
  6: "deputado_federal",
  7: "deputado_estadual",
  8: "deputado_distrital",
};

/** `votacao_candidato.situacao` (o `st` do TSE) → `result_status`. Mesmos valores de
 * `normalizeStatus` em `ingest-tse-prior-results.ts`. `null` = sem situação, pula. */
function status(situacao: string | null): string | null {
  if (!situacao) return null;
  if (situacao.startsWith("Eleito")) return "eleito";
  if (situacao === "2º turno") return "2t_disputou";
  if (situacao === "Suplente") return "suplente";
  if (situacao === "Não eleito") return "nao_eleito";
  return null;
}

function erro(contexto: string, e: { message: string } | null) {
  if (e) throw new Error(`${contexto}: ${e.message}`);
}

type Linha = {
  candidate_id: string;
  cpf_clean: string | null;
  year: number;
  round: number;
  election_type: string;
  state: string;
  city: null;
  party: string | null;
  total_votes: number;
  result_status: string;
  source: string;
};

async function main() {
  console.log(`\n🏛️  Marcar resultado ${ANO} nos perfis`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}${REVALIDAR ? " + revalidar" : ""}`);

  // 1. Eleições oficiais (1º e 2º turno são eleições separadas no schema apuracao).
  let q = apu.from("eleicao").select("id, turno").eq("ambiente", "oficial").eq("ciclo", `ele${ANO}`);
  if (TURNO) q = q.eq("turno", Number(TURNO));
  const { data: eleicoes, error: e1 } = await q;
  erro("eleicao", e1);
  const turnoPorEleicao = new Map((eleicoes ?? []).map((e) => [e.id as number, e.turno as number]));
  if (turnoPorEleicao.size === 0) {
    console.log("Nenhuma eleição oficial coletada.");
    return;
  }

  const { data: cargos, error: e2 } = await apu
    .from("cargo")
    .select("id, codigo, eleicao_id")
    .in("eleicao_id", [...turnoPorEleicao.keys()])
    .in("codigo", Object.keys(CARGO).map(Number));
  erro("cargo", e2);
  const cargoPorId = new Map((cargos ?? []).map((c) => [c.id as number, c]));

  // Presidente: só a disputa nacional (as 28 por UF são recortes da mesma eleição).
  const { data: disputas, error: e3 } = await apu
    .from("disputa")
    .select("id, cargo_id, uf, tipo_abrangencia")
    .in("cargo_id", [...cargoPorId.keys()]);
  erro("disputa", e3);
  const candidatas = (disputas ?? []).filter((d) => {
    const codigo = cargoPorId.get(d.cargo_id)!.codigo;
    return codigo === 1 ? d.tipo_abrangencia === "br" : d.tipo_abrangencia === "uf";
  });

  const { data: situacoes, error: e4 } = await apu
    .from("v_disputa_situacao")
    .select("disputa_id, andamento")
    .in("disputa_id", candidatas.map((d) => d.id));
  erro("v_disputa_situacao", e4);
  const finalizadas = new Set(
    (situacoes ?? []).filter((s) => s.andamento === "f").map((s) => s.disputa_id as number),
  );
  const alvo = candidatas.filter((d) => finalizadas.has(d.id));
  console.log(`📦 ${alvo.length} de ${candidatas.length} disputas finalizadas pelo TSE`);

  // 2. Candidatos de cada disputa finalizada (paginado: SP estadual passa de 1000).
  type Cand = {
    sqcand: string;
    partido_sigla: string | null;
    votos_apurados: number;
    situacao: string | null;
  };
  const registros: { cand: Cand; disputa: (typeof alvo)[number] }[] = [];
  for (const d of alvo) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await apu
        .from("votacao_candidato")
        .select("sqcand, partido_sigla, votos_apurados, situacao")
        .eq("disputa_id", d.id)
        .order("id")
        .range(from, from + 999);
      erro(`votacao_candidato ${d.id}`, error);
      for (const c of (data ?? []) as Cand[]) registros.push({ cand: c, disputa: d });
      if (!data || data.length < 1000) break;
    }
  }

  // 3. Perfis por tse_id. Quando o mesmo tse_id está em mais de um perfil, fica o da
  // eleição de 2026: perfis antigos (ex.: presidente 2022 de Tebet, Soraya e Ciro)
  // herdaram o carimbo de 2026 do bug do mapa global do ingest de candidaturas — ver
  // scripts/fix-tse-candidate-stamps.ts. Se sobrar mais de um perfil 2026 (o finalista
  // de governador/presidente tem um perfil por turno, com o mesmo tse_id), fica o do
  // turno que está sendo marcado. Persistindo o empate, é ambíguo e é pulado.
  const sqcands = [...new Set(registros.map((r) => r.cand.sqcand).filter(Boolean))];
  type Perfil = {
    id: string;
    cpf: string | null;
    slug: string | null;
    ano: number | null;
    turno: number | null;
  };
  const perfisPorSq = new Map<string, Perfil[]>();
  for (let i = 0; i < sqcands.length; i += 200) {
    const { data, error } = await pub
      .from("candidates")
      .select("id, cpf, slug, tse_id, elections(year, round)")
      .in("tse_id", sqcands.slice(i, i + 200));
    erro("candidates", error);
    for (const c of data ?? []) {
      const sq = String(c.tse_id);
      const eleicao = c.elections as unknown as { year: number; round: number | null } | null;
      const lista = perfisPorSq.get(sq) ?? [];
      lista.push({ id: c.id, cpf: c.cpf, slug: c.slug, ano: eleicao?.year ?? null, turno: eleicao?.round ?? null });
      perfisPorSq.set(sq, lista);
    }
  }
  let desempatados = 0;
  const desempatadosSq = new Set<string>();
  /** Perfil do candidato para o turno que está sendo marcado; `undefined` = sem perfil,
   * `"ambiguo"` = mais de um perfil e nenhum critério decide. */
  function resolverPerfil(sq: string, turno: number): Perfil | "ambiguo" | undefined {
    const lista = perfisPorSq.get(sq);
    if (!lista || lista.length === 0) return undefined;
    if (lista.length === 1) return lista[0];
    const de2026 = lista.filter((p) => p.ano === ANO);
    if (de2026.length === 1) {
      desempatadosSq.add(sq);
      return de2026[0];
    }
    const doTurno = de2026.filter((p) => p.turno === turno);
    if (doTurno.length === 1) {
      desempatadosSq.add(sq);
      return doTurno[0];
    }
    return "ambiguo";
  }

  // 4. Linhas a gravar.
  const linhas: Linha[] = [];
  const slugsDestaque = new Set<string>();
  const cont = { semSituacao: 0, semPerfil: 0, ambiguo: 0 };
  const porStatus: Record<string, number> = {};
  for (const { cand, disputa } of registros) {
    const st = status(cand.situacao);
    if (!st) {
      cont.semSituacao++;
      continue;
    }
    const cargo = cargoPorId.get(disputa.cargo_id)!;
    const turno = turnoPorEleicao.get(cargo.eleicao_id)!;
    const perfil = resolverPerfil(cand.sqcand, turno);
    if (perfil === "ambiguo") {
      cont.ambiguo++;
      continue;
    }
    if (!perfil) {
      cont.semPerfil++;
      continue;
    }
    linhas.push({
      candidate_id: perfil.id,
      cpf_clean: perfil.cpf ? perfil.cpf.replace(/\D/g, "") : null,
      year: ANO,
      round: turno,
      election_type: CARGO[cargo.codigo],
      state: cargo.codigo === 1 ? "BR" : (disputa.uf ?? "").toUpperCase(),
      city: null,
      party: cand.partido_sigla,
      total_votes: cand.votos_apurados ?? 0,
      result_status: st,
      source: SOURCE,
    });
    porStatus[st] = (porStatus[st] ?? 0) + 1;
    if ((st === "eleito" || st === "2t_disputou") && perfil.slug) slugsDestaque.add(perfil.slug);
  }

  console.log(`👥 ${registros.length} candidatos nas disputas finalizadas`);
  console.log(`   → ${linhas.length} perfis a marcar: ${JSON.stringify(porStatus)}`);
  console.log(
    `   pulados: ${cont.semSituacao} sem situação no TSE · ${cont.semPerfil} sem perfil (tse_id) · ${cont.ambiguo} tse_id em mais de um perfil 2026`,
  );
  desempatados = desempatadosSq.size;
  if (desempatados) console.log(`   ${desempatados} tse_id repetido em mais de um perfil — usado o perfil 2026 do turno`);

  if (!APPLY) {
    console.log("\n(dry-run: nada gravado. Rode com --apply para gravar.)");
    return;
  }

  // 5. Apaga as linhas deste script dos perfis tocados e grava de novo (idempotente —
  // `city` null não entra no unique index, então upsert duplicaria).
  const rounds = [...new Set(linhas.map((l) => l.round))];
  const ids = [...new Set(linhas.map((l) => l.candidate_id))];
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await pub
      .from("prior_election_results")
      .delete()
      .in("candidate_id", ids.slice(i, i + 200))
      .eq("year", ANO)
      .in("round", rounds)
      .eq("source", SOURCE);
    erro("delete prior_election_results", error);
  }
  let gravadas = 0;
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await pub.from("prior_election_results").insert(linhas.slice(i, i + 500));
    erro("insert prior_election_results", error);
    gravadas += Math.min(500, linhas.length - i);
  }
  console.log(`💾 prior_election_results: ${gravadas} linhas gravadas (${ids.length} perfis)`);

  // 6. Revalida só as páginas de eleitos e 2º turno (~1.200). As demais atualizam no
  // ciclo normal do ISR. Token no header: com `+`/`=` na query dá 401.
  if (REVALIDAR) {
    const token = process.env.REVALIDATE_TOKEN;
    if (!token) {
      console.warn("⚠️  REVALIDATE_TOKEN ausente — pulando revalidação");
      return;
    }
    const slugs = [...slugsDestaque];
    let ok = 0;
    const falhas: string[] = [];
    for (let i = 0; i < slugs.length; i += 5) {
      await Promise.all(
        slugs.slice(i, i + 5).map(async (slug) => {
          const url = `${SITE}/api/revalidate?path=${encodeURIComponent(`/candidato/${slug}`)}`;
          const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
          if (r.ok) ok++;
          else falhas.push(`${slug} (${r.status})`);
        }),
      );
    }
    console.log(`🔄 revalidadas ${ok}/${slugs.length} páginas`);
    if (falhas.length) console.log(`   falhas: ${falhas.slice(0, 10).join(", ")}${falhas.length > 10 ? "…" : ""}`);
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
