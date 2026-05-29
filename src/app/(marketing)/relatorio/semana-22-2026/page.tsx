import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 22,
  dateRange: "26 de maio – 1 de junho de 2026",
  dateISO: "2026-06-01",

  presidencial: [
    { name: "Lula",            party: "PT",  pct: 40.0, delta: +0.3, cor: "#ef4444" },
    { name: "Flávio Bolsonaro", party: "PL", pct: 35.0, delta: +0.3, cor: "#1d4ed8" },
    { name: "Caiado",          party: "PSD", pct: 3.0,  delta: -0.7, cor: "#eab308" },
    { name: "Zema",            party: "NOVO", pct: 4.0, delta: +0.7, cor: "#f97316" },
  ],

  analise: [
    "A PoderData fecha a janela com Lula 40% e Flávio Bolsonaro 35%, em linha com a média das semanas anteriores.",
    "Cinco semanas de dados consolidam o quadro: Lula na casa dos 40%, Flávio em torno de 35%, vantagem estável de cerca de 5pp. Caiado e Zema não decolam, ambos abaixo de 5%.",
  ],
  destaqueAnalise:
    "O 1º turno presidencial está estabilizado: Lula ~40%, Flávio ~35%. A questão em aberto é se Flávio cresce o suficiente para garantir um 2º turno competitivo — nos cenários simulados, Lula leva vantagem na maioria.",

  pesquisas: [
    {
      instituto: "PoderData", cliente: "Espontânea", publicacao: "29 mai 2026",
      metodologia: "Telefônica", n: 2400, lider: "Lula", pct_lider: 40,
      destaque: "Lula 40%, Flávio 35%; vantagem estável de 5pp, dentro do padrão das últimas semanas.",
    },
  ],

  governadores: [],

  totalPesquisas: 27,
  totalInstitutos: 14,
  totalEntrevistados: 107807,

  prevSemana: 21,
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
