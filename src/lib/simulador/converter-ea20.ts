/**
 * Converte um EA20 proporcional (`ArquivoResultado`, já tipado como o TSE manda —
 * ver `src/lib/apuracao/tipos.ts`) para a entrada do motor `distribuirCadeiras`.
 *
 * Só serve pra alimentar o motor a partir do arquivo bruto (testes com fixtures reais,
 * ou uma simulação ao vivo antes do TSE fechar a disputa) — não é usado pelo coletor
 * nem grava nada; regra 8 do `apuracao-2026/CLAUDE.md` continua valendo, isto é sempre
 * "cálculo Electiolab".
 */

import { inteiro } from "../apuracao/valores";
import type { ArquivoResultado, CargoResultadoTse } from "../apuracao/tipos";
import type { AgrupamentoEntrada, CandidatoEntrada, DistribuicaoEntrada } from "./distribuir-cadeiras";

/** Só `"Válido"` concorre a vaga individual — ver `CandidatoEntrada.elegivel`. */
function elegivel(dvt: string): boolean {
  return dvt === "Válido";
}

function converterAgrupamento(agr: CargoResultadoTse["agr"][number]): AgrupamentoEntrada {
  let votosValidos = 0;
  const candidatos: CandidatoEntrada[] = [];

  for (const par of agr.par) {
    votosValidos += (inteiro(par.tvtn) ?? 0) + (inteiro(par.tvtl) ?? 0);
    for (const cand of par.cand) {
      candidatos.push({
        id: cand.sqcand,
        numero: inteiro(cand.n) ?? 0,
        nomeUrna: cand.nmu,
        votos: inteiro(cand.vap) ?? 0,
        elegivel: elegivel(cand.dvt),
        ordemDesempate: inteiro(cand.seq) ?? undefined,
      });
    }
  }

  return {
    numero: agr.n,
    tipo: agr.tp as "i" | "c" | "f",
    nome: agr.nm,
    votosValidos,
    candidatos,
  };
}

/** Pega o primeiro (e único, no formato do TSE) cargo do arquivo. */
export function converterEA20ParaEntrada(arquivo: ArquivoResultado): DistribuicaoEntrada {
  const carg = arquivo.carg[0];
  return {
    vagas: inteiro(carg.nv) ?? 0,
    agrupamentos: carg.agr.map(converterAgrupamento),
  };
}
