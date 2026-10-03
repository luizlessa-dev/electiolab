/**
 * Projeção de bancada via pesquisas de intenção de voto agregadas
 *
 * Lê pesquisas do agregador Supabase (tabelas `polls` + `poll_results`),
 * executa `distribuirCadeiras` pra cada cenário/pesquisa e retorna
 * o resultado consolidado por fonte + data + cenário.
 */

import { createClient } from "@supabase/supabase-js";
import {
  distribuirCadeiras,
  type AgrupamentoEntrada,
  type CandidatoEntrada,
  type DistribuicaoEntrada,
} from "./distribuir-cadeiras";
import type { Database } from "@/types/database.types";

const AMBIENTE = process.env.TSE_AMBIENTE ?? "simulado";

function sbPublic() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface BancadaProjecao {
  /** Nome do partido/federação (ex: "PARTIDO X", "FEDERAÇÃO Y") */
  nome: string;
  /** Tipo: "i" (independente), "c" (coligação), "f" (federação) */
  tipo: "i" | "c" | "f";
  /** Número de vagas na Câmara (distribuição proporcional) */
  vagas: number;
  /** UFs em que elegeu pelo menos 1 deputado (informativo) */
  ufs: string[];
}

export interface ProjecaoPesquisa {
  /** ID da pesquisa no agregador */
  id: string;
  /** Instituto: Datafolha, Ipespe, etc (nome do instituto) */
  instituto: string;
  /** Data de publicação ISO 8601 */
  data: string;
  /** Cenário/rótulo (ex: "Com Lula", "Sem Lula") - undefined se pesquisa padrão */
  cenario?: string;
  /** Ambiente: "simulado" ou "producao" */
  ambiente: "simulado" | "producao";
  /** Número do turno (1 ou 2) */
  turno: number;
  /** Tamanho da amostra */
  tamanhoAmostra: number;
  /** Total de disputas (sempre 1 para nível nacional) */
  totalDisputas: number;
  /** Total de vagas em disputa (513 para Câmara) */
  totalVagas: number;
  /** Vagas efetivamente distribuídas */
  vagasDistribuidas: number;
  /** Bancadas por partido/federação */
  bancadas: BancadaProjecao[];
}

interface PollRow {
  id: string;
  publication_date: string;
  scenario_label: string | null;
  round: number;
  sample_size: number;
  institute?: {
    name: string;
  } | null;
  poll_results?: {
    candidate_id: string;
    percentage: number;
    absolute_votes: number | null;
    candidate?: {
      name: string;
      party?: string | null;
    } | null;
  }[];
}

interface CandidatoAgregado {
  id: string;
  nome: string;
  votos: number;
  partido: string | null;
}

/**
 * Carrega projeções de bancada a partir de pesquisas do agregador.
 * Executa distribuir-cadeiras pra cada pesquisa/cenário.
 *
 * Retorna array ordenado por data DESC (mais recente primeiro).
 */
export async function carregarProjecaoPesquisas(): Promise<ProjecaoPesquisa[]> {
  const cliente = sbPublic();

  // 1. Query pesquisas com relações
  const { data: pesquisas, error } = await cliente
    .from("polls")
    .select(
      `
      id,
      publication_date,
      scenario_label,
      round,
      sample_size,
      institute:institute_id(name),
      poll_results(
        candidate_id,
        percentage,
        absolute_votes,
        candidate:candidate_id(name, party)
      )
      `,
    )
    .eq("scope", "BR")
    .order("publication_date", { ascending: false });

  if (error) {
    console.error("Erro ao carregar pesquisas:", error);
    return [];
  }

  if (!pesquisas || pesquisas.length === 0) {
    return [];
  }

  const resultados: ProjecaoPesquisa[] = [];

  // 2. Para cada pesquisa, rodar distribuir-cadeiras
  for (const poll of pesquisas as PollRow[]) {
    try {
      const projecao = await processarPesquisa(cliente, poll);
      if (projecao) {
        resultados.push(projecao);
      }
    } catch (err) {
      console.warn(`Erro ao processar pesquisa ${poll.id}:`, err);
    }
  }

  return resultados;
}

async function processarPesquisa(
  cliente: ReturnType<typeof sbPublic>,
  poll: PollRow,
): Promise<ProjecaoPesquisa | null> {
  const resultados = poll.poll_results ?? [];

  // Agrupar por partido/federação (via party do candidato)
  const agrupamentosMap = new Map<string, CandidatoAgregado[]>();

  for (const resultado of resultados) {
    const candidato = resultado.candidate;
    if (!candidato) continue;

    const partido = candidato.party ?? "Sem Partido";
    const lista = agrupamentosMap.get(partido) ?? [];

    // Assumir votos percentuais como "votos"
    // (em uma pesquisa real, seria a % de intenção)
    const votos = Math.round((resultado.percentage ?? 0) * 100);

    lista.push({
      id: resultado.candidate_id,
      nome: candidato.name ?? "Desconhecido",
      votos,
      partido,
    });

    agrupamentosMap.set(partido, lista);
  }

  // Converter para formato de entrada do distribuir-cadeiras
  const agrupamentosEntrada: AgrupamentoEntrada[] = Array.from(agrupamentosMap.entries()).map(
    ([nome, candidatos]) => ({
      numero: nome, // Usar nome do partido como número único
      tipo: "i" as const, // Tipo "independente" por padrão
      nome,
      votosValidos: candidatos.reduce((s, c) => s + c.votos, 0),
      candidatos: candidatos.map((c) => ({
        id: c.id,
        numero: 0, // Sem número específico em pesquisa
        nomeUrna: c.nome,
        votos: c.votos,
        elegivel: true, // Todos elegíveis em pesquisa
      })),
    }),
  );

  // Executar distribuição
  const distribuicao: DistribuicaoEntrada = {
    vagas: 513, // Câmara dos Deputados
    agrupamentos: agrupamentosEntrada,
  };

  const resultado = distribuirCadeiras(distribuicao);

  // Montar resposta: rastrear vagas por agrupamento
  const vagasPorAgrupamento = new Map<string, number>();
  const agrupamentoInfo = new Map<string, { nome: string; tipo: "i" | "c" | "f"; ufs: string[] }>();

  for (const agr of resultado.agrupamentos) {
    if (agr.vagasTotal === 0) continue;

    vagasPorAgrupamento.set(agr.agrupamentoNumero, (vagasPorAgrupamento.get(agr.agrupamentoNumero) ?? 0) + agr.vagasTotal);

    if (!agrupamentoInfo.has(agr.agrupamentoNumero)) {
      agrupamentoInfo.set(agr.agrupamentoNumero, {
        nome: agr.agrupamentoNumero,
        tipo: "i" as const,
        ufs: [],
      });
    }
  }

  const bancadas: BancadaProjecao[] = Array.from(agrupamentoInfo.entries())
    .map(([numero, info]) => ({
      nome: info.nome,
      tipo: info.tipo,
      vagas: vagasPorAgrupamento.get(numero) ?? 0,
      ufs: info.ufs,
    }))
    .sort((a, b) => b.vagas - a.vagas || a.nome.localeCompare(b.nome));

  return {
    id: poll.id,
    instituto: poll.institute?.name ?? "Desconhecido",
    data: poll.publication_date,
    cenario: poll.scenario_label ?? undefined,
    ambiente: AMBIENTE as "simulado" | "producao",
    turno: poll.round,
    tamanhoAmostra: poll.sample_size,
    totalDisputas: 1,
    totalVagas: 513,
    vagasDistribuidas: bancadas.reduce((s, b) => s + b.vagas, 0),
    bancadas,
  };
}
