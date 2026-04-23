import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador DF 2026 — Arruda vs Celina Leão vs Izalci | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Distrito Federal 2026. Arruda (PSD) 24%, Celina Leão (PP) 22%, Izalci (PL) 21,5% — quadra empate técnico.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-df-2026" },
  openGraph: {
    title: "Pesquisas Governador DF 2026 — Arruda vs Celina Leão vs Izalci | ElectioLab",
    description: "Arruda (PSD) 24%, Celina Leão (PP) 22%, Izalci (PL) 21,5% — empate técnico de 4 candidatos.",
    url: "https://electiolab.com/eleicoes-governador-df-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "José Roberto Arruda", party: "PSD",  pct: 24.0 },
  { name: "Celina Leão",         party: "PP",   pct: 22.0 },
  { name: "Izalci Lucas",        party: "PL",   pct: 21.5 },
  { name: "Leandro Grass",       party: "PV",   pct: 21.4 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Distrito Federal em 2026?",
    answer: "O DF 2026 tem a corrida mais equilibrada do Brasil: quatro candidatos em empate técnico dentro da margem de erro. Pesquisa de março/2026 aponta Arruda (PSD) 24%, Celina Leão (PP) 22%, Izalci Lucas (PL) 21,5% e Leandro Grass (PV) 21,4% — uma diferença de apenas 2,6 pp entre o 1º e o 4º colocados. Nota: o Real Time Big Data de dez/2025 havia apontado Celina Leão com 40%, mas o quadro se fragmentou com o avanço das candidaturas.",
  },
  {
    question: "Por que Ibaneis Rocha não disputa a reeleição no DF?",
    answer: "Ibaneis Rocha (MDB) governou o Distrito Federal por dois mandatos (2019–2026) e está impedido de se reeleger. Renunciou em 30 de março de 2026 para disputar o Senado Federal pelo DF. Celina Leão (PP), sua vice-governadora, assumiu o cargo e passa a disputar a eleição como governadora em exercício — vantagem de incumbência que se reflete na posição de segunda colocada nas pesquisas.",
  },
  {
    question: "Quem é José Roberto Arruda e por que lidera no DF?",
    answer: "José Roberto Arruda (PSD) é ex-governador do DF (2007–2010) e tem longa trajetória na política brasiliense. Seu retorno ao cenário eleitoral aposta na memória positiva de sua primeira gestão e no vácuo deixado por Ibaneis Rocha. Com 24% nas pesquisas, lidera mas sem folga — a fragmentação do eleitorado entre quatro candidatos sugere que o 2º turno definirá o resultado.",
  },
  {
    question: "Quem é Leandro Grass e qual seu apelo no Distrito Federal?",
    answer: "Leandro Grass (PV) é ex-deputado distrital e representa o campo progressista no DF — o único estado onde a esquerda enfrenta sua maior dificuldade histórica por concentrar o eleitorado de funcionários públicos federais e militares. Com 21,4% nas pesquisas, Grass demonstra que a esquerda tem eleitorado relevante no DF — principalmente entre servidores federais e professores. Uma eventual aliança com o PT poderia posicioná-lo para o 2º turno.",
  },
  {
    question: "Quando é a eleição para governador do Distrito Federal em 2026?",
    answer: "A eleição para governador do Distrito Federal ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O DF tem aproximadamente 2,3 milhões de eleitores e é um colégio especial — capital federal com eleitorado concentrado em servidores públicos, militares e profissionais liberais. O resultado distrital costuma espelhar tendências nacionais e tem peso simbólico desproporcional ao seu tamanho.",
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

export default function GovernadorDF2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Distrito Federal · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador DF 2026 — Quatro Candidatos em Empate Técnico</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Mar/2026: Arruda (PSD) 24%, Celina Leão (PP) 22%, Izalci Lucas (PL) 21,5%, Leandro Grass (PV) 21,4%.
            A corrida mais fragmentada do Brasil — 2,6 pp separam o 1º do 4º colocado.
            Com Ibaneis Rocha impedido, DF entra em aberto.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">±3,0 pp</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 28) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Pesquisa registrada · Cenário estimulado, 1º turno</p>
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
              { label: "Governador GO 2026", href: "/eleicoes-governador-go-2026" },
              { label: "Governador MG 2026", href: "/eleicoes-governador-mg-2026" },
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
