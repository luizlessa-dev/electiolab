#!/usr/bin/env npx tsx
/**
 * Preenche `parlamentares.cpf` (projeto TF) para deputados federais sem CPF,
 * consultando o detalhe oficial na API de dados abertos da Câmara por
 * `id_camara` (GET /deputados/{id} → `cpf`). Nunca casa por nome.
 *
 * Contexto: docs/BASTIDORES-POS-ELEICAO.md §2.2. A migration
 * 20261003100000_tf_parlamentares_corrige_lote_20260910.sql cobre 55 dos 90 via
 * `cam_parlamentar_risco`; este script resolve o resto (e qualquer futuro caso).
 *
 * Regras de segurança (um CPF só é gravado se TODAS valerem):
 *   1. dígitos verificadores válidos;
 *   2. nenhuma outra linha de `parlamentares` usa esse CPF;
 *   3. se o CPF existir em `candidates` do ElectioLab, o nome civil da API da
 *      Câmara precisa compartilhar sobrenome com o nome do candidato; senão vai
 *      para "revisão manual" e não é gravado.
 *
 * Uso:
 *   npx tsx scripts/backfill-cpf-camara.ts            # dry-run (padrão)
 *   npx tsx scripts/backfill-cpf-camara.ts --apply    # grava no TF
 *
 * Env (.env.local):
 *   TF_SUPABASE_URL, TF_SUPABASE_SERVICE_ROLE_KEY   (TF: leitura e escrita)
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (ElectioLab: só leitura, cruzamento)
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

const TF_URL = process.env.TF_SUPABASE_URL;
const TF_KEY = process.env.TF_SUPABASE_SERVICE_ROLE_KEY;
const EL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const EL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TF_URL || !TF_KEY) {
  console.error("❌ Faltam TF_SUPABASE_URL ou TF_SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const tf = createClient(TF_URL, TF_KEY);
const el = EL_URL && EL_KEY ? createClient(EL_URL, EL_KEY) : null;

const API = "https://dadosabertos.camara.leg.br/api/v2/deputados";
const DELAY_MS = 250;

function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(cpf[i]) * (len + 1 - i);
    return ((s * 10) % 11) % 10;
  };
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10]);
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .split(/[^A-Z]+/)
      .filter((t) => t.length > 2 && !["DOS", "DAS", "DE", "DA", "DO"].includes(t)),
  );
}

function compartilhaSobrenome(a: string, b: string): boolean {
  const ta = tokens(a);
  for (const t of tokens(b)) if (ta.has(t)) return true;
  return false;
}

type Pendente = { id: string; id_camara: number; nome: string };
type Resultado = { p: Pendente; cpf: string | null; nomeCivil: string | null; motivo: string; ok: boolean };

async function consultaCamara(id: number): Promise<{ cpf: string | null; nomeCivil: string | null }> {
  const res = await fetch(`${API}/${id}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`API Câmara ${res.status} para id ${id}`);
  const { dados } = (await res.json()) as { dados?: { cpf?: string | null; nomeCivil?: string | null } };
  return { cpf: dados?.cpf?.replace(/\D/g, "") || null, nomeCivil: dados?.nomeCivil ?? null };
}

async function main() {
  const { data, error } = await tf
    .from("parlamentares")
    .select("id, id_camara, nome")
    .is("cpf", null)
    .not("id_camara", "is", null)
    .order("nome");
  if (error) throw error;
  const pendentes = (data ?? []) as Pendente[];
  console.log(`🔎 ${pendentes.length} parlamentares da Câmara sem CPF no TF (${APPLY ? "APPLY" : "dry-run"})\n`);

  const resultados: Resultado[] = [];
  for (const p of pendentes) {
    const r: Resultado = { p, cpf: null, nomeCivil: null, motivo: "", ok: false };
    try {
      const { cpf, nomeCivil } = await consultaCamara(p.id_camara);
      r.cpf = cpf;
      r.nomeCivil = nomeCivil;
      if (!cpf) r.motivo = "API sem CPF";
      else if (!cpfValido(cpf)) r.motivo = "dígito verificador inválido";
      else {
        const { data: outros, error: e1 } = await tf
          .from("parlamentares")
          .select("id")
          .eq("cpf", cpf)
          .neq("id", p.id)
          .limit(1);
        if (e1) throw e1;
        if (outros?.length) r.motivo = "CPF já usado por outra linha de parlamentares";
        else if (el) {
          const { data: cands, error: e2 } = await el
            .from("candidates")
            .select("name, full_name")
            .eq("cpf", cpf)
            .limit(3);
          if (e2) throw e2;
          const divergente =
            cands?.length &&
            nomeCivil &&
            !cands.some((c) => compartilhaSobrenome(nomeCivil, `${c.full_name ?? ""} ${c.name ?? ""}`));
          if (divergente) r.motivo = "CPF existe em candidates com nome sem sobrenome em comum: revisão manual";
          else r.ok = true;
        } else r.ok = true;
      }
    } catch (e) {
      r.motivo = `erro: ${(e as Error).message}`;
    }
    resultados.push(r);
    console.log(`${r.ok ? "✓" : "✗"} ${p.id_camara}  ${p.nome.padEnd(30)} ${r.ok ? "ok" : r.motivo}`);
    await new Promise((res) => setTimeout(res, DELAY_MS));
  }

  const ok = resultados.filter((r) => r.ok);
  const rev = resultados.filter((r) => !r.ok);
  console.log(`\n✓ ${ok.length} prontos | ✗ ${rev.length} para revisão manual`);

  if (!APPLY) {
    console.log("💡 Rode com --apply para gravar os prontos.");
    return;
  }

  let gravados = 0;
  for (const r of ok) {
    const { error: eu } = await tf
      .from("parlamentares")
      .update({ cpf: r.cpf, updated_at: new Date().toISOString() })
      .eq("id", r.p.id)
      .is("cpf", null);
    if (eu) console.error(`❌ ${r.p.id_camara}: ${eu.message}`);
    else gravados++;
  }
  console.log(`✅ ${gravados}/${ok.length} gravados`);
  if (gravados < ok.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
