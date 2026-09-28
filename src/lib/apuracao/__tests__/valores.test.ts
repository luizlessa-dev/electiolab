import { dataHoraUtc, dataIso, flag, inteiro, percentual, texto } from "../valores";

describe("inteiro", () => {
  it("converte string de dígitos", () => {
    expect(inteiro("528951")).toBe(528951);
    expect(inteiro("0")).toBe(0);
  });

  it("trata ausência e string vazia como null", () => {
    expect(inteiro(undefined)).toBeNull();
    expect(inteiro(null)).toBeNull();
    expect(inteiro("")).toBeNull();
    expect(inteiro("   ")).toBeNull();
  });

  it("recusa o que não é inteiro, em vez de devolver NaN", () => {
    expect(() => inteiro("7,53")).toThrow(/inteiro inesperado/);
    expect(() => inteiro("12.5")).toThrow(/inteiro inesperado/);
    expect(() => inteiro("abc")).toThrow(/inteiro inesperado/);
  });

  it("recusa inteiro fora da faixa segura de JS", () => {
    expect(() => inteiro("9007199254740993")).toThrow(/faixa segura/);
  });
});

describe("percentual", () => {
  it("troca vírgula por ponto sem arredondar", () => {
    expect(percentual("7,527528669")).toBe(7.527528669);
    expect(percentual("100")).toBe(100);
    expect(percentual("0,00")).toBe(0);
  });

  it("preserva as 9 casas do TSE", () => {
    // A variante de 2 casas perderia informação: o coletor usa sempre a `…n`.
    expect(percentual("85,150902319")).toBe(85.150902319);
    expect(percentual("85,15")).not.toBe(percentual("85,150902319"));
  });

  it("trata ausência como null e recusa lixo", () => {
    expect(percentual("")).toBeNull();
    expect(percentual(undefined)).toBeNull();
    expect(() => percentual("7,5,3")).toThrow(/Percentual inesperado/);
  });
});

describe("texto e flag", () => {
  it("string vazia do TSE vira null", () => {
    // O TSE usa '' onde queremos ausência (ex.: cdi do Exterior, par.nfed).
    expect(texto("")).toBeNull();
    expect(texto("  ")).toBeNull();
    expect(texto(" MG ")).toBe("MG");
  });

  it("flag só é verdadeira em 's'", () => {
    expect(flag("s")).toBe(true);
    expect(flag("S")).toBe(true);
    expect(flag("n")).toBe(false);
    expect(flag("")).toBe(false);
    expect(flag(undefined)).toBe(false);
  });
});

describe("dataHoraUtc", () => {
  it("interpreta como Brasília (UTC-3) e devolve UTC", () => {
    expect(dataHoraUtc("24/09/2026", "16:12:34")).toBe("2026-09-24T19:12:34.000Z");
  });

  it("vira o dia quando a hora passa das 21h de Brasília", () => {
    expect(dataHoraUtc("04/10/2026", "22:30:00")).toBe("2026-10-05T01:30:00.000Z");
  });

  it("aceita hora sem segundos", () => {
    expect(dataHoraUtc("04/10/2026", "17:00")).toBe("2026-10-04T20:00:00.000Z");
  });

  it("precisa das duas partes", () => {
    expect(dataHoraUtc("24/09/2026", "")).toBeNull();
    expect(dataHoraUtc("", "16:12:34")).toBeNull();
    expect(dataHoraUtc(undefined, undefined)).toBeNull();
  });

  it("recusa formato inesperado", () => {
    expect(() => dataHoraUtc("2026-09-24", "16:12:34")).toThrow(/inesperada/);
  });
});

describe("dataIso", () => {
  it("converte dd/mm/aaaa", () => {
    expect(dataIso("26/04/2026")).toBe("2026-04-26");
    expect(dataIso("")).toBeNull();
  });
});
