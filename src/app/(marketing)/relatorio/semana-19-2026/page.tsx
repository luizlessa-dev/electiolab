import type { Metadata } from "next";
import { RelatorioPage, buildReportMetadata } from "@/components/relatorio/relatorio-page";
import type { ReportData } from "@/components/relatorio/types";

export const DATA: ReportData = {
  semana: 19,
  dateRange: "5–11 de maio de 2026",
  dateISO: "2026-05-11",

  presidencial: [
    { name: "Lula",      party: "PT",           pct: 37.0, delta: +0.1, cor: "#ef4444" },
    { name: "Bolsonaro", party: "PL",           pct: 30.3, delta:  0.0, cor: "#3b82f6" },
    { name: "Tarcísio",  party: "Republicanos", pct: 18.4, delta: +0.1, cor: "#8b5cf6" },
    { name: "Outros",    party: "—",            pct: 14.3, delta: -0.2, cor: "#6b7280" },
  ],

  analise: [
    "Semana mais movimentada em termos de pesquisas — dois institutos publicaram levantamentos, permitindo uma comparação metodológica direta. A Quaest (telefônica) e o Paraná Pesquisas (presencial) apontam para o mesmo ranking, com distâncias ligeiramente diferentes, o que é esperado dado o efeito de metodologia.",
    "Lula (PT) chega a 37,0% — marca psicológica que não alcançava desde o início de março. A melhora é puxada especialmente pela Quaest, que registrou 38% na coleta de 6 de maio. O Paraná Pesquisas, metodologia presencial, marcou 36%, dentro do padrão histórico de resultados mais conservadores para candidatos de esquerda nessa metodologia.",
    "Bolsonaro (PL) estabiliza em 30,3% pela segunda semana consecutiva, sem variação. O campo conservador, somado, ainda ultrapassa Lula se Tarcísio for somado a Bolsonaro — leitura que os estrategistas do PT monitoram de perto.",
    "Tarcísio (Republicanos) mantém a trajetória de alta moderada (+0,1pp). Vale observar que a candidatura começa a aparecer com força em pesquisas qualitativas como 'candidato do futuro' e 'renovação' — atributos que não se convertem em voto imediato mas constroem favorabilidade para o segundo semestre.",
  ],
  destaqueAnalise:
    "A comparação direta Quaest × Paraná Pesquisas nesta semana ilustra o conceito de house effect: a diferença de 2pp para Lula entre as metodologias está dentro do padrão histórico de cada instituto, não representa mudança real de cenário.",

  pesquisas: [
    {
      instituto: "Quaest",
      cliente: "Genial Investimentos",
      publicacao: "7 mai 2026",
      metodologia: "Telefônica",
      n: 2_000,
      lider: "Lula",
      pct_lider: 38,
      destaque: "Lula atinge 38% — melhor resultado da Quaest em 2026. Tarcísio marca 19%, também recorde para o instituto neste ciclo.",
    },
    {
      instituto: "Paraná Pesquisas",
      cliente: "Espontânea",
      publicacao: "9 mai 2026",
      metodologia: "Presencial",
      n: 2_012,
      lider: "Lula",
      pct_lider: 36,
      destaque: "Bolsonaro aparece com 31% — patamar mais alto desde o início de 2026 nessa metodologia. Margem sobre Tarcísio permanece em 13pp.",
    },
  ],

  governadores: [
    { uf: "SP", lider: "Tarcísio",      pct: 40.4, delta: +0.2, partido: "Rep" },
    { uf: "MG", lider: "Cleitinho",     pct: 48.3, delta: +0.1, partido: "Rep" },
    { uf: "RJ", lider: "Eduardo Paes",  pct: 49.2, delta: +0.1, partido: "PSD" },
    { uf: "RS", lider: "Eduardo Leite", pct: 43.4, delta: -0.1, partido: "PSDB" },
    { uf: "BA", lider: "Jerônimo",      pct: 54.7, delta: +0.3, partido: "PT" },
  ],

  totalPesquisas: 27,
  totalInstitutos: 13,
  totalEntrevistados: 64_814,

  prevSemana: 18,
  nextSemana: 20,
  nextDateRange: "12–18 de maio de 2026",
};

export const metadata: Metadata = buildReportMetadata(DATA);

export default function Page() {
  return <RelatorioPage data={DATA} />;
}
