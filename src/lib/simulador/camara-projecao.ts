/**
 * Projeção de bancada da Câmara (Deputado Federal, 513 vagas) — SEMPRE "cálculo
 * Electiolab" (regra 8, `apuracao-2026/CLAUDE.md`), nunca a distribuição oficial do
 * TSE. Roda `distribuirCadeiras` para cada uma das disputas estaduais de Deputado
 * Federal já coletadas no schema `apuracao` (leitura pública, RLS só permite SELECT —
 * mesma fonte de `scripts/simulador-validar.ts`) e soma as vagas por partido/federação
 * nacionalmente, usando `votacao_agrupamento.nome` como chave: nesse ambiente o mesmo
 * partido/federação usa sempre o mesmo rótulo em todas as UFs (confirmado por
 * inspeção — "PARTIDO 9974", "FEDERAÇÃO 9995" etc. se repetem UF a UF), ao contrário de
 * `numero`, que é só um id interno por disputa.
 */

import { createClient } from "@supabase/supabase-js";
import {
  distribuirCadeiras,
  type AgrupamentoEntrada,
  type CandidatoEntrada,
  type DistribuicaoEntrada,
} from "./distribuir-cadeiras";

const AMBIENTE = process.env.TSE_AMBIENTE ?? "simulado";
/** Código do cargo "Deputado Federal" na tabela `cargo` (`cp.tp` do TSE). */
const CODIGO_DEPUTADO_FEDERAL = 6;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, db: { schema: "apuracao" } },
  );
}

interface DisputaFederal {
  id: number;
  uf: string;
  vagas: number;
}

interface AgrupamentoRow {
  numero: string;
  tipo: "i" | "c" | "f";
  nome: string;
}

interface AgrupamentoOficialRow {
  nome: string;
  tipo: "i" | "c" | "f";
  vagas_obtidas: number | null;
}

interface PartidoRow {
  agrupamento_numero: string | null;
  votos_nominais_validos: number | null;
  votos_legenda_total: number | null;
}

interface CandidatoRow {
  sqcand: string;
  numero: number;
  nome_urna: string;
  votos_apurados: number;
  posicao: number | null;
  destinacao: string | null;
  agrupamento_numero: string | null;
}

/** Só `destinacao === "Válido"` concorre a vaga individual — ver `CandidatoEntrada.elegivel`. */
function elegivel(destinacao: string | null): boolean {
  return destinacao === "Válido";
}

async function montarEntrada(
  cliente: ReturnType<typeof sb>,
  disputa: DisputaFederal,
): Promise<{
  entrada: DistribuicaoEntrada;
  agrupamentoInfo: Map<string, { nome: string; tipo: "i" | "c" | "f" }>;
}> {
  const [{ data: agrupamentos }, { data: partidos }, { data: candidatos }] = await Promise.all([
    cliente.from("votacao_agrupamento").select("numero, tipo, nome").eq("disputa_id", disputa.id),
    cliente
      .from("votacao_partido")
      .select("agrupamento_numero, votos_nominais_validos, votos_legenda_total")
      .eq("disputa_id", disputa.id),
    cliente
      .from("votacao_candidato")
      .select("sqcand, numero, nome_urna, votos_apurados, posicao, destinacao, agrupamento_numero")
      .eq("disputa_id", disputa.id),
  ]);

  const agrupamentoList = (agrupamentos ?? []) as AgrupamentoRow[];
  const agrupamentoInfo = new Map(agrupamentoList.map((a) => [a.numero, { nome: a.nome, tipo: a.tipo }]));

  // Votos válidos por agrupamento: soma dos partidos-membros (nominal + legenda) — não dá
  // pra confiar em `votacao_agrupamento.votos_*`, que o TSE só manda agregado pra
  // federação/coligação (partido isolado vem null; mesma regra de `simulador-validar.ts`).
  const votosValidosPorAgrupamento = new Map<string, number>();
  for (const p of (partidos ?? []) as PartidoRow[]) {
    if (!p.agrupamento_numero) continue;
    const atual = votosValidosPorAgrupamento.get(p.agrupamento_numero) ?? 0;
    votosValidosPorAgrupamento.set(
      p.agrupamento_numero,
      atual + (p.votos_nominais_validos ?? 0) + (p.votos_legenda_total ?? 0),
    );
  }

  const candidatosPorAgrupamento = new Map<string, CandidatoEntrada[]>();
  for (const c of (candidatos ?? []) as CandidatoRow[]) {
    if (!c.agrupamento_numero) continue;
    const lista = candidatosPorAgrupamento.get(c.agrupamento_numero) ?? [];
    lista.push({
      id: c.sqcand,
      numero: c.numero,
      nomeUrna: c.nome_urna,
      votos: c.votos_apurados,
      elegivel: elegivel(c.destinacao),
      ordemDesempate: c.posicao ?? undefined,
    });
    candidatosPorAgrupamento.set(c.agrupamento_numero, lista);
  }

  const entradaAgrupamentos: AgrupamentoEntrada[] = agrupamentoList.map((a) => ({
    numero: a.numero,
    tipo: a.tipo,
    nome: a.nome,
    votosValidos: votosValidosPorAgrupamento.get(a.numero) ?? 0,
    candidatos: candidatosPorAgrupamento.get(a.numero) ?? [],
  }));

  return {
    entrada: { vagas: disputa.vagas, agrupamentos: entradaAgrupamentos },
    agrupamentoInfo,
  };
}

