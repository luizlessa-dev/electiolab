import { alvosEA20, coletarAcompanhamento, type AcompanhamentoEleicao } from "../acompanhamento";
import type { ConfigApuracao, EleicaoConfig } from "../config";
import type { RepositorioApuracao } from "../repositorio";
import type { ClienteTse, RespostaTse } from "../tse-cliente";
import { baseDoAmbiente } from "../urls";
import { ea14Federal, ea15Acre, eleC } from "./fixtures";

const ENV = {
  TSE_BASE_SIMULADO: "https://resultados-sim.tse.jus.br/simulado",
  TSE_AMB_SIMULADO: "simulado2026",
};

const FEDERAL: EleicaoConfig = {
  id: 1,
  codigoEleicao: 21270,
  codigoEleicao2t: 21271,
  codigoPleito: 17801,
  ciclo: "ele2026",
  turno: 1,
  tipo: 8,
  descricao: "Federal",
  cargos: [{ id: 10, codigo: 1, nome: "Presidente", tipoDisputa: "majoritario" }],
};

const ESTADUAL: EleicaoConfig = {
  id: 2,
  codigoEleicao: 21272,
  codigoEleicao2t: 21273,
  codigoPleito: 17801,
  ciclo: "ele2026",
  turno: 1,
  tipo: 1,
  descricao: "Estadual",
  cargos: [
    { id: 30, codigo: 3, nome: "Governador", tipoDisputa: "majoritario" },
    { id: 50, codigo: 5, nome: "Senador", tipoDisputa: "majoritario" },
    { id: 60, codigo: 6, nome: "Deputado Federal", tipoDisputa: "proporcional" },
    { id: 70, codigo: 7, nome: "Deputado Estadual", tipoDisputa: "proporcional" },
    { id: 80, codigo: 8, nome: "Deputado Distrital", tipoDisputa: "proporcional" },
  ],
};

function config(eleicoes: EleicaoConfig[]): ConfigApuracao {
  return {
    base: baseDoAmbiente("simulado", ENV),
    templates: eleC().arq,
    idg: "1",
    eleicoes,
  };
}

/** Repositório em memória com só o que `coletarAcompanhamento` usa. */
function repoFalso(estados: Map<string, { idg: string | null; etag: string | null }> = new Map()) {
  const acompanhamento: Record<string, unknown>[] = [];
  const brutos: Record<string, unknown>[] = [];
  const repo = {
    async estadosAcompanhamento() {
      return new Map(
        [...estados].map(([k, v]) => [k, { ...v, lastModified: null }]),
      );
    },
    async salvarArquivoBruto(l: Record<string, unknown>) {
      brutos.push(l);
      return brutos.length;
    },
    async upsertAcompanhamento(linhas: Record<string, unknown>[]) {
      acompanhamento.push(...linhas);
    },
    async abrangenciasConhecidas() {
      return [
        { abrangencia: "br", tipo_abrangencia: "br", uf: null, municipio_codigo: null },
        { abrangencia: "mg", tipo_abrangencia: "uf", uf: "mg", municipio_codigo: null },
        { abrangencia: "ac", tipo_abrangencia: "uf", uf: "ac", municipio_codigo: null },
      ];
    },
  };
  return { repo: repo as unknown as RepositorioApuracao, acompanhamento, brutos };
}

function clienteFalso(respostas: (url: string) => RespostaTse) {
  const pedidos: { url: string; etag: string | null | undefined }[] = [];
  const cliente = {
    async buscar(url: string, cond: { etag?: string | null } = {}) {
      pedidos.push({ url, etag: cond.etag });
      return respostas(url);
    },
  };
  return { cliente: cliente as unknown as ClienteTse, pedidos };
}

const ok = (corpo: unknown, etag = 'W/"1"'): RespostaTse => ({
  resultado: "200",
  corpo,
  etag,
  lastModified: null,
  bytes: 1,
});

