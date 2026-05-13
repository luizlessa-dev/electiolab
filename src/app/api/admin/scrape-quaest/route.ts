/**
 * POST /api/admin/scrape-quaest
 * Body: { url: "https://quaest.com.br/..." }
 *
 * Tenta extrair candidatos+% de uma matéria do site Quaest.
 * Quaest publica em texto livre (narrativo) — patterns:
 *   - "Nome (XX%)"                  ← formato compacto p/ múltiplos
 *   - "Nome ... XX% e YY%"          ← formato range/intervalo (estimativa)
 *   - "Nome lidera com XX%"         ← formato individual
 *
 * Output:
 * {
 *   candidates: [{ name, pct }],
 *   confidence: "high" | "medium" | "low",
 *   detected: { uf?, office?, fieldwork?, sample_size?, margin_of_error? },
 *   raw_excerpt: string  // texto que motivou a extração, para conferência
 * }
 *
 * Auth: Bearer INGEST_SECRET_KEY.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function authorize(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const secret = process.env.INGEST_SECRET_KEY;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

type Candidate = { name: string; pct: number };

/** Padrão "Nome (XX%)" — alta confiança. */
function extractParenPattern(text: string): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  // Nome composto (2+ palavras capitalizadas) + (XX%) ou (XX,X%)
  const re = /([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,4})\s*\(\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim();
    const pct = parseFloat(m[2].replace(",", "."));
    const key = name.toLowerCase();
    if (!seen.has(key) && pct >= 0 && pct <= 100) {
      seen.add(key);
      out.push({ name, pct });
    }
  }
  return out;
}

/** Padrão "Nome: XX%" ou "Nome — XX%" — média confiança. */
function extractColonPattern(text: string): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const re = /([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:de|da|do|dos|das|e)?\s*[A-ZÀ-Ú][a-zà-ú]+){0,3})\s*(?::|—|–|-)\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim();
    const pct = parseFloat(m[2].replace(",", "."));
    const key = name.toLowerCase();
    // filtra falsos positivos comuns
    if (key.length < 4 || key.includes("margem") || key.includes("amostra") || key.includes("nível") || key.includes("confianç")) continue;
    if (!seen.has(key) && pct >= 0 && pct <= 100) {
      seen.add(key);
      out.push({ name, pct });
    }
  }
  return out;
}

