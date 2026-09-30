import { linhaTotalizacao, normalizarHierarquia, retencaoDoBruto } from "../resultados";
import type { ArquivoResultado } from "../tipos";
import { EA20, ea20 } from "./fixtures";

const META = { url: "https://exemplo/x.json", etag: 'W/"abc"', lastModified: null, arquivoId: 7 };

function copia(a: ArquivoResultado): ArquivoResultado {
  return JSON.parse(JSON.stringify(a)) as ArquivoResultado;
}

describe("linhaTotalizacao", () => {
  it("mapeia os blocos v/s/e do Presidente BR sem alterar número", () => {
    const a = ea20("br-c0001-e021270-u.json");
    const l = linhaTotalizacao(42, a, META);

    expect(l).toMatchObject({
      disputa_id: 42,
      arquivo_id: 7,
      url_origem: META.url,
      idg: "172098798",
      etag: 'W/"abc"',
      andamento: "f",
      sem_eleito_tse: false,
      mensagens_sem_eleito: [],
      // dg/hg = 24/09/2026 16:12:52 Brasília; dt/ht = 16:12:34 (totalização ≠ geração)
      gerado_em: "2026-09-24T19:12:52.000Z",
      data_hora_total: "2026-09-24T19:12:34.000Z",
      secoes_total: 528951,
      secoes_totalizadas: 528951,
      secoes_nao_totalizadas: 0,
      pct_secoes_totalizadas: 100,
      eleitorado_total: 163079139,
      eleitorado_instalado: 163078872,
      eleitorado_nao_instalado: 267,
      comparecimento: 138863131,
      total_votos: 138863131,
      votos_validos_com_anulados: 120704576,
      votos_validos: 100982116,
      votos_nominais: 100982116,
      anulados: 9218887,
      anulados_sub_judice: 10503573,
      votos_sem_candidato: 143627,
      brancos: 9118018,
      nulos: 9040537,
      nulos_diretos: 9040537,
      nulos_tecnicos: 0,
      vscv: 0,
    });
    // Majoritário não tem legenda: a coluna fica nula, não zero.
    expect(l.votos_legenda).toBeNull();
  });

  it("guarda vl no proporcional e as mensagens de 'sem eleito'", () => {
    expect(linhaTotalizacao(1, ea20("ac-c0006-e021272-u.json"), META).votos_legenda).toBe(78804);

    const ap = linhaTotalizacao(1, ea20("ap-c0003-e021272-u.json"), META);
    expect(ap.sem_eleito_tse).toBe(true);
    expect(ap.mensagens_sem_eleito).toHaveLength(2);
    expect(ap.mensagens_sem_eleito).toEqual(
      expect.arrayContaining([expect.stringContaining("anulada sub judice")]),
    );
  });
});

