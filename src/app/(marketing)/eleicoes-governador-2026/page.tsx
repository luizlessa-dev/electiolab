import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, HelpCircle, TrendingUp } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador 2026 — Todos os 27 Estados | ElectioLab" },
  description:
    "Acompanhe as pesquisas de governador 2026 em tempo real para todos os 27 estados. Dados agregados de institutos como Quaest, Real Time Big Data, Paraná Pesquisas e Futura Inteligência.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-2026" },
  openGraph: {
    title: "Pesquisas Governador 2026 — Todos os 27 Estados | ElectioLab",
    description: "Acompanhe as pesquisas para governador 2026 em tempo real — SP, MG, RJ, BA, RS e mais 22 estados.",
    url: "https://electiolab.com/eleicoes-governador-2026",
  },
};

const STATES = [
  { uf: "SP", name: "São Paulo", href: "/eleicoes-governador-sp-2026" },
  { uf: "MG", name: "Minas Gerais", href: "/eleicoes-governador-mg-2026" },
  { uf: "RJ", name: "Rio de Janeiro", href: "/eleicoes-governador-rj-2026" },
  { uf: "BA", name: "Bahia", href: "/eleicoes-governador-ba-2026" },
  { uf: "RS", name: "Rio Grande do Sul", href: "/eleicoes-governador-rs-2026" },
  { uf: "PR", name: "Paraná", href: "/eleicoes-governador-pr-2026" },
  { uf: "PE", name: "Pernambuco", href: "/eleicoes-governador-pe-2026" },
  { uf: "SC", name: "Santa Catarina", href: "/eleicoes-governador-sc-2026" },
  { uf: "GO", name: "Goiás", href: "/eleicoes-governador-go-2026" },
  { uf: "PB", name: "Paraíba", href: "/eleicoes-governador-pb-2026" },
  { uf: "CE", name: "Ceará", href: "/eleicoes-governador-ce-2026" },
  { uf: "PA", name: "Pará", href: "/eleicoes-governador-pa-2026" },
  { uf: "ES", name: "Espírito Santo", href: "/eleicoes-governador-es-2026" },
  { uf: "PI", name: "Piauí", href: "/eleicoes-governador-pi-2026" },
  { uf: "RN", name: "Rio Grande do Norte", href: "/eleicoes-governador-rn-2026" },
  { uf: "MA", name: "Maranhão", href: "/eleicoes-governador-ma-2026" },
  { uf: "AL", name: "Alagoas", href: "/eleicoes-governador-al-2026" },
  { uf: "DF", name: "Distrito Federal", href: "/eleicoes-governador-df-2026" },
  { uf: "MS", name: "Mato Grosso do Sul", href: "/eleicoes-governador-ms-2026" },
  { uf: "MT", name: "Mato Grosso", href: "/eleicoes-governador-mt-2026" },
  { uf: "RO", name: "Rondônia", href: "/eleicoes-governador-ro-2026" },
  { uf: "AC", name: "Acre", href: "/eleicoes-governador-ac-2026" },
  { uf: "AM", name: "Amazonas", href: "/eleicoes-governador-am-2026" },
  { uf: "RR", name: "Roraima", href: "/eleicoes-governador-rr-2026" },
  { uf: "AP", name: "Amapá", href: "/eleicoes-governador-ap-2026" },
  { uf: "TO", name: "Tocantins", href: "/eleicoes-governador-to-2026" },
  { uf: "SE", name: "Sergipe", href: "/eleicoes-governador-se-2026" },
];

const FAQ_ITEMS = [
  {
    question: "Quando é a eleição para governador em 2026?",
    answer: "15 de outubro de 2026 (1º turno) e 29 de outubro (2º turno, se necessário). A eleição é simultânea em todos os 27 estados.",
  },
  {
    question: "Quais institutos fazem pesquisas para governador 2026?",
    answer: "Os principais institutos são: Quaest, Real Time Big Data, Paraná Pesquisas, Futura Inteligência, Gerp, Datafolha e Ipespe. Cada um tem metodologia própria (telefone, online, híbrida).",
  },
  {
    question: "Como o ElectioLab calcula a média de pesquisas?",
    answer: "Agregamos pesquisas dos principais institutos ponderando por data (mais recentes têm maior peso), tamanho da amostra e metodologia. O cálculo é transparente e atualizado em tempo real.",
  },
  {
    question: "Por que as pesquisas divergem entre institutos?",
    answer: "Diferenças metodológicas (telefone vs online), tamanho da amostra, margem de erro, forma de abordagem e perfil dos entrevistados causam variação. Por isso acompanhamos múltiplos institutos.",
  },
  {
    question: "As pesquisas predizem com precisão o resultado das eleições?",
    answer: "Pesquisas são indicadores de tendência, não predições exatas. Margem de erro, campanhas, eventos inesperados e mobilização eleitoral podem mudar o resultado final.",
  },
];

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://electiolab.com/eleicoes-governador-2026",
  name: "Pesquisas Governador 2026 — Todos os 27 Estados",
  description: "Acompanhe as pesquisas de governador 2026 em tempo real para todos os 27 estados brasileiros",
  datePublished: "2026-07-30",
  inLanguage: "pt-BR",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: STATES.map((state, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: `Eleições Governador ${state.name} 2026`,
      url: `https://electiolab.com${state.href}`,
    })),
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function GovernadorHub2026Page() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
              { "@type": "ListItem", position: 2, name: "Eleições 2026", item: "https://electiolab.com/eleicoes" },
              {
                "@type": "ListItem",
                position: 3,
                name: "Governador 2026",
                item: "https://electiolab.com/eleicoes-governador-2026",
              },
            ],
          }),
        }}
      />

      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16 space-y-16">
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Eleições 2026 · Todos os Estados</p>
          <h1 className="text-4xl font-bold tracking-tight">Pesquisas Governador 2026 — Todos os 27 Estados</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed text-lg">
            Acompanhe as pesquisas de governador em tempo real para todos os 27 estados. Dados agregados dos principais institutos de pesquisa brasileiros com atualização contínua.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" /> Ver dashboard ao vivo →
          </Link>
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Eleições por Estado</h2>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">27</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden">
            {STATES.map((state) => (
              <Link
                key={state.uf}
                href={state.href}
                className="bg-card px-4 py-5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors flex flex-col gap-1"
              >
                <span className="text-xs font-mono text-primary">{state.uf}</span>
                <span className="line-clamp-2">{state.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-16">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-2 max-w-3xl">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="border border-border rounded-sm bg-card overflow-hidden group">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-3">
                  {item.question}
                  <span className="text-muted-foreground text-xs shrink-0 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="border border-border rounded-sm bg-card px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Análises em Profundidade</p>
            <p className="text-xs text-muted-foreground">Acesse o dashboard para dados interativos, cenários de segundo turno e histórico de pesquisas</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0">
            Abrir Dashboard
          </Link>
        </section>
      </main>

      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">ElectioLab — Terminal de Inteligência Eleitoral</span>
        </div>
      </footer>
    </div>
  );
}
