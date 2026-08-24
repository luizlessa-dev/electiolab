#!/usr/bin/env npx tsx
/**
 * Gera síntese por (candidato, tema) a partir dos trechos já classificados
 * (etapa 3) — decisão de 2026-08-24: revisar trecho a trecho não era
 * prático (economia sozinho tinha 333 trechos pendentes pra 12 candidatos,
 * parágrafos longos e repetitivos). Isso quebra a regra original de "só
 * trecho literal, sem texto de ligação" — decisão consciente do usuário,
 * registrada no chat, não um desvio silencioso.
 *
 * Uma chamada de LLM por (plano, tema) que tem pelo menos 1 trecho — não por
 * parágrafo, como a classificação. Naturalmente muito mais barato: no máximo
 * 12 candidatos × 17 temas = 204 chamadas, contra as milhares da etapa 3.
 *
 * O prompt manda o LLM usar SÓ os trechos já classificados daquele tema como
 * fonte (nunca o plano inteiro) — grounding explícito, sem opinião, sem
 * comparação com outro candidato. plano_trecho não é apagado nem deixa de
 * existir: continua como matéria-prima auditável, mostrado na revisão e
 * (via página+link) na página pública, por trás da síntese.
 *
 * plano_sintese nasce sempre status='pendente' — mesma regra de produto de
 * plano_trecho: nada pendente aparece no site (RLS filtra no banco).
 *
 * Uso:
 *   npx tsx scripts/sintetizar-planos-trechos.ts                       # dry-run: só conta
 *   npx tsx scripts/sintetizar-planos-trechos.ts --apply --budget=1.00 # gera de verdade, gasto real travado em US$1
 *   npx tsx scripts/sintetizar-planos-trechos.ts --apply --force       # regenera quem já tem síntese
 *   npx tsx scripts/sintetizar-planos-trechos.ts --apply --cargo=presidente
 *   npx tsx scripts/sintetizar-planos-trechos.ts --apply --only-temas=saude,tecnologia
 *
 * --budget=<usd> mede gasto real via response.usage (preço Haiku 4.5
 * hardcoded: $1/MTok entrada, $5/MTok saída). Sem --budget, roda sem limite.
 *
 * Dependências: @anthropic-ai/sdk (já instalada). Precisa de ANTHROPIC_API_KEY
 * no .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { paginasUnicas, montarFonte, type TrechoFonte } from "../src/lib/planos-governo/sintese";

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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
const BUDGET_USD = parseFloat(process.argv.find((a) => a.startsWith("--budget="))?.split("=")[1] ?? "");
const CARGO_FILTER = process.argv.find((a) => a.startsWith("--cargo="))?.split("=")[1];
const ONLY_TEMAS = process.argv
  .find((a) => a.startsWith("--only-temas="))
  ?.split("=")[1]
  ?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PRECO_INPUT_POR_TOKEN = 1.0 / 1_000_000;
const PRECO_OUTPUT_POR_TOKEN = 5.0 / 1_000_000;
let gastoAcumuladoUsd = 0;
let orcamentoEstourado = false;

type Sintese = { texto: string; textoEstendido: string };

// Sempre gera os dois tamanhos na mesma chamada — texto curto pra leitura
// padrão na página, texto_estendido pro "ver mais" (candidato com muito
// material, ex. Renan/segurança pública com 17 páginas de referência, não
// cabia em 2-4 frases sem perder ponto relevante; decisão de 2026-08-24).
async function sintetizar(temaNome: string, descricaoEscopo: string, trechos: TrechoFonte[]): Promise<Sintese | null> {
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tool_choice: { type: "tool", name: "sintetizar" },
      tools: [
        {
          name: "sintetizar",
          description: "Registra a síntese da posição do candidato sobre o tema, baseada só nos trechos fornecidos.",
          input_schema: {
            type: "object",
            properties: {
              texto: {
                type: "string",
                description:
                  "Síntese CURTA: sempre 2 a 4 frases, mesmo que os trechos-fonte sejam muitos ou longos — escolha só os pontos mais centrais e descarte o resto (o texto_estendido cobre o restante). Terceira pessoa, tom neutro e factual. Só o que está literalmente nos trechos — nada inventado, nada de fora deles. Sem adjetivo de avaliação (bom/ruim/vago/ousado), sem comparação com outro candidato.",
              },
              texto_estendido: {
                type: "string",
                description:
                  "Versão mais completa da mesma síntese, cobrindo todos os pontos principais que os trechos-fonte trazem (não só os da versão curta) — ainda um resumo neutro em terceira pessoa, nunca cópia literal do trecho, nunca invenção fora dele. Sem limite de frases, mas sem redundância ou enchimento.",
              },
            },
            required: ["texto", "texto_estendido"],
          },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Tema: ${temaNome}\nCritério do tema: ${descricaoEscopo}\n\nTrechos do plano de governo já classificados nesse tema (fonte ÚNICA e exclusiva — não use conhecimento externo sobre o candidato ou o partido):\n"""\n${montarFonte(trechos)}\n"""\n\nEscreva duas versões de uma síntese neutra do que esses trechos dizem sobre o tema: uma curta (texto) e uma completa (texto_estendido). Não avalie, não compare, não complete lacunas com suposição.`,
        },
      ],
    });
    gastoAcumuladoUsd +=
      resp.usage.input_tokens * PRECO_INPUT_POR_TOKEN + resp.usage.output_tokens * PRECO_OUTPUT_POR_TOKEN;

    if (resp.stop_reason === "max_tokens") {
      console.warn(`      ⚠️  resposta cortada por max_tokens (${trechos.length} trecho(s) fonte) — aumentar max_tokens.`);
    }
    const toolUse = resp.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;
    const input = toolUse.input as { texto?: string; texto_estendido?: string };
    if (!input.texto?.trim() || !input.texto_estendido?.trim()) return null;
    return { texto: input.texto.trim(), textoEstendido: input.texto_estendido.trim() };
  } catch (e) {
    console.warn(`      ⚠️  erro na síntese: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function main() {
  console.log(`▶️  Síntese de trechos por tema — modo: ${APPLY ? "APPLY (sintetiza e grava)" : "DRY RUN (só conta chamadas de LLM)"}`);

  let temas =
    (
      await supabase.from("tema").select("id, slug, nome, descricao_escopo").order("ordem")
    ).data ?? [];
  if (ONLY_TEMAS) {
    const antes = temas.length;
    temas = temas.filter((t) => ONLY_TEMAS.includes(t.slug));
    console.log(`🎯 --only-temas: ${antes} → ${temas.length} tema(s) (${temas.map((t) => t.slug).join(", ")}).`);
  }
  const temaById = new Map(temas.map((t) => [t.id as string, t]));
  console.log(`📚 ${temas.length} tema(s) carregado(s).`);

  const { data: planos, error: planoErr } = await supabase.from("plano_governo").select("id, candidato_id");
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
  }

  // Todos os trechos dos planos alvo, paginado (mesmo cuidado dos outros
  // scripts desta feature — .select() sem .range() corta em 1000 linhas, e
  // aqui passa: 2439 trechos no total). .order("id") é obrigatório junto do
  // .range() — sem ordem explícita o Postgres não garante linha estável
  // entre páginas, causando corte/duplicata silenciosa (achado em
  // 2026-08-24: sem isso, a segunda rodada de síntese via só 137 dos 173
  // pares candidato+tema que realmente têm trecho).
  const PAGE_SIZE = 1000;
  const todosTrechos: { plano_id: string; tema_id: string; pagina: number; texto: string }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page, error: pageErr } = await supabase
      .from("plano_trecho")
      .select("id, plano_id, tema_id, pagina, texto")
      .neq("status", "rejeitado")
      .in("plano_id", alvo.map((p) => p.id))
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (pageErr) throw pageErr;
    todosTrechos.push(...((page ?? []) as typeof todosTrechos));
    if (!page || page.length < PAGE_SIZE) break;
  }

  // Agrupa por (plano_id, tema_id).
  const trechosPorPar = new Map<string, TrechoFonte[]>();
  for (const t of todosTrechos) {
    if (!temaById.has(t.tema_id)) continue; // fora do --only-temas
    const key = `${t.plano_id}::${t.tema_id}`;
    const arr = trechosPorPar.get(key) ?? [];
    arr.push({ pagina: t.pagina, texto: t.texto });
    trechosPorPar.set(key, arr);
  }

  const existentes = new Set<string>();
  if (!FORCE) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page, error: pageErr } = await supabase
        .from("plano_sintese")
        .select("id, plano_id, tema_id")
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (pageErr) throw pageErr;
      for (const r of page ?? []) existentes.add(`${r.plano_id}::${r.tema_id}`);
      if (!page || page.length < PAGE_SIZE) break;
    }
  }

  const pares = [...trechosPorPar.entries()].filter(([key]) => FORCE || !existentes.has(key));
  const pulados = trechosPorPar.size - pares.length;
  if (pulados > 0) {
    console.log(`⏭️  ${pulados} par(es) candidato+tema já têm síntese, pulando (use --force pra refazer).`);
  }
  console.log(`\n📋 ${pares.length} síntese(s) a gerar (de ${trechosPorPar.size} par(es) candidato+tema com trecho).\n`);

  let totalChamadas = 0;
  let totalGravadas = 0;

  for (const [key, trechos] of pares) {
    if (orcamentoEstourado) break;
    const [planoId, temaId] = key.split("::");
    const plano = alvo.find((p) => p.id === planoId)!;
    const tema = temaById.get(temaId)!;
    const cand = candidatoById.get(plano.candidato_id as string);
    const label = cand ? `${cand.name} / ${tema.nome}` : `${planoId} / ${tema.nome}`;

    totalChamadas++;
    if (!APPLY) continue;

    if (Number.isFinite(BUDGET_USD) && gastoAcumuladoUsd >= BUDGET_USD) {
      console.warn(
        `\n💰 Orçamento de $${BUDGET_USD.toFixed(2)} atingido (gasto real: $${gastoAcumuladoUsd.toFixed(4)}) — parando antes de gerar mais.`
      );
      orcamentoEstourado = true;
      break;
    }

    const resultado = await sintetizar(tema.nome, tema.descricao_escopo, trechos);
    if (!resultado) {
      console.warn(`   ⚠️  ${label}: síntese vazia, pulando.`);
      continue;
    }

    const { error: upErr } = await supabase.from("plano_sintese").upsert(
      {
        plano_id: planoId,
        tema_id: temaId,
        texto: resultado.texto,
        texto_estendido: resultado.textoEstendido,
        paginas_referencia: paginasUnicas(trechos),
        status: "pendente",
      },
      { onConflict: "plano_id,tema_id" }
    );
    if (upErr) {
      console.error(`   ❌ ${label}: erro ao gravar: ${upErr.message}`);
      continue;
    }
    totalGravadas++;
    console.log(`   ${label}: ${trechos.length} trecho(s) fonte, gasto acumulado: $${gastoAcumuladoUsd.toFixed(4)}`);
  }

  console.log(
    `\n📊 Total: ${totalChamadas} chamada(s) de LLM${APPLY ? `, ${totalGravadas} síntese(s) gravada(s), gasto real: $${gastoAcumuladoUsd.toFixed(4)}` : " (estimativa — dry-run não chama a API)"}.`
  );
  if (orcamentoEstourado) {
    console.log(`💰 Parou por orçamento (--budget=${BUDGET_USD}). Rode de novo pra continuar — pares já gravados são pulados automaticamente.`);
  }
  if (!APPLY) {
    console.log(`💡 Rode com --apply pra sintetizar de verdade (gasta API — use --budget=X pra travar o gasto máximo em USD).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
