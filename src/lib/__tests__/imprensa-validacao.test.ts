import {
  validarExtracao,
  normProtocolo,
  type Extracao,
  type RegistroTSE,
} from "../imprensa-validacao";

// Registro real do TSE: Quaest presidencial, campo 10–13/08/2026, n=2.004.
const REG: RegistroTSE = {
  protocolo: "BR067732026",
  uf: "BR",
  cargos: "Presidente",
  nome_empresa: "QUAEST PESQUISAS, CONSULTORIA E PROJETOS LTDA.",
  dt_inicio: "2026-08-10",
  dt_fim: "2026-08-13",
  qt_entrevistados: 2004,
};

const EXTRACAO_BOA: Extracao = {
  encontrado: true,
  protocolo_citado: "BR-06773/2026",
  source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/quaest-presidente-agosto-2026/",
  instituto: "Quaest",
  amostra: 2004,
  campo_inicio: "2026-08-10",
  campo_fim: "2026-08-13",
  margem_erro: 2,
  cenario: null,
  cargo: "presidente",
  resultados: [
    { nome: "Lula", pct: 38 },
    { nome: "Flávio Bolsonaro", pct: 31 },
  ],
};

const com = (over: Partial<Extracao>): Extracao => ({ ...EXTRACAO_BOA, ...over });

describe("normProtocolo", () => {
  it("normaliza o formato editorial da imprensa para o do CSV do TSE", () => {
    expect(normProtocolo("BR-06773/2026")).toBe("BR067732026");
    expect(normProtocolo("br 06773 / 2026")).toBe("BR067732026");
  });

  it("trata null como string vazia em vez de estourar", () => {
    expect(normProtocolo(null)).toBe("");
  });
});

describe("validarExtracao — caminho feliz", () => {
  it("aceita extração que casa com protocolo, amostra e datas do TSE", () => {
    expect(validarExtracao(EXTRACAO_BOA, REG)).toEqual({ ok: true });
  });

  it("aceita quando a matéria omite o início de campo mas o fim bate", () => {
    expect(validarExtracao(com({ campo_inicio: null }), REG).ok).toBe(true);
  });
});

describe("validarExtracao — a trava tripla", () => {
  it("rejeita protocolo divergente (o caso que mais importa)", () => {
    const v = validarExtracao(com({ protocolo_citado: "BR-06868/2026" }), REG);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/protocolo diverge/);
  });

  it("rejeita matéria que não cita protocolo nenhum", () => {
    const v = validarExtracao(com({ protocolo_citado: null }), REG);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/protocolo diverge/);
  });

  it("rejeita amostra divergente — pega número alucinado com protocolo certo", () => {
    const v = validarExtracao(com({ amostra: 2000 }), REG);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/amostra diverge/);
  });

  it("rejeita fim de campo divergente", () => {
    const v = validarExtracao(com({ campo_fim: "2026-08-12" }), REG);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/fim de campo diverge/);
  });

  it("rejeita início de campo divergente", () => {
    const v = validarExtracao(com({ campo_inicio: "2026-08-09" }), REG);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/início de campo diverge/);
  });
});

describe("validarExtracao — proveniência", () => {
  it.each(["https://pt.wikipedia.org/wiki/Pesquisas", "https://www.wikiwand.com/pt/x"])(
    "rejeita %s como lastro",
    (url) => {
      const v = validarExtracao(com({ source_url: url }), REG);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.motivo).toMatch(/fonte bloqueada/);
    }
  );

  it("rejeita extração sem source_url", () => {
    const v = validarExtracao(com({ source_url: null }), REG);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/sem source_url/);
  });

  it("respeita encontrado=false mesmo com o resto preenchido", () => {
    const v = validarExtracao(com({ encontrado: false }), REG);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/não localizado/);
  });
});

describe("validarExtracao — sanidade dos percentuais", () => {
  it("rejeita menos de 2 candidatos", () => {
    const v = validarExtracao(com({ resultados: [{ nome: "Lula", pct: 38 }] }), REG);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/menos de 2 candidatos/);
  });

  it("rejeita percentual fora de 0–100", () => {
    const v = validarExtracao(
      com({ resultados: [{ nome: "A", pct: 138 }, { nome: "B", pct: 31 }] }),
      REG
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/fora de 0–100/);
  });

  it("rejeita soma implausivelmente baixa (extração truncada)", () => {
    const v = validarExtracao(
      com({ resultados: [{ nome: "A", pct: 5 }, { nome: "B", pct: 4 }] }),
      REG
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/implausível/);
  });

  it("rejeita soma implausivelmente alta (candidatos duplicados)", () => {
    const v = validarExtracao(
      com({
        resultados: [
          { nome: "A", pct: 80 },
          { nome: "B", pct: 80 },
          { nome: "C", pct: 80 },
        ],
      }),
      REG
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.motivo).toMatch(/implausível/);
  });

  it("aceita Senado somando acima de 100 — 2 vagas, o eleitor escolhe dois nomes", () => {
    const senado: RegistroTSE = { ...REG, cargos: "Senador", qt_entrevistados: 1104 };
    const v = validarExtracao(
      com({
        amostra: 1104,
        resultados: [
          { nome: "A", pct: 39.1 },
          { nome: "B", pct: 28.5 },
          { nome: "C", pct: 27.5 },
          { nome: "D", pct: 22.4 },
        ],
      }),
      senado
    );
    expect(v.ok).toBe(true);
  });
});
