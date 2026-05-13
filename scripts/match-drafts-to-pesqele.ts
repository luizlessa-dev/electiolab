#!/usr/bin/env npx tsx
/**
 * Fase B — fuzzy match poll_drafts ↔ pesqele_registry.
 *
 * Para cada draft sem tse_protocolo, tenta achar registro TSE com:
 *  - mesma UF (extraída da eleição) ou BR para presidente
 *  - mesmo cargo (cargos LIKE)
 *  - fieldwork_end dentro de ±2 dias
 *  - nome instituto normalizado bate (substring em qualquer direção)
 *
 * Uso:
 *   npx tsx scripts/match-drafts-to-pesqele.ts            # dry-run
 *   npx tsx scripts/match-drafts-to-pesqele.ts --apply    # grava tse_protocolo
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs"; import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("="); if (idx > 0) {
    const k = line.slice(0, idx).trim(); const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
const APPLY = process.argv.includes("--apply");

// Tokens lixo a remover ao comparar nomes de instituto
const STOP = [
  "INSTITUTO", "DE", "PESQUISAS", "PESQUISA", "OPINIAO", "OPINIÃO",
  "LTDA", "S.A", "SA", "ME", "EPP", "EIRELI", "PARTICIPACOES", "PARTICIPAÇÕES",
  "TECNOLOGIA", "DADOS", "ANALISE", "ANÁLISE", "CONSUMIDOR", "MIDIA", "MÍDIA",
  "CONSULTORIA", "PROJETOS", "MERCADOLOGIA", "INTELIGENCIA", "INTELIGÊNCIA",
  "PESQUISA E ESTRATEGIA", "AND", "&", "E", "DA", "DO", "DOS", "DAS",
  "PESQUISAS,",
];

function normalize(s: string): string {
  return s.toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[.,\/-]+/g, " ")
    .replace(/\s+/g, " ").trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length > 2 && !STOP.includes(t)));
}

function instituteMatch(wikiName: string, tseName: string): number {
  const a = tokens(wikiName);
  const b = tokens(tseName);
  if (!a.size || !b.size) return 0;
  // Conta tokens compartilhados
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  // Bônus se algum token do wiki está como substring no nome TSE limpo (cobre "QUAEST" → "QUAEST PESQUISAS ...")
  const tseClean = normalize(tseName);
  let subBonus = 0;
  for (const t of a) if (t.length >= 4 && tseClean.includes(t)) subBonus = Math.max(subBonus, 1);
  return (shared / Math.max(a.size, b.size)) + subBonus * 0.3;
}

function daysDiff(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
}

(async () => {
  console.log(`\n🔍 Match poll_drafts → pesqele_registry`);
  console.log(`   Modo: ${APPLY ? "✍️ APPLY" : "🔍 DRY-RUN"}`);

  const { data: drafts } = await sb
    .from("poll_drafts")
    .select("id, institute_name, fieldwork_end, election:elections(type, state)")
    .is("tse_protocolo", null);
  if (!drafts?.length) { console.log("   nenhum draft pendente de match"); return; }
  console.log(`   ${drafts.length} drafts sem TSE match`);

  const { data: registry } = await sb
    .from("pesqele_registry")
    .select("protocolo, nome_empresa, uf, cargos, dt_fim")
    .eq("ano", 2026)
    .not("dt_fim", "is", null);
  if (!registry?.length) { console.log("   pesqele_registry vazio"); return; }

  let matched = 0, ambiguous = 0, none = 0;
  const updates: Array<{ id: string; tse_protocolo: string }> = [];

  for (const d of drafts) {
    const el = Array.isArray(d.election) ? d.election[0] : d.election;
    if (!el) continue;
    const expectedUf = el.type === "presidente" ? "BR" : el.state;
    const cargo = el.type;
    const candidates = registry.filter((r) => {
      if (r.uf !== expectedUf) return false;
      if (!r.cargos.toLowerCase().includes(cargo)) return false;
      if (daysDiff(r.dt_fim, d.fieldwork_end) > 2) return false;
      return true;
    });

    if (!candidates.length) { none++; continue; }
    const scored = candidates
      .map((r) => ({ r, score: instituteMatch(d.institute_name, r.nome_empresa) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best.score < 0.3) { none++; continue; }
    const ambiguousFlag = scored.length > 1 && scored[1].score >= best.score * 0.9;
    if (ambiguousFlag) ambiguous++;
    matched++;
    updates.push({ id: d.id, tse_protocolo: best.r.protocolo });

    if (!APPLY || ambiguousFlag) {
      console.log(`   ${ambiguousFlag ? "⚠" : "✓"} "${d.institute_name}" ${d.fieldwork_end} → ${best.r.protocolo} ${best.r.nome_empresa.slice(0, 40)} (score=${best.score.toFixed(2)})`);
    }
  }

  console.log(`\n   📊 ${matched} matched (${ambiguous} ambíguos) · ${none} sem candidato`);

  if (APPLY) {
    let saved = 0;
    for (const u of updates) {
      const { error } = await sb.from("poll_drafts").update({ tse_protocolo: u.tse_protocolo }).eq("id", u.id);
      if (!error) saved++;
    }
    console.log(`   💾 ${saved}/${updates.length} gravados`);
  }
})();
