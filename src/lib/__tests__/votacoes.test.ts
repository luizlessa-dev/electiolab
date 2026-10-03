import {
  VOTO_LABEL,
  VOTO_TOM,
  formatPct,
  normalizarVoto,
  resumoCamara,
  resumoSenado,
  rotuloResultado,
  temConteudo,
  type AggCamaraRow,
  type ResumoSenadorRow,
} from "../votacoes";

const agg = (over: Partial<AggCamaraRow> = {}): AggCamaraRow => ({
  id_legislatura: 57,
  total_votacoes: 1002,
  presencas: 843,
  votos_sim: 399,
  votos_nao: 395,
  votos_abstencao: 41,
  votos_obstrucao: 8,
  pct_presenca: "84.13",
  concordancia_partido: "69.47",
  ...over,
});

describe("resumoCamara", () => {
  it("com janela de exercício da mesma legislatura, usa o total e a presença do agregado", () => {
    const r = resumoCamara(agg(), 57);
    expect(r.votacoesNominais).toBe(1002);
    expect(r.pctPresenca).toBe(84.13);
    expect(r.presencaNaoCalculada).toBeNull();
    expect(r.concordanciaPartido).toBe(69.47);
  });

  it("suplente sem janela: NÃO publica a presença (7% seria falso) e conta só os votos dados", () => {
    const r = resumoCamara(agg({ total_votacoes: 1123, presencas: 83, pct_presenca: "7.39" }), null);
    expect(r.pctPresenca).toBeNull();
    expect(r.votacoesNominais).toBe(83);
    expect(r.presencaNaoCalculada).toMatch(/período de exercício/);
  });

  it("deputado sem partido não tem alinhamento com a bancada", () => {
    expect(resumoCamara(agg({ concordancia_partido: "100" }), 57, "S.PART.").concordanciaPartido).toBeNull();
    expect(resumoCamara(agg({ concordancia_partido: "100" }), 57, "Sem partido").concordanciaPartido).toBeNull();
    expect(resumoCamara(agg({ concordancia_partido: "69.47" }), 57, "PL").concordanciaPartido).toBe(69.47);
  });

  it("janela de outra legislatura não vale para esta", () => {
    expect(resumoCamara(agg({ id_legislatura: 58 }), 57).pctPresenca).toBeNull();
  });

  it("agregado sem legislatura não conta como janela conhecida", () => {
    expect(resumoCamara(agg({ id_legislatura: null }), 57).pctPresenca).toBeNull();
  });

  it("concordância nula continua nula, e campos numéricos como string viram número", () => {
    const r = resumoCamara(agg({ concordancia_partido: null, votos_sim: "10" }), 57);
    expect(r.concordanciaPartido).toBeNull();
    expect(r.votosSim).toBe(10);
  });
});

const sen = (over: Partial<ResumoSenadorRow> = {}): ResumoSenadorRow => ({
  votacoes_nominais: 337,
  votos_sim: 216,
  votos_nao: 40,
  votos_abstencao: 2,
  ausencias_justificadas: 96,
  votacoes_secretas: 12,
  pct_presenca: "73.3",
  pct_faltas_nao_justificadas: "2.1",
  pct_presenca_12m: "80.0",
  primeira_sessao: "2019-03-19",
  ultima_sessao: "2026-09-03",
  ...over,
});

describe("resumoSenado", () => {
  it("repassa presença, faltas sem justificativa e janela de 12 meses", () => {
    const r = resumoSenado(sen());
    expect(r.casa).toBe("senado");
    expect(r.pctPresenca).toBe(73.3);
    expect(r.pctFaltasNaoJustificadas).toBe(2.1);
    expect(r.pctPresenca12m).toBe(80);
    expect(r.ausenciasJustificadas).toBe(96);
    expect(r.presencaNaoCalculada).toBeNull();
  });

  it("sem votações nominais: sem percentuais e com aviso", () => {
    const r = resumoSenado(sen({ votacoes_nominais: 0, pct_presenca: null, pct_faltas_nao_justificadas: null }));
    expect(r.pctPresenca).toBeNull();
    expect(r.pctFaltasNaoJustificadas).toBeNull();
    expect(r.presencaNaoCalculada).toMatch(/Sem votações nominais/);
  });
});

describe("normalizarVoto", () => {
  it("aceita os valores conhecidos", () => {
    expect(normalizarVoto("sim")).toBe("sim");
    expect(normalizarVoto("ausencia_justificada")).toBe("ausencia_justificada");
  });

  it("código novo, vazio ou nulo cai em nao_classificado em vez de quebrar", () => {
    expect(normalizarVoto("P-OD")).toBe("nao_classificado");
    expect(normalizarVoto("")).toBe("nao_classificado");
    expect(normalizarVoto(null)).toBe("nao_classificado");
    expect(normalizarVoto(undefined)).toBe("nao_classificado");
  });

  it("todo voto conhecido tem rótulo e tom", () => {
    for (const v of Object.keys(VOTO_LABEL)) {
      expect(VOTO_LABEL[v as keyof typeof VOTO_LABEL]).toBeTruthy();
      expect(["positive", "negative", "neutral"]).toContain(VOTO_TOM[v as keyof typeof VOTO_TOM]);
    }
  });
});

describe("formatPct e temConteudo", () => {
  it("formata em pt-BR e usa travessão para ausente", () => {
    expect(formatPct(83.4)).toBe("83,4%");
    expect(formatPct(100)).toBe("100,0%");
    expect(formatPct(null)).toBe("—");
    expect(formatPct(Number.NaN)).toBe("—");
  });

  it("o bloco some quando não há votos nem votações recentes", () => {
    expect(temConteudo(null)).toBe(false);
    const vazio = { resumo: resumoSenado(sen({ votacoes_nominais: 0 })), recentes: [] };
    expect(temConteudo(vazio)).toBe(false);
    expect(temConteudo({ ...vazio, resumo: resumoSenado(sen()) })).toBe(true);
  });
});

describe("rotuloResultado", () => {
  it("traduz os códigos do Senado e mantém os da Câmara", () => {
    expect(rotuloResultado("A")).toBe("aprovada");
    expect(rotuloResultado("R")).toBe("rejeitada");
    expect(rotuloResultado("aprovada")).toBe("aprovada");
    expect(rotuloResultado("Rejeitada")).toBe("rejeitada");
  });

  it("vazio vira null e valor desconhecido passa como veio, em minúsculas", () => {
    expect(rotuloResultado(null)).toBeNull();
    expect(rotuloResultado("  ")).toBeNull();
    expect(rotuloResultado("Prejudicada")).toBe("prejudicada");
  });
});
