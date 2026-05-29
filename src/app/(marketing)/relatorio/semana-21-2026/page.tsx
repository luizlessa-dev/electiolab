import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 21,
  dateRange: "19–25 de maio de 2026",
  dateISO: "2026-05-25",

  presidencial: [
    { name: "Lula",            party: "PT",  pct: 39.7, delta: -0.1, cor: "#ef4444" },
    { name: "Flávio Bolsonaro", party: "PL", pct: 34.7, delta: -0.6, cor: "#1d4ed8" },
    { name: "Caiado",          party: "PSD", pct: 3.7,  delta: +0.8, cor: "#eab308" },
    { name: "Zema",            party: "NOVO", pct: 3.3, delta: -0.8, cor: "#f97316" },
  ],

  analise: [
    "Três pesquisas na semana. A Datafolha apontou a maior distância (Lula 40% x Flávio Bolsonaro 31%), enquanto a Gerp registrou empate técnico em 38%. A Nexus/BTG ficou no meio (Lula 41% x Flávio 35%).",
    "A média consolida Lula em torno de 40% e Flávio em 35%, vantagem de cerca de 5pp. A dispersão entre Datafolha e Gerp ilustra como dois institutos sérios podem divergir dentro de suas margens.",
  ],
  destaqueAnalise:
    "Mesmo com a Gerp apontando empate em 38%, o conjunto das pesquisas da semana mantém Lula à frente de Flávio por ~5pp na média.",

  pesquisas: [
    {
      instituto: "Datafolha", cliente: "Folha de S.Paulo", publicacao: "22 mai 2026",
      metodologia: "Presencial", n: 2004, lider: "Lula", pct_lider: 40,
      destaque: "Maior distância da semana: Lula 40%, Flávio 31%, Caiado 4%.",
    },
    {
      instituto: "Gerp", cliente: "Espontânea", publicacao: "21 mai 2026",
      metodologia: "Presencial", n: 2000, lider: "Lula", pct_lider: 38,
      destaque: "Empate técnico: Lula e Flávio ambos em 38%.",
    },
    {
      instituto: "Nexus", cliente: "BTG Pactual", publicacao: "25 mai 2026",
      metodologia: "Telefônica", n: 2045, lider: "Lula", pct_lider: 41,
      destaque: "Nexus/BTG: Lula 41%, Flávio 35%, Caiado 5%.",
    },
  ],

  governadores: [],

  totalPesquisas: 26,
  totalInstitutos: 13,
  totalEntrevistados: 105407,

  prevSemana: 20,
  nextSemana: 22,
  nextDateRange: "26 mai – 1 jun 2026",
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