describe("coletarAcompanhamento — EA14", () => {
  it("grava as 29 abrangências da eleição federal e devolve as UFs", async () => {
    const { repo, acompanhamento, brutos } = repoFalso();
    const { cliente, pedidos } = clienteFalso(() => ok(ea14Federal()));

    const r = await coletarAcompanhamento(cliente, repo, config([FEDERAL]), { ea15: false });

    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].url).toContain("/21270/dados/br/br-e021270-ab.json");
    // 1 br + 27 UFs + zz
    expect(acompanhamento).toHaveLength(29);
    expect(r[0].ufs).toHaveLength(28);
    expect(r[0].ufs).toContain("zz");
    expect(r[0].doCache).toBe(false);
    expect(brutos[0]).toMatchObject({ tipo: "EA14", idg: "172098675", retencao: "completa" });
  });

  it("normaliza seções, percentual de 9 casas e data/hora em UTC", async () => {
    const { repo, acompanhamento } = repoFalso();
    const { cliente } = clienteFalso(() => ok(ea14Federal()));
    await coletarAcompanhamento(cliente, repo, config([FEDERAL]), { ea15: false });

    const br = acompanhamento.find((l) => l.abrangencia === "br")!;
    expect(br).toMatchObject({
      eleicao_id: 1,
      tipo_abrangencia: "br",
      uf: null,
      andamento: "f",
      secoes_total: 528951,
      secoes_totalizadas: 528951,
      pct_secoes_totalizadas: 100,
      ufs_finais: 28,
      // dt/ht = 25/09/2026 06:45:18 em Brasília
      data_hora_total: "2026-09-25T09:45:18.000Z",
    });

    const pi = acompanhamento.find((l) => l.abrangencia === "pi")!;
    expect(pi).toMatchObject({
      tipo_abrangencia: "uf",
      uf: "pi",
      municipios_finais: 224,
      secoes_total: 11803,
    });
    // Campos que só existem na abrangência BR ficam nulos na UF, e vice-versa.
    expect(pi.ufs_finais).toBeNull();
    expect(br.municipios_finais).toBeNull();
  });

  it("só grava idg/etag na linha que identifica o arquivo", async () => {
    // Senão o EA14 apagaria o ETag de que o EA15 depende no ciclo seguinte.
    const { repo, acompanhamento } = repoFalso();
    const { cliente } = clienteFalso(() => ok(ea14Federal(), 'W/"ea14"'));
    await coletarAcompanhamento(cliente, repo, config([FEDERAL]), { ea15: false });

    const br = acompanhamento.find((l) => l.abrangencia === "br")!;
    expect(br).toMatchObject({ idg: "172098675", etag: 'W/"ea14"' });
    expect(br.url_origem).toContain("br-e021270-ab.json");

    const mg = acompanhamento.find((l) => l.abrangencia === "mg")!;
    expect("idg" in mg).toBe(false);
    expect("etag" in mg).toBe(false);
    expect("url_origem" in mg).toBe(false);
  });

  it("manda o ETag guardado na requisição condicional", async () => {
    const { repo } = repoFalso(new Map([["br", { idg: "1", etag: 'W/"anterior"' }]]));
    const { cliente, pedidos } = clienteFalso(() => ok(ea14Federal()));
    await coletarAcompanhamento(cliente, repo, config([FEDERAL]), { ea15: false });
    expect(pedidos[0].etag).toBe('W/"anterior"');
  });

  it("em 304 usa as abrangências do banco e não grava nada", async () => {
    const { repo, acompanhamento } = repoFalso();
    const { cliente } = clienteFalso(() => ({ resultado: "304" }));
    const r = await coletarAcompanhamento(cliente, repo, config([FEDERAL]), { ea15: false });

    expect(r[0].doCache).toBe(true);
    expect(r[0].ufs).toEqual(["ac", "mg"]);
    expect(acompanhamento).toHaveLength(0);
  });

  it("interrompe o ciclo se o EA14 falhar — sem ele não há EA20 a pedir", async () => {
    const { repo } = repoFalso();
    const { cliente } = clienteFalso(() => ({ resultado: "erro", mensagem: "timeout de 15000ms" }));
    await expect(
      coletarAcompanhamento(cliente, repo, config([FEDERAL]), { ea15: false }),
    ).rejects.toThrow(/EA14 da eleição 21270 falhou[\s\S]*timeout/);
  });
});

describe("coletarAcompanhamento — EA15", () => {
  it("pede um EA15 por UF e grava os municípios com abrangência uf+código", async () => {
    const { repo, acompanhamento } = repoFalso();
    const { cliente, pedidos } = clienteFalso((url) =>
      url.includes("/br/br-") ? ok(ea14Federal()) : ok(ea15Acre(), 'W/"ea15"'),
    );

    await coletarAcompanhamento(cliente, repo, config([FEDERAL]), { ea15: true });

    // 1 EA14 + 28 EA15 (27 UFs + zz)
    expect(pedidos).toHaveLength(29);

    const mun = acompanhamento.filter((l) => l.tipo_abrangencia === "mun");
    expect(mun.length).toBeGreaterThan(0);
    const acrelandia = mun.find((l) => l.municipio_codigo === "01007")!;
    // A UF vem do arquivo pedido, porque a entrada `mun` só traz o código de 5 dígitos.
    expect(acrelandia).toMatchObject({
      abrangencia: "ac01007",
      uf: "ac",
      municipio_codigo: "01007",
      secoes_total: 156,
    });
    expect("idg" in acrelandia).toBe(false);
  });

  it("não pede EA15 quando desligado", async () => {
    const { repo } = repoFalso();
    const { cliente, pedidos } = clienteFalso(() => ok(ea14Federal()));
    await coletarAcompanhamento(cliente, repo, config([FEDERAL]), { ea15: false });
    expect(pedidos).toHaveLength(1);
  });

  it("um EA15 com erro não derruba o ciclo", async () => {
    const { repo } = repoFalso();
    const { cliente } = clienteFalso((url) =>
      url.includes("/br/br-") ? ok(ea14Federal()) : { resultado: "404" },
    );
    const r = await coletarAcompanhamento(cliente, repo, config([FEDERAL]), { ea15: true });
    expect(r[0].ufs).toHaveLength(28);
  });
});

