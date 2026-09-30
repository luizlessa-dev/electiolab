import { descreverFalha, validarEA20 } from "../identidades";
import type { ArquivoResultado } from "../tipos";
import { EA20, ea20 } from "./fixtures";

/** Cópia profunda para poder quebrar um campo sem contaminar outro teste. */
function copia(a: ArquivoResultado): ArquivoResultado {
  return JSON.parse(JSON.stringify(a)) as ArquivoResultado;
}

describe("identidades aritméticas dos EA20 reais", () => {
  it.each(EA20)("$nome passa sem falha bloqueante", ({ arquivo, tipoDisputa }) => {
    const r = validarEA20(ea20(arquivo), tipoDisputa);
    if (!r.ok) {
      throw new Error(`falhas: ${r.bloqueantes.map(descreverFalha).join(" | ")}`);
    }
    expect(r.bloqueantes).toHaveLength(0);
  });

  it.each(EA20)("$nome não gera nem aviso", ({ arquivo, tipoDisputa }) => {
    // As 9 amostras estão em and='f'; se um aviso aparecer aqui é sinal de que o
    // entendimento do campo mudou e o mapa precisa ser revisto.
    const r = validarEA20(ea20(arquivo), tipoDisputa);
    expect(r.falhas.map(descreverFalha)).toEqual([]);
  });
});

describe("tv = comparecimento × vagas", () => {
  it("no Senado (2 vagas) o total de votos é o dobro do comparecimento", () => {
    // Correção ao mapa de campos: `e.c = v.tv` NÃO é identidade — falha no Senador.
    const senado = ea20("ac-c0005-e021272-u.json");
    expect(senado.carg[0].nv).toBe("2");
    expect(Number(senado.v.tv)).toBe(2 * Number(senado.e.c));
    expect(validarEA20(senado, "majoritario").ok).toBe(true);
  });

  it("no majoritário de 1 vaga o total de votos é igual ao comparecimento", () => {
    const gov = ea20("mg-c0003-e021272-u.json");
    expect(Number(gov.v.tv)).toBe(Number(gov.e.c));
  });

  it("no proporcional é 1 voto por eleitor, independentemente das vagas", () => {
    const dep = ea20("ac-c0006-e021272-u.json");
    expect(dep.carg[0].nv).toBe("8");
    expect(Number(dep.v.tv)).toBe(Number(dep.e.c));
    expect(validarEA20(dep, "proporcional").ok).toBe(true);
  });

  it("acusa o Senado se for validado como proporcional", () => {
    // Prova que o tipo vem da config e não é inferido do arquivo.
    const r = validarEA20(ea20("ac-c0005-e021272-u.json"), "proporcional");
    expect(r.ok).toBe(false);
    expect(r.bloqueantes.map((f) => f.identidade)).toContain("tv = comparecimento × 1");
  });
});

describe("quebras detectadas", () => {
  it("acusa total de votos inconsistente", () => {
    const a = copia(ea20("br-c0001-e021270-u.json"));
    a.v.tv = String(Number(a.v.tv) + 1);
    const r = validarEA20(a, "majoritario");
    expect(r.ok).toBe(false);
    expect(r.bloqueantes.map((f) => f.identidade)).toContain("tv = vvc + vb + tvn");
  });

  it("acusa voto de candidato alterado", () => {
    const a = copia(ea20("mg-c0003-e021272-u.json"));
    a.carg[0].agr[0].par[0].cand[0].vap = "1";
    const r = validarEA20(a, "majoritario");
    expect(r.ok).toBe(false);
    expect(r.bloqueantes.map((f) => f.identidade)).toEqual(
      expect.arrayContaining(["par.tvan = Σ cand.vap", "vvc = Σ cand.vap + Σ par.tval + vsan"]),
    );
  });

  it("acusa proporcional sem votos de legenda", () => {
    const a = copia(ea20("ac-c0006-e021272-u.json"));
    delete a.v.vl;
    const r = validarEA20(a, "proporcional");
    expect(r.ok).toBe(false);
    expect(r.bloqueantes.map((f) => f.identidade)).toContain("vv = vnom + vl (proporcional)");
  });

  it("avisa (sem bloquear) quando o percentual do candidato não fecha", () => {
    const a = copia(ea20("rr-c0003-e021272-u.json"));
    a.carg[0].agr[0].par[0].cand[0].pvapn = "99,999999999";
    const r = validarEA20(a, "majoritario");
    expect(r.ok).toBe(true); // o número do TSE é gravado como veio; não bloqueia
    expect(r.falhas.map((f) => f.severidade)).toEqual(["aviso"]);
    expect(r.falhas[0].identidade).toBe("cand.pvapn = 100 × vap / (vvc − vsan)");
  });

  it("falha explicitamente sem carg[]", () => {
    const a = copia(ea20("rr-c0003-e021272-u.json"));
    a.carg = [];
    const r = validarEA20(a, "majoritario");
    expect(r.ok).toBe(false);
    expect(r.bloqueantes[0].identidade).toBe("carg[] presente");
  });
});

describe("cenários que NÃO são falha de identidade", () => {
  it("governador sem eleito (esae='s') passa", () => {
    const ap = ea20("ap-c0003-e021272-u.json");
    expect(ap.esae).toBe("s");
    expect(ap.mnae).toHaveLength(2);
    expect(validarEA20(ap, "majoritario").ok).toBe(true);
  });

  it("dois candidatos com e='s' em 2º turno passa", () => {
    // O nº de candidatos com e='s' NÃO precisa ser igual a `nv`: aqui são 2 para 1 vaga.
    const ma = ea20("ma-c0003-e021272-u.json");
    const eleitos = ma.carg[0].agr
      .flatMap((g) => g.par)
      .flatMap((p) => p.cand)
      .filter((c) => c.e === "s");
    expect(eleitos).toHaveLength(2);
    expect(ma.carg[0].nv).toBe("1");
    expect(eleitos.every((c) => c.st === "2º turno")).toBe(true);
    expect(validarEA20(ma, "majoritario").ok).toBe(true);
  });
});
