/**
 * Orientação de bancada do Senado: normalização dos dados da API para o que o TF guarda em
 * `senado_orientacao` (id_sve, sigla_partido, orientacao). Lógica pura, sem I/O.
 * Contexto: docs/BASTIDORES-POS-ELEICAO.md §8.2.
 *
 * Fonte: GET legis.senado.leg.br/dadosabertos/plenario/votacao/orientacaoBancada/{AAAAMMDD}/{AAAAMMDD}
 * Chave de junção: `sequencialVotacao` da API = `senado_votacao.id_sve` do TF
 * (`codigoVotacaoSve`, outro campo da API, NÃO serve).
 */

/** Valores que `senado_voto.voto` e a view `senado_dissidencia` do TF comparam. */
export type OrientacaoNormalizada = "Sim" | "Não" | "Liberado" | "Obstrução";

const ORIENTACAO: Record<string, OrientacaoNormalizada> = {
  SIM: "Sim",
  "NÃO": "Não",
  NAO: "Não",
  LIVRE: "Liberado",
  "OBSTRUÇÃO": "Obstrução",
  OBSTRUCAO: "Obstrução",
};

/** null para voto vazio ou desconhecido (a linha é descartada e contada no relatório). */
export function normalizarOrientacao(v: string | null | undefined): OrientacaoNormalizada | null {
  return ORIENTACAO[(v ?? "").trim().toUpperCase()] ?? null;
}

/**
 * Rótulo da API → sigla usada em `senado_voto.sigla_partido`. A API muda a grafia ao longo dos
 * anos (PROGRES / Progressistas, Republica / Republicanos, PODE / Podemos) e usa as siglas
 * antigas de partidos que mudaram de nome (PRB→Republicanos, PR→PL, PPS→Cidadania).
 */
const PARTIDO: Record<string, string> = {
  PT: "PT", MDB: "MDB", PSD: "PSD", PSDB: "PSDB", PL: "PL", PSB: "PSB", PDT: "PDT", NOVO: "NOVO",
  REDE: "REDE", PSL: "PSL", PSC: "PSC", PROS: "PROS", PTB: "PTB", DEM: "DEM", AVANTE: "AVANTE",
  UNIÃO: "UNIÃO", UNIAO: "UNIÃO", PP: "PP", PROGRES: "PP", PROGRESSISTAS: "PP",
  CIDADANIA: "CIDADANIA", PPS: "CIDADANIA", PATRIOTA: "PATRIOTA",
  PODEMOS: "PODEMOS", PODE: "PODEMOS",
  REPUBLICA: "REPUBLICANOS", REPUBLICANOS: "REPUBLICANOS", PRB: "REPUBLICANOS",
  PR: "PL",
};

/** Lideranças que não são partido. Guardadas com rótulo canônico: servem para "alinhado com o governo" no futuro. */
const BLOCO: Record<string, string> = {
  GOVERNO: "GOVERNO",
  "OPOSIÇÃO": "OPOSIÇÃO",
  OPOSICAO: "OPOSIÇÃO",
  MAIORIA: "MAIORIA",
  MINORIA: "MINORIA",
  "BANC FEM": "BANCADA FEMININA",
  "B.FEMININA": "BANCADA FEMININA",
};

export type RotuloPartido = { sigla: string; tipo: "partido" | "bloco" } | null;

/** null = rótulo desconhecido: o ingest o relata em vez de gravar lixo. */
export function normalizarPartido(rotulo: string | null | undefined): RotuloPartido {
  const k = (rotulo ?? "").trim().toUpperCase();
  if (PARTIDO[k]) return { sigla: PARTIDO[k], tipo: "partido" };
  if (BLOCO[k]) return { sigla: BLOCO[k], tipo: "bloco" };
  return null;
}

export type OrientacaoApi = { dataHora?: string | null; partido?: string | null; voto?: string | null };
export type VotacaoApi = { sequencialVotacao: number; orientacoesLideranca?: OrientacaoApi[] | null };

