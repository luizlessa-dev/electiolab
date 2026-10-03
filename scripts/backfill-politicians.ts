#!/usr/bin/env npx tsx
/**
 * Backfill de `politicians` / `politician_links` / `politician_link_conflicts`
 * (ElectioLab). Uma linha por PESSOA, chaveada por CPF.
 *
 * Fontes
 *   - ElectioLab `candidates` (+ `elections`): uma linha por candidatura.
 *   - TF `parlamentares`: parlamentares federais com CPF, id_camara e id_senado.
 *
 * Regras (docs/BASTIDORES-POS-ELEICAO.md §3.1)
 *   - Agrupa SÓ por CPF. Nunca por nome nem por slug.
 *   - Conflito não é resolvido sozinho: o CPF inteiro fica de fora e vira linha em
 *     `politician_link_conflicts` para revisão humana. Tipos: CPF inválido,
 *     nomes do mesmo CPF sem nenhum sobrenome em comum, tse_id ou chave externa
 *     já ligada a outra pessoa.
 *   - Linha sem CPF não vira pessoa (nada a chavear); é só relatada.
 *   - 1º e 2º turno continuam sendo `candidates` distintos, ligados à mesma pessoa.
 *
 * Slug (público, por pessoa; nunca contém CPF)
 *   - Base: nome de urna mais recente, em minúsculas e sem acento.
 *   - Colisão entre pessoas diferentes: quem tem prioridade (cargo, depois ano)
 *     fica com o slug nu; os demais recebem `-uf`; se persistir, `-uf-NNNN` com os
 *     4 últimos dígitos do tse_id; por último um sufixo numérico.
 *   - URL estável tem prioridade: pessoa nova mantém o slug que já tem em
 *     `candidates` (o da candidatura de maior prioridade) se ninguém mais o
 *     reivindicou; a escada acima só roda para quem não tem slug (parlamentar
 *     que não é candidato nos dados) ou colide. Slugs de candidatos sem CPF
 *     ficam reservados contra quem cai na escada, mas não tiram o slug de quem já
 *     o tem (a linha sem CPF e a com CPF já dividem essa URL hoje; ver sugestões
 *     de vínculo manual no relatório).
 *   - Pessoa que já existe em `politicians` mantém o slug que tem.
 *
 * Uso:
 *   npx tsx scripts/backfill-politicians.ts            # dry-run (padrão)
 *   npx tsx scripts/backfill-politicians.ts --apply    # grava no ElectioLab
 *
 * Idempotente: rodar de novo só acrescenta o que falta.
 *
 * Env (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY     (ElectioLab)
 *   TF_SUPABASE_URL, TF_SUPABASE_SERVICE_ROLE_KEY           (TF, só leitura)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CARGO_PRIORITY, ordenarPorPrioridade, slugify, type EleicaoRef } from "./lib/candidate-slug";

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

const EL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const EL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TF_URL = process.env.TF_SUPABASE_URL;
const TF_KEY = process.env.TF_SUPABASE_SERVICE_ROLE_KEY;

if (!EL_URL || !EL_KEY || !TF_URL || !TF_KEY) {
  console.error(
    "❌ Faltam NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TF_SUPABASE_URL ou TF_SUPABASE_SERVICE_ROLE_KEY em .env.local",
  );
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const el = createClient(EL_URL, EL_KEY);
const tf = createClient(TF_URL, TF_KEY);

// ─────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────
type Eleicao = EleicaoRef & { id: string };
type Cand = {
  id: string;
  name: string | null;
  full_name: string | null;
  cpf: string | null;
  tse_id: string | null;
  birth_date: string | null;
  election_id: string | null;
  slug: string | null;
};
type Parl = {
  id: string;
  cpf: string | null;
  nome: string | null;
  nome_parlamentar: string | null;
  uf: string | null;
  id_camara: number | null;
  id_senado: number | null;
  casa_legislativa: string | null;
};

type System = "candidates" | "tf_parlamentar" | "camara" | "senado" | "tse_sq";
type Confidence = "exact_cpf" | "exact_tse_id";
type Link = { system: System; external_id: string; confidence: Confidence };

type ConflictKind = "cpf_names_diverge" | "tse_id_multiple_cpfs" | "cpf_invalid" | "external_id_claimed";
type Conflict = {
  kind: ConflictKind;
  system: System;
  external_id: string;
  candidate_politician_ids: string[];
  details: Record<string, unknown>;
};

type Person = {
  cpf: string;
  displayName: string;
  birthDate: string | null;
  uf: string | null;
  election: EleicaoRef; // a de maior prioridade, para decidir quem fica com o slug nu
  tseId: string | null; // da candidatura de maior prioridade, para o sufixo do slug
  currentCandidateSlug: string | null; // slug atual em `candidates`, só para o relatório
  links: Link[];
  existingId: string | null;
  slug: string;
  slugStep: "existente" | "atual" | "nu" | "uf" | "uf+tse" | "numerico";
};

// ─────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────
function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(cpf[i]) * (len + 1 - i);
    return ((s * 10) % 11) % 10;
  };
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10]);
}

function normCpf(raw: string | null | undefined): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  return d ? d.padStart(11, "0").slice(-11) : null;
}

// Tokens que NÃO bastam para dizer que dois nomes são da mesma pessoa: sobrenomes
// muito comuns e sufixos. Dois nomes do mesmo CPF que só compartilham "SILVA" são
// suspeitos e vão para revisão.
const TOKENS_COMUNS = new Set([
  "SILVA", "SANTOS", "SOUSA", "SOUZA", "OLIVEIRA", "PEREIRA", "LIMA", "COSTA", "FERREIRA", "RODRIGUES",
  "ALMEIDA", "NASCIMENTO", "CARVALHO", "ARAUJO", "ALVES", "GOMES", "MARTINS", "BARBOSA", "RIBEIRO",
  "JUNIOR", "FILHO", "NETO", "NETTO", "SOBRINHO",
]);

function tokens(...parts: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const p of parts) {
    for (const t of (p ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .split(/[^A-Z]+/)) {
      if (t.length > 2 && !["DOS", "DAS", "DE", "DA", "DO"].includes(t) && !TOKENS_COMUNS.has(t)) out.add(t);
    }
  }
  return out;
}

function nomeExato(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

type FonteNome = { label: string; toks: Set<string>; exatos: Set<string> };

function fonteNome(label: string, ...nomes: Array<string | null | undefined>): FonteNome {
  return { label, toks: tokens(...nomes), exatos: new Set(nomes.map(nomeExato).filter(Boolean)) };
}

/**
 * Componentes conexos: duas fontes de nome se ligam se compartilham ao menos um
 * token (fora os sobrenomes comuns) OU se algum nome é idêntico (cobre "Zé Neto",
 * cujos tokens todos caem no filtro).
 */
