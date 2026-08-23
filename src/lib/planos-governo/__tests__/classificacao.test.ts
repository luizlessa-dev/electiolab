import { extractKeywords, algumMatcherBate, normalize, splitParagraphs } from "../classificacao";

const DESCRICAO_TECNOLOGIA =
  "Entra: redes sociais, responsabilidade de plataformas, Marco Civil, IA, dados pessoais, cibersegurança, desinformação como regulação, pesquisa e inovação. Não entra: educação digital em escolas (educacao).";

const DESCRICAO_ASSISTENCIA_SOCIAL =
  "Entra: Bolsa Família e programas de transferência de renda, BPC, combate à fome, SUAS, CRAS, população em situação de rua. Não entra: previdência contributiva (trabalho-previdencia).";

describe("extractKeywords", () => {
  it("extrai só a cláusula Entra, ignorando Não entra", () => {
    const matchers = extractKeywords(DESCRICAO_TECNOLOGIA);
    const labels = matchers.map((m) => m.label);
    expect(labels).toContain("redes sociais");
    expect(labels).not.toContain("educacao digital em escolas");
  });

  it("marca keyword toda em maiúscula no original como sigla (case-sensitive)", () => {
    const matchers = extractKeywords(DESCRICAO_TECNOLOGIA);
    const ia = matchers.find((m) => m.label === "IA");
    expect(ia?.caseSensitive).toBe(true);
    const redesSociais = matchers.find((m) => m.label === "redes sociais");
    expect(redesSociais?.caseSensitive).toBe(false);
  });

  it("retorna vazio se a descrição não tem o formato Entra/Não entra", () => {
    expect(extractKeywords("texto sem o formato esperado")).toEqual([]);
  });
});

describe("algumMatcherBate — regressão do achado de 2026-08-22 (substring de 'IA')", () => {
  const matchers = extractKeywords(DESCRICAO_TECNOLOGIA);

  it("NÃO bate em 'economia' (continha 'ia' como substring antes do fix)", () => {
    const p = "O crescimento da economia é prioridade do nosso governo.";
    expect(algumMatcherBate(matchers, p, normalize(p))).toBe(false);
  });

  it("NÃO bate em 'democracia' (mesmo motivo)", () => {
    const p = "Defendemos o fortalecimento da democracia brasileira.";
    expect(algumMatcherBate(matchers, p, normalize(p))).toBe(false);
  });

  it("bate em 'IA' isolado (uso real do tema)", () => {
    const p = "Vamos regulamentar o uso de IA na administração pública.";
    expect(algumMatcherBate(matchers, p, normalize(p))).toBe(true);
  });

  it("bate em 'redes sociais' (keyword de frase, não sigla)", () => {
    const p = "A moderação de conteúdo nas redes sociais precisa de regras claras.";
    expect(algumMatcherBate(matchers, p, normalize(p))).toBe(true);
  });
});

describe("algumMatcherBate — regressão do achado de 2026-08-23 (colisão SUAS/suas)", () => {
  const matchers = extractKeywords(DESCRICAO_ASSISTENCIA_SOCIAL);

  it("NÃO bate no pronome possessivo 'suas' (início de frase, maiúscula)", () => {
    const p = "Suas famílias merecem apoio do Estado.";
    expect(algumMatcherBate(matchers, p, normalize(p))).toBe(false);
  });

  it("NÃO bate no pronome possessivo 'suas' (minúscula, meio de frase)", () => {
    const p = "Nossas propostas incluem suas demandas mais urgentes.";
    expect(algumMatcherBate(matchers, p, normalize(p))).toBe(false);
  });

  it("bate na sigla SUAS de verdade (maiúscula)", () => {
    const p = "Os beneficiários do SUAS terão prioridade no atendimento.";
    expect(algumMatcherBate(matchers, p, normalize(p))).toBe(true);
  });

  it("bate em CRAS (mesma classe de sigla)", () => {
    const p = "Vamos ampliar as unidades do CRAS em todo o estado.";
    expect(algumMatcherBate(matchers, p, normalize(p))).toBe(true);
  });

});

