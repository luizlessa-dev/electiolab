/**
 * Um ciclo de coleta: config → acompanhamento → EA20, com log em
 * `apuracao.coletor_execucao`.
 *
 * Escopo por onda (PROMPT_INICIAL.md):
 *  - **onda 1**: Presidente (BR + UFs), Governador e Senador (27 UFs) → cargos 1, 3, 5;
 *  - **onda 2**: Deputado Federal/Estadual/Distrital → cargos 6, 7, 8.
 *
 * O escopo é dito por **código de cargo**, nunca por código de eleição: os códigos de
 * eleição mudam entre simulado (21270/21272) e oficial (6257/6259) e saem do `ele-c.json`.
 */

import { carregarConfig, carregarMunicipios, type ConfigApuracao } from "./config";
import { alvosEA20, coletarAcompanhamento, type AcompanhamentoEleicao } from "./acompanhamento";
import { coletarResultados, type ResumoAlvo } from "./resultados";
import { RepositorioApuracao } from "./repositorio";
import { ClienteTse, contadoresZerados, type ContadoresTse } from "./tse-cliente";
import type { Ambiente } from "./urls";

/** Cargos por onda. */
export const ONDA_1 = [1, 3, 5];
export const ONDA_2 = [6, 7, 8];

/** Conselheiro Distrital — fora do escopo (decisão de 26/09/2026). */
export const CARGOS_FORA_DO_ESCOPO = [25];

export interface OpcoesCiclo {
  ambiente: Ambiente;
  /** Códigos de cargo a coletar. */
  cargos?: number[];
  /** Baixar EA15 (1 arquivo por UF por eleição). */
  ea15?: boolean;
  /** Carregar a config de municípios (EA12) quando a tabela estiver vazia. */
  municipios?: boolean;
  /** Ano usado para ligar `apuracao.disputa` a `public.elections`. */
  ano?: number;
  repo?: RepositorioApuracao;
  cliente?: ClienteTse;
  aoRegistrar?: (linha: string) => void;
  /** Ctrl+C: o ciclo para de pedir arquivos novos e fecha o log. */
  interromper?: () => boolean;
  /** Reprocessa os EA20 ignorando ETag/idg guardados (recuperação; ver `resultados.ts`). */
  reprocessar?: boolean;
}

export interface ResultadoCiclo {
  execucaoId: number | null;
  contadores: ContadoresTse;
  duracaoMs: number;
  alvos: number;
  resumos: ResumoAlvo[];
  acompanhamentos: AcompanhamentoEleicao[];
  config: ConfigApuracao | null;
  interrompido: boolean;
  erro: string | null;
}

function contarPorSituacao(resumos: ResumoAlvo[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const r of resumos) contagem[r.situacao] = (contagem[r.situacao] ?? 0) + 1;
  return contagem;
}

/** Linha única de resumo para `coletor_execucao.mensagem`. */
export function mensagemDoCiclo(r: ResultadoCiclo): string {
  const partes: string[] = [];
  partes.push(`alvos=${r.alvos}`);
  const contagem = contarPorSituacao(r.resumos);
  for (const [k, v] of Object.entries(contagem).sort()) partes.push(`${k}=${v}`);
  partes.push(`duracao=${(r.duracaoMs / 1000).toFixed(1)}s`);
  if (r.interrompido) partes.push("interrompido");

  const identidades = r.resumos.filter((x) => x.situacao === "identidade");
  if (identidades.length > 0) {
    const detalhes = identidades
      .slice(0, 5)
      .map((x) => `${x.alvo.abrangencia}/c${x.alvo.cargo.codigo}: ${x.falhas?.[0]?.identidade}`)
      .join("; ");
    partes.push(`IDENTIDADES FALHARAM [${detalhes}]`);
  }
  const erros = r.resumos.filter((x) => x.situacao === "erro");
  if (erros.length > 0) {
    partes.push(`erros [${erros.slice(0, 3).map((x) => x.mensagem).join("; ")}]`);
  }
  if (r.erro) partes.push(`ERRO DE CICLO: ${r.erro}`);
  return partes.join(" ");
}

