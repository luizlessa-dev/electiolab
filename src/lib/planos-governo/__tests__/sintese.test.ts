import { paginasUnicas, montarFonte } from "../sintese";

describe("paginasUnicas", () => {
  it("ordena e remove duplicata de página", () => {
    const trechos = [
      { pagina: 10, texto: "a" },
      { pagina: 3, texto: "b" },
      { pagina: 10, texto: "c" },
      { pagina: 7, texto: "d" },
    ];
    expect(paginasUnicas(trechos)).toEqual([3, 7, 10]);
  });

  it("retorna vazio pra lista vazia", () => {
    expect(paginasUnicas([])).toEqual([]);
  });
});

describe("montarFonte", () => {
  it("marca cada trecho com a própria página, um por linha", () => {
    const trechos = [
      { pagina: 5, texto: "Primeiro trecho." },
      { pagina: 9, texto: "Segundo trecho." },
    ];
    expect(montarFonte(trechos)).toBe("[p.5] Primeiro trecho.\n\n[p.9] Segundo trecho.");
  });

  it("retorna string vazia pra lista vazia", () => {
    expect(montarFonte([])).toBe("");
  });
});
