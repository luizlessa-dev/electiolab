import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

type Article = {
  href: string;
  title: string;
  desc: string;
  tag: string;
};

/**
 * Cluster editorial de artigos sobre pesquisas eleitorais.
 * Atualizar quando novas páginas forem publicadas.
 */
const CLUSTER: Article[] = [
  {
    href: "/pesquisas-presidenciais-2026",
    title: "Pesquisas presidenciais 2026",
    desc: "Médias ponderadas ao vivo — todos os candidatos",
    tag: "Dados ao vivo",
  },
  {
    href: "/metodologia",
    title: "Como calculamos a média ponderada",
    desc: "Fórmula, fatores de peso e exemplo numérico completo",
    tag: "Metodologia",
  },
  {
    href: "/margem-de-erro-pesquisa-eleitoral",
    title: "O que é margem de erro",
    desc: "Como interpretar o intervalo de confiança de 95%",
    tag: "Educacional",
  },
  {
    href: "/empate-tecnico-pesquisa-eleitoral",
    title: "O que é empate técnico",
    desc: "Definição correta e como a mídia frequentemente erra",
    tag: "Educacional",
  },
  {
    href: "/por-que-institutos-dao-numeros-diferentes",
    title: "Por que institutos dão números diferentes",
    desc: "House effects, metodologia e como a média resolve",
    tag: "Análise",
  },
  {
    href: "/pesquisas-eleitorais-sao-confiaveis",
    title: "Pesquisas eleitorais são confiáveis?",
    desc: "Por que a média de várias é mais confiável que uma só",
    tag: "Análise",
  },
  {
    href: "/pesquisas-erraram-2022",
    title: "As pesquisas erraram em 2022?",
    desc: "O que aconteceu no 1º e 2º turno e o que mudou",
    tag: "Análise",
  },
  {
    href: "/dinheiro-e-votos-pesquisas-2026",
    title: "Dinheiro e Votos — FEFC 2026",
    desc: "Financiamento de campanha cruzado com as pesquisas",
    tag: "Análise",
  },
  {
    href: "/glossario-pesquisa-eleitoral",
    title: "Glossário de pesquisa eleitoral",
    desc: "Termos essenciais explicados em linguagem simples",
    tag: "Educacional",
  },
  {
    href: "/pesquisa-estimulada-vs-espontanea",
    title: "Estimulada vs. espontânea",
    desc: "Duas formas de perguntar, dois resultados diferentes",
    tag: "Educacional",
  },
  {
    href: "/pesquisa-presencial-vs-online",
    title: "Presencial vs. online",
    desc: "Diferenças de metodologia e o que cada uma captura",
    tag: "Educacional",
  },
  {
    href: "/quanto-custa-campanha-eleitoral-google-ads-meta",
    title: "Quanto custa uma campanha em ads digitais",
    desc: "Google e Meta nas eleições presidenciais brasileiras",
    tag: "Dados",
  },
  {
    href: "/instituto-mais-acurado-eleicoes-brasil",
    title: "Qual instituto acerta mais",
    desc: "Ranking histórico de acurácia por eleição",
    tag: "Análise",
  },
  {
    href: "/quem-vence-no-segundo-turno-presidencia-2026",
    title: "Quem vence no segundo turno",
    desc: "Cenários de 2T presidencial nas pesquisas",
    tag: "Análise",
  },
];

interface LeiaTabemProps {
  /** Href da página atual — será excluída da lista */
  current: string;
  /** Quantos artigos exibir. Padrão: 4 */
  count?: number;
}

/**
 * Seção "Leia também" com links para artigos do cluster editorial.
 * Use em todas as páginas editoriais para fortalecer o internal linking.
 */
export function LeiaTabem({ current, count = 4 }: LeiaTabemProps) {
  const articles = CLUSTER.filter((a) => a.href !== current).slice(0, count);
  if (articles.length === 0) return null;

  return (
    <section className="border-t border-border pt-8 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Leia também
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {articles.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group border border-border rounded-lg px-4 py-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {a.tag}
              </span>
              <p className="text-sm font-medium group-hover:text-primary transition-colors mt-0.5 leading-snug">
                {a.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.desc}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </section>
  );
}
