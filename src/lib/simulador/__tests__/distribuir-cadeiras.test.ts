import * as fs from "fs";
import * as path from "path";
import { distribuirCadeiras, type DistribuicaoEntrada } from "../distribuir-cadeiras";
import { converterEA20ParaEntrada } from "../converter-ea20";
import type { ArquivoResultado } from "../../apuracao/tipos";

const FIXTURES_APURACAO = path.join(__dirname, "../../apuracao/__tests__/fixtures");

function carregarEA20(nome: string): ArquivoResultado {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_APURACAO, nome), "utf-8"));
}

describe("distribuirCadeiras — fixtures reais do simulado do TSE", () => {
  test("Dep. Federal AC (ac-c0006-e021272-u.json): 8 vagas, todas por média (QP=0 em todos os agrupamentos)", () => {
    const entrada = converterEA20ParaEntrada(carregarEA20("ac-c0006-e021272-u.json"));
    const resultado = distribuirCadeiras(entrada);

    expect(resultado.vagas).toBe(8);
    expect(resultado.quocienteEleitoral).toBe(66697); // bate com o `carg.qe` oficial do TSE
    expect(resultado.eleitos).toHaveLength(8);
    expect(resultado.eleitos.every((e) => e.motivo === "media")).toBe(true);

    // Os 8 eleitos reais (`e:"s"`, `st:"Eleito por média"`), extraídos do bruto —
    // ver `python` de verificação usado pra montar o motor.
    const numerosEleitos = resultado.eleitos.map((e) => e.numero).sort((a, b) => a - b);
    expect(numerosEleitos).toEqual([6102, 6203, 6801, 7307, 7506, 7907, 8507, 8706]);
  });

  test("Dep. Federal RR (rr-c0006-e021272-u.json): 8 vagas, 3 por QP e 5 por média", () => {
    const entrada = converterEA20ParaEntrada(carregarEA20("rr-c0006-e021272-u.json"));
    const resultado = distribuirCadeiras(entrada);

    expect(resultado.vagas).toBe(8);
    expect(resultado.quocienteEleitoral).toBe(43007); // bate com o `carg.qe` oficial do TSE

    const porMotivo = { QP: 0, media: 0 };
    for (const e of resultado.eleitos) porMotivo[e.motivo]++;
    expect(porMotivo).toEqual({ QP: 3, media: 5 });

    // Eleitos reais (`e:"s"`), por número de urna — ver mapa de campos / conferência SQL.
    const numerosEleitos = resultado.eleitos.map((e) => e.numero).sort((a, b) => a - b);
    expect(numerosEleitos).toEqual([5901, 5903, 5904, 6001, 6002, 6007, 6102, 6104]);

    const eleitoPorNumero = new Map(resultado.eleitos.map((e) => [e.numero, e]));
    expect(eleitoPorNumero.get(5903)?.motivo).toBe("QP"); // CANDIDATO 9263, 104117 votos
    expect(eleitoPorNumero.get(6102)?.motivo).toBe("QP"); // CANDIDATO 9252, 104117 votos
    expect(eleitoPorNumero.get(6001)?.motivo).toBe("QP"); // CANDIDATO 9257, 104117 votos
  });
});

