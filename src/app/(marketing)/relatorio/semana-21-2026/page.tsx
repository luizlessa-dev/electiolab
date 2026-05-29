import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 21,
  dateRange: "19–25 de maio de 2026",
  dateISO: "2026-05-25",

  presidencial: [
    { name: "Lula",      party: "PT",           pct: 37.1, delta: +0.3,  cor: "#ef4444" },
    { name: "Bolsonaro", party: "PL",           pct: 30.2, delta: -0.2,  cor: "#3b82f6" },
    { name: "Tarcísio",  party: "Republicanos", pct: 18.6, delta: +0.4,  cor: "#8b5cf6" },
    { name: "Outros",    party: "—",            pct: 14.1, delta: -0.5,  cor: "#6b7280" },
  ],

  analise: [
    "Lula (PT) avança 0,3pp e mantém a maior distância sobre o segundo colocado desde o início da série histórica do ElectioLab. A pesquisa Quaest de 20 de maio foi o principal driver da variação positiva, com a candidatura alcançando 38% na metodologia telefônica — melhor resultado desde outubro de 2025.",
    "Tarcísio (Republicanos) registra +0,4pp, consolidando a tendência de crescimento lento mas consistente observada desde a semana 14. O ganho vem principalmente da faixa etária 18–34 anos e de eleitores de baixa renda no interior de São Paulo e Minas Gerais, segundo a desagregação regional da AtlasIntel.",
    "Bolsonaro (PL) recua 0,2pp, dentro da margem de ruído estatístico da média. O piso eleitoral do ex-presidente permanece estável na faixa de 29–31% há 9 semanas consecutivas — o mais longo período de estabilidade registrado na série.",
  ],
  destaqueAnalise:
    "Com 5 meses de série histórica, o ElectioLab não registra nenhum movimento de virada. A corrida presidencial permanece estabilizada: Lula à frente por cerca de 6,9pp da soma dos dois candidatos conservadores mais fortes.",

  pesquisas: [
    {
      instituto: "Quaest",
      cliente: "Genial Investimentos",
      publicacao: "20 mai 2026",
      metodologia: "Telefônica",
      n: 2_000,
      lider: "Lula",
      pct_lider: 38,
      destaque: "Lula atinge 38% — melhor resultado na metodologia telefônica em 7 meses. Tarcísio sobe 1pp entre eleitores sem ensino superior.",
    },
    {
      instituto: "AtlasIntel",
      cliente: "Espontânea",
      publicacao: "23 mai 2026",
      metodologia: "Online",
      n: 5_114,
      lider: "Lula",
      pct_lider: 36,
      destaque: "Cenário mais equilibrado no interior de SP. Tarcísio alcança 21% na faixa 18–34 anos — melhor resultado desde que entrou na corrida.",
    },
  ],

  governadores: [
    { uf: "SP", lider: "Tarcísio",      pct: 40.8, delta: +0.8, partido: "Rep" },
    { uf: "MG", lider: "Cleitinho",     pct: 48.5, delta: +0.5, partido: "Rep" },
    { uf: "RJ", lider: "Eduardo Paes",  pct: 49.3, delta: +0.3, partido: "PSD" },
    { uf: "RS", lider: "Eduardo Leite", pct: 43.2, delta: -0.4, partido: "PSDB" },
  ],

  totalPesquisas: 28,
  totalInstitutos: 13,
  totalEntrevistados: 68_420,

  prevSemana: 17,
  nextSemana: 22,
  nextDateRange: "26 mai – 1 jun 2026",
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