describe("algumMatcherBate — regressão do achado de 2026-08-23 (sub-classificação por cláusula composta)", () => {
  // "Bolsa Família e programas de transferência de renda" virava UMA keyword
  // de 8 palavras que quase nunca batia no texto real. Fix: keyword longa
  // ligada por e/quando/como também gera candidato truncado no conector.
  const matchersAssistencia = extractKeywords(DESCRICAO_ASSISTENCIA_SOCIAL);

  it("agora bate em 'Bolsa Família' sozinho, sem precisar da cláusula inteira", () => {
    const p = "O programa Bolsa família será reforçado.";
    expect(algumMatcherBate(matchersAssistencia, p, normalize(p))).toBe(true);
  });

  it("a frase completa original continua batendo também (nada foi removido)", () => {
    const p = "Vamos ampliar a Bolsa Família e programas de transferência de renda para famílias vulneráveis.";
    expect(algumMatcherBate(matchersAssistencia, p, normalize(p))).toBe(true);
  });

  const DESCRICAO_MEIO_AMBIENTE =
    "Entra: desmatamento, Amazônia, clima, licenciamento ambiental, terras indígenas quando tratadas como preservação, biodiversidade. Não entra: matriz energética e transição energética (energia).";
  const matchersMeioAmbiente = extractKeywords(DESCRICAO_MEIO_AMBIENTE);

  it("bate em 'terras indígenas' sozinho (truncado em 'quando')", () => {
    const p = "A demarcação de terras indígenas é prioridade do nosso governo.";
    expect(algumMatcherBate(matchersMeioAmbiente, p, normalize(p))).toBe(true);
  });

  const DESCRICAO_TRIBUTACAO =
    "Entra: reforma tributária, alíquotas, renúncia fiscal, imposto de renda, imposto sobre patrimônio e heranças. Não entra: gasto público (economia).";
  const matchersTributacao = extractKeywords(DESCRICAO_TRIBUTACAO);

  it("bate em 'imposto sobre patrimônio' sozinho (truncado em 'e')", () => {
    const p = "Vamos taxar mais o imposto sobre patrimônio dos mais ricos.";
    expect(algumMatcherBate(matchersTributacao, p, normalize(p))).toBe(true);
  });

  it("não trunca frase sem conector (preposição interna não conta)", () => {
    // "população em situação de rua" não tem " e "/" quando "/" como " —
    // truncar em "em" quebraria o termo técnico, então fica intacto.
    const matchers = extractKeywords(DESCRICAO_ASSISTENCIA_SOCIAL);
    const labels = matchers.map((m) => m.label);
    expect(labels).toContain("populacao em situacao de rua");
    expect(labels).not.toContain("populacao");
  });
});

describe("normalize", () => {
  it("remove acento e baixa a caixa", () => {
    expect(normalize("Educação Pública")).toBe("educacao publica");
  });
});

describe("splitParagraphs", () => {
  it("separa por linha em branco dupla e une quebra de linha simples num texto corrido", () => {
    const texto = "Primeira linha do parágrafo um,\nsegunda linha do mesmo parágrafo.\n\nPrimeiro parágrafo dois, corrido também.";
    const paras = splitParagraphs(texto);
    expect(paras).toEqual([
      "Primeira linha do parágrafo um, segunda linha do mesmo parágrafo.",
      "Primeiro parágrafo dois, corrido também.",
    ]);
  });

  it("descarta fragmento curto (ex.: número de página solto)", () => {
    const texto = "40\n\nUm parágrafo de verdade, longo o suficiente pra não ser descartado pelo filtro de tamanho mínimo.";
    const paras = splitParagraphs(texto);
    expect(paras).toHaveLength(1);
    expect(paras[0]).toContain("Um parágrafo de verdade");
  });

  it("mantém item de lista curto o bastante como parágrafo válido, desde que passe do mínimo", () => {
    const texto = "Implantar protocolo estadual de atendimento humanizado em delegacias e hospitais.";
    expect(splitParagraphs(texto)).toEqual([texto]);
  });
});
