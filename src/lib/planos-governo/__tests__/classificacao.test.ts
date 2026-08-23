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

  // Achado ao escrever este teste (2026-08-23), não corrigido ainda: a
  // cláusula "Bolsa Família e programas de transferência de renda" (ligada
  // por "e", não por vírgula) vira UMA keyword de 8 palavras que exige
  // bater no texto quase literalmente — "Bolsa Família" sozinho, do jeito
  // que aparece na prática, NÃO ativa esse tema por essa keyword (só bate
  // se também mencionar BPC/combate à fome/SUAS/CRAS/situação de rua no
  // mesmo parágrafo). Sub-classificação silenciosa: menos grave que os
  // bugs de falso-positivo acima (não põe conteúdo errado na fila de
  // revisão), mas real — os 12 presidenciáveis já foram classificados
  // assim. Ver nota no README/relatório da etapa 6.
  it("NÃO bate em 'Bolsa Família' sozinho — cobertura incompleta, documentada, não corrigida", () => {
    const p = "O programa Bolsa família será reforçado.";
    expect(algumMatcherBate(matchers, p, normalize(p))).toBe(false);
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
