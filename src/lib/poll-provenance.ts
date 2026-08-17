/**
 * Filtro de proveniência para leituras públicas de `polls`.
 *
 * Em 30/07/2026, 52 pesquisas foram promovidas a partir de drafts da Wikipedia
 * e, como a promoção descartava `source_url`, entraram em `polls` sem fonte
 * nenhuma — 32 delas como a pesquisa MAIS RECENTE da sua eleição, e 14 com data
 * de publicação em nov/dez 2026 (depois do pleito de 04/10). Ou seja: eram o
 * que as páginas de governador de 16 UFs exibiam como "última pesquisa".
 *
 * `polls.source_kind` passa a registrar proveniência. Linhas marcadas como
 * 'wikipedia' não circulam em superfície pública: a Wikipedia serve como sinal
 * de descoberta ("essa pesquisa existe"), não como validação do número.
 *
 * NULL = lote legado de abr/2026, sem proveniência registrada. Continua visível
 * — marcar tudo que não tem fonte como suspeito é outra decisão, editorial, e
 * não foi tomada aqui.
 *
 * Ver docs/ELECTIOLAB-AUDIT-2026-08.md §5.1.
 */
export const PROVENIENCIA_PUBLICA = "source_kind.is.null,source_kind.neq.wikipedia";
