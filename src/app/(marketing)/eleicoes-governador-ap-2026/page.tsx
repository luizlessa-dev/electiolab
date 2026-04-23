import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador AP 2026 — Dr. Furlan Domina | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Amapá 2026. Dr. Furlan (PSD) 65,1%, Clécio Luís (União) 25,3% — Paraná Pesquisas mar/2026. Corrida sem suspense.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-ap-2026" },
  openGraph: {
    title: "Pesquisas Governador AP 2026 — Dr. Furlan Domina | ElectioLab",
    description: "Dr. Furlan (PSD) 65,1%, Clécio Luís (União) 25,3% — Paraná Pesquisas mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-ap-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Dr. Furlan",    party: "PSD",         pct: 65.1 },
  { name: "Clécio Luís",  party: "União Brasil", pct: 25.3 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Amapá em 2026?",
    answer: "Dr. Furlan (PSD), atual governador, lidera com 65,1% na Paraná Pesquisas (mar/2026). Clécio Luís (União Brasil), ex-governador, aparece em segundo com 25,3%. A diferença de 39,8 pp é a maior entre todos os estados brasileiros — Furlan está na posição mais confortável de qualquer governador que busca reeleição em 2026. Uma vitória no 1º turno é o cenário mais provável.",
  },
  {
    question: "Dr. Furlan pode ser reeleito governador do Amapá?",
    answer: "Dr. Furlan (PSD) assumiu o governo do Amapá em 2023 em seu 1º mandato e é elegível para reeleição em 2026. Com 65% nas pesquisas e liderança esmagadora sobre o adversário mais próximo, a reeleição de Furlan é virtualmente certa pelo cenário atual. Seu governo foi marcado pela reconstrução administrativa do estado após os problemas de gestão anteriores — o que explica a altíssima aprovação.",
  },
  {
    question: "Quem é Clécio Luís e por que enfrenta tanta dificuldade no Amapá?",
    answer: "Clécio Luís (União Brasil) é ex-governador do Amapá e tentará reconquistar o cargo que perdeu para Furlan em 2022. A derrota anterior e a administração contestada no período em que governou pesam contra sua candidatura. Com 25,3% nas pesquisas, Clécio não consegue capturar o eleitorado de oposição de forma dominante — o que indica que mesmo os críticos do governo Furlan não convergiram para sua candidatura.",
  },
  {
    question: "Qual a situação política e econômica do Amapá em 2026?",
    answer: "O Amapá é um dos estados mais dependentes de transferências federais do Brasil e tem o menor PIB per capita do Norte. Em 2026, questões como desenvolvimento sustentável da Área de Proteção Ambiental (APA), royalties de mineração e geração de empregos para os jovens amapaenses dominam a pauta eleitoral. A sede do governo em Macapá — isolada do restante do Brasil por falta de ponte — é símbolo das dificuldades logísticas do estado.",
  },
  {
    question: "Quando é a eleição para governador do Amapá em 2026?",
    answer: "A eleição para governador do Amapá ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O Amapá tem aproximadamente 600 mil eleitores — um dos menores colégios do Brasil. O estado não tem ligação rodoviária com o restante do Brasil (apenas barco ou avião de Macapá para o Sul/Sudeste), o que torna o custo logístico das campanhas altíssimo e favorece candidatos com recursos amplos.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function GovernadorAP2026Page() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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
      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Amapá · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador AP 2026 — Dr. Furlan 65,1% Domina</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Paraná Pesquisas (mar/2026): Dr. Furlan (PSD) 65,1%, Clécio Luís (União) 25,3%.
            A maior vantagem entre todos os governadores candidatos à reeleição no Brasil —
            vitória no 1º turno é o cenário mais provável.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Paraná Pesquisas · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Presencial</span>
              <span className="text-xs font-mono text-muted-foreground">Mar/2026</span>
            </div>
            <div className="divide-y divide-border">
              {POLL_SNAPSHOT.map((c, i) => (
                <div key={c.name} className="px-4 py-3 flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.party}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 hidden sm:block">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 72) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Paraná Pesquisas · Cenário estimulado, 1º turno</p>
        </section>
        <section className="space-y-4" id="faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Perguntas frequentes</h2>
          </div>
          <div className="space-y-2">
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
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Outras eleições 2026</h2>
          <div className="grid sm:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { label: "Presidente 2026",    href: "/pesquisas-presidenciais-2026" },
              { label: "Governador PA 2026", href: "/eleicoes-governador-pa-2026" },
              { label: "Governador AM 2026", href: "/eleicoes-governador-am-2026" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="bg-card px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-between">
                {l.label} <span className="text-primary">→</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="border border-border rounded-sm bg-card px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Dados ao vivo no Dashboard</p>
            <p className="text-xs text-muted-foreground max-w-sm">Média ponderada atualizada, tendência histórica e ranking de acurácia dos institutos.</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0">
            <ExternalLink className="h-3.5 w-3.5" /> Abrir dashboard
          </Link>
        </section>
      </main>
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">ElectioLab — Terminal de Inteligência Eleitoral</span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/metodologia" className="hover:text-foreground transition-colors">Metodologia</Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
