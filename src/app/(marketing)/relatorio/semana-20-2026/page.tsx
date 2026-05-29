import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

const DATA: ReportData = {
  semana: 20,
  dateRange: "12–18 de maio de 2026",
  dateISO: "2026-05-18",

  presidencial: [
    { name: "Lula",      party: "PT",           pct: 37.0, delta:  0.0, cor: "#ef4444" },
    { name: "Bolsonaro", party: "PL",           pct: 30.2, delta: -0.1, cor: "#3b82f6" },
    { name: "Tarcísio",  party: "Republicanos", pct: 18.5, delta: +0.1, cor: "#8b5cf6" },
    { name: "Outros",    party: "—",            pct: 14.3, delta:  0.0, cor: "#6b7280" },
  ],

  analise: [
    "Semana de manutenção: Lula estabiliza em 37,0% pela segunda semana consecutiva — sinal de consolidação, não de estagnação. Em ciência política eleitoral, estabilidade em patamar elevado é um ativo: indica que a liderança não depende de eventos favoráveis para se sustentar.",
    "Bolsonaro (PL) recua 0,1pp, acumulando -0,2pp desde a semana 17. A série de quatro semanas sem crescimento começa a configurar uma tendência de pressão sobre o piso eleitoral. Ainda não é uma queda estrutural, mas merece atenção nos próximos ciclos.",
    "Tarcísio (Republicanos) sobe 0,1pp e encerra a semana em 18,5% — a maior marca da candidatura desde o início da série do ElectioLab. Dezembro começa a aparecer em análises como prazo para o candidato consolidar uma identidade eleitoral própria, separada do bolsonarismo histórico.",
    "O campo 'Outros' permanece em 14,3% pela segunda semana seguida. A manutenção indica que os eleitores indecisos entre os candidatos menores ainda não migram para o campo polarizado — o que pode mudar a partir de agosto com o início oficial da campanha.",
  ],
  destaqueAnalise:
    "Momento de estabilidade máxima na série: nenhum candidato varia mais de 0,1pp. Isso pode indicar que o eleitorado está aguardando eventos concretos de campanha para revisar intenções — confirmando a importância do período agosto–outubro para a definição do quadro final.",

  pesquisas: [
    {
      instituto: "AtlasIntel",
      cliente: "Espontânea",
      publicacao: "15 mai 2026",
      metodologia: "Online",
      n: 4_622,
      lider: "Lula",
      pct_lider: 36,
      destaque: "Tarcísio alcança 19% na faixa 25–34 anos — o melhor resultado entre jovens adultos desde que entrou na corrida. Bolsonaro recua para 29% nessa faixa etária.",
    },
  ],

  governadores: [
    { uf: "SP", lider: "Tarcísio",      pct: 40.6, delta: +0.2, partido: "Rep" },
    { uf: "MG", lider: "Cleitinho",     pct: 48.4, delta: +0.1, partido: "Rep" },
    { uf: "RJ", lider: "Eduardo Paes",  pct: 49.2, delta:  0.0, partido: "PSD" },
    { uf: "RS", lider: "Eduardo Leite", pct: 43.3, delta: -0.1, partido: "PSDB" },
    { uf: "BA", lider: "Jerônimo",      pct: 54.9, delta: +0.2, partido: "PT" },
  ],

  totalPesquisas: 27,
  totalInstitutos: 13,
  totalEntrevistados: 66_617,

  prevSemana: 19,
  nextSemana: 21,
  nextDateRange: "19–25 de maio de 2026",
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
