import { destinoCanonico, type OpcaoEleicao } from "../politicians-routing";

const opcoes: OpcaoEleicao[] = [
  { candidateId: "linha-principal", segment: "senador-2026-1t", isPrimary: true },
  { candidateId: "linha-2022", segment: "senador-2022-1t", isPrimary: false },
];

const base = { slugPedido: "renan-al", pessoaSlug: "renan-calheiros", opcoesDaPessoa: opcoes };

describe("destinoCanonico", () => {
  it("já no slug da pessoa: não redireciona", () => {
    expect(destinoCanonico({ ...base, slugPedido: "renan-calheiros", candidateId: "linha-principal" })).toBeNull();
  });

  it("linha sem pessoa: não redireciona", () => {
    expect(destinoCanonico({ ...base, pessoaSlug: null, candidateId: "x" })).toBeNull();
  });

  it("linha da eleição principal vai para a página base da pessoa", () => {
    expect(destinoCanonico({ ...base, candidateId: "linha-principal" })).toBe("/candidato/renan-calheiros");
  });

  it("linha de OUTRA eleição da pessoa mantém a eleição pedida", () => {
    expect(destinoCanonico({ ...base, candidateId: "linha-2022" })).toBe(
      "/candidato/renan-calheiros/senador-2022-1t",
    );
  });

  it("linha duplicada ou filtrada pelo seletor cai na página base, que sempre existe", () => {
    expect(destinoCanonico({ ...base, candidateId: "duplicada-fora-das-opcoes" })).toBe("/candidato/renan-calheiros");
    expect(destinoCanonico({ ...base, candidateId: "qualquer", opcoesDaPessoa: [] })).toBe("/candidato/renan-calheiros");
  });
});