describe("distribuirCadeiras — casos de borda (dados sintéticos, para exercitar regras que os 54 gabaritos disponíveis não cobrem sozinhos)", () => {
  test("piso de 10% do QE (art. 108): candidato abaixo do piso não ocupa vaga de QP; a vaga sobra pro cálculo de médias", () => {
    // QE = 1000 / 5 = 200. Piso individual = 20.
    // Agrupamento A: 600 votos válidos → QP = 3, mas só um candidato (300 votos) está
    // acima do piso — os outros dois (10 e 5 votos) ficam de fora do QP. Só 1 vaga de
    // QP é preenchida; as outras 2 "sobram" pro cálculo de médias.
    const entrada: DistribuicaoEntrada = {
      vagas: 5,
      agrupamentos: [
        {
          numero: "A",
          tipo: "i",
          nome: "Partido A",
          votosValidos: 600,
          candidatos: [
            { id: "a1", numero: 1, nomeUrna: "A1", votos: 300, elegivel: true },
            { id: "a2", numero: 2, nomeUrna: "A2", votos: 10, elegivel: true },
            { id: "a3", numero: 3, nomeUrna: "A3", votos: 5, elegivel: true },
          ],
        },
        {
          numero: "B",
          tipo: "i",
          nome: "Partido B",
          votosValidos: 250,
          candidatos: [{ id: "b1", numero: 4, nomeUrna: "B1", votos: 250, elegivel: true }],
        },
        {
          numero: "C",
          tipo: "i",
          nome: "Partido C",
          votosValidos: 150,
          candidatos: [{ id: "c1", numero: 5, nomeUrna: "C1", votos: 150, elegivel: true }],
        },
      ],
    };

    const resultado = distribuirCadeiras(entrada);
    expect(resultado.quocienteEleitoral).toBe(200);

    const A = resultado.agrupamentos.find((a) => a.agrupamentoNumero === "A")!;
    expect(A.quocientePartidario).toBe(3); // QP bruto: floor(600/200)
    expect(A.vagasPorQp).toBe(1); // só A1 (300) está acima do piso de 20
    expect(A.vagasPorQp).toBeLessThan(A.quocientePartidario);

    // As duas vagas de QP não preenchidas em A voltam pro bolo de sobras.
    const totalVagas = resultado.agrupamentos.reduce((s, a) => s + a.vagasTotal, 0);
    expect(totalVagas).toBe(5);
    expect(resultado.eleitos.find((e) => e.candidatoId === "a1")?.motivo).toBe("QP");
    // A continua sendo o maior agrupamento e acaba levando também as vagas de média
    // que sobrarem pra ele (o piso de 10% só filtra o preenchimento do QP, nunca da
    // média) — então A2/A3, mesmo com poucos votos, podem ser eleitos, mas sempre
    // como "media", nunca como "QP".
    const a2 = resultado.eleitos.find((e) => e.candidatoId === "a2");
    const a3 = resultado.eleitos.find((e) => e.candidatoId === "a3");
    if (a2) expect(a2.motivo).toBe("media");
    if (a3) expect(a3.motivo).toBe("media");
  });

  test("candidato Anulado/Anulado sub judice/Válido (legenda) não concorre a vaga individual, mesmo com mais votos que os elegíveis", () => {
    const entrada: DistribuicaoEntrada = {
      vagas: 1,
      agrupamentos: [
        {
          numero: "A",
          tipo: "i",
          nome: "Partido A",
          votosValidos: 100,
          candidatos: [
            { id: "anulado", numero: 1, nomeUrna: "Anulado", votos: 999, elegivel: false },
            { id: "legenda", numero: 2, nomeUrna: "Legenda", votos: 500, elegivel: false },
            { id: "valido", numero: 3, nomeUrna: "Válido", votos: 50, elegivel: true },
          ],
        },
      ],
    };
    const resultado = distribuirCadeiras(entrada);
    expect(resultado.eleitos).toHaveLength(1);
    expect(resultado.eleitos[0].candidatoId).toBe("valido");
  });

  test("empate de médias entre agrupamentos: vence o candidato individualmente mais votado (art. 109 §2º), não o agrupamento com mais votos no total", () => {
    // A e B empatam a média inicial (200 cada, 0 vagas). A tem um candidato só com
    // 200 votos; B tem dois candidatos com 150 e 50 — o mais votado de B (150) perde
    // pro único candidato de A (200), então A leva a única vaga.
    const entrada: DistribuicaoEntrada = {
      vagas: 1,
      agrupamentos: [
        {
          numero: "A",
          tipo: "i",
          nome: "A",
          votosValidos: 200,
          candidatos: [{ id: "a1", numero: 1, nomeUrna: "A1", votos: 200, elegivel: true }],
        },
        {
          numero: "B",
          tipo: "i",
          nome: "B",
          votosValidos: 200,
          candidatos: [
            { id: "b1", numero: 2, nomeUrna: "B1", votos: 150, elegivel: true },
            { id: "b2", numero: 3, nomeUrna: "B2", votos: 50, elegivel: true },
          ],
        },
      ],
    };
    const resultado = distribuirCadeiras(entrada);
    expect(resultado.eleitos).toHaveLength(1);
    expect(resultado.eleitos[0].agrupamentoNumero).toBe("A");
  });

  test("empate de votos entre candidatos da mesma lista: desempate pelo `ordemDesempate` (seq do TSE), não pelo número de urna", () => {
    // Confirmado contra 13 pares reais do gabarito (54 disputas): quando dois
    // candidatos do mesmo agrupamento têm votos idênticos, o TSE elege sempre quem
    // tem `seq` (posição no arquivo) menor — nunca o de menor número de urna.
    const entrada: DistribuicaoEntrada = {
      vagas: 1,
      agrupamentos: [
        {
          numero: "A",
          tipo: "i",
          nome: "A",
          votosValidos: 100,
          candidatos: [
            { id: "numero-baixo-seq-alto", numero: 1, nomeUrna: "X", votos: 100, elegivel: true, ordemDesempate: 32 },
            { id: "numero-alto-seq-baixo", numero: 8, nomeUrna: "Y", votos: 100, elegivel: true, ordemDesempate: 14 },
          ],
        },
      ],
    };
    const resultado = distribuirCadeiras(entrada);
    expect(resultado.eleitos).toHaveLength(1);
    expect(resultado.eleitos[0].candidatoId).toBe("numero-alto-seq-baixo");
  });

  test("QE (art. 106): fração > 0,5 arredonda pra cima, ≤ 0,5 é descartada", () => {
    const base = { tipo: "i" as const, candidatos: [] as DistribuicaoEntrada["agrupamentos"][number]["candidatos"] };
    // 1001/2 = 500,5 → descarta a fração (≤ 0,5) → QE = 500
    expect(
      distribuirCadeiras({ vagas: 2, agrupamentos: [{ ...base, numero: "A", nome: "A", votosValidos: 1001 }] })
        .quocienteEleitoral,
    ).toBe(500);
    // 1002/2 = 501 → sem fração → QE = 501
    expect(
      distribuirCadeiras({ vagas: 2, agrupamentos: [{ ...base, numero: "A", nome: "A", votosValidos: 1002 }] })
        .quocienteEleitoral,
    ).toBe(501);
    // 1003/2 = 501,5 → descarta → QE = 501
    expect(
      distribuirCadeiras({ vagas: 2, agrupamentos: [{ ...base, numero: "A", nome: "A", votosValidos: 1003 }] })
        .quocienteEleitoral,
    ).toBe(501);
    // 1004/2 = 502 → QE = 502
    // 1005/2 = 502,5 → descarta → QE = 502
    expect(
      distribuirCadeiras({ vagas: 2, agrupamentos: [{ ...base, numero: "A", nome: "A", votosValidos: 1005 }] })
        .quocienteEleitoral,
    ).toBe(502);
    // 1006/2 = 503 → sem fração
    // 1007/2 = 503,5 → fração > 0,5? não, é exatamente 0,5 → descarta (regra: só
    // arredonda pra cima se a fração for MAIOR que 0,5)
    expect(
      distribuirCadeiras({ vagas: 2, agrupamentos: [{ ...base, numero: "A", nome: "A", votosValidos: 1007 }] })
        .quocienteEleitoral,
    ).toBe(503);
    // 1008/2 = 504 → QE = 504
    // fração > 0,5 real: 1009/2 = 504,5 ainda é exatamente 0,5 (denominador par nunca
    // passa de 0,5 exato) — usar vagas ímpares pra testar fração > 0,5 de verdade.
    // 1000/3 = 333,33 → descarta → 333
    expect(
      distribuirCadeiras({ vagas: 3, agrupamentos: [{ ...base, numero: "A", nome: "A", votosValidos: 1000 }] })
        .quocienteEleitoral,
    ).toBe(333);
    // 1001/3 = 333,67 → fração > 0,5 → arredonda pra cima → 334
    expect(
      distribuirCadeiras({ vagas: 3, agrupamentos: [{ ...base, numero: "A", nome: "A", votosValidos: 1001 }] })
        .quocienteEleitoral,
    ).toBe(334);
  });

  test("sobras em duas etapas (art. 109, I-III): etapa 1 exige agrupamento ≥80% do QE E candidato ≥20% do QE; etapa 2 (sem STF) não exige nada", () => {
    // QE = 3000/3 = 1000. Piso etapa 1: agrupamento ≥800, candidato ≥200.
    // A e B ficam acima dos dois pisos (900/850, candidatos com 250/210) e cada um só
    // tem UM candidato acima de 200 — então cada um leva exatamente 1 vaga na etapa 1 e
    // fica sem candidato pra disputar uma 2ª.
    // C tem muito mais votos (1250, inclusive ≥ QE — teria QP=1, mas nenhum candidato
    // seu chega nem a 10% do QE, então nem o QP fica preenchido) mas nenhum candidato
    // seu chega a 20% do QE: fica de fora da etapa 1 inteira, apesar do total maior que
    // A e B somados. A vaga que sobra vai pra etapa 2, sem piso nenhum — e aí C, com a
    // maior média entre todos, leva a vaga que a etapa 1 negou a ele.
    const entrada: DistribuicaoEntrada = {
      vagas: 3,
      agrupamentos: [
        {
          numero: "A",
          tipo: "i",
          nome: "A",
          votosValidos: 900,
          candidatos: [
            { id: "a1", numero: 1, nomeUrna: "A1", votos: 250, elegivel: true },
            { id: "a2", numero: 2, nomeUrna: "A2", votos: 30, elegivel: true },
          ],
        },
        {
          numero: "B",
          tipo: "i",
          nome: "B",
          votosValidos: 850,
          candidatos: [
            { id: "b1", numero: 3, nomeUrna: "B1", votos: 210, elegivel: true },
            { id: "b2", numero: 4, nomeUrna: "B2", votos: 40, elegivel: true },
          ],
        },
        {
          numero: "C",
          tipo: "i",
          nome: "C",
          votosValidos: 1250,
          candidatos: [
            { id: "c1", numero: 5, nomeUrna: "C1", votos: 50, elegivel: true },
            { id: "c2", numero: 6, nomeUrna: "C2", votos: 20, elegivel: true },
          ],
        },
      ],
    };

    const resultado = distribuirCadeiras(entrada);
    expect(resultado.quocienteEleitoral).toBe(1000);

    const porNumero = new Map(resultado.agrupamentos.map((a) => [a.agrupamentoNumero, a]));
    expect(porNumero.get("C")!.quocientePartidario).toBe(1); // QP bruto (1250/1000), não preenchido (nenhum candidato ≥10% do QE)
    expect(porNumero.get("C")!.vagasPorQp).toBe(0);
    expect(porNumero.get("A")!.vagasTotal).toBe(1);
    expect(porNumero.get("B")!.vagasTotal).toBe(1);
    expect(porNumero.get("C")!.vagasTotal).toBe(1); // só a etapa 2 (sem piso) dá vaga pra C

    const eleitoPorId = new Map(resultado.eleitos.map((e) => [e.candidatoId, e]));
    expect(eleitoPorId.get("a1")?.motivo).toBe("media");
    expect(eleitoPorId.get("b1")?.motivo).toBe("media");
    expect(eleitoPorId.get("c1")?.motivo).toBe("media"); // etapa 2, com só 50 votos (bem abaixo dos 20% da etapa 1)
    expect(resultado.eleitos).toHaveLength(3);
  });
});