export async function executarCiclo(opcoes: OpcoesCiclo): Promise<ResultadoCiclo> {
  const inicio = Date.now();
  const registrar = opcoes.aoRegistrar ?? (() => {});
  const interrompido = opcoes.interromper ?? (() => false);
  const cargos = opcoes.cargos ?? ONDA_1;

  const repo = opcoes.repo ?? new RepositorioApuracao();
  const cliente =
    opcoes.cliente ??
    new ClienteTse({ quarentena: repo.quarentena(), aoRegistrar: opcoes.aoRegistrar });

  const saida: ResultadoCiclo = {
    execucaoId: null,
    contadores: contadoresZerados(),
    duracaoMs: 0,
    alvos: 0,
    resumos: [],
    acompanhamentos: [],
    config: null,
    interrompido: false,
    erro: null,
  };

  try {
    saida.execucaoId = await repo.abrirExecucao(opcoes.ambiente);
  } catch (e) {
    // Sem log não dá para seguir: é o registro exigido do ciclo.
    saida.erro = `não foi possível abrir coletor_execucao: ${(e as Error).message}`;
    saida.duracaoMs = Date.now() - inicio;
    saida.contadores = cliente.contadores;
    return saida;
  }

  try {
    await cliente.prepararQuarentena();

    // --- config ---
    const configCompleta = await carregarConfig(cliente, repo, {
      ambiente: opcoes.ambiente,
      cargosForaDoEscopo: CARGOS_FORA_DO_ESCOPO,
    });

    // Só as eleições que têm algum cargo da onda: evita pedir o EA14 de eleição
    // que não interessa (a municipal do simulado, por exemplo).
    const config: ConfigApuracao = {
      ...configCompleta,
      eleicoes: configCompleta.eleicoes.filter((e) =>
        e.cargos.some((c) => cargos.includes(c.codigo)),
      ),
    };
    saida.config = config;
    registrar(
      `config: ${config.eleicoes.length} eleição(ões) no escopo — ` +
        config.eleicoes
          .map((e) => `${e.codigoEleicao} [${e.cargos.map((c) => c.codigo).join(",")}]`)
          .join(" · "),
    );

    if (opcoes.municipios) {
      for (const eleicao of config.eleicoes) {
        if (interrompido()) break;
        const r = await carregarMunicipios(cliente, repo, config, eleicao);
        registrar(
          `municípios ${eleicao.codigoEleicao}: ${r.municipios}` +
            (r.baixado ? " (baixado)" : " (já no banco)"),
        );
      }
    }

    if (interrompido()) {
      saida.interrompido = true;
      return await finalizar(repo, saida, cliente, inicio);
    }

    // --- acompanhamento (EA14 + EA15) ---
    saida.acompanhamentos = await coletarAcompanhamento(cliente, repo, config, {
      ea15: opcoes.ea15 ?? true,
      aoRegistrar: opcoes.aoRegistrar,
    });

    if (interrompido()) {
      saida.interrompido = true;
      return await finalizar(repo, saida, cliente, inicio);
    }

    // --- EA20 ---
    const alvos = alvosEA20(config, saida.acompanhamentos, { cargos });
    saida.alvos = alvos.length;
    registrar(`EA20: ${alvos.length} alvos (cargos ${cargos.join(",")})`);

    const [elections, tiposDeCargo] = await Promise.all([
      repo.mapaElections(opcoes.ano ?? 2026),
      repo.mapaCargoTipo(),
    ]);

    saida.resumos = await coletarResultados(cliente, repo, alvos, {
      elections,
      tiposDeCargo,
      ano: opcoes.ano ?? 2026,
      aoRegistrar: opcoes.aoRegistrar,
      interromper: opcoes.interromper,
      reprocessar: opcoes.reprocessar,
    });
    saida.interrompido = interrompido();
  } catch (e) {
    saida.erro = (e as Error).message;
    registrar(`ERRO DE CICLO: ${saida.erro}`);
  }

  return await finalizar(repo, saida, cliente, inicio);
}

async function finalizar(
  repo: RepositorioApuracao,
  saida: ResultadoCiclo,
  cliente: ClienteTse,
  inicio: number,
): Promise<ResultadoCiclo> {
  saida.contadores = cliente.contadores;
  saida.duracaoMs = Date.now() - inicio;
  if (saida.execucaoId !== null) {
    try {
      await repo.fecharExecucao(saida.execucaoId, saida.contadores, mensagemDoCiclo(saida));
    } catch (e) {
      saida.erro = `${saida.erro ? `${saida.erro}; ` : ""}falha ao fechar coletor_execucao: ${
        (e as Error).message
      }`;
    }
  }
  return saida;
}
