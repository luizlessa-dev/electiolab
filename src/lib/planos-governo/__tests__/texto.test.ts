import { reconstructText, sanitizeTexto, type TextItem } from "../texto";

describe("sanitizeTexto", () => {
  it("remove caracteres de controle mas preserva quebra de linha", () => {
    // Reprodução do achado de produção (2026-08-22): carimbo de número de
    // página numa fonte decorativa cujos glifos viram caracteres de controle
    // Unicode (-) em vez de texto real.
    const sujo = "40\n\nA saúde é um direito de todos.";
    expect(sanitizeTexto(sujo)).toBe("40\n\nA saúde é um direito de todos.");
  });

  it("remove controle em qualquer posição, não só no início", () => {
    const sujo = "Texto normal com lixo no meio.";
    expect(sanitizeTexto(sujo)).toBe("Texto normal com lixo no meio.");
  });

  it("mantém acentuação e pontuação intactas", () => {
    const limpo = "Educação, saúde e segurança pública são prioridades — não é negociável.";
    expect(sanitizeTexto(limpo)).toBe(limpo);
  });

  it("apara espaço nas bordas", () => {
    expect(sanitizeTexto("  texto com espaço nas bordas  ")).toBe("texto com espaço nas bordas");
  });
});

describe("reconstructText", () => {
  // helper: monta item no formato real do pdfjs (transform[5] = y)
  function pdfItem(str: string, y: number, hasEOL: boolean): TextItem {
    return { str, hasEOL, transform: [1, 0, 0, 1, 0, y] };
  }

  it("junta itens de uma mesma linha e separa linhas com \\n", () => {
    const items = [pdfItem("Primeira linha do parágrafo.", 780, true), pdfItem("Segunda linha, mesmo parágrafo.", 764, true)];
    expect(reconstructText(items)).toBe("Primeira linha do parágrafo.\nSegunda linha, mesmo parágrafo.");
  });

  it("detecta quebra de parágrafo (\\n\\n) quando o gap vertical é bem maior que o típico", () => {
    const items = [
      pdfItem("Primeira linha do parágrafo um.", 800, true),
      pdfItem("Segunda linha do parágrafo um.", 784, true), // gap 16 — típico
      pdfItem("Primeira linha do parágrafo dois.", 720, true), // gap 64 — bem maior, é quebra de parágrafo
      pdfItem("Segunda linha do parágrafo dois.", 704, true),
    ];
    const out = reconstructText(items);
    expect(out).toBe(
      "Primeira linha do parágrafo um.\nSegunda linha do parágrafo um.\n\nPrimeira linha do parágrafo dois.\nSegunda linha do parágrafo dois."
    );
  });

  it("retorna string vazia pra lista de items vazia", () => {
    expect(reconstructText([])).toBe("");
  });

  it("ignora item sem str (marcador sem texto)", () => {
    const items = [
      pdfItem("Texto real.", 800, true),
      { hasEOL: true, transform: [1, 0, 0, 1, 0, 780] } as unknown as TextItem,
    ];
    expect(reconstructText(items)).toBe("Texto real.");
  });

  it("sanitiza o resultado final (carimbo de página com caractere de controle)", () => {
    const items = [
      pdfItem("40", 800, true),
      pdfItem("Texto de verdade da página.", 784, true),
    ];
    expect(reconstructText(items)).toBe("40\nTexto de verdade da página.");
  });
});
