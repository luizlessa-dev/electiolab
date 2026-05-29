import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 17,
  dateRange: "21–27 de abril de 2026",
  dateISO: "2026-04-27",

  presidencial: [
    { name: "Lula",            party: "PT",  pct: 42.8, delta: 0, cor: "#ef4444" },
    { name: "Flávio Bolsonaro", party: "PL", pct: 37.8, delta: 0, cor: "#1d4ed8" },
    { name: "Caiado",          party: "PSD", pct: 3.9,  delta: 0, cor: "#eab308" },
    { name: "Zema",            party: "NOVO", pct: 3.9, delta: 0, cor: "#f97316" },
  ],

  analise: [
    "A corrida presidencial de 2026 se organiza em torno de Lula (PT) e do senador Flávio Bolsonaro (PL), que concentra o espólio eleitoral do campo bolsonarista. Na média das pesquisas da semana, Lula aparece em torno de 43% e Flávio em 38%.",
    "O patamar de Lula é puxado para cima pela AtlasIntel (online, n=5.008), que aponta 46,6%; pesquisas telefônicas como a Nexus mostram cenário mais próximo, com Lula em 41%.",
    "Caiado (PSD) e Zema (NOVO) disputam a terceira posição, ambos em torno de 4%, sem decolar. Tarcísio de Freitas não disputa a Presidência — concorre ao governo de São Paulo.",
  ],
  destaqueAnalise:
    "Lula lidera com folga de cerca de 5pp sobre Flávio, mas a distância varia com a metodologia: maior nas pesquisas online, menor nas telefônicas. Por isso a agregação importa mais que qualquer pesquisa isolada.",

  pesquisas: [
    {
      instituto: "Nexus", cliente: "BTG Pactual", publicacao: "26 abr 2026",
      metodologia: "Telefônica", n: 2028, lider: "Lula", pct_lider: 41,
      destaque: "Testou três cenários de 1º turno; Lula em 41% em todos, Flávio entre 36% e 38%.",
    },
    {
      instituto: "Atlas Intel", cliente: "Espontânea", publicacao: "27 abr 2026",
      metodologia: "Online", n: 5008, lider: "Lula", pct_lider: 46.6,
      destaque: "Online, maior amostra da semana: Lula 46,6% e Flávio 39,7% — patamar mais alto do petista entre os institutos.",
    },
  ],

  governadores: [],

  totalPesquisas: 17,
  totalInstitutos: 9,
  totalEntrevistados: 84718,

  prevSemana: 16,
  nextSemana: 18,
  nextDateRange: "28 abr – 4 mai 2026",
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