describe("alvosEA20", () => {
  function acompanhamentos(): AcompanhamentoEleicao[] {
    const ufs = ["ac", "mg", "sp", "df"];
    const abrangencias = [
      { abrangencia: "br", tipoAbrangencia: "br" as const, uf: null, municipioCodigo: null, andamento: "f", pctSecoesTotalizadas: 100 },
      ...ufs.map((uf) => ({
        abrangencia: uf,
        tipoAbrangencia: "uf" as const,
        uf,
        municipioCodigo: null,
        andamento: "f",
        pctSecoesTotalizadas: 100,
      })),
    ];
    return [
      { eleicao: FEDERAL, ufs, abrangencias, doCache: false },
      { eleicao: ESTADUAL, ufs, abrangencias, doCache: false },
    ];
  }

  it("onda 1: Presidente em BR + UFs, Governador e Senador só por UF", () => {
    const alvos = alvosEA20(config([FEDERAL, ESTADUAL]), acompanhamentos(), { cargos: [1, 3, 5] });

    const presidente = alvos.filter((a) => a.cargo.codigo === 1);
    expect(presidente.map((a) => a.abrangencia)).toEqual(["br", "ac", "mg", "sp", "df"]);

    // Governador/Senador não existem na abrangência BR: nenhuma URL é montada para lá.
    for (const cargo of [3, 5]) {
      const doCargo = alvos.filter((a) => a.cargo.codigo === cargo);
      expect(doCargo.map((a) => a.abrangencia)).toEqual(["ac", "mg", "sp", "df"]);
    }
    expect(alvos).toHaveLength(5 + 4 + 4);
  });

  it("não inclui cargo fora da onda", () => {
    const alvos = alvosEA20(config([FEDERAL, ESTADUAL]), acompanhamentos(), { cargos: [1, 3, 5] });
    expect(alvos.some((a) => a.cargo.codigo === 6)).toBe(false);

    const onda2 = alvosEA20(config([FEDERAL, ESTADUAL]), acompanhamentos(), { cargos: [6] });
    expect(onda2.map((a) => a.abrangencia)).toEqual(["ac", "mg", "sp", "df"]);
  });

  it("onda 2: Deputado Distrital só no DF, Deputado Estadual em todas as UFs menos o DF", () => {
    // Regra do domínio, não do ele-c.json (que lista os dois cargos juntos, sem UF):
    // no DF a Câmara Legislativa ocupa o lugar da Assembleia. Sem este filtro o
    // coletor pediria df-c0007 e c0008 das outras UFs — 404 por descuido (regra 3).
    const alvos = alvosEA20(config([FEDERAL, ESTADUAL]), acompanhamentos(), { cargos: [6, 7, 8] });

    const federal = alvos.filter((a) => a.cargo.codigo === 6);
    expect(federal.map((a) => a.abrangencia).sort()).toEqual(["ac", "df", "mg", "sp"]);

    const estadual = alvos.filter((a) => a.cargo.codigo === 7);
    expect(estadual.map((a) => a.abrangencia).sort()).toEqual(["ac", "mg", "sp"]);
    expect(estadual.some((a) => a.abrangencia === "df")).toBe(false);

    const distrital = alvos.filter((a) => a.cargo.codigo === 8);
    expect(distrital.map((a) => a.abrangencia)).toEqual(["df"]);
  });

  it("monta URL pelo padrão da config, com a UF no diretório e no nome", () => {
    const alvos = alvosEA20(config([FEDERAL, ESTADUAL]), acompanhamentos(), { cargos: [1, 3] });
    expect(alvos.find((a) => a.cargo.codigo === 1 && a.abrangencia === "br")!.url).toBe(
      "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json",
    );
    expect(alvos.find((a) => a.cargo.codigo === 3 && a.abrangencia === "mg")!.url).toBe(
      "https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/mg/mg-c0003-e021272-u.json",
    );
  });

  it("não gera alvo para abrangência que o TSE não listou", () => {
    const semUfs: AcompanhamentoEleicao[] = [
      {
        eleicao: FEDERAL,
        ufs: [],
        abrangencias: [
          { abrangencia: "br", tipoAbrangencia: "br", uf: null, municipioCodigo: null, andamento: "f", pctSecoesTotalizadas: 100 },
        ],
        doCache: false,
      },
    ];
    const alvos = alvosEA20(config([FEDERAL]), semUfs, { cargos: [1] });
    expect(alvos.map((a) => a.abrangencia)).toEqual(["br"]);
  });
});