export type LinhaOrientacao = { id_sve: number; sigla_partido: string; orientacao: OrientacaoNormalizada };

export type ResultadoParse = {
  linhas: LinhaOrientacao[];
  votacoesComOrientacao: number;
  votoVazioOuDesconhecido: number;
  rotulosDesconhecidos: Map<string, number>;
};

/**
 * Converte as votações da API em linhas para o TF. Se a mesma liderança aparece mais de uma vez
 * na mesma votação (grafias diferentes que caem na mesma sigla, ou reorientação), vale a de
 * `dataHora` mais recente. Votação sem orientação alguma não gera linha.
 */
export function parseVotacoes(votacoes: readonly VotacaoApi[]): ResultadoParse {
  const porChave = new Map<string, { linha: LinhaOrientacao; hora: string }>();
  const comOrientacao = new Set<number>();
  const rotulosDesconhecidos = new Map<string, number>();
  let votoVazioOuDesconhecido = 0;

  for (const v of votacoes) {
    for (const o of v.orientacoesLideranca ?? []) {
      const partido = normalizarPartido(o.partido);
      if (!partido) {
        const r = (o.partido ?? "(vazio)").trim() || "(vazio)";
        rotulosDesconhecidos.set(r, (rotulosDesconhecidos.get(r) ?? 0) + 1);
        continue;
      }
      const orientacao = normalizarOrientacao(o.voto);
      if (!orientacao) {
        votoVazioOuDesconhecido++;
        continue;
      }
      comOrientacao.add(v.sequencialVotacao);
      const chave = `${v.sequencialVotacao}|${partido.sigla}`;
      const hora = o.dataHora ?? "";
      const atual = porChave.get(chave);
      if (!atual || hora >= atual.hora) {
        porChave.set(chave, {
          hora,
          linha: { id_sve: v.sequencialVotacao, sigla_partido: partido.sigla, orientacao },
        });
      }
    }
  }

  return {
    linhas: [...porChave.values()].map((x) => x.linha),
    votacoesComOrientacao: comOrientacao.size,
    votoVazioOuDesconhecido,
    rotulosDesconhecidos,
  };
}

/** `senado_voto.sigla_partido` → sigla da orientação. O TF grava PODE em parte de 2026. */
export function partidoDoVoto(sigla: string | null | undefined): string | null {
  const k = (sigla ?? "").trim().toUpperCase();
  return PARTIDO[k] ?? (k || null);
}

export type VotoParaAlinhamento = { idSve: number; partido: string | null; voto: string; data: string };

/**
 * Alinhamento de um senador com a orientação do partido, a MESMA regra da view
 * `mv_senador_alinhamento` (migration 20261003150000), para conferir uma contra a outra:
 * conta as votações nominais em que o partido orientou Sim ou Não e o senador votou Sim, Não ou
 * Abstenção. Alinhado = votou igual à orientação (abstenção conta como não alinhada).
 */
export function alinhamento(
  votos: readonly VotoParaAlinhamento[],
  orientacaoPorVotacaoEPartido: ReadonlyMap<string, OrientacaoNormalizada>,
): { votacoes: number; alinhados: number; pct: number | null } {
  let votacoes = 0;
  let alinhados = 0;
  for (const v of votos) {
    const p = partidoDoVoto(v.partido);
    if (!p) continue;
    const o = orientacaoPorVotacaoEPartido.get(`${v.idSve}|${p}`);
    if (o !== "Sim" && o !== "Não") continue;
    if (v.voto !== "Sim" && v.voto !== "Não" && v.voto !== "Abstenção") continue;
    votacoes++;
    if (v.voto === o) alinhados++;
  }
  return { votacoes, alinhados, pct: votacoes ? Math.round((1000 * alinhados) / votacoes) / 10 : null };
}
