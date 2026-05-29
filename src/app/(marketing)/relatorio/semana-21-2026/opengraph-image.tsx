import { buildRelatorioOG, size, contentType } from "@/components/relatorio/og-builder";
import { DATA } from "./page";

export { size, contentType };
export const alt = `Relatório Semanal ElectioLab — Semana 21`;
export const runtime = "edge";

export default function OG() {
  return buildRelatorioOG(DATA);
}
