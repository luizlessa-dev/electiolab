import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 22,
  dateRange: "26 de maio – 1 de junho de 2026",
  dateISO: "2026-06-01",

  presidencial: [
    { name: "Lula",      party: "PT",           pct: 37.3, delta: +0.2,  cor: "#ef4444" },
    { name: "Bolsonaro", party: "PL",           pct: 30.1, delta: -0.1,  cor: "#3b82f6" },
    { name: "Tarcísio",  party: "Republicanos", pct: 18.9, delta: +0.3,  cor: "#8b5cf6" },
    { name: "Outros",    party: "—",            pct: 13.7, delta: -0.4,  cor: "#6b7280" },
  ],

  analise: [
    "Semana de movimentação moderada em todas as candidaturas. Lula (PT) sustenta a liderança com +0,2pp, tendência consistente com as últimas cinco semanas: a candidatura acumula +0,9pp desde a semana 17 sem nenhum recuo.",
    "Tarcísio (Republicanos) chega a 18,9% — o maior patamar da candidatura desde o início da série. O crescimento é gradual (média de +0,3pp/semana) e ainda não aciona nenhum sinal de catch-up com Bolsonaro, que permanece em torno de 30% com baixa volatilidade.",
    "O campo 'Outros' acumula a quarta semana consecutiva de queda, sugerindo consolidação: pequenos candidatos perdem espaço à medida que o eleitorado começa a formatar preferências para 2026.",
  ],
  destaqueAnalise:
    "Tarcísio ultrapassa 18,9% pela primeira vez — mas a distância para Bolsonaro ainda é de 11,2pp. Para uma virada no campo conservador, analistas estimam que Tarcísio precisaria atingir pelo menos 24–25% enquanto Bolsonaro ficasse abaixo de 28%.",

  pesquisas: [
    {
      instituto: "Datafolha",
      cliente: "Folha de S.Paulo",
      publicacao: "27 mai 2026",
      metodologia: "Presencial",
      n: 2_856,
      lider: "Lula",
      pct_lider: 36,
      destaque: "Primeiro Datafolha de 2026. Confirma a liderança de Lula com 36% e mostra Tarcísio em 19% — acima das últimas pesquisas online do mesmo candidato.",
    },
    {
      instituto: "PoderData",
      cliente: "Poder360",
      publicacao: "29 mai 2026",
      metodologia: "Telefônica",
      n: 1_500,
      lider: "Lula",
      pct_lider: 37,
      destaque: "Tarcísio aparece com 18% entre eleitores acima de 50 anos — faixa que historicamente é mais fiel a Bolsonaro. Pode indicar início de migração intergeracional no campo conservador.",
    },
  ],

  governadores: [
    { uf: "SP", lider: "Tarcísio",      pct: 41.2, delta: +0.4, partido: "Rep" },
    { uf: "MG", lider: "Cleitinho",     pct: 49.0, delta: +0.5, partido: "Rep" },
    { uf: "RJ", lider: "Eduardo Paes",  pct: 49.7, delta: +0.4, partido: "PSD" },
    { uf: "RS", lider: "Eduardo Leite", pct: 43.0, delta: -0.2, partido: "PSDB" },
    { uf: "BA", lider: "Jerônimo",      pct: 55.1, delta: +0.1, partido: "PT" },
  ],

  totalPesquisas: 30,
  totalInstitutos: 13,
  totalEntrevistados: 71_776,

  prevSemana: 21,
  // nextSemana undefined — semana corrente
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
