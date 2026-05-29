import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 19,
  dateRange: "5–11 de maio de 2026",
  dateISO: "2026-05-11",

  presidencial: [
    { name: "Lula",            party: "PT",  pct: 39.5, delta: -0.5, cor: "#ef4444" },
    { name: "Flávio Bolsonaro", party: "PL", pct: 34.5, delta: +0.5, cor: "#1d4ed8" },
    { name: "Caiado",          party: "PSD", pct: 4.8,  delta: -0.2, cor: "#eab308" },
    { name: "Zema",            party: "NOVO", pct: 3.5, delta: -0.5, cor: "#f97316" },
  ],

  analise: [
    "Duas pesquisas na semana — Meio/Ideia (telefônica) e Quaest (presencial) — convergem: Lula entre 39% e 40%, Flávio Bolsonaro entre 33% e 36%.",
    "A vantagem de Lula se mantém na casa dos 5-6pp. Caiado segue como o minoritário mais forte, em torno de 5%.",
  ],
  destaqueAnalise:
    "Estabilidade: a distância entre Lula e Flávio não se move de forma significativa há três semanas, independentemente da metodologia do instituto.",

  pesquisas: [
    {
      instituto: "Meio/Ideia", cliente: "Espontânea", publicacao: "6 mai 2026",
      metodologia: "Telefônica", n: 1500, lider: "Lula", pct_lider: 40,
      destaque: "Lula 40% x Flávio 36% no cenário estimulado.",
    },
    {
      instituto: "Quaest", cliente: "Genial", publicacao: "11 mai 2026",
      metodologia: "Presencial", n: 2004, lider: "Lula", pct_lider: 39,
      destaque: "Quaest presencial: Lula 39%, Flávio 33%, Caiado 4%.",
    },
  ],

  governadores: [],

  totalPesquisas: 20,
  totalInstitutos: 11,
  totalEntrevistados: 90222,

  prevSemana: 18,
  nextSemana: 20,
  nextDateRange: "12–18 de maio de 2026",
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
