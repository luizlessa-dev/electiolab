// Lógica pura de classificação de trechos por tema — separada de
// scripts/classify-planos-trechos.ts pra poder ser testada (Jest só enxerga
// src/, não scripts/). O script importa daqui, não duplica.

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export type KeywordMatcher = { regex: RegExp; caseSensitive: boolean; label: string };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Conectores que juntam duas ideias dentro de uma cláusula ("X quando Y",
// "X como Y", "X e Y") — usados só pra truncar keyword longa demais, nunca
// pra dividir frase que só tem preposição interna (ver terceiro achado).
const CONECTORES = [" quando ", " como ", " e "];

function buildMatcher(raw: string): KeywordMatcher {
  const isSigla = /^[A-ZÀ-Ý]+$/.test(raw);
  const label = isSigla ? raw : normalize(raw);
  return { regex: new RegExp(`\\b${escapeRegExp(label)}\\b`), caseSensitive: isSigla, label };
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
//
// Terceiro achado (2026-08-23), ao escrever teste: cláusula do texto ligada
// por "e"/"quando"/"como" em vez de vírgula vira UMA keyword de 5-8 palavras
// que quase nunca bate no texto real — sub-classificação silenciosa (ex.:
// "Bolsa Família e programas de transferência de renda" nunca casa com um
// parágrafo que só diz "Bolsa Família"). Em vez de reescrever o texto da
// taxonomia (que o LLM também lê como critério — mudar ali mudaria o que o
// modelo enxerga, não só o pré-filtro), a keyword longa agora também gera um
// candidato truncado no primeiro conector, mais permissivo (mais chamada de
// LLM, nunca mais chance de perder trecho válido) — o texto completo
// continua entrando também, então nada foi removido, só adicionado. Não
// trunca em preposição solta ("população em situação de rua" não tem
// conector, fica intacta).
export function extractKeywords(descricaoEscopo: string): KeywordMatcher[] {
  const m = descricaoEscopo.match(/Entra:\s*(.+?)\.\s*N[ãa]o entra:/i);
  if (!m) return [];
  const matchers: KeywordMatcher[] = [];
  for (const raw of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
    matchers.push(buildMatcher(raw));
    for (const conector of CONECTORES) {
      const idx = raw.indexOf(conector);
      if (idx > 0) {
        const truncado = raw.slice(0, idx).trim();
        if (truncado && truncado.toLowerCase() !== raw.toLowerCase()) matchers.push(buildMatcher(truncado));
        break; // só o primeiro conector — truncar em todos encadearia demais
      }
    }
  }
  return matchers;
}

// true se o parágrafo (já normalizado, exceto pros matchers de sigla — esses
// testam contra o original com maiúscula) bate com pelo menos uma keyword do
// tema. paragrafoOriginal preserva capitalização (necessário pra sigla);
// paragrafoNormalizado é minúsculo/sem acento (pro resto).
export function algumMatcherBate(
  matchers: KeywordMatcher[],
  paragrafoOriginal: string,
  paragrafoNormalizado: string
): boolean {
  return matchers.some((m) => m.regex.test(m.caseSensitive ? paragrafoOriginal : paragrafoNormalizado));
}

// Une quebra de linha dentro do parágrafo (artefato do wrap do PDF) num
// texto corrido; \n\n continua separando parágrafo de parágrafo. Descarta
// fragmento curto (número de página solto, cabeçalho) — não é "parágrafo".
export function splitParagraphs(texto: string): string[] {
  return texto
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter((p) => p.length > 30);
}
