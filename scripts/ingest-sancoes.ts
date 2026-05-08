#!/usr/bin/env npx tsx
/**
 * Ingest sanções do Portal da Transparência:
 *   - CEIS  → sanctioned_entities (PJ)
 *   - CEAF  → sanctioned_persons (PF)
 *
 * API: https://api.portaldatransparencia.gov.br/api-de-dados
 * Auth: header `chave-api-dados: ${TRANSPARENCIA_API_KEY}`
 * Paginação: ?pagina=N (15 itens/página por padrão)
 *
 * Uso:
 *   npx tsx scripts/ingest-sancoes.ts                        # dry-run
 *   npx tsx scripts/ingest-sancoes.ts --apply                # grava
 *   npx tsx scripts/ingest-sancoes.ts --apply --only=ceis    # só CEIS
 *   npx tsx scripts/ingest-sancoes.ts --apply --pages=200    # limita 200 páginas
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Env loader
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
const API_KEY = process.env.TRANSPARENCIA_API_KEY ?? "8965d2863eeea39bae8aa65122213610";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Faltam env Supabase");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const API_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";
const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const MAX_PAGES = parseInt(process.argv.find((a) => a.startsWith("--pages="))?.split("=")[1] ?? "500");

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const parseDateBR = (s?: string | null): string | null => {
  if (!s || s === "Sem informação" || s === "") return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const cleanDigits = (s?: string | null): string | null => {
  if (!s) return null;
  const t = s.replace(/\D/g, "");
  return t || null;
};

async function fetchPage(endpoint: string, page: number): Promise<unknown[]> {
  const url = `${API_BASE}/${endpoint}?pagina=${page}`;
  const res = await fetch(url, { headers: { "chave-api-dados": API_KEY } });
  if (!res.ok) {
    if (res.status === 429) {
      console.log("    ⏳ rate limit, sleep 30s…");
      await new Promise((r) => setTimeout(r, 30000));
      return fetchPage(endpoint, page);
    }
    throw new Error(`HTTP ${res.status} on ${url}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function paginate<T>(
  endpoint: string,
  mapper: (raw: unknown) => T,
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const items = await fetchPage(endpoint, page);
    if (items.length === 0) {
      console.log(`  📄 ${endpoint} fim na página ${page}`);
      break;
    }
    for (const it of items) out.push(mapper(it));
    if (page % 10 === 0 || page <= 3) {
      console.log(`  📄 ${endpoint} page ${page}: +${items.length} (acumulado ${out.length})`);
    }
    // Throttle pra não bater rate limit (700/min)
    await new Promise((r) => setTimeout(r, 90));
  }
  return out;
}

async function insertBatch<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
): Promise<number> {
  if (!APPLY || rows.length === 0) return 0;
  const BATCH = 500;
  let n = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await sb.from(table).upsert(slice, { onConflict: "id", ignoreDuplicates: false });
    if (error) {
      console.error(`❌ ${table}: ${error.message}`);
      console.error(`   sample:`, JSON.stringify(slice[0]).slice(0, 300));
      break;
    }
    n += slice.length;
  }
  return n;
}

// ─────────────────────────────────────────────────────────────────
// CEIS (PJ)
// ─────────────────────────────────────────────────────────────────
async function ingestCEIS() {
  console.log("\n━━━ CEIS (Empresas Inidôneas) ━━━");

  type CEIS = {
    id: number;
    dataInicioSancao?: string;
    dataFimSancao?: string;
    dataPublicacaoSancao?: string;
    abrangenciaDefinidaDecisaoJudicial?: string;
    tipoSancao?: { descricaoPortal?: string };
    fundamentacao?: Array<{ codigo?: string; descricao?: string }>;
    orgaoSancionador?: { nome?: string; esfera?: string; siglaUf?: string };
    fonteSancao?: { nomeExibicao?: string };
    pessoa?: { cnpjFormatado?: string; nome?: string; razaoSocialReceita?: string; nomeFantasiaReceita?: string };
    sancionado?: { codigoFormatado?: string; nome?: string };
    numeroProcesso?: string;
    linkPublicacao?: string;
  };

  const rows = await paginate<Record<string, unknown>>("ceis", (raw) => {
    const r = raw as CEIS;
    const cnpj = r.pessoa?.cnpjFormatado || r.sancionado?.codigoFormatado || null;
    return {
      id: r.id,
      cnpj,
      cnpj_clean: cleanDigits(cnpj),
      nome: r.pessoa?.nome ?? r.sancionado?.nome ?? null,
      razao_social: r.pessoa?.razaoSocialReceita ?? null,
      nome_fantasia: r.pessoa?.nomeFantasiaReceita ?? null,
      tipo_sancao: r.tipoSancao?.descricaoPortal ?? null,
      fundamentacao: r.fundamentacao?.[0]?.descricao ?? r.fundamentacao?.[0]?.codigo ?? null,
      data_inicio: parseDateBR(r.dataInicioSancao),
      data_fim: parseDateBR(r.dataFimSancao),
      data_publicacao: parseDateBR(r.dataPublicacaoSancao),
      abrangencia: r.abrangenciaDefinidaDecisaoJudicial ?? null,
      orgao_sancionador: r.orgaoSancionador?.nome ?? null,
      orgao_esfera: r.orgaoSancionador?.esfera ?? null,
      orgao_uf: r.orgaoSancionador?.siglaUf ?? null,
      fonte_sancao: r.fonteSancao?.nomeExibicao ?? null,
      numero_processo: r.numeroProcesso ?? null,
      link_publicacao: r.linkPublicacao ?? null,
      raw_data: raw,
    };
  });

  console.log(`  📊 Total CEIS coletado: ${rows.length}`);
  const n = await insertBatch("sanctioned_entities", rows);
  console.log(`  💾 sanctioned_entities: ${n}/${rows.length} ${APPLY ? "inseridos" : "(dry-run)"}`);
}

// ─────────────────────────────────────────────────────────────────
// CEAF (PF — servidores expulsos)
// ─────────────────────────────────────────────────────────────────
async function ingestCEAF() {
  console.log("\n━━━ CEAF (Servidores Expulsos) ━━━");

  type CEAF = {
    id: number;
    cpfFormatado?: string;
    nome?: string;
    tipoSancao?: string;
    publicacaoDOU?: string;
    dataPublicacaoDOU?: string;
    cargoEfetivo?: string;
    orgaoLotacao?: { nome?: string };
    numeroProcesso?: string;
    fundamentoLegal?: string;
  };

  const rows = await paginate<Record<string, unknown>>("ceaf", (raw) => {
    const r = raw as CEAF;
    const cpf = r.cpfFormatado ?? null;
    return {
      id: r.id,
      cpf,
      cpf_clean: cleanDigits(cpf),
      nome: r.nome ?? null,
      tipo_sancao: r.tipoSancao ?? null,
      fundamentacao: r.fundamentoLegal ?? null,
      data_publicacao: parseDateBR(r.dataPublicacaoDOU),
      data_inicio: parseDateBR(r.dataPublicacaoDOU),
      cargo: r.cargoEfetivo ?? null,
      orgao: r.orgaoLotacao?.nome ?? null,
      numero_processo: r.numeroProcesso ?? null,
      raw_data: raw,
    };
  });

  console.log(`  📊 Total CEAF coletado: ${rows.length}`);
  const n = await insertBatch("sanctioned_persons", rows);
  console.log(`  💾 sanctioned_persons: ${n}/${rows.length} ${APPLY ? "inseridos" : "(dry-run)"}`);
}

(async () => {
  console.log(`\n🇧🇷 Ingest Sanções — Portal da Transparência`);
  console.log(`   Modo: ${APPLY ? "✍️  APPLY" : "🔍 DRY-RUN"}`);
  console.log(`   Max pages: ${MAX_PAGES}`);
  if (ONLY) console.log(`   Filtro: ${ONLY}`);

  if (!ONLY || ONLY === "ceis") await ingestCEIS();
  if (!ONLY || ONLY === "ceaf") await ingestCEAF();

  console.log("\n✅ Concluído");
})();
