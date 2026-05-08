#!/usr/bin/env npx tsx
/**
 * Extrai menções judiciais relevantes das bios já gravadas (de Wikipedia).
 * Não inventa nada — só identifica termos públicos mencionados.
 *
 * Para cada candidato, escaneia bio em busca de:
 *   - Operações nomeadas (Lava Jato, Carne Fraca, etc)
 *   - Verbos judiciais com contexto (condenado, absolvido, denunciado, indiciado)
 *   - Inelegibilidade / Ficha Limpa
 *   - Tribunais (STF, STJ, TRF, TRE)
 *
 * Insere registros stub em judicial_proceedings com source_url=Wikipedia
 * e is_relevant=true.
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

// Keywords organizadas por categoria
const PATTERNS: Array<{ category: string; regex: RegExp }> = [
  { category: "Operação Lava Jato", regex: /\b(Lava ?Jato|Operação Lava ?Jato)\b/i },
  { category: "Operação Mãos Limpas", regex: /\bMãos Limpas\b/i },
  { category: "Mensalão", regex: /\bMensalão\b/i },
  { category: "Petrolão", regex: /\bPetrolão\b/i },
  { category: "Operação Acrônimo", regex: /\bOperação Acrônimo\b/i },
  { category: "Operação Calicute", regex: /\bOperação Calicute\b/i },
  { category: "Operação Carne Fraca", regex: /\bCarne Fraca\b/i },
  { category: "Operação Spoofing", regex: /\bOperação Spoofing\b/i },
  { category: "Operação Saqueador", regex: /\bOperação Saqueador\b/i },
  { category: "Operação Faroeste", regex: /\bOperação Faroeste\b/i },
  { category: "Operação Greenfield", regex: /\bOperação Greenfield\b/i },
  { category: "Operação Mãos à Obra", regex: /\bOperação Mãos à Obra\b/i },
  // Operação genérica (qualquer "Operação X")
  { category: "Operação policial", regex: /\bOperação\s+[A-ZÁÉÍÓÚÇ][a-záéíóúç]+(?:\s+[A-ZÁÉÍÓÚÇ][a-záéíóúç]+)?\b/ },
  { category: "Condenação", regex: /\bcondenad[oa]\s+(?:a|por|pelo|pela|em)\b/i },
  { category: "Denunciado", regex: /\bdenunciad[oa]\s+(?:pelo|pela|por)\b/i },
  { category: "Absolvição", regex: /\babsolvid[oa]\b/i },
  { category: "Indiciamento", regex: /\bindiciad[oa]\b/i },
  { category: "Cassação", regex: /\bcassad[oa]\b/i },
  { category: "Impeachment", regex: /\bimpeachment\b/i },
  { category: "Ficha Limpa", regex: /\bFicha Limpa\b/i },
  { category: "Inelegibilidade", regex: /\bineleg[íi]vel\b/i },
  { category: "Improbidade administrativa", regex: /\bimprobidade administrativa\b/i },
  { category: "Investigado pela PF", regex: /\binvestigad[oa]\s+pela?\s+PF\b/i },
  { category: "Investigado pela CPI", regex: /\bCPI\b.*investig|investigad[oa].*CPI\b/i },
  { category: "Réu no STF", regex: /\bréu\b.*\bSTF\b|\bSTF\b.*\bréu\b/i },
  { category: "Foro privilegiado", regex: /\bforo privilegiado\b/i },
  { category: "Habeas corpus", regex: /\bhabeas corpus\b/i },
  { category: "Prisão preventiva", regex: /\bprisão preventiva\b/i },
  { category: "Lei Maria da Penha", regex: /\bMaria da Penha\b/i },
];

function extractMentions(bio: string): { category: string; snippet: string }[] {
  const found: { category: string; snippet: string }[] = [];
  const seen = new Set<string>();
  for (const p of PATTERNS) {
    const m = bio.match(p.regex);
    if (!m) continue;
    if (seen.has(p.category)) continue;
    // Snippet: 80 chars antes e 80 depois do match
    const idx = m.index ?? 0;
    const start = Math.max(0, idx - 80);
    const end = Math.min(bio.length, idx + (m[0]?.length ?? 0) + 80);
    let snippet = bio.slice(start, end).trim();
    if (start > 0) snippet = "…" + snippet;
    if (end < bio.length) snippet += "…";
    found.push({ category: p.category, snippet });
    seen.add(p.category);
  }
  return found;
}

async function main() {
  console.log(`▶️  Extraindo menções judiciais — modo: ${APPLY ? "APPLY" : "DRY RUN"}`);

  const { data, error } = await supabase
    .from("candidates")
    .select("id, name, bio")
    .eq("is_active", true)
    .not("bio", "is", null);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  let totalMentions = 0;
  const inserts: Array<{
    candidate_id: string;
    process_class: string;
    process_subject: string;
    source_url: string;
    is_relevant: boolean;
    court: string;
    name: string; // só pra debug
  }> = [];

  for (const c of data ?? []) {
    const mentions = extractMentions(c.bio as string);
    if (mentions.length === 0) continue;
    totalMentions += mentions.length;
    for (const m of mentions) {
      inserts.push({
        candidate_id: c.id as string,
        process_class: m.category,
        process_subject: m.snippet,
        source_url: "https://pt.wikipedia.org",
        is_relevant: true,
        court: "Wikipedia (menção pública)",
        name: c.name as string,
      });
    }
  }

  console.log(`📈 ${totalMentions} menções em ${inserts.length} entradas (${data?.length ?? 0} bios escaneadas)`);
  console.log(`\n🔬 Amostra (primeiras 10):`);
  for (const ins of inserts.slice(0, 10)) {
    console.log(`   ${ins.name}: [${ins.process_class}]`);
    console.log(`      "${ins.process_subject.slice(0, 120)}..."`);
  }

  if (!APPLY) {
    console.log(`\n💡 Rode com --apply pra gravar (${inserts.length} entradas).`);
    return;
  }

  console.log(`\n💾 Limpando entradas Wikipedia anteriores e gravando ${inserts.length}…`);
  // Limpa entradas anteriores extraídas pelo script (idempotência)
  await supabase
    .from("judicial_proceedings")
    .delete()
    .eq("court", "Wikipedia (menção pública)");

  // Grava em batches de 100
  let inserted = 0;
  for (let i = 0; i < inserts.length; i += 100) {
    const batch = inserts.slice(i, i + 100).map(({ name, ...rest }) => rest);
    const { error: ie } = await supabase.from("judicial_proceedings").insert(batch);
    if (ie) console.error(`  batch ${i}:`, ie.message);
    else inserted += batch.length;
  }
  console.log(`✅ ${inserted} entradas inseridas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
