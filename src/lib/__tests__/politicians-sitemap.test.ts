import { calcularAjustes, type PessoaParaSitemap } from "../politicians-sitemap";

const set = (...x: string[]) => new Set(x);

describe("calcularAjustes", () => {
  it("remove o slug que redireciona e garante o destino no sitemap", () => {
    const r = calcularAjustes({
      slugsListados: set("renan-al", "kim"),
      todosSlugsDeCandidates: set("renan-al", "renan-calheiros", "kim"),
      pessoaDoSlugServido: new Map([
        ["renan-al", "renan-calheiros"],
        ["kim", "kim"],
      ]),
      pessoas: [],
    });
    expect([...r.remover]).toEqual(["renan-al"]);
    // o destino não estava listado (ex.: ficou fora do filtro de qualidade): entra
    expect(r.adicionar).toEqual(["renan-calheiros"]);
  });

  it("não duplica destino que já está listado", () => {
    const r = calcularAjustes({
      slugsListados: set("ciro-gomes", "ciro"),
      todosSlugsDeCandidates: set("ciro-gomes", "ciro"),
      pessoaDoSlugServido: new Map([
        ["ciro-gomes", "ciro"],
        ["ciro", "ciro"],
      ]),
      pessoas: [],
    });
    expect([...r.remover]).toEqual(["ciro-gomes"]);
    expect(r.adicionar).toEqual([]);
  });

  it("pessoa só do TF entra só se tiver dados; sem dados a página ficaria vazia", () => {
    const pessoas: PessoaParaSitemap[] = [
      { slug: "chiquinho-brazao", temCandidatura: false, temDadosTf: true },
      { slug: "alexandre-padilha", temCandidatura: false, temDadosTf: false },
    ];
    const r = calcularAjustes({
      slugsListados: set(),
      todosSlugsDeCandidates: set(),
      pessoaDoSlugServido: new Map(),
      pessoas,
    });
    expect(r.adicionar).toEqual(["chiquinho-brazao"]);
  });

  it("pessoa servida por vínculo entra; a que já tem slug em candidates não é reinserida por aqui", () => {
    const r = calcularAjustes({
      slugsListados: set(),
      todosSlugsDeCandidates: set("filtrada-pelo-sitemap"),
      pessoaDoSlugServido: new Map(),
      pessoas: [
        { slug: "jaques-wagner", temCandidatura: true, temDadosTf: true },
        // slug existe em candidates mas o filtro de qualidade a deixou de fora: não furar o filtro
        { slug: "filtrada-pelo-sitemap", temCandidatura: true, temDadosTf: false },
      ],
    });
    expect(r.adicionar).toEqual(["jaques-wagner"]);
  });

  it("nunca adiciona um slug que ele mesmo redireciona (sem cadeia)", () => {
    const r = calcularAjustes({
      slugsListados: set("a", "b"),
      todosSlugsDeCandidates: set("a", "b"),
      // a → b e b → a: laço teórico; nenhum dos dois pode ser adicionado de volta
      pessoaDoSlugServido: new Map([
        ["a", "b"],
        ["b", "a"],
      ]),
      pessoas: [],
    });
    expect([...r.remover].sort()).toEqual(["a", "b"]);
    expect(r.adicionar).toEqual([]);
  });

  it("sem dados de pessoa não muda nada", () => {
    const r = calcularAjustes({
      slugsListados: set("x", "y"),
      todosSlugsDeCandidates: set("x", "y"),
      pessoaDoSlugServido: new Map(),
      pessoas: [],
    });
    expect(r.remover.size).toBe(0);
    expect(r.adicionar).toEqual([]);
  });
});
