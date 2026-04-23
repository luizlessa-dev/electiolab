import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador SE 2026 — Mitidieri vs Valmir | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de Sergipe 2026. Fábio Mitidieri (PSD) 44,2%, Valmir (Republicanos) 34,5% — Veritá mar/2026. Atualizado.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-se-2026" },
  openGraph: {
    title: "Pesquisas Governador SE 2026 — Mitidieri vs Valmir | ElectioLab",
    description: "Fábio Mitidieri (PSD) 44,2%, Valmir (Republicanos) 34,5% — Veritá mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-se-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Fábio Mitidieri",           party: "PSD",          pct: 44.2 },
  { name: "Valmir de Francisquinho",   party: "Republicanos", pct: 34.5 },
  { name: "Ricardo Marques",           party: "Cidadania",    pct: 17.6 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Sergipe em 2026?",
    answer: "Fábio Mitidieri (PSD), atual governador, lidera com 44,2% na Veritá (13–16 mar/2026, 1.200 entrevistados, ±2,8 pp, registro TSE: BR-06397/2026). Valmir de Francisquinho (Republicanos) aparece em segundo com 34,5% e Ricardo Marques (Cidadania) com 17,6%. A diferença de 9,7 pp coloca Mitidieri como favorito, mas a força de Valmir torna o 2º turno provável.",
  },
  {
    question: "Fábio Mitidieri pode ser reeleito governador de Sergipe?",
    answer: "Fábio Mitidieri (PSD) está no 1º mandato (2023–2026) e é constitucionalmente elegível para a reeleição em 2026. Com 44,2% nas pesquisas e liderança consolidada, parte em posição favorável. Mitidieri foi eleito em 2022 com o apoio do campo lulista e de Rogério Carvalho (PT) — e mantém o alinhamento com o governo federal, o que reforça seu capital eleitoral no estado mais dependente de transferências do Nordeste.",
  },
  {
    question: "Quem é Valmir de Francisquinho e qual sua força em Sergipe?",
    answer: "Valmir de Francisquinho (Republicanos) é ex-prefeito de Lagarto, segunda maior cidade de Sergipe, e deputado estadual. Representa o campo conservador-evangélico no estado. Com 34,5% nas pesquisas, é o principal nome de oposição a Mitidieri e disputa votos do eleitorado religioso e ruralista do interior sergipano. Sua candidatura ao governo em 2026 é o maior salto de sua trajetória política.",
  },
  {
    question: "Qual a importância das alianças políticas em Sergipe 2026?",
    answer: "Sergipe é o menor estado do Brasil em extensão e um dos menores em população — o que amplifica o peso das redes de influência locais. Em 2026, as alianças entre os campos do PSD, PT, MDB e Republicanos definirão o quadro. O apoio de Rogério Carvalho (PT) e Laércio Oliveira (PP/União) — dois dos nomes mais fortes do estado — pode ser o fator decisivo para quem vai ao 2º turno.",
  },
  {
    question: "Quando é a eleição para governador de Sergipe em 2026?",
    answer: "A eleição para governador de Sergipe ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). Sergipe tem aproximadamente 1,7 milhão de eleitores e é o menor estado do Nordeste. O estado recebe a maior transferência federal per capita do Brasil, o que torna o debate sobre gestão dos recursos federais central em todas as campanhas.",
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

export default function GovernadorSE2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Sergipe · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador SE 2026 — Mitidieri 44,2% vs Valmir 34,5%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Veritá (13–16 mar/2026, 1.200 entrevistados, ±2,8 pp): Fábio Mitidieri (PSD) 44,2%,
            Valmir de Francisquinho (Republicanos) 34,5%, Ricardo Marques (Cidadania) 17,6%.
            Governador no 1º mandato é favorito, mas 2º turno é provável.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Instituto Veritá · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.200 entrevistados · ±2,8 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">13–16 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 50) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Instituto Veritá · Cenário estimulado, 1º turno</p>
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
              { label: "Governador BA 2026", href: "/eleicoes-governador-ba-2026" },
              { label: "Governador PE 2026", href: "/eleicoes-governador-pe-2026" },
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
