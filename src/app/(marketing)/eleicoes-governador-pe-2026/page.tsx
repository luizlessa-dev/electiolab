import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador PE 2026 — João Campos vs Raquel Lyra | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de Pernambuco 2026. João Campos (PSB) 50%, Raquel Lyra (PSD) 38% — Datafolha abr/2026. Atualizado semanalmente.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-pe-2026" },
  openGraph: {
    title: "Pesquisas Governador PE 2026 — João Campos vs Raquel Lyra | ElectioLab",
    description: "João Campos (PSB) 50%, Raquel Lyra (PSD) 38% — Datafolha abr/2026.",
    url: "https://electiolab.com/eleicoes-governador-pe-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "João Campos",  party: "PSB", pct: 50 },
  { name: "Raquel Lyra",  party: "PSD", pct: 38 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Pernambuco em 2026?",
    answer: "João Campos (PSB) lidera com 50% das intenções de voto no Datafolha de abril de 2026 (13–15 abr, 1.022 entrevistas, ±3 pp). A atual governadora Raquel Lyra (PSD) aparece em segundo com 38%. A diferença de 12 pontos coloca Campos como favorito, mas Lyra permanece competitiva — o cenário muda de acordo com o instituto: a Veritá (mar/2026) apontou empate técnico.",
  },
  {
    question: "João Campos deixaria a prefeitura do Recife para disputar o governo de PE?",
    answer: "João Campos foi reeleito prefeito do Recife em 2024 com votação expressiva e tornou-se o principal nome do PSB para o governo de Pernambuco em 2026. Para disputar o cargo, precisaria renunciar à prefeitura até 1º de abril de 2026. A decisão ainda não foi formalizada até a publicação desta página. O ElectioLab reflete os cenários testados pelos institutos, que incluem Campos mesmo antes da confirmação formal da candidatura.",
  },
  {
    question: "Raquel Lyra pode ser reeleita governadora de Pernambuco?",
    answer: "Raquel Lyra (PSD) foi eleita em 2022 com 52,87% dos votos no 2º turno. Com 61,3% de aprovação (Veritá, mar/2026), ela tem base sólida para disputar a reeleição. Contudo, o cenário contra João Campos — que acumula aprovações recordes em Recife — é desafiador. Em diferentes simulações de institutos, o resultado varia de empate técnico a vantagem de 12 pp para Campos, dependendo de metodologia e período.",
  },
  {
    question: "Quais institutos acompanham o governo de Pernambuco 2026?",
    answer: "Os principais institutos com pesquisas publicadas para PE 2026 são Datafolha (abr/2026), Real Time Big Data (fev e abr/2026), Veritá (mar/2026) e Instituto Conecta (dez/2025). Os números variam significativamente conforme a metodologia: o Datafolha presencial mostra João Campos com 12 pp de vantagem; a Veritá online apontou empate técnico. O ElectioLab pondera cada pesquisa pelo histórico de acurácia do instituto em eleições passadas.",
  },
  {
    question: "Quando é a eleição para governador de Pernambuco em 2026?",
    answer: "A eleição para governador de Pernambuco ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). Pernambuco tem aproximadamente 7 milhões de eleitores e é o estado mais populoso do Nordeste após a Bahia. A corrida pernambucana é uma das mais relevantes para o cenário presidencial — o PSB e o PT disputam influência na região, e o resultado estadual impacta diretamente a composição do Congresso eleito.",
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

export default function GovernadorPE2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Pernambuco · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador PE 2026 — João Campos 50% vs Raquel Lyra 38%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Datafolha (13–15 abr/2026, 1.022 entrevistas, ±3 pp) aponta João Campos (PSB) com 50% e Raquel Lyra (PSD) com 38%.
            Corrida competitiva — diferentes institutos apresentam resultados variados, de empate técnico a 12 pp de vantagem para Campos.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Datafolha · Abr/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.022 entrevistas · ±3,0 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">13–15 abr/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 55) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Datafolha · Cenário estimulado, 1º turno</p>
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
              { label: "Presidente 2026", href: "/pesquisas-presidenciais-2026" },
              { label: "Governador BA 2026", href: "/eleicoes-governador-ba-2026" },
              { label: "Governador CE 2026", href: "/eleicoes-governador-ce-2026" },
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
