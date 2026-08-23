#!/usr/bin/env npx tsx
/**
 * Classifica trechos de plano_governo por tema (etapa 3 de "Planos de
 * governo"). Unidade é o parágrafo completo (nunca corta frase no meio) —
 * usa as quebras \n\n que scripts/extract-planos-paginas.ts já preserva.
 *
 * Pipeline por parágrafo, pra não gastar LLM à toa:
 *   1. Pré-filtro por palavra-chave: extrai os termos da cláusula "Entra:" de
 *      cada tema.descricao_escopo. Parágrafo sem nenhum match de palavra-
 *      chave é descartado sem chamar LLM.
 *   2. Pros temas candidatos (só os que bateram keyword, não os 17), UMA
 *      chamada de LLM (Claude Haiku, tool use pra saída estruturada)
 *      pergunta quais desses o parágrafo trata explicitamente — usa o
 *      descricao_escopo inteiro (entra + não entra) como critério.
 *   3. Cada tema retornado vira uma linha em `plano_trecho`, status='pendente'
 *      sempre (regra de produto: nada pendente aparece no site — a RLS de
 *      `plano_trecho` já filtra isso no banco, não só no app).
 *
 * Dry-run (sem --apply) só CONTA quantas chamadas de LLM seriam feitas — não
 * gasta API. Isso existe justamente pra dar uma estimativa de custo antes de
 * rodar de verdade, discutido em 2026-08-22 (repo não tinha nenhuma chamada
 * de LLM nem ANTHROPIC_API_KEY até essa etapa).
 *
 * Idempotente por plano: pula quem já tem alguma linha em plano_trecho, a
 * menos que --force (apaga e reclassifica esse plano do zero). Não é
 * resumível por página — se o processo cair no meio de um plano grande, o
 * jeito é rodar de novo com --force só pra esse plano (--tse_id=...).
 *
 * Uso:
 *   npx tsx scripts/classify-planos-trechos.ts                              # dry-run: só conta
 *   npx tsx scripts/classify-planos-trechos.ts --tse_id=280002542548        # dry-run, só um candidato
 *   npx tsx scripts/classify-planos-trechos.ts --tse_id=280002542548 --apply  # classifica de verdade, um candidato
 *   npx tsx scripts/classify-planos-trechos.ts --apply --budget=3.50        # classifica todo mundo, para sozinho ao atingir US$3,50 de gasto real
 *   npx tsx scripts/classify-planos-trechos.ts --apply --force              # reclassifica quem já tem trecho
 *
 * --budget=<usd> mede gasto real via response.usage de cada chamada (preço
 * Haiku 4.5 hardcoded: $1/MTok entrada, $5/MTok saída — atualizar se mudar).
 * Sem --budget, roda sem limite. Se estourar no meio de um plano, esse plano
 * fica de fora inteiro (nada parcial gravado) — plano completo antes do
 * estouro já está salvo e não é reprocessado numa próxima rodada.
 *
 * Dependências: @anthropic-ai/sdk (já instalada). Precisa de ANTHROPIC_API_KEY
 * no .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

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
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error("❌ Falta ANTHROPIC_API_KEY em .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const TSE_ID_FILTER = process.argv.find((a) => a.startsWith("--tse_id="))?.split("=")[1];
const BUDGET_USD = parseFloat(process.argv.find((a) => a.startsWith("--budget="))?.split("=")[1] ?? "");
// --sort=pages ordena do plano menor pro maior antes de processar. Junto com
// --budget, maximiza quantos candidatos ficam com o plano INTEIRO classificado
// dentro do orçamento (plano interrompido no meio não grava nada — ver
// planoInterrompido abaixo), em vez de gastar tudo pela metade num só grande.
const SORT_PAGES = process.argv.includes("--sort=pages");
// --cargo=presidente|governador filtra por candidates.election_id -> elections.type.
// Sem --cargo, processa todos os cargos (comportamento anterior).
const CARGO_FILTER = process.argv.find((a) => a.startsWith("--cargo="))?.split("=")[1];

// Preço Claude Haiku 4.5, confirmado em 2026-08-22: $1,00/MTok entrada, $5,00/MTok saída.
const PRECO_INPUT_POR_TOKEN = 1.0 / 1_000_000;
const PRECO_OUTPUT_POR_TOKEN = 5.0 / 1_000_000;
let gastoAcumuladoUsd = 0;
let orcamentoEstourado = false;

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type KeywordMatcher = { regex: RegExp; caseSensitive: boolean; label: string };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Extrai os termos da cláusula "Entra: ...." de descricao_escopo — ignora
// "Não entra" de propósito (são exemplos negativos, dariam falso-positivo).
//
// Achado em produção (2026-08-22): match por substring cru (`includes`) fazia
// a keyword de 2 letras "ia" (de "IA", tema tecnologia) bater em qualquer
// palavra terminada em "-ia" — "economia", "democracia", "estratégia" — e
// isso inflou falso-positivo (368 trechos em tecnologia, quase 25% do total,
// vários claramente errados, ex. financiamento de saúde classificado como
// tecnologia). Fronteira de palavra (\b) resolve isso.
//
// Segundo achado, no mesmo dia: fronteira de palavra sozinha não resolve
// sigla que colide com palavra comum — "SUAS" (Sistema Único de Assistência
// Social) é também o pronome possessivo "suas" ("suas famílias"), então
// qualquer keyword que no texto original está TODA em maiúscula (sigla —
// IA, SUS, BPC, STF, INSS, SUAS, CRAS, BRICS) passa a exigir match sensível
// a maiúscula/minúscula contra o parágrafo original (não o normalizado):
// documento oficial escreve sigla em caixa alta, texto corrido normal não.
function extractKeywords(descricaoEscopo: string): KeywordMatcher[] {
  const m = descricaoEscopo.match(/Entra:\s*(.+?)\.\s*N[ãa]o entra:/i);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const isSigla = /^[A-ZÀ-Ý]+$/.test(raw);
      const label = isSigla ? raw : normalize(raw);
      return { regex: new RegExp(`\\b${escapeRegExp(label)}\\b`), caseSensitive: isSigla, label };
    });
}

// Une quebra de linha dentro do parágrafo (artefato do wrap do PDF) num
// texto corrido; \n\n continua separando parágrafo de parágrafo. Descarta
// fragmento curto (número de página solto, cabeçalho) — não é "parágrafo".
function splitParagraphs(texto: string): string[] {
  return texto
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter((p) => p.length > 30);
}

type Tema = {
  id: string;
  slug: string;
  nome: string;
  descricao_escopo: string;
  matchers: KeywordMatcher[];
};

async function classificarParagrafo(paragrafo: string, candidatos: Tema[]): Promise<string[]> {
  const listaTemas = candidatos.map((t) => `- ${t.slug}: ${t.descricao_escopo}`).join("\n");
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      tool_choice: { type: "tool", name: "classificar" },
      tools: [
        {
          name: "classificar",
          description:
            "Retorna quais temas o parágrafo trata explicitamente, segundo o critério de escopo de cada um.",
          input_schema: {
            type: "object",
            properties: {
              temas: {
                type: "array",
                items: { type: "string", enum: candidatos.map((t) => t.slug) },
                description: "Slugs dos temas que o parágrafo trata explicitamente. Array vazio se nenhum se aplica.",
              },
            },
            required: ["temas"],
          },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Parágrafo de um plano de governo:\n"""\n${paragrafo}\n"""\n\nTemas candidatos, com o critério exato do que entra e do que não entra em cada um:\n${listaTemas}\n\nRegras: o parágrafo pode pertencer a mais de um tema só se tratar explicitamente de ambos — não force encaixe. Se o parágrafo menciona o tema só de passagem (ex.: um item numa lista de intenções), ainda conta como pertencente ao tema.`,
        },
      ],
    });
    gastoAcumuladoUsd +=
      resp.usage.input_tokens * PRECO_INPUT_POR_TOKEN + resp.usage.output_tokens * PRECO_OUTPUT_POR_TOKEN;

    const toolUse = resp.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return [];
    const input = toolUse.input as { temas?: string[] };
    return input.temas ?? [];
  } catch (e) {
    console.warn(`      ⚠️  erro na classificação: ${e instanceof Error ? e.message : e}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`▶️  Classificação de trechos — modo: ${APPLY ? "APPLY (classifica e grava)" : "DRY RUN (só conta chamadas de LLM)"}`);

  const { data: temasRaw, error: temaErr } = await supabase
    .from("tema")
    .select("id, slug, nome, descricao_escopo")
    .order("ordem");
  if (temaErr) throw temaErr;
  const temas: Tema[] = (temasRaw ?? []).map((t) => ({
    ...t,
    matchers: extractKeywords(t.descricao_escopo),
  }));
  console.log(`📚 ${temas.length} temas carregados.`);

  const { data: planos, error: planoErr } = await supabase
    .from("plano_governo")
    .select("id, candidato_id, num_paginas");
  if (planoErr) throw planoErr;
  if (!planos || planos.length === 0) {
    console.log("Nenhum plano em `plano_governo`.");
    return;
  }

  const { data: candidatos } = await supabase
    .from("candidates")
    .select("id, name, tse_id, election_id")
    .in("id", planos.map((p) => p.candidato_id));
  const candidatoById = new Map((candidatos ?? []).map((c) => [c.id as string, c]));

  let alvo = planos;
  if (TSE_ID_FILTER) {
    const ids = new Set((candidatos ?? []).filter((c) => c.tse_id === TSE_ID_FILTER).map((c) => c.id as string));
    alvo = alvo.filter((p) => ids.has(p.candidato_id));
    if (alvo.length === 0) {
      console.error(`❌ Nenhum plano encontrado pra tse_id=${TSE_ID_FILTER}`);
      process.exit(1);
    }
  }

  if (CARGO_FILTER) {
    const electionIds = [...new Set((candidatos ?? []).map((c) => c.election_id as string).filter(Boolean))];
    const { data: elections } = await supabase
      .from("elections")
      .select("id, type")
      .in("id", electionIds)
      .eq("type", CARGO_FILTER);
    const electionIdsOk = new Set((elections ?? []).map((e) => e.id as string));
    const candidatoIdsOk = new Set(
      (candidatos ?? []).filter((c) => electionIdsOk.has(c.election_id as string)).map((c) => c.id as string)
    );
    const antes = alvo.length;
    alvo = alvo.filter((p) => candidatoIdsOk.has(p.candidato_id as string));
    console.log(`🎯 --cargo=${CARGO_FILTER}: ${antes} → ${alvo.length} plano(s).`);
    if (alvo.length === 0) {
      console.error(`❌ Nenhum plano encontrado pra --cargo=${CARGO_FILTER}`);
      process.exit(1);
    }
  }

  if (!FORCE) {
    const { data: jaClassificados } = await supabase.from("plano_trecho").select("plano_id");
    const feitoSet = new Set((jaClassificados ?? []).map((r) => r.plano_id as string));
    const antes = alvo.length;
    alvo = alvo.filter((p) => !feitoSet.has(p.id));
    if (antes !== alvo.length) {
      console.log(`⏭️  ${antes - alvo.length} plano(s) já têm trecho classificado, pulando (use --force pra refazer).`);
    }
  }

  if (SORT_PAGES) {
    alvo = [...alvo].sort((a, b) => ((a.num_paginas as number) ?? 0) - ((b.num_paginas as number) ?? 0));
    console.log(`↕️  Ordenado por num_paginas crescente (--sort=pages).`);
  }

  console.log(`\n📋 ${alvo.length} plano(s) a processar.\n`);

  let totalParagrafos = 0;
  let totalPulados = 0;
  let totalChamadasLlm = 0;
  let totalTrechos = 0;

  for (const plano of alvo) {
    if (orcamentoEstourado) break;

    const cand = candidatoById.get(plano.candidato_id as string);
    const label = cand ? `${cand.name} (tse_id=${cand.tse_id})` : (plano.candidato_id as string);

    if (FORCE) {
      const { error: delErr } = await supabase.from("plano_trecho").delete().eq("plano_id", plano.id);
      if (delErr) {
        console.error(`   ❌ ${label}: erro ao limpar trechos antigos: ${delErr.message}`);
        continue;
      }
    }

    const { data: paginas, error: pagErr } = await supabase
      .from("plano_pagina")
      .select("numero, texto")
      .eq("plano_id", plano.id)
      .order("numero");
    if (pagErr) {
      console.error(`   ❌ ${label}: ${pagErr.message}`);
      continue;
    }
    if (!paginas || paginas.length === 0) {
      console.warn(`   ⚠️  ${label}: sem páginas extraídas — rode extract-planos-paginas.ts primeiro.`);
      continue;
    }

    let paragrafosPlano = 0;
    let puladosPlano = 0;
    let llmPlano = 0;
    let planoInterrompido = false;
    const rows: { plano_id: string; tema_id: string; pagina: number; texto: string; status: string }[] = [];

    for (const pagina of paginas) {
      if (orcamentoEstourado) break;
      const paragrafos = splitParagraphs(pagina.texto as string);
      for (const paragrafo of paragrafos) {
        if (orcamentoEstourado) break;
        paragrafosPlano++;
        const normParagrafo = normalize(paragrafo);
        const candidatosTema = temas.filter((t) =>
          t.matchers.some((m) => m.regex.test(m.caseSensitive ? paragrafo : normParagrafo))
        );
        if (candidatosTema.length === 0) {
          puladosPlano++;
          continue;
        }

        llmPlano++;
        if (!APPLY) continue;

        if (Number.isFinite(BUDGET_USD) && gastoAcumuladoUsd >= BUDGET_USD) {
          console.warn(
            `\n💰 Orçamento de $${BUDGET_USD.toFixed(2)} atingido (gasto real: $${gastoAcumuladoUsd.toFixed(4)}) — parando antes de classificar mais. "${label}" ficou pela metade, nada dele foi gravado (rode de novo depois, sem --force, pra completar só ele).`
          );
          orcamentoEstourado = true;
          planoInterrompido = true;
          break;
        }

        const slugsAplicaveis = await classificarParagrafo(paragrafo, candidatosTema);
        for (const slug of slugsAplicaveis) {
          const tema = candidatosTema.find((t) => t.slug === slug);
          if (!tema) continue;
          rows.push({
            plano_id: plano.id,
            tema_id: tema.id,
            pagina: pagina.numero as number,
            texto: paragrafo,
            status: "pendente",
          });
        }
      }
    }

    totalParagrafos += paragrafosPlano;
    totalPulados += puladosPlano;
    totalChamadasLlm += llmPlano;

    if (planoInterrompido) {
      console.log(`   ⏸️  ${label}: interrompido pelo orçamento, nada gravado (parágrafos parciais descartados).`);
      continue;
    }

    totalTrechos += rows.length;

    if (APPLY && rows.length > 0) {
      const { error: insErr } = await supabase.from("plano_trecho").insert(rows);
      if (insErr) {
        console.error(`   ❌ ${label}: erro ao gravar trechos: ${insErr.message}`);
        continue;
      }
    }

    console.log(
      `   ${label}: ${paragrafosPlano} parágrafos, ${puladosPlano} sem keyword, ${llmPlano} chamada(s) LLM${APPLY ? `, ${rows.length} trecho(s) gravado(s) (pendente), gasto acumulado: $${gastoAcumuladoUsd.toFixed(4)}` : ""}`
    );
  }

  console.log(
    `\n📊 Total: ${totalParagrafos} parágrafos em ${alvo.length} plano(s) — ${totalPulados} descartados sem keyword, ${totalChamadasLlm} chamada(s) de LLM${APPLY ? `, ${totalTrechos} trecho(s) gravado(s), gasto real: $${gastoAcumuladoUsd.toFixed(4)}` : " (estimativa — dry-run não chama a API)"}.`
  );
  if (orcamentoEstourado) {
    console.log(`💰 Parou por orçamento (--budget=${BUDGET_USD}). Rode de novo (mais tarde, com mais orçamento) pra continuar — planos já gravados são pulados automaticamente.`);
  }
  if (!APPLY) {
    console.log(`💡 Rode com --apply pra classificar de verdade (isso gasta API — confira o número de chamadas acima antes, e use --budget=X pra travar o gasto máximo em USD).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