describe("normalizarHierarquia", () => {
  it("achata agr → par → cand do Presidente BR", () => {
    const { agrupamentos, partidos, candidatos, vinculados } = normalizarHierarquia(
      ea20("br-c0001-e021270-u.json"),
      42,
      99,
    );
    expect(agrupamentos).toHaveLength(13);
    expect(partidos).toHaveLength(13);
    expect(candidatos).toHaveLength(13);
    expect(new Set(agrupamentos.map((a) => a.tipo))).toEqual(new Set(["i", "c", "f"]));
    // Toda linha carrega a marca da versão — é ela que permite apagar o que saiu.
    expect(candidatos.every((c) => c.totalizacao_id === 99 && c.disputa_id === 42)).toBe(true);

    const primeiro = candidatos.find((c) => c.numero === 57)!;
    expect(primeiro).toMatchObject({
      sqcand: "41592406",
      numero: 57,
      posicao: 1,
      votos_apurados: 10503573,
      pct_tse: 8.712251427, // pvapn, as 9 casas, como veio
      destinacao: "Anulado sub judice",
      situacao: "2º turno",
      eleito: true,
      substituidos: null,
    });

    // Vice vem em vs[] com tp='v'.
    expect(vinculados.size).toBe(13);
    expect(vinculados.get("41592406")).toEqual([
      expect.objectContaining({ papel: "vice", partido_sigla: expect.any(String) }),
    ]);
  });

  it("mapeia os dois suplentes do Senado e o candidato substituído", () => {
    const { candidatos, vinculados } = normalizarHierarquia(
      ea20("ac-c0005-e021272-u.json"),
      1,
      1,
    );
    expect(candidatos).toHaveLength(24);

    const eleito = candidatos.find((c) => c.numero === 571)!;
    expect(eleito.situacao).toBe("Eleito");
    expect(eleito.eleito).toBe(true);
    // subs[] = candidatos substituídos por este; vem sem sqcand e sem votos.
    expect(eleito.substituidos).toEqual([
      { nm: "CANDIDATO 9366", nmu: "CANDIDATO 9366", sgp: "P 9998" },
    ]);

    expect(vinculados.get(eleito.sqcand as string)?.map((v) => v.papel)).toEqual([
      "suplente_1",
      "suplente_2",
    ]);
  });

  it("guarda legenda e federação no proporcional", () => {
    const { agrupamentos, partidos, candidatos } = normalizarHierarquia(
      ea20("ac-c0006-e021272-u.json"),
      1,
      1,
    );
    // 22 agrupamentos e 25 partidos: uma federação agrupa mais de um partido.
    expect(agrupamentos).toHaveLength(22);
    expect(partidos).toHaveLength(25);
    expect(candidatos).toHaveLength(176);

    const comLegenda = partidos.find((p) => p.numero === 62)!;
    expect(comLegenda).toMatchObject({
      destinacao: "Válido (legenda)",
      votos_legenda_total: 3069,
      votos_legenda_pura: 3069,
    });

    const federados = partidos.filter((p) => p.federacao_numero !== null);
    expect(federados.length).toBeGreaterThan(0);
    expect(federados.every((p) => p.agrupamento_tipo === "f")).toBe(true);
    // par.nfed vem '' nos partidos isolados: virou null, não string vazia.
    expect(partidos.filter((p) => p.federacao_numero === "")).toHaveLength(0);
  });

  it("não inventa vínculo onde o TSE não manda vs[]", () => {
    const { vinculados } = normalizarHierarquia(ea20("ac-c0006-e021272-u.json"), 1, 1);
    expect(vinculados.size).toBe(0);
  });

  it.each(EA20)("$nome: nenhum candidato perdido no achatamento", ({ arquivo }) => {
    const a = ea20(arquivo);
    const esperado = a.carg[0].agr
      .flatMap((g) => g.par)
      .flatMap((p) => p.cand ?? []).length;
    const { candidatos } = normalizarHierarquia(a, 1, 1);
    expect(candidatos).toHaveLength(esperado);
    // A chave natural do snapshot é (disputa_id, sqcand): não pode repetir.
    expect(new Set(candidatos.map((c) => c.sqcand)).size).toBe(esperado);
  });
});

describe("retencaoDoBruto", () => {
  const maj = ea20("mg-c0003-e021272-u.json");
  const prop = ea20("ac-c0006-e021272-u.json");

  it("majoritário guarda todas as versões", () => {
    expect(retencaoDoBruto("majoritario", maj, null)).toBe("completa");
    expect(retencaoDoBruto("majoritario", maj, 42)).toBe("completa");
  });

  it("proporcional final é 'final'", () => {
    expect(prop.and).toBe("f");
    expect(retencaoDoBruto("proporcional", prop, 90)).toBe("final");
  });

  it("proporcional marca um bruto a cada faixa de 10%", () => {
    const parcial = copia(prop);
    parcial.and = "p";
    parcial.s.pstn = "23,456789";

    // Primeira vez nesta faixa (20–30%) → marco.
    expect(retencaoDoBruto("proporcional", parcial, null)).toBe("marco");
    expect(retencaoDoBruto("proporcional", parcial, 15)).toBe("marco");
    // Já havia versão na mesma faixa → só 'ultima', que é descartável.
    expect(retencaoDoBruto("proporcional", parcial, 21)).toBe("ultima");
    expect(retencaoDoBruto("proporcional", parcial, 23.1)).toBe("ultima");
  });
});