export interface BancadaPartido {
  nome: string;
  tipo: "i" | "c" | "f";
  vagas: number;
  /** UFs (maiúsculo) em que o partido/federação elegeu ao menos 1 deputado, nesta projeção. */
  ufs: string[];
}

export interface ProjecaoCamara {
  ambiente: string;
  totalDisputas: number;
  /** Soma de `disputa.vagas` das 27 disputas — deve ser 513 (Câmara dos Deputados). */
  totalVagas: number;
  /** Soma de vagas efetivamente atribuídas pelo motor — só diverge de `totalVagas` se
   * alguma disputa ficar sem candidato elegível suficiente para preencher o cargo. */
  vagasDistribuidas: number;
  bancadas: BancadaPartido[];
  porUf: { uf: string; vagas: number; oficial: boolean }[];
  /** Disputas já finalizadas pelo TSE (`andamento = 'f'`): nelas as vagas são as
   * oficiais (`votacao_agrupamento.vagas_obtidas`), não o cálculo Electiolab. */
  disputasOficiais: number;
}

/**
 * Câmara dos Deputados: 513 vagas de Deputado Federal, uma disputa proporcional por UF.
 * Retorna `null` só se ainda não houver dados coletados (nenhuma eleição/cargo/disputa).
 */
export async function carregarProjecaoCamara(): Promise<ProjecaoCamara | null> {
  const cliente = sb();

  const { data: eleicoes } = await cliente.from("eleicao").select("id").eq("ambiente", AMBIENTE);
  const eleicaoIds = (eleicoes ?? []).map((e) => e.id as number);
  if (eleicaoIds.length === 0) return null;

  const { data: cargos } = await cliente
    .from("cargo")
    .select("id")
    .in("eleicao_id", eleicaoIds)
    .eq("codigo", CODIGO_DEPUTADO_FEDERAL);
  const cargoIds = (cargos ?? []).map((c) => c.id as number);
  if (cargoIds.length === 0) return null;

  const { data: disputas } = await cliente
    .from("disputa")
    .select("id, uf, vagas")
    .in("cargo_id", cargoIds)
    .order("uf");
  const disputaList = ((disputas ?? []) as { id: number; uf: string | null; vagas: number }[]).filter(
    (d): d is DisputaFederal => d.uf !== null,
  );
  if (disputaList.length === 0) return null;

  const { data: situacoes } = await cliente
    .from("v_disputa_situacao")
    .select("disputa_id, andamento")
    .in("disputa_id", disputaList.map((d) => d.id));
  const finalizadas = new Set(
    ((situacoes ?? []) as { disputa_id: number; andamento: string | null }[])
      .filter((s) => s.andamento === "f")
      .map((s) => s.disputa_id),
  );

  // Por disputa: lista de (nome, tipo, vagas). Finalizada -> vagas oficiais do TSE;
  // ainda em apuração -> `distribuirCadeiras` sobre os votos parciais.
  const porDisputa = await Promise.all(
    disputaList.map(async (disputa) => {
      if (finalizadas.has(disputa.id)) {
        const { data } = await cliente
          .from("votacao_agrupamento")
          .select("nome, tipo, vagas_obtidas")
          .eq("disputa_id", disputa.id);
        const linhas = (data ?? []) as AgrupamentoOficialRow[];
        const vagas = linhas.map((a) => ({ nome: a.nome, tipo: a.tipo, vagas: a.vagas_obtidas ?? 0 }));
        return { disputa, oficial: true, vagas };
      }
      const { entrada, agrupamentoInfo } = await montarEntrada(cliente, disputa);
      const resultado = distribuirCadeiras(entrada);
      const vagas = resultado.agrupamentos.map((agr) => {
        const info = agrupamentoInfo.get(agr.agrupamentoNumero);
        return {
          nome: info?.nome ?? agr.agrupamentoNumero,
          tipo: info?.tipo ?? ("i" as const),
          vagas: agr.vagasTotal,
        };
      });
      return { disputa, oficial: false, vagas };
    }),
  );

  const bancadaPorNome = new Map<string, BancadaPartido>();
  const porUf: { uf: string; vagas: number; oficial: boolean }[] = [];

  for (const { disputa, oficial, vagas } of porDisputa) {
    const uf = disputa.uf.toUpperCase();
    let vagasUf = 0;
    for (const agr of vagas) {
      vagasUf += agr.vagas;
      if (agr.vagas === 0) continue;
      const atual = bancadaPorNome.get(agr.nome) ?? { nome: agr.nome, tipo: agr.tipo, vagas: 0, ufs: [] };
      atual.vagas += agr.vagas;
      atual.ufs.push(uf);
      bancadaPorNome.set(agr.nome, atual);
    }
    porUf.push({ uf, vagas: vagasUf, oficial });
  }

  const bancadas = [...bancadaPorNome.values()].sort(
    (a, b) => b.vagas - a.vagas || a.nome.localeCompare(b.nome),
  );
  const totalVagas = disputaList.reduce((soma, d) => soma + d.vagas, 0);
  const vagasDistribuidas = bancadas.reduce((soma, b) => soma + b.vagas, 0);

  return {
    ambiente: AMBIENTE,
    totalDisputas: disputaList.length,
    totalVagas,
    vagasDistribuidas,
    bancadas,
    porUf: porUf.sort((a, b) => a.uf.localeCompare(b.uf)),
    disputasOficiais: finalizadas.size,
  };
}