/** Detecta UF/cargo/datas do texto. */
function detectMeta(text: string): {
  uf?: string;
  office?: string;
  sample_size?: number;
  margin_of_error?: number;
  fieldwork_start?: string;
  fieldwork_end?: string;
} {
  const meta: ReturnType<typeof detectMeta> = {};

  // UF (state names mapping to sigla)
  const ufMap: Record<string, string> = {
    "São Paulo": "SP", "Minas Gerais": "MG", "Rio de Janeiro": "RJ", "Bahia": "BA",
    "Paraná": "PR", "Rio Grande do Sul": "RS", "Pernambuco": "PE", "Ceará": "CE",
    "Pará": "PA", "Santa Catarina": "SC", "Maranhão": "MA", "Goiás": "GO",
    "Amazonas": "AM", "Espírito Santo": "ES", "Paraíba": "PB", "Rio Grande do Norte": "RN",
    "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Distrito Federal": "DF",
    "Piauí": "PI", "Alagoas": "AL", "Sergipe": "SE", "Tocantins": "TO",
    "Rondônia": "RO", "Acre": "AC", "Amapá": "AP", "Roraima": "RR",
  };
  for (const [name, sigla] of Object.entries(ufMap)) {
    if (text.includes(name)) { meta.uf = sigla; break; }
  }

  // Office
  const lower = text.toLowerCase();
  if (lower.includes("presidente")) meta.office = "presidente";
  else if (lower.includes("governador")) meta.office = "governador";
  else if (lower.includes("senador")) meta.office = "senador";

  // Sample size: "1.650 pessoas", "2 mil entrevistas", "amostra de 2004"
  const sampleMatches = [
    /(\d{1,2}\.\d{3})\s+(?:pessoas|entrevistas|eleitores)/i,
    /amostra\s+de\s+(\d{3,5})/i,
    /(\d{3,5})\s+(?:entrevistados|entrevistas)/i,
  ];
  for (const re of sampleMatches) {
    const m = text.match(re);
    if (m) {
      meta.sample_size = parseInt(m[1].replace(/\./g, ""));
      break;
    }
  }

  // Margem: "±3pp", "margem de 3 pontos", "margem de erro 2 pontos percentuais"
  const marginRe = /margem\s+(?:de\s+(?:erro\s+(?:de\s+)?)?)?\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:pp|pontos?\s+percentuais?|p\.?p\.?)/i;
  const mm = text.match(marginRe);
  if (mm) meta.margin_of_error = parseFloat(mm[1].replace(",", "."));

  // Fieldwork: "Campo: 23-27 de abril de 2026", "23 a 27 de abril"
  const fieldRe = /(?:campo|coleta|entre|de)\s*:?\s*(\d{1,2})\s+(?:a|e|-)\s+(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(\d{4})/i;
  const fw = text.match(fieldRe);
  if (fw) {
    const monthMap: Record<string, string> = {
      janeiro: "01", fevereiro: "02", "março": "03", marco: "03", abril: "04", maio: "05",
      junho: "06", julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
    };
    const mo = monthMap[fw[3].toLowerCase()];
    if (mo) {
      const startDay = fw[1].padStart(2, "0");
      const endDay = fw[2].padStart(2, "0");
      meta.fieldwork_start = `${fw[4]}-${mo}-${startDay}`;
      meta.fieldwork_end = `${fw[4]}-${mo}-${endDay}`;
    }
  }

  return meta;
}

export async function POST(req: Request) {
  const denied = authorize(req); if (denied) return denied;
  const body = await req.json().catch(() => null);
  const url = body?.url as string | undefined;
  if (!url || !/^https?:\/\/(www\.)?quaest\.com\.br\//i.test(url)) {
    return NextResponse.json(
      { error: "Body deve conter url do domínio quaest.com.br" },
      { status: 400 }
    );
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ElectioLab/1.0; +https://electiolab.com)" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Falha ao buscar URL: HTTP ${res.status}` }, { status: 502 });
    }
    html = await res.text();
  } catch (e) {
    return NextResponse.json({ error: `Erro ao buscar URL: ${(e as Error).message}` }, { status: 502 });
  }

  const text = stripHtml(html);
  const paren = extractParenPattern(text);
  const colon = extractColonPattern(text);

  // Merge: paren tem precedência (alta confiança); colon preenche sem duplicar
  const candidates: Candidate[] = [...paren];
  const seenNames = new Set(candidates.map((c) => c.name.toLowerCase()));
  for (const c of colon) {
    if (!seenNames.has(c.name.toLowerCase())) {
      candidates.push(c);
      seenNames.add(c.name.toLowerCase());
    }
  }

  // Confidence ranking
  let confidence: "high" | "medium" | "low" = "low";
  if (paren.length >= 3) confidence = "high";
  else if (paren.length >= 1 || colon.length >= 3) confidence = "medium";

  const detected = detectMeta(text);

  // Excerto pra debug — primeira ocorrência de % no texto + contexto
  const pctIdx = text.search(/\d{1,2}(?:[.,]\d{1,2})?\s*%/);
  const rawExcerpt = pctIdx >= 0
    ? text.slice(Math.max(0, pctIdx - 200), pctIdx + 400)
    : text.slice(0, 600);

  return NextResponse.json({
    candidates,
    confidence,
    detected,
    raw_excerpt: rawExcerpt,
    counts: { paren: paren.length, colon: colon.length, total: candidates.length },
  });
}
