import {
  abrangenciaMunicipio,
  baseDoAmbiente,
  expandirDir,
  sufixoCargo,
  sufixoEleicao,
  urlAcompanhamento,
  urlEleC,
  urlMunicipios,
  urlResultado,
} from "../urls";
import { eleC } from "./fixtures";

const ENV = {
  TSE_BASE_SIMULADO: "https://resultados-sim.tse.jus.br/simulado",
  TSE_AMB_SIMULADO: "simulado2026",
  TSE_BASE_OFICIAL: "https://resultados.tse.jus.br",
  TSE_AMB_OFICIAL: "oficial",
};

const base = baseDoAmbiente("simulado", ENV);
const templates = eleC().arq;
const CICLO = "ele2026";

describe("baseDoAmbiente", () => {
  it("lê a base do ambiente pedido", () => {
    expect(baseDoAmbiente("simulado", ENV).base).toBe("https://resultados-sim.tse.jus.br/simulado");
    expect(baseDoAmbiente("oficial", ENV).nomeAmbiente).toBe("oficial");
  });

  it("tira barra final da base", () => {
    const b = baseDoAmbiente("simulado", { ...ENV, TSE_BASE_SIMULADO: "https://x.tse/simulado/" });
    expect(b.base).toBe("https://x.tse/simulado");
  });

  it("falha explicitamente sem as variáveis", () => {
    expect(() => baseDoAmbiente("oficial", {})).toThrow(/TSE_BASE_OFICIAL/);
  });
});

describe("sufixos do nome de arquivo", () => {
  it("completa o código da eleição até 6 dígitos", () => {
    expect(sufixoEleicao(21270)).toBe("e021270");
    expect(sufixoEleicao("21272")).toBe("e021272");
    // Os códigos do oficial têm 4 dígitos e precisam do mesmo preenchimento.
    expect(sufixoEleicao(6257)).toBe("e006257");
  });

  it("completa o código do cargo até 4 dígitos", () => {
    expect(sufixoCargo(1)).toBe("c0001");
    expect(sufixoCargo(3)).toBe("c0003");
    expect(sufixoCargo(25)).toBe("c0025");
  });
});

describe("URLs a partir dos templates do ele-c.json", () => {
  it("monta o ele-c.json", () => {
    expect(urlEleC(base)).toBe(
      "https://resultados-sim.tse.jus.br/simulado/simulado2026/comum/config/ele-c.json",
    );
  });

  it("monta a config de municípios (EA12)", () => {
    expect(urlMunicipios(base, templates, CICLO, 21270)).toBe(
      "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/config/mun-e021270-cm.json",
    );
  });

  it("monta o EA14 (Brasil) e o EA15 (UF)", () => {
    expect(urlAcompanhamento(base, templates, CICLO, 21270, "br")).toBe(
      "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-e021270-ab.json",
    );
    expect(urlAcompanhamento(base, templates, CICLO, 21272, "ac")).toBe(
      "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/ac/ac-e021272-ab.json",
    );
  });

  it("monta o EA20 por BR, por UF e por município", () => {
    expect(urlResultado(base, templates, CICLO, 21270, "br", 1)).toBe(
      "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json",
    );
    expect(urlResultado(base, templates, CICLO, 21272, "mg", 3)).toBe(
      "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/mg/mg-c0003-e021272-u.json",
    );
    // No resultado municipal a abrangência é UF+código de 5 dígitos, mas o diretório é a UF.
    expect(urlResultado(base, templates, CICLO, 21272, "ac01120", 5)).toBe(
      "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/ac/ac01120-c0005-e021272-u.json",
    );
  });

  it("monta o mesmo caminho no ambiente oficial", () => {
    const oficial = baseDoAmbiente("oficial", ENV);
    expect(urlResultado(oficial, templates, CICLO, 6257, "mg", 6)).toBe(
      "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/mg/mg-c0006-e006257-u.json",
    );
  });
});

describe("guarda contra URL incompleta", () => {
  it("falha se sobrar placeholder no template", () => {
    // `cs` precisa de <cd_pleito>; sem ele a URL sairia pela metade e daria 404.
    expect(() => expandirDir(base, templates, "cs", CICLO, { codigoEleicao: 21270, uf: "mg" })).toThrow(
      /placeholder não resolvido \(<cd_pleito>\)/,
    );
  });

  it("falha se o tipo de arquivo não existe na config", () => {
    expect(() =>
      expandirDir(base, templates, "inexistente", CICLO, { codigoEleicao: 21270, uf: "br" }),
    ).toThrow(/não traz template de diretório/);
  });

  it("exige 5 dígitos no código de município", () => {
    expect(abrangenciaMunicipio("AC", "01120")).toBe("ac01120");
    expect(() => abrangenciaMunicipio("ac", "1120")).toThrow(/5 dígitos/);
  });
});
