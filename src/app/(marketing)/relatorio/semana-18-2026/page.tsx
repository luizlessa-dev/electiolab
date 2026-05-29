import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 18,
  dateRange: "28 de abril – 4 de maio de 2026",
  dateISO: "2026-05-04",

  presidencial: [
    { name: "Lula",      party: "PT",           pct: 36.9, delta: +0.1, cor: "#ef4444" },
    { name: "Bolsonaro", party: "PL",           pct: 30.3, delta: -0.1, cor: "#3b82f6" },
    { name: "Tarcísio",  party: "Republicanos", pct: 18.3, delta: +0.1, cor: "#8b5cf6" },
    { name: "Outros",    party: "—",            pct: 14.5, delta: -0.1, cor: "#6b7280" },
  ],

  analise: [
    "Semana de baixa volatilidade — apenas uma pesquisa nova incorporada à base. Os três candidatos principais registram variação dentro do ruído estatístico, o que reforça a leitura de estabilidade estrutural da corrida presidencial.",
    "Lula (PT) avança 0,1pp, sustentado pela pesquisa do Ipespe de 30 de abril, que mostrou o presidente com 37% entre eleitores de renda até 2 salários mínimos — base ainda sólida apesar da pressão inflacionária dos primeiros meses do ano.",
    "Bolsonaro (PL) recua 0,1pp. A queda é tecnicamente insignificante, mas marca a terceira semana consecutiva sem crescimento para a candidatura. Analistas apontam que o ex-presidente perdeu espaço na pauta com a ausência de eventos de mobilização relevantes em abril.",
    "Tarcísio (Republicanos) sobe 0,1pp e acumula agora +0,3pp desde a semana 16 — ritmo lento mas consistente. O crescimento se concentra entre eleitores com ensino superior no estado de São Paulo.",
  ],
  destaqueAnalise:
    "Com a pauta política relativamente neutra na semana, a média reflete o patamar consolidado das últimas quatro semanas: Lula entre 36,5% e 37%, Bolsonaro entre 30% e 31%, Tarcísio entre 18% e 19%.",

  pesquisas: [
    {
      instituto: "Ipespe",
      cliente: "XP Investimentos",
      publicacao: "30 abr 2026",
      metodologia: "Telefônica",
      n: 1_204,
      lider: "Lula",
      pct_lider: 37,
      destaque: "Lula lidera com 37% e mantém vantagem de 7pp sobre Bolsonaro. Entre eleitores sem ensino superior, vantagem sobe para 12pp.",
    },
  ],

  governadores: [
    { uf: "SP", lider: "Tarcísio",      pct: 40.2, delta: +0.2, partido: "Rep" },
    { uf: "MG", lider: "Cleitinho",     pct: 48.2, delta: +0.2, partido: "Rep" },
    { uf: "RJ", lider: "Eduardo Paes",  pct: 49.1, delta: +0.1, partido: "PSD" },
    { uf: "RS", lider: "Eduardo Leite", pct: 43.5, delta: -0.3, partido: "PSDB" },
  ],

  totalPesquisas: 26,
  totalInstitutos: 13,
  totalEntrevistados: 62_408,

  prevSemana: 17,
  nextSemana: 19,
  nextDateRange: "5–11 de maio de 2026",
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
