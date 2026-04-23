import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador PR 2026 — Sergio Moro Lidera com 51% | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Paraná 2026. Sergio Moro (PL) 51,5%, Requião Filho (PDT) 28,4% — AtlasIntel mar/2026. Atualizado.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-pr-2026" },
  openGraph: {
    title: "Pesquisas Governador PR 2026 — Sergio Moro Lidera com 51% | ElectioLab",
    description: "Sergio Moro (PL) 51,5%, Requião Filho (PDT) 28,4% — AtlasIntel mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-pr-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Sergio Moro",    party: "PL",  pct: 51.5 },
  { name: "Requião Filho",  party: "PDT", pct: 28.4 },
  { name: "Rafael Greca",   party: "MDB", pct:  8.4 },
  { name: "Guto Silva",     party: "PSD", pct:  5.6 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Paraná em 2026?",
    answer: "Sergio Moro (PL) lidera com 51,5% das intenções de voto no cenário estimulado da AtlasIntel (25–30 mar/2026, 1.254 entrevistados, ±3 pp). Requião Filho (PDT) aparece em segundo com 28,4%, seguido de Rafael Greca (MDB) com 8,4% e Guto Silva (PSD) com 5,6%. A corrida paranaense é a mais relevante do Sul do país — opõe o campo bolsonarista ao campo progressista numa das maiores economias regionais do Brasil.",
  },
  {
    question: "Por que Ratinho Junior não disputa a reeleição no Paraná?",
    answer: "Carlos Massa Ratinho Junior (PSD) cumpriu dois mandatos consecutivos como governador do Paraná (2019–2026) e está constitucionalmente impedido de se reeleger. Ratinho Junior encerra o mandato com altíssima aprovação (acima de 70%) e seu legado é disputado pelo campo conservador. Em 2026, a cadeira fica em aberto e a corrida se tornou a mais competitiva do Sul.",
  },
  {
    question: "Sergio Moro pode ser eleito governador do Paraná em 2026?",
    answer: "Sergio Moro (PL) lidera todas as pesquisas para governador do PR 2026 com mais de 50% — o que, se confirmado, resultaria em vitória já no 1º turno. Moro se tornou senador pelo Paraná em 2022 e construiu base eleitoral sólida no estado. A candidatura ao governo estadual é vista como plataforma para 2030 presidencial. O principal desafio é consolidar apoios do PSD e MDB antes das convenções.",
  },
  {
    question: "Quem é Requião Filho e qual sua força no Paraná?",
    answer: "Roberto Requião Filho (PDT) é filho do ex-governador e senador Roberto Requião, herdeiro de uma das mais longevas tradições políticas do Paraná. É deputado federal e representa o campo progressista da disputa. Com 28,4% nas pesquisas, lidera a oposição e seria o provável adversário de Moro num eventual 2º turno. A base do PDT paranaense, forjada pelo pai, ainda mobiliza eleitores nas regiões metropolitana de Curitiba e interior.",
  },
  {
    question: "Quando é a eleição para governador do Paraná em 2026?",
    answer: "A eleição para governador do Paraná ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O Paraná tem aproximadamente 8,5 milhões de eleitores — é o quarto maior colégio eleitoral do Brasil. O estado é considerado laboratório político do campo conservador e seus resultados influenciam diretamente a composição da bancada federal.",
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

export default function GovernadorPR2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Paraná · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador PR 2026 — Moro 51,5% vs Requião Filho 28,4%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            AtlasIntel (25–30 mar/2026, 1.254 entrevistados, ±3 pp): Sergio Moro (PL) lidera com 51,5%,
            Requião Filho (PDT) com 28,4%, Rafael Greca (MDB) com 8,4%. Com Ratinho Junior impedido
            de reeleger, a corrida paranaense é aberta e estratégica para 2030.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — AtlasIntel · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.254 entrevistados · ±3,0 pp · online</span>
              <span className="text-xs font-mono text-muted-foreground">25–30 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 57) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: AtlasIntel · Cenário estimulado, 1º turno</p>
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
              { label: "Governador SC 2026", href: "/eleicoes-governador-sc-2026" },
              { label: "Governador RS 2026", href: "/eleicoes-governador-rs-2026" },
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
