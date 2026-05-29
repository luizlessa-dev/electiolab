import { buildRelatorioOG, size, contentType } from "@/components/relatorio/og-builder";

export { size, contentType };
export const alt = "Relatório Semanal ElectioLab — Semana 17 (21–27 abr 2026)";
export const runtime = "edge";

export default function OG() {
  return buildRelatorioOG({
    semana: 17,
    dateRange: "21–27 de abril de 2026",
    dateISO: "2026-04-27",
    presidencial: [
      { name: "Lula",      party: "PT",           pct: 36.8, delta: +0.4, cor: "#ef4444" },
      { name: "Bolsonaro", party: "PL",           pct: 30.4, delta: -0.3, cor: "#3b82f6" },
      { name: "Tarcísio",  party: "Republicanos", pct: 18.2, delta: +0.8, cor: "#8b5cf6" },
      { name: "Outros",    party: "—",            pct: 14.6, delta: -0.9, cor: "#6b7280" },
    ],
    analise: [],
    pesquisas: [],
    governadores: [],
    totalPesquisas: 26,
    totalInstitutos: 13,
    totalEntrevistados: 60608,
    prevSemana: 16,
    nextSemana: 18,
  });
}
