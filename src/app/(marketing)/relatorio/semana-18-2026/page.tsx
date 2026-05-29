import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 18,
  dateRange: "28 de abril – 4 de maio de 2026",
  dateISO: "2026-05-04",

  presidencial: [
    { name: "Lula",            party: "PT",  pct: 40.0, delta: -2.8, cor: "#ef4444" },
    { name: "Flávio Bolsonaro", party: "PL", pct: 34.0, delta: -3.8, cor: "#1d4ed8" },
    { name: "Caiado",          party: "PSD", pct: 5.0,  delta: +1.1, cor: "#eab308" },
    { name: "Zema",            party: "NOVO", pct: 4.0, delta: +0.1, cor: "#f97316" },
  ],

  analise: [
    "Com apenas a Real Time Big Data publicada na janela, a média recua para Lula 40% e Flávio Bolsonaro 34%. O movimento reflete a saída da AtlasIntel (online, favorável a Lula) da semana anterior — não uma mudança real de cenário.",
    "Nas pesquisas presenciais e telefônicas, Lula se mantém estável em torno de 40%. Caiado (5%) e Zema (4%) seguem como os minoritários mais fortes.",
  ],
  destaqueAnalise:
    "A variação semanal é dominada pela composição de institutos: cada semana traz um conjunto diferente de pesquisas. Leia os deltas com cautela — a tendência só fica clara no acumulado de várias semanas.",

  pesquisas: [
    {
      instituto: "Real Time Big Data", cliente: "Espontânea", publicacao: "5 mai 2026",
      metodologia: "Telefônica", n: 2000, lider: "Lula", pct_lider: 40,
      destaque: "Lula 40%, Flávio 34%; Caiado (5%) e Zema (4%) lideram o pelotão de minoritários.",
    },
  ],

  governadores: [],

  totalPesquisas: 18,
  totalInstitutos: 10,
  totalEntrevistados: 86718,

  prevSemana: 17,
  nextSemana: 19,
  nextDateRange: "5–11 de maio de 2026",
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
