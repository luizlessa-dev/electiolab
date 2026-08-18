#!/usr/bin/env npx tsx
/**
 * ingest-imprensa.ts
 *
 * Preenche a lacuna entre "o TSE registrou que a pesquisa existe" e "temos os
 * percentuais". O TSE nunca publica os números — eles saem em release do
 * instituto ou na imprensa, que tipicamente cita o protocolo do registro.
 *
 * Fluxo, por pendência da fila (`pesqele_missing`, tiers de pending-polls.ts):
 *
 *   1. Busca a matéria via web search server-side do Claude.
 *   2. Extrai os percentuais em formato estruturado.
 *   3. VALIDA contra o registro oficial do TSE antes de aceitar (§ trava tripla).
 *   4. Grava em `poll_drafts` com source_kind='imprensa' + source_url,
 *      status='pending' — para revisão humana.
 *
 * A trava tripla é o que diferencia isto do Agente 2 (aposentado por raspar
 * sites de instituto que não servem HTML com dado). Aqui nada é aceito por
 * confiança na extração: protocolo, tamanho de amostra e datas de campo têm
 * que bater com o que o TSE já publicou. Extração errada ou alucinada não vira
 * draft — vira pendência de revisão manual.
 *
 * NUNCA usa Wikipedia como fonte (ver docs/ELECTIOLAB-AUDIT-2026-08.md §5.1).
 *
 * Requer ANTHROPIC_API_KEY no ambiente ou em .env.local.
 *
 * Uso:
 *   npx tsx scripts/ingest-imprensa.ts                    # dry-run, Tier 1, 5 pesquisas
 *   npx tsx scripts/ingest-imprensa.ts --limit 20 --apply
 *   npx tsx scripts/ingest-imprensa.ts --tier 2 --days 30 --apply
 *   npx tsx scripts/ingest-imprensa.ts --model claude-haiku-4-5   # mais barato
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import {
  validarExtracao,
  DOMINIOS_BLOQUEADOS,
  type Extracao,
  type RegistroTSE,
} from "../src/lib/imprensa-validacao";
import * as fs from "fs";
import * as path from "path";

// ── Env ──────────────────────────────────────────────────────────────────────
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

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "❌ ANTHROPIC_API_KEY não configurada (nem no ambiente, nem em .env.local).\n" +
      "   Este script precisa dela para buscar e extrair os resultados."
  );
  process.exit(1);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic();

// ── Args ─────────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes("--apply");
const argOf = (flag: string, fallback: number) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : fallback;
};
const LIMIT = argOf("--limit", 5);
const TIER = argOf("--tier", 1);
const DAYS = argOf("--days", 45);
const MODEL = (() => {
  const i = process.argv.indexOf("--model");
  return i >= 0 ? process.argv[i + 1] : "claude-opus-5";
})();

// ── Tipos ────────────────────────────────────────────────────────────────────
type Pendencia = {
  protocolo: string;
  uf: string;
  cargos: string;
  instituto: string;
  fieldwork_end: string;
  sample_size: number | null;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    encontrado: {
      type: "boolean",
      description: "true só se achou os percentuais numa fonte primária confiável",
    },
    protocolo_citado: {
      type: ["string", "null"],
      description: "Protocolo TSE exatamente como citado na matéria, ex: BR-06773/2026",
    },
    source_url: { type: ["string", "null"], description: "URL da matéria usada" },
    instituto: { type: ["string", "null"] },
    amostra: { type: ["integer", "null"], description: "Número de entrevistados" },
    campo_inicio: { type: ["string", "null"], description: "AAAA-MM-DD" },
    campo_fim: { type: ["string", "null"], description: "AAAA-MM-DD" },
    margem_erro: { type: ["number", "null"], description: "Em pontos percentuais" },
    cenario: {
      type: ["string", "null"],
      description: "Rótulo do cenário quando houver mais de um, ex: 'Lula vs Flávio Bolsonaro'",
    },
    cargo: { type: ["string", "null"], description: "presidente | governador | senador" },
    resultados: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          nome: { type: "string" },
          pct: { type: "number" },
        },
        required: ["nome", "pct"],
      },
    },
  },
  required: [
    "encontrado",
    "protocolo_citado",
    "source_url",
    "instituto",
    "amostra",
    "campo_inicio",
    "campo_fim",
    "margem_erro",
    "cenario",
    "cargo",
    "resultados",
  ],
} as const;

// ── Extração ─────────────────────────────────────────────────────────────────

function cargoDe(cargos: string): string {
  if (/presidente/i.test(cargos)) return "presidente";
  if (/governador/i.test(cargos)) return "governador";
  if (/senador/i.test(cargos)) return "senador";
  return "outros";
}

async function extrair(reg: RegistroTSE): Promise<Extracao | null> {
  const cargo = cargoDe(reg.cargos);
  const escopo = cargo === "presidente" ? "presidente da República" : `${cargo} de ${reg.uf}`;

  const prompt = [
    `Busque na web os resultados desta pesquisa eleitoral brasileira registrada no TSE e extraia os percentuais.`,
    ``,
    `Registro oficial do TSE (fonte da verdade — não invente nem "corrija" estes dados):`,
    `- Protocolo: ${reg.protocolo}`,
    `- Instituto: ${reg.nome_empresa}`,
    `- Cargo: ${escopo}`,
    `- Campo: ${reg.dt_inicio ?? "?"} a ${reg.dt_fim ?? "?"}`,
    `- Entrevistados: ${reg.qt_entrevistados ?? "?"}`,
    ``,
    `Regras:`,
    `- Use apenas fonte primária: release do instituto ou matéria de veículo de imprensa.`,
    `- NUNCA use Wikipedia ou espelhos dela como fonte.`,
    `- A matéria precisa citar o protocolo do TSE. Se não citar, ou se citar um`,
    `  protocolo diferente de ${reg.protocolo}, responda encontrado=false.`,
    `- Extraia o cenário de 1º turno estimulado mais completo (mais candidatos).`,
    `- Copie os percentuais exatamente como publicados; não arredonde nem recalcule.`,
    `- Na dúvida, responda encontrado=false. É melhor não achar do que achar errado.`,
  ].join("\n");

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  // Server tools podem devolver pause_turn quando o loop interno atinge o
  // limite de iterações — reenviar a conversa faz o servidor retomar.
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 6,
          blocked_domains: DOMINIOS_BLOQUEADOS,
        } as unknown as Anthropic.ToolUnion,
      ],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages,
    });

    if (resp.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: resp.content });
      continue;
    }
    if (resp.stop_reason === "refusal") return null;

    const texto = resp.content.find((b) => b.type === "text");
    if (!texto || texto.type !== "text") return null;
    try {
      return JSON.parse(texto.text) as Extracao;
    } catch {
      return null;
    }
  }
  return null;
}

// ── Fila ─────────────────────────────────────────────────────────────────────

const REPUTAVEIS = [
  "datafolha", "quaest", "atlas", "poderdata", "poder data", "ipespe", "ipec",
  "parana pesquisas", "real time", "mda", "nexus", "futura", "vox brasil",
  "gerp", "meio", "ideia", "fsb", "seculus", "neokemp", "vetor", "indice",
  "datatempo", "genial",
];
const ESTADOS_CHAVE = ["SP", "MG", "RJ", "RS", "BA", "PR", "PE", "CE", "GO", "PA", "SC", "DF"];

const reputavel = (i: string) => REPUTAVEIS.some((t) => i.toLowerCase().includes(t));

async function fila(): Promise<Pendencia[]> {
  const linhas: Pendencia[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("pesqele_missing")
      .select("protocolo, uf, cargos, instituto, fieldwork_end, sample_size, days_since_fieldwork")
      .order("fieldwork_end", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`pesqele_missing: ${error.message}`);
    const page = (data ?? []) as Array<Pendencia & { days_since_fieldwork: number | null }>;
    linhas.push(
      ...page.filter((r) => {
        const d = r.days_since_fieldwork;
        return d !== null && d >= 0 && d <= DAYS;
      })
    );
    if (page.length < PAGE) break;
  }

  return linhas.filter((r) => {
    const n = r.sample_size ?? 0;
    if (!reputavel(r.instituto)) return false;
    if (TIER === 1) return /presidente/i.test(r.cargos) && n >= 1500;
    if (TIER === 2)
      return /governador/i.test(r.cargos) && ESTADOS_CHAVE.includes(r.uf) && n >= 1000;
    return /governador/i.test(r.cargos) && n >= 800;
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `\n📰 Ingestão via imprensa — Tier ${TIER}, janela ${DAYS}d, modelo ${MODEL}, modo ${APPLY ? "APPLY" : "DRY-RUN"}\n`
  );

  const pendencias = (await fila()).slice(0, LIMIT);
  console.log(`  ${pendencias.length} pendências selecionadas\n`);

  let aceitas = 0;
  let rejeitadas = 0;

  for (const p of pendencias) {
    const { data: reg } = await sb
      .from("pesqele_registry")
      .select("protocolo, uf, cargos, nome_empresa, dt_inicio, dt_fim, qt_entrevistados")
      .eq("protocolo", p.protocolo)
      .single();
    if (!reg) continue;

    const rotulo = `${reg.protocolo} · ${reg.nome_empresa.slice(0, 28)} · ${cargoDe(reg.cargos)}`;
    process.stdout.write(`  ${rotulo} … `);

    let extracao: Extracao | null = null;
    try {
      extracao = await extrair(reg as RegistroTSE);
    } catch (e) {
      console.log(`❌ erro na extração: ${(e as Error).message}`);
      rejeitadas++;
      continue;
    }
    if (!extracao) {
      console.log("❌ sem extração utilizável");
      rejeitadas++;
      continue;
    }

    const v = validarExtracao(extracao, reg as RegistroTSE);
    if (!v.ok) {
      console.log(`❌ ${v.motivo}`);
      rejeitadas++;
      continue;
    }

    // Resolve a eleição correspondente (UF + cargo).
    const cargo = cargoDe(reg.cargos);
    const q = sb
      .from("elections")
      .select("id")
      .eq("year", 2026)
      .eq("round", 1)
      .eq("type", cargo);
    const { data: eleicao } = await (cargo === "presidente"
      ? q.is("state", null)
      : q.eq("state", reg.uf)
    ).maybeSingle();

    if (!eleicao) {
      console.log(`❌ eleição não encontrada (${cargo}/${reg.uf})`);
      rejeitadas++;
      continue;
    }

    const draft = {
      election_id: eleicao.id,
      institute_name: extracao.instituto ?? reg.nome_empresa,
      fieldwork_start: extracao.campo_inicio,
      fieldwork_end: extracao.campo_fim,
      publication_date: extracao.campo_fim,
      sample_size: extracao.amostra,
      margin_of_error: extracao.margem_erro,
      scope: cargo === "presidente" ? "nacional" : reg.uf,
      round: 1,
      tse_protocolo: reg.protocolo,
      results: extracao.resultados.map((r) => ({ name: r.nome, pct: r.pct })),
      source_url: extracao.source_url,
      source_kind: "imprensa",
      scenario_label: extracao.cenario,
      status: "pending" as const,
      raw_row: { extracao, validado_contra: reg },
    };

    if (!APPLY) {
      console.log(
        `✅ validado (${extracao.resultados.length} candidatos) — dry-run, não gravado`
      );
      aceitas++;
      continue;
    }

    const { error } = await sb.from("poll_drafts").insert(draft);
    if (error) {
      console.log(`❌ falha ao gravar: ${error.message}`);
      rejeitadas++;
      continue;
    }
    console.log(`✅ draft criado (${extracao.resultados.length} candidatos)`);
    aceitas++;
  }

  console.log(
    `\n  ${aceitas} aceitas · ${rejeitadas} rejeitadas pela trava` +
      (APPLY
        ? `\n  Revise em poll_drafts (status='pending') antes de promover.\n`
        : `\n  Dry-run — nada gravado. Rode com --apply.\n`)
  );
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
