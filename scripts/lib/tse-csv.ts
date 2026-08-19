/**
 * Helpers compartilhados entre os scripts de ingestão TSE (candidaturas,
 * extended, prestação de contas). Extraído em 2026-08-13 pra parar de
 * duplicar NULO/parseValor/cleanCpf entre ingest-tse-extended.ts e
 * ingest-tse-candidaturas.ts (que tinham pequenas divergências, ex:
 * "#NULO#" vs "#NULO" — aqui trata as duas formas).
 */

import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { parse } from "csv-parse";

// ─────────────────────────────────────────────────────────────────
// Sentinelas de null / parsing de campo TSE
// ─────────────────────────────────────────────────────────────────
const NULL_SENTINELS = new Set([
  "#NULO#",
  "#NULO",
  "#NE#",
  "#NE",
  "-1",
  "NÃO INFORMADO",
  "N/A",
]);

export function NULO(s: string | undefined | null): string | null {
  if (!s) return null;
  const t = s.replace(/^"|"$/g, "").trim();
  if (!t || NULL_SENTINELS.has(t)) return null;
  return t;
}

export function parseValor(s: string | undefined | null): number | null {
  const t = NULO(s);
  if (!t) return null;
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

export function cleanCpf(s: string | undefined | null): string | null {
  const t = NULO(s);
  if (!t) return null;
  // CPF/CNPJ nunca é negativo — TSE usa sentinelas tipo "-3"/"-4" pra
  // mascarar por privacidade em alguns datasets (ex: prestação de contas de
  // candidatos), além do "-1" já coberto por NULL_SENTINELS.
  if (t.startsWith("-")) return null;
  const digits = t.replace(/\D/g, "");
  if (!digits) return null;
  return digits.padStart(11, "0").slice(-11);
}

export function parseDateBR(s: string | undefined | null): string | null {
  const t = NULO(s);
  if (!t) return null;
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// ─────────────────────────────────────────────────────────────────
// Download com cache, streaming pra disco (não materializa o ZIP
// inteiro em memória — arquivos deste domínio passam de 300MB).
// ─────────────────────────────────────────────────────────────────
export const TSE_CACHE_DIR = path.join(os.tmpdir(), "tse-cache");
mkdirSync(TSE_CACHE_DIR, { recursive: true });

export async function downloadCachedStream(url: string, cacheName: string): Promise<string> {
  const cachePath = path.join(TSE_CACHE_DIR, cacheName);
  if (existsSync(cachePath) && statSync(cachePath).size > 1024) {
    const mb = (statSync(cachePath).size / 1024 / 1024).toFixed(1);
    console.log(`📂 cache: ${cacheName} (${mb}MB)`);
    return cachePath;
  }
  console.log(`⬇️  ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} para ${url}`);
  await pipeline(Readable.fromWeb(res.body as import("stream/web").ReadableStream), createWriteStream(cachePath));
  const mb = (statSync(cachePath).size / 1024 / 1024).toFixed(1);
  console.log(`✅ ${mb}MB salvo em ${cachePath}`);
  return cachePath;
}

// ─────────────────────────────────────────────────────────────────
// Listagem de membros do ZIP sem abrir o arquivo inteiro em memória
// ─────────────────────────────────────────────────────────────────
export function listZipMembers(zipPath: string): string[] {
  const out = execFileSync("unzip", ["-Z1", zipPath], {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────
// Streaming linha a linha de um membro do ZIP: unzip -p → iconv
// (latin1→utf8) → csv-parse (colunas mapeadas pelo header). Nunca
// materializa o CSV inteiro em memória — cada `yield` é uma linha.
// ─────────────────────────────────────────────────────────────────
export async function* streamZipCsvRows(
  zipPath: string,
  member: string,
): AsyncGenerator<Record<string, string>> {
  const unzip = spawn("unzip", ["-p", zipPath, member], { stdio: ["ignore", "pipe", "pipe"] });
  const iconvProc = spawn("iconv", ["-f", "LATIN1", "-t", "UTF-8//IGNORE"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let unzipErr = "";
  unzip.stderr.on("data", (d) => (unzipErr += d.toString()));
  let iconvErr = "";
  iconvProc.stderr.on("data", (d) => (iconvErr += d.toString()));
  unzip.stdout.pipe(iconvProc.stdin);
  unzip.on("error", (e) => iconvProc.stdin.destroy(e));

  const parser = iconvProc.stdout.pipe(
    parse({
      delimiter: ";",
      columns: true,
      bom: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true,
    }),
  );

  for await (const record of parser) {
    yield record as Record<string, string>;
  }

  // waitClose: por arquivo pequeno os processos filhos costumam já ter
  // fechado antes de chegarmos aqui — anexar `.on("close")` depois do
  // evento já disparado nunca resolveria (child_process não reemite
  // "close" retroativamente), travando o generator pra sempre. Checa
  // `exitCode`/`signalCode` primeiro; só espera o evento se ainda não
  // terminou.
  const waitClose = (proc: ChildProcess): Promise<number | null> =>
    proc.exitCode !== null || proc.signalCode !== null
      ? Promise.resolve(proc.exitCode)
      : new Promise<number | null>((resolve) => proc.on("close", resolve));

  const [unzipCode, iconvCode] = await Promise.all([waitClose(unzip), waitClose(iconvProc)]);
  if (unzipCode !== 0) {
    throw new Error(`unzip -p ${member} saiu com código ${unzipCode}: ${unzipErr.trim()}`);
  }
  if (iconvCode !== 0) {
    throw new Error(`iconv (${member}) saiu com código ${iconvCode}: ${iconvErr.trim()}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Resolução de colunas por nome de header — não por índice posicional
// (o TSE muda a ordem/quantidade de colunas entre anos). Cada campo
// lógico tenta uma lista de nomes candidatos (o layout exato varia
// entre datasets e não é 100% documentado publicamente); se nenhum
// candidato bater, tenta um fallback por tokens (todos os tokens
// precisam aparecer no nome do header, ex: ["DOADOR","ORIGINARIO"]).
// Campos não resolvidos ficam null — o `raw jsonb` de cada tabela
// continua com a linha inteira como rede de segurança.
// ─────────────────────────────────────────────────────────────────
export type FieldSpec = { field: string; candidates: string[]; tokens?: string[] };

export function resolveColumns(
  header: string[],
  specs: FieldSpec[],
): { map: Record<string, string | null>; missing: string[] } {
  const map: Record<string, string | null> = {};
  const missing: string[] = [];
  const upperHeader = header.map((h) => h.toUpperCase());
  for (const spec of specs) {
    let found: string | null = null;
    for (const c of spec.candidates) {
      const idx = upperHeader.indexOf(c.toUpperCase());
      if (idx >= 0) {
        found = header[idx];
        break;
      }
    }
    if (!found && spec.tokens?.length) {
      const hit = header.find((h) => spec.tokens!.every((t) => h.toUpperCase().includes(t.toUpperCase())));
      if (hit) found = hit;
    }
    map[spec.field] = found;
    if (!found) missing.push(spec.field);
  }
  return { map, missing };
}

// ─────────────────────────────────────────────────────────────────
// Retry com backoff — Supabase pode ter picos de erro 5xx/timeout em
// volumes grandes; upserts sem retry perdem dados silenciosamente.
// ─────────────────────────────────────────────────────────────────
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 7,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === maxAttempts) break;
      const wait = Math.min(2000 * attempt, 30000);
      console.warn(
        `⚠️  ${label} falhou (tentativa ${attempt}/${maxAttempts}): ${(e as Error).message}. Retry em ${wait}ms`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
