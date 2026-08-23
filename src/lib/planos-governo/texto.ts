// Lógica pura de reconstrução/limpeza de texto extraído de PDF — separada de
// scripts/extract-planos-paginas.ts pra poder ser testada (Jest só enxerga
// src/, não scripts/). O script importa daqui, não duplica.

export type TextItem = { str: string; hasEOL: boolean; transform: number[] };

// Achado em produção (2026-08-22): 99,5% das páginas nativas vinham com um
// carimbo de número de página renderizado numa fonte decorativa cujos glifos
// mapeiam pra caracteres de controle Unicode em vez de texto real — sujeira
// estrutural, não pontual, presente em quase toda página de quase todo PDF.
// Remove em qualquer posição (não só no início), já que não há garantia de
// que essa fonte quebrada só apareça no início da página.
export function sanitizeTexto(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    const isControl = (code <= 0x1f && code !== 0x0a) || code === 0x7f;
    if (!isControl) out += ch;
  }
  return out.trim();
}

// Reconstrói o texto de uma página a partir dos items de pdfjs.getTextContent().
// Usa hasEOL (fim de linha) pra juntar item em linha, e o gap vertical (Y)
// entre linhas consecutivas pra decidir quebra de linha (\n) vs quebra de
// parágrafo (\n\n, quando o gap é bem maior que o típico da página) — importa
// pra etapa de recorte, que corta trecho por parágrafo completo.
export function reconstructText(items: TextItem[]): string {
  type Line = { text: string; y: number };
  const lines: Line[] = [];
  let buf = "";
  let bufY: number | null = null;

  for (const it of items) {
    if (typeof it.str !== "string") continue;
    if (bufY === null) bufY = it.transform[5];
    buf += it.str;
    if (it.hasEOL) {
      lines.push({ text: buf, y: bufY });
      buf = "";
      bufY = null;
    }
  }
  if (buf.trim()) lines.push({ text: buf, y: bufY ?? 0 });
  if (lines.length === 0) return "";

  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) gaps.push(Math.abs(lines[i - 1].y - lines[i].y));
  gaps.sort((a, b) => a - b);
  const gapTipico = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;

  let out = lines[0].text;
  for (let i = 1; i < lines.length; i++) {
    const gap = Math.abs(lines[i - 1].y - lines[i].y);
    out += gapTipico > 0 && gap > gapTipico * 1.4 ? "\n\n" : "\n";
    out += lines[i].text;
  }
  return sanitizeTexto(out);
}