function componentesDeNome(fontes: FonteNome[]): string[][] {
  const pai = fontes.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  for (let i = 0; i < fontes.length; i++)
    for (let j = i + 1; j < fontes.length; j++) {
      const ligam =
        [...fontes[i].toks].some((t) => fontes[j].toks.has(t)) ||
        [...fontes[i].exatos].some((n) => fontes[j].exatos.has(n));
      if (ligam) pai[raiz(i)] = raiz(j);
    }
  const grupos = new Map<number, string[]>();
  fontes.forEach((f, i) => {
    const r = raiz(i);
    grupos.set(r, [...(grupos.get(r) ?? []), f.label]);
  });
  return [...grupos.values()];
}

async function fetchAll<T>(
  pagina: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  const TAM = 1000;
  for (let from = 0; ; from += TAM) {
    const { data, error } = await pagina(from, from + TAM - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < TAM) break;
  }
  return out;
}

const ordemEleicao = (e: EleicaoRef | undefined) => (e?.year ?? 0) * 10 + (e?.round ?? 0);

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔎 backfill de politicians (${APPLY ? "APPLY" : "dry-run"})\n`);

  const [elections, cands, parls, existingPols, existingLinks, existingConflicts] = await Promise.all([
    fetchAll<Eleicao>((a, b) => el.from("elections").select("id, type, state, year, round").range(a, b)),
    fetchAll<Cand>((a, b) =>
      el
        .from("candidates")
        .select("id, name, full_name, cpf, tse_id, birth_date, election_id, slug")
        .order("id")
        .range(a, b),
    ),
    fetchAll<Parl>((a, b) =>
      tf
        .from("parlamentares")
        .select("id, cpf, nome, nome_parlamentar, uf, id_camara, id_senado, casa_legislativa")
        .order("id")
        .range(a, b),
    ),
    fetchAll<{ id: string; cpf: string; slug: string }>((a, b) =>
      el.from("politicians").select("id, cpf, slug").order("id").range(a, b),
    ),
    fetchAll<{ system: System; external_id: string; politician_id: string }>((a, b) =>
      el.from("politician_links").select("system, external_id, politician_id").order("id").range(a, b),
    ),
    fetchAll<{ kind: ConflictKind; system: System; external_id: string }>((a, b) =>
      el
        .from("politician_link_conflicts")
        .select("kind, system, external_id")
        .eq("status", "open")
        .order("id")
        .range(a, b),
    ),
  ]);

  console.log(
    `📥 ${cands.length} candidates, ${parls.length} parlamentares (TF), ${existingPols.length} politicians e ${existingLinks.length} vínculos já existentes\n`,
  );

  const eleicaoPorId = new Map(elections.map((e) => [e.id, e]));
  const polPorCpf = new Map(existingPols.map((p) => [p.cpf, p]));
  const dono = new Map(existingLinks.map((l) => [`${l.system}:${l.external_id}`, l.politician_id]));
  const conflitosAbertos = new Set(existingConflicts.map((c) => `${c.kind}|${c.system}|${c.external_id}`));

  // ── 1. Agrupa por CPF ────────────────────────────────────────
  const candsPorCpf = new Map<string, Cand[]>();
  const semCpf: Cand[] = [];
  for (const c of cands) {
    const cpf = normCpf(c.cpf);
    if (!cpf) semCpf.push(c);
    else candsPorCpf.set(cpf, [...(candsPorCpf.get(cpf) ?? []), c]);
  }
  const parlPorCpf = new Map<string, Parl>();
  const parlSemCpf: Parl[] = [];
  for (const p of parls) {
    const cpf = normCpf(p.cpf);
    if (!cpf) parlSemCpf.push(p);
    else parlPorCpf.set(cpf, p);
  }

  const todosCpfs = new Set([...candsPorCpf.keys(), ...parlPorCpf.keys()]);
  const conflitos: Conflict[] = [];
  const cpfsBloqueados = new Set<string>();
  const pessoas: Person[] = [];

  for (const cpf of [...todosCpfs].sort()) {
    const cs = candsPorCpf.get(cpf) ?? [];
    const parl = parlPorCpf.get(cpf);
    const idExistente = polPorCpf.get(cpf)?.id ?? null;

    if (!cpfValido(cpf)) {
      cpfsBloqueados.add(cpf);
      conflitos.push({
        kind: "cpf_invalid",
        system: cs.length ? "candidates" : "tf_parlamentar",
        external_id: cpf,
        candidate_politician_ids: idExistente ? [idExistente] : [],
        details: { motivo: "dígito verificador inválido", candidates: cs.map((c) => c.id), tf: parl?.id ?? null },
      });
      continue;
    }

    // nomes do mesmo CPF precisam formar um único bloco de sobrenomes
    const fontes: FonteNome[] = [
      ...cs.map((c) => fonteNome(`candidates:${c.id} "${c.name ?? ""}" / "${c.full_name ?? ""}"`, c.name, c.full_name)),
      ...(parl ? [fonteNome(`tf:${parl.id} "${parl.nome_parlamentar ?? ""}" / "${parl.nome ?? ""}"`, parl.nome_parlamentar, parl.nome)] : []),
    ];
    const blocos = componentesDeNome(fontes);
    if (blocos.length > 1) {
      cpfsBloqueados.add(cpf);
      conflitos.push({
        kind: "cpf_names_diverge",
        system: cs.length ? "candidates" : "tf_parlamentar",
        external_id: cpf,
        candidate_politician_ids: idExistente ? [idExistente] : [],
        details: { blocos_de_nome: blocos },
      });
      continue;
    }

    // melhor candidatura = maior prioridade (cargo, ano, turno)
    const ordenadas = ordenarPorPrioridade(
      cs.map((c) => ({ id: c.id, election: c.election_id ? (eleicaoPorId.get(c.election_id) ?? null) : null, c })),
    );
    const melhor = ordenadas[0];
    const maisRecente = [...cs].sort(
      (a, b) =>
        ordemEleicao(eleicaoPorId.get(b.election_id ?? "")) - ordemEleicao(eleicaoPorId.get(a.election_id ?? "")) ||
        a.id.localeCompare(b.id),
    )[0];

    const displayName =
      (maisRecente?.name ?? maisRecente?.full_name ?? parl?.nome_parlamentar ?? parl?.nome ?? "").trim();
    if (!displayName) {
      cpfsBloqueados.add(cpf);
      conflitos.push({
        kind: "cpf_names_diverge",
        system: cs.length ? "candidates" : "tf_parlamentar",
        external_id: cpf,
        candidate_politician_ids: idExistente ? [idExistente] : [],
        details: { motivo: "nenhum nome disponível" },
      });
      continue;
    }

    const eleicaoRank: EleicaoRef = melhor?.election
      ? { type: melhor.election.type, state: melhor.election.state, year: melhor.election.year, round: melhor.election.round }
      : {
          type: parl?.casa_legislativa === "senado" ? "senador" : "deputado_federal",
          state: parl?.uf ?? null,
          year: 2022,
          round: 1,
        };

    const links: Link[] = [];
    for (const c of cs) links.push({ system: "candidates", external_id: c.id, confidence: "exact_cpf" });
    for (const t of new Set(cs.map((c) => c.tse_id).filter((t): t is string => !!t)))
      links.push({ system: "tse_sq", external_id: t, confidence: "exact_tse_id" });
    if (parl) {
      links.push({ system: "tf_parlamentar", external_id: parl.id, confidence: "exact_cpf" });
      if (parl.id_camara != null) links.push({ system: "camara", external_id: String(parl.id_camara), confidence: "exact_cpf" });
      if (parl.id_senado != null) links.push({ system: "senado", external_id: String(parl.id_senado), confidence: "exact_cpf" });
    }

    pessoas.push({
      cpf,
      displayName,
      birthDate: cs.find((c) => c.birth_date)?.birth_date ?? null,
      uf: eleicaoRank.state ?? parl?.uf ?? null,
      election: eleicaoRank,
      tseId: melhor?.c.tse_id ?? null,
      currentCandidateSlug: melhor?.c.slug ?? null,
      links,
      existingId: idExistente,
      slug: polPorCpf.get(cpf)?.slug ?? "",
      slugStep: "existente",
    });
  }

  // ── 2. Chaves externas: cada (system, external_id) pertence a UMA pessoa ──
  const reivindicado = new Map<string, string>(); // chave → cpf
  for (const p of pessoas) {
    for (const l of p.links) {
      const chave = `${l.system}:${l.external_id}`;
      const outroNaRodada = reivindicado.get(chave);
      const donoNoBanco = dono.get(chave);
      const ehOutra =
        (outroNaRodada && outroNaRodada !== p.cpf) || (donoNoBanco && donoNoBanco !== p.existingId);
      if (ehOutra) {
        cpfsBloqueados.add(p.cpf);
        conflitos.push({
          kind: l.system === "tse_sq" ? "tse_id_multiple_cpfs" : "external_id_claimed",
          system: l.system,
          external_id: l.external_id,
          candidate_politician_ids: [p.existingId, donoNoBanco].filter((x): x is string => !!x),
          details: { cpf_desta_pessoa: p.cpf, outro_cpf_na_rodada: outroNaRodada ?? null },
        });
      } else reivindicado.set(chave, p.cpf);
    }
  }
  const pessoasOk = pessoas.filter((p) => !cpfsBloqueados.has(p.cpf));

  // ── 3. Slugs ────────────────────────────────────────────────
  const emUso = new Set(existingPols.map((p) => p.slug));
  const novas = pessoasOk.filter((p) => !p.existingId);
  const prioridade = (grupo: Person[]) =>
    ordenarPorPrioridade(grupo.map((p) => ({ id: p.cpf, election: p.election, p }))).map((x) => x.p);

  // fase 1: quem já tem slug em `candidates` o mantém, se ninguém mais o reivindicou
  const semSlug: Person[] = [];
  for (const p of prioridade(novas)) {
    const atual = p.currentCandidateSlug;
    if (atual && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(atual) && !emUso.has(atual)) {
      p.slug = atual;
      p.slugStep = "atual";
      emUso.add(atual);
    } else semSlug.push(p);
  }

  // slugs de candidatos sem CPF ficam reservados contra a escada (até serem resolvidos à mão)
  for (const c of semCpf) if (c.slug) emUso.add(c.slug);

  // fase 2: escada para o resto (nome → -uf → -uf-NNNN do tse_id → numérico)
  const porBase = new Map<string, Person[]>();
  for (const p of semSlug) {
    const base = slugify(p.displayName) || "politico";
    porBase.set(base, [...(porBase.get(base) ?? []), p]);
  }
  for (const [base, grupo] of [...porBase.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    for (const p of prioridade(grupo)) {
      const uf = (p.uf ?? "").toLowerCase().replace(/[^a-z]/g, "");
      const last4 = (p.tseId ?? "").replace(/\D/g, "").slice(-4);
      const escada: Array<[string, Person["slugStep"]]> = [[base, "nu"]];
      if (uf) escada.push([`${base}-${uf}`, "uf"]);
      if (uf && last4) escada.push([`${base}-${uf}-${last4}`, "uf+tse"]);
      let escolhido = escada.find(([s]) => !emUso.has(s));
      if (!escolhido) {
        let n = 2;
        while (emUso.has(`${base}-${n}`)) n++;
        escolhido = [`${base}-${n}`, "numerico"];
      }
      [p.slug, p.slugStep] = escolhido;
      emUso.add(p.slug);
    }
  }

  // ── 4. Relatório ────────────────────────────────────────────
  const porKind = new Map<string, number>();
  for (const c of conflitos) porKind.set(c.kind, (porKind.get(c.kind) ?? 0) + 1);
  const porPasso = new Map<string, number>();
  for (const p of novas) porPasso.set(p.slugStep, (porPasso.get(p.slugStep) ?? 0) + 1);
  const mudaSlug = novas.filter((p) => p.currentCandidateSlug && p.currentCandidateSlug !== p.slug);
  const soTf = pessoasOk.filter((p) => !candsPorCpf.has(p.cpf));
  const semCpfPorCargo = new Map<string, number>();
  for (const c of semCpf) {
    const e = eleicaoPorId.get(c.election_id ?? "");
    const k = `${e?.type ?? "?"} ${e?.year ?? "?"}`;
    semCpfPorCargo.set(k, (semCpfPorCargo.get(k) ?? 0) + 1);
  }
  const slugParaPessoa = new Map(pessoasOk.map((p) => [p.slug, p]));
  const sugestoesManuais = semCpf
    .filter((c) => c.slug && slugParaPessoa.has(c.slug))
    .map((c) => {
      const e = eleicaoPorId.get(c.election_id ?? "");
      const p = slugParaPessoa.get(c.slug as string) as Person;
      return { candidate_id: c.id, nome: c.name, cargo: e?.type ?? null, uf: e?.state ?? null, ano: e?.year ?? null, turno: e?.round ?? null, mesma_url_de: p.slug, pessoa: p.displayName, pessoa_uf: p.uf };
    });
  const totalLinks = pessoasOk.reduce((n, p) => n + p.links.length, 0);

  console.log("── Pessoas ──");
  console.log(`  CPFs distintos (candidates + TF): ${todosCpfs.size}`);
  console.log(`  prontas para gravar: ${pessoasOk.length} (${novas.length} novas, ${pessoasOk.length - novas.length} já existem)`);
  console.log(`  só no TF (parlamentar que não é candidato nos dados): ${soTf.length}`);
  console.log(`  vínculos desejados: ${totalLinks}`);
  console.log("── Conflitos (CPF inteiro fica de fora; revisão humana) ──");
  console.log(`  total: ${conflitos.length} ${[...porKind].map(([k, n]) => `${k}=${n}`).join(" ")}`);
  for (const c of conflitos.slice(0, 12)) console.log(`   • ${c.kind} ${c.system} ${c.external_id.slice(0, 3)}…: ${JSON.stringify(c.details).slice(0, 170)}`);
  if (conflitos.length > 12) console.log(`   … e mais ${conflitos.length - 12} no arquivo de relatório`);
  console.log("── Linhas de candidates sem CPF (não viram pessoa) ──");
  console.log(`  total: ${semCpf.length} | ${[...semCpfPorCargo].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(" | ")}`);
  console.log(`  parlamentares do TF sem CPF: ${parlSemCpf.length}`);
  console.log(`  dessas, com o MESMO slug de uma pessoa já identificada (sugestão de vínculo manual): ${sugestoesManuais.length}`);
  for (const x of sugestoesManuais.slice(0, 6))
    console.log(`   • "${x.nome}" ${x.cargo} ${x.uf ?? ""} ${x.ano}/${x.turno}  ↔  ${x.pessoa} (${x.pessoa_uf ?? "?"})`);
  console.log("── Slugs das pessoas novas ──");
  console.log(`  ${[...porPasso].map(([k, n]) => `${k}=${n}`).join(" ")}`);
  console.log(`  diferem do slug atual de candidates: ${mudaSlug.length} de ${novas.length} (precisam de 301; só pessoas que colidiram)`);
  for (const p of mudaSlug.slice(0, 8)) console.log(`   • ${p.currentCandidateSlug} → ${p.slug}`);

  const relatorio = path.join(os.tmpdir(), "backfill-politicians-report.json");
  fs.writeFileSync(
    relatorio,
    JSON.stringify(
      {
        gerado_em: new Date().toISOString(),
        conflitos,
        sugestoes_vinculo_manual: sugestoesManuais,
        candidates_sem_cpf: semCpf.map((c) => ({ id: c.id, name: c.name, election: eleicaoPorId.get(c.election_id ?? "") ?? null })),
        slugs_que_mudam: mudaSlug.map((p) => ({ de: p.currentCandidateSlug, para: p.slug, nome: p.displayName })),
      },
      null,
      2,
    ),
  );
  console.log(`\n📝 relatório completo (contém CPFs, não commitar): ${relatorio}`);

  if (!APPLY) {
    console.log("💡 Rode com --apply para gravar.");
    return;
  }

  // ── 5. Gravação ─────────────────────────────────────────────
  const { data: run, error: runErr } = await el
    .from("ingest_runs")
    .insert({ source: "backfill-politicians", status: "running" })
    .select("id")
    .single();
  if (runErr) throw new Error(`ingest_runs: ${runErr.message}`);

  let politiciansGravados = 0;
  let linksGravados = 0;
  let conflitosGravados = 0;
  try {
    const idPorCpf = new Map<string, string>(existingPols.map((p) => [p.cpf, p.id]));

    for (let i = 0; i < novas.length; i += 500) {
      const lote = novas.slice(i, i + 500).map((p) => ({
        cpf: p.cpf,
        display_name: p.displayName,
        slug: p.slug,
        birth_date: p.birthDate,
      }));
      const { data, error } = await el
        .from("politicians")
        .upsert(lote, { onConflict: "cpf", ignoreDuplicates: true })
        .select("id, cpf");
      if (error) throw new Error(`politicians: ${error.message}`);
      for (const r of data ?? []) idPorCpf.set(r.cpf, r.id);
      politiciansGravados += data?.length ?? 0;
    }

    const linhasLink = pessoasOk.flatMap((p) => {
      const id = idPorCpf.get(p.cpf);
      if (!id) return [];
      return p.links
        .filter((l) => !dono.has(`${l.system}:${l.external_id}`))
        .map((l) => ({ politician_id: id, system: l.system, external_id: l.external_id, confidence: l.confidence }));
    });
    for (let i = 0; i < linhasLink.length; i += 500) {
      const { data, error } = await el
        .from("politician_links")
        .upsert(linhasLink.slice(i, i + 500), { onConflict: "system,external_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(`politician_links: ${error.message}`);
      linksGravados += data?.length ?? 0;
    }

    const novosConflitos = conflitos.filter((c) => !conflitosAbertos.has(`${c.kind}|${c.system}|${c.external_id}`));
    for (let i = 0; i < novosConflitos.length; i += 500) {
      const { data, error } = await el
        .from("politician_link_conflicts")
        .insert(novosConflitos.slice(i, i + 500))
        .select("id");
      if (error) throw new Error(`politician_link_conflicts: ${error.message}`);
      conflitosGravados += data?.length ?? 0;
    }

    await el
      .from("ingest_runs")
      .update({
        status: conflitos.length ? "partial" : "ok",
        finished_at: new Date().toISOString(),
        rows_read: cands.length + parls.length,
        rows_written: politiciansGravados + linksGravados + conflitosGravados,
        metadata: { politicians: politiciansGravados, links: linksGravados, conflitos: conflitosGravados, sem_cpf: semCpf.length },
      })
      .eq("id", run.id);
    console.log(`\n✅ politicians +${politiciansGravados} | vínculos +${linksGravados} | conflitos +${conflitosGravados}`);
  } catch (e) {
    await el
      .from("ingest_runs")
      .update({ status: "error", finished_at: new Date().toISOString(), error: (e as Error).message })
      .eq("id", run.id);
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
