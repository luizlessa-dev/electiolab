import {
  alinhamento,
  normalizarOrientacao,
  normalizarPartido,
  parseVotacoes,
  partidoDoVoto,
  type OrientacaoNormalizada,
} from "../senado-orientacao";

describe("normalizarOrientacao", () => {
  it("traduz os valores da API para os que o TF compara", () => {
    expect(normalizarOrientacao("SIM")).toBe("Sim");
    expect(normalizarOrientacao("NÃO")).toBe("Não");
    expect(normalizarOrientacao("LIVRE")).toBe("Liberado");
    expect(normalizarOrientacao("OBSTRUÇÃO")).toBe("Obstrução");
  });
  it("vazio ou desconhecido vira null", () => {
    expect(normalizarOrientacao(null)).toBeNull();
    expect(normalizarOrientacao("")).toBeNull();
    expect(normalizarOrientacao("TALVEZ")).toBeNull();
  });
});

describe("normalizarPartido", () => {
  it("unifica as grafias que mudaram ao longo dos anos", () => {
    for (const r of ["Republica", "Republicanos", "PRB"]) expect(normalizarPartido(r)).toEqual({ sigla: "REPUBLICANOS", tipo: "partido" });
    for (const r of ["PROGRES", "Progressistas", "PP"]) expect(normalizarPartido(r)?.sigla).toBe("PP");
    for (const r of ["Podemos", "PODE"]) expect(normalizarPartido(r)?.sigla).toBe("PODEMOS");
    expect(normalizarPartido("PR")?.sigla).toBe("PL");
    expect(normalizarPartido("PPS")?.sigla).toBe("CIDADANIA");
    expect(normalizarPartido("UNIÃO")?.sigla).toBe("UNIÃO");
  });
  it("lideranças que não são partido ficam marcadas como bloco", () => {
    expect(normalizarPartido("Governo")).toEqual({ sigla: "GOVERNO", tipo: "bloco" });
    expect(normalizarPartido("Oposição")).toEqual({ sigla: "OPOSIÇÃO", tipo: "bloco" });
    expect(normalizarPartido("Banc Fem")).toEqual({ sigla: "BANCADA FEMININA", tipo: "bloco" });
    expect(normalizarPartido("B.Feminina")).toEqual({ sigla: "BANCADA FEMININA", tipo: "bloco" });
  });
  it("rótulo desconhecido vira null em vez de ser gravado", () => {
    expect(normalizarPartido("Partido Inventado")).toBeNull();
    expect(normalizarPartido(null)).toBeNull();
  });
});

describe("parseVotacoes", () => {
  it("gera uma linha por votação e liderança, e conta o que descartou", () => {
    const r = parseVotacoes([
      {
        sequencialVotacao: 10,
        orientacoesLideranca: [
          { partido: "PT", voto: "SIM", dataHora: "2025-01-01T10:00:00" },
          { partido: "Republica", voto: "NÃO", dataHora: "2025-01-01T10:00:00" },
          { partido: "PSDB", voto: null },
          { partido: "XYZ", voto: "SIM" },
        ],
      },
      { sequencialVotacao: 11, orientacoesLideranca: [] },
      { sequencialVotacao: 12 },
    ]);
    expect(r.linhas).toEqual([
      { id_sve: 10, sigla_partido: "PT", orientacao: "Sim" },
      { id_sve: 10, sigla_partido: "REPUBLICANOS", orientacao: "Não" },
    ]);
    expect(r.votacoesComOrientacao).toBe(1);
    expect(r.votoVazioOuDesconhecido).toBe(1);
    expect([...r.rotulosDesconhecidos]).toEqual([["XYZ", 1]]);
  });

  it("duas grafias da mesma sigla na mesma votação: vale a mais recente", () => {
    const r = parseVotacoes([
      {
        sequencialVotacao: 1,
        orientacoesLideranca: [
          { partido: "PODE", voto: "SIM", dataHora: "2019-05-01T10:00:00" },
          { partido: "Podemos", voto: "NÃO", dataHora: "2019-05-01T10:05:00" },
        ],
      },
    ]);
    expect(r.linhas).toEqual([{ id_sve: 1, sigla_partido: "PODEMOS", orientacao: "Não" }]);
  });
});

describe("alinhamento", () => {
  const orient = new Map<string, OrientacaoNormalizada>([
    ["1|PT", "Sim"],
    ["2|PT", "Não"],
    ["3|PT", "Liberado"],
    ["4|PT", "Obstrução"],
    ["5|PODEMOS", "Sim"],
  ]);
  const v = (idSve: number, partido: string | null, voto: string) => ({ idSve, partido, voto, data: "2025-01-01" });

  it("conta só votações com orientação Sim/Não e voto Sim/Não/Abstenção", () => {
    const r = alinhamento(
      [
        v(1, "PT", "Sim"), // alinhado
        v(2, "PT", "Sim"), // contra a orientação Não
        v(3, "PT", "Sim"), // orientação liberada: fora
        v(4, "PT", "Sim"), // obstrução: fora
        v(1, "PT", "P-NRV"), // não votou: fora
      ],
      orient,
    );
    expect(r).toEqual({ votacoes: 2, alinhados: 1, pct: 50 });
  });
  it("abstenção conta como não alinhada", () => {
    expect(alinhamento([v(1, "PT", "Abstenção")], orient)).toEqual({ votacoes: 1, alinhados: 0, pct: 0 });
  });
  it("PODE no voto casa com PODEMOS na orientação; sem partido ou sem orientação não conta", () => {
    expect(partidoDoVoto("PODE")).toBe("PODEMOS");
    expect(alinhamento([v(5, "PODE", "Sim"), v(5, null, "Sim"), v(9, "PT", "Sim")], orient)).toEqual({
      votacoes: 1,
      alinhados: 1,
      pct: 100,
    });
  });
  it("sem nenhuma votação com orientação o percentual é null, não zero", () => {
    expect(alinhamento([], orient).pct).toBeNull();
  });
});
