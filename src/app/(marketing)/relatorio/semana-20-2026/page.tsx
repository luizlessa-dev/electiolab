import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 20,
  dateRange: "12–18 de maio de 2026",
  dateISO: "2026-05-18",

  presidencial: [
    { name: "Lula",            party: "PT",  pct: 39.8, delta: +0.3, cor: "#ef4444" },
    { name: "Flávio Bolsonaro", party: "PL", pct: 35.3, delta: +0.8, cor: "#1d4ed8" },
    { name: "Caiado",          party: "PSD", pct: 2.9,  delta: -1.9, cor: "#eab308" },
    { name: "Zema",            party: "NOVO", pct: 4.1, delta: +0.6, cor: "#f97316" },
  ],

  analise: [
    "Semana de maior dispersão entre os institutos. A Vox Brasil (online) foi o único levantamento a colocar Flávio Bolsonaro numericamente à frente (36,5% x 34,3%); no mesmo período, a AtlasIntel apontou Lula com 47%.",
    "A média da semana (Lula ~40%, Flávio ~35%) suaviza essa divergência metodológica — exatamente o tipo de ruído que a agregação existe para tratar.",
  ],
  destaqueAnalise:
    "Quando institutos divergem na mesma semana (Vox aponta Flávio na frente, Atlas aponta Lula com folga), a média ponderada é mais informativa que qualquer pesquisa isolada.",

  pesquisas: [
    {
      instituto: "Vox Brasil", cliente: "Espontânea", publicacao: "13 mai 2026",
      metodologia: "Online", n: 2100, lider: "Flávio Bolsonaro", pct_lider: 36.5,
      destaque: "Único da semana com Flávio (36,5%) numericamente à frente de Lula (34,3%).",
    },
    {
      instituto: "Datafolha", cliente: "Folha de S.Paulo", publicacao: "14 mai 2026",
      metodologia: "Presencial", n: 2004, lider: "Lula", pct_lider: 38,
      destaque: "Datafolha: Lula 38%, Flávio 35%, Zema 3%.",
    },
    {
      instituto: "Atlas Intel", cliente: "Espontânea", publicacao: "19 mai 2026",
      metodologia: "Online", n: 5032, lider: "Lula", pct_lider: 47,
      destaque: "AtlasIntel volta a apontar o topo da série para Lula (47%), Flávio 34,3%.",
    },
  ],

  governadores: [],

  totalPesquisas: 23,
  totalInstitutos: 12,
  totalEntrevistados: 99358,

  prevSemana: 19,
  nextSemana: 21,
  nextDateRange: "19–25 de maio de 2026",
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
