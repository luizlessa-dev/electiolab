#!/usr/bin/env npx tsx
/**
 * Ingest Wikipedia bios — popula candidates.bio com o resumo da pt.wikipedia.org.
 *
 * Estratégia:
 *   1. Carrega candidatos com full_name preenchido mas bio NULL.
 *   2. Para cada um, tenta o endpoint:
 *        https://pt.wikipedia.org/api/rest_v1/page/summary/{title}
 *      com várias variações:
 *        a) full_name como veio
 *        b) full_name title-cased
 *        c) name (apelido) title-cased
 *        d) "{name} (político)" — desambiguação comum no Wikipedia BR
 *   3. Aceita o primeiro hit que tenha description política plausível
 *      (filtra páginas de homônimos, esportistas, atores, etc).
 *   4. Grava extract em bio. Não sobrescreve se já existe.
 *
 * Uso:
 *   npx tsx scripts/ingest-wikipedia-bios.ts            # dry-run
 *   npx tsx scripts/ingest-wikipedia-bios.ts --apply    # grava
 *   npx tsx scripts/ingest-wikipedia-bios.ts --apply --limit=20
 *
 * Observações:
 *   - Wikipedia exige User-Agent identificando o cliente
 *   - Rate-limit: 200ms entre chamadas (até 5 req/s, dentro do permitido)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────
// Env loader
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const APPLY = process.argv.includes("--apply");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;

const USER_AGENT = "ElectioLab/1.0 (https://electiolab.com; contato@electiolab.com)";
const SLEEP_MS = 200;

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) =>
      w.length <= 2 && ["da", "de", "do", "das", "dos", "e"].includes(w)
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");
}

// Sinais de que a página é de político brasileiro
const POLITICAL_KEYWORDS = [
  "político",
  "polític",
  "deputado",
  "senador",
  "governador",
  "prefeito",
  "presidente",
  "ministro",
  "vereador",
  "candidato",
  "partido",
  "vice-presidente",
  "vice-governador",
];

const NEGATIVE_KEYWORDS = [
  "desambiguação",
  "futebolista",
  "ator brasileiro",
  "atriz brasileira",
  "cantor brasileiro",
  "cantora brasileira",
  "jogador",
];

function isPolitical(extract: string, description?: string): boolean {
  const s = `${description ?? ""} ${extract}`.toLowerCase();
  if (NEGATIVE_KEYWORDS.some((k) => s.includes(k))) return false;
  return POLITICAL_KEYWORDS.some((k) => s.includes(k));
}

type WikiSummary = {
  title: string;
  description?: string;
  extract: string;
  type: string;
  content_urls?: { desktop?: { page?: string } };
};

async function fetchSummary(title: string): Promise<WikiSummary | null> {
  const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as WikiSummary;
    if (!json?.extract || json.type === "disambiguation") return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * Busca via API de pesquisa do Wikipedia. Resolve acentos divergentes,
 * sufixos comuns ("(político)") e variações de grafia automaticamente.
 * Retorna até 3 títulos candidatos.
 */
async function searchTitles(query: string): Promise<string[]> {
  const url = `https://pt.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
    query
  )}&limit=5&namespace=0&format=json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as [string, string[], string[], string[]];
    return Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];
  } catch {
    return [];
  }
}

async function findBio(
  fullName: string,
  shortName: string,
  state: string | null
): Promise<{ extract: string; pageUrl: string; title: string } | null> {
  // 1. Tenta variantes diretas
  const variants = new Set<string>();
  variants.add(fullName);
  variants.add(titleCase(fullName));
  if (shortName) {
    variants.add(shortName);
    variants.add(titleCase(shortName));
    variants.add(`${titleCase(shortName)} (político)`);
    variants.add(`${titleCase(shortName)} (política)`);
  }

  for (const v of variants) {
    const sum = await fetchSummary(v);
    await sleep(SLEEP_MS);
    if (!sum) continue;
    if (!isPolitical(sum.extract, sum.description)) continue;
    return {
      extract: sum.extract,
      pageUrl:
        sum.content_urls?.desktop?.page ??
        `https://pt.wikipedia.org/wiki/${encodeURIComponent(sum.title)}`,
      title: sum.title,
    };
  }

  // 2. Fallback: search API (resolve acentos + grafias variantes)
  const queries = [
    `${fullName} político`,
    `${fullName}`,
    shortName ? `${shortName} político` : null,
  ].filter((q): q is string => Boolean(q));

  for (const q of queries) {
    const titles = await searchTitles(q);
    await sleep(SLEEP_MS);
    for (const t of titles.slice(0, 3)) {
      const sum = await fetchSummary(t);
      await sleep(SLEEP_MS);
      if (!sum) continue;
      if (!isPolitical(sum.extract, sum.description)) continue;
      return {
        extract: sum.extract,
        pageUrl:
          sum.content_urls?.desktop?.page ??
          `https://pt.wikipedia.org/wiki/${encodeURIComponent(sum.title)}`,
        title: sum.title,
      };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`▶️  Wikipedia bios — modo: ${APPLY ? "APPLY" : "DRY RUN"}${LIMIT < Infinity ? ` (limit=${LIMIT})` : ""}`);

  const { data, error } = await supabase
    .from("candidates")
    .select("id, name, full_name, party, election:elections(state)")
    .eq("is_active", true)
    .is("bio", null)
    .not("full_name", "is", null);

  if (error) {
    console.error("❌ Erro lendo candidates:", error);
    process.exit(1);
  }
  const list = (data ?? []).slice(0, LIMIT);
  console.log(`👥 Candidatos sem bio com full_name: ${list.length}`);

  let found = 0;
  let updated = 0;
  let notFound = 0;
  const updates: Array<{ id: string; bio: string; debug: string }> = [];

  for (let i = 0; i < list.length; i++) {
    const c = list[i] as Record<string, unknown>;
    const fullName = c.full_name as string;
    const name = c.name as string;
    const state = ((c.election as { state?: string } | null)?.state) ?? null;
    process.stdout.write(`  [${i + 1}/${list.length}] ${name} (${state ?? "-"})… `);
    const hit = await findBio(fullName, name, state);
    if (!hit) {
      notFound++;
      console.log("∅");
      await sleep(SLEEP_MS);
      continue;
    }
    found++;
    console.log(`✓ ${hit.title}`);
    updates.push({
      id: c.id as string,
      bio: hit.extract,
      debug: `${name} → ${hit.title}`,
    });
    await sleep(SLEEP_MS);
  }

  console.log(`\n📈 Estatísticas:`);
  console.log(`   encontrados: ${found}`);
  console.log(`   sem match: ${notFound}`);

  if (!APPLY) {
    console.log(`\n💡 Rode com --apply pra gravar ${updates.length} bios.`);
    if (updates.length > 0) {
      console.log(`\nAmostra (3 primeiros):`);
      for (const u of updates.slice(0, 3)) {
        console.log(`\n→ ${u.debug}`);
        console.log(`  ${u.bio.slice(0, 200)}…`);
      }
    }
    return;
  }

  console.log(`\n💾 Gravando ${updates.length} bios…`);
  for (const u of updates) {
    const { error: ue } = await supabase
      .from("candidates")
      .update({ bio: u.bio })
      .eq("id", u.id);
    if (ue) console.error(`  ❌ ${u.debug}:`, ue.message);
    else updated++;
  }
  console.log(`✅ ${updated} bios gravadas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
