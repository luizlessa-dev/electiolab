import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador RS 2026 — Zucco vs Brizola vs Pretto | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Rio Grande do Sul 2026. Zucco (PL) 31%, Brizola (PDT) 24%, Pretto (PT) 19% — Real Time Big Data mar/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-rs-2026" },
  openGraph: {
    title: "Pesquisas Governador RS 2026 — Zucco vs Brizola vs Pretto | ElectioLab",
    description: "Zucco (PL) 31%, Brizola (PDT) 24%, Pretto (PT) 19% — Real Time Big Data mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-rs-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Luciano Zucco",   party: "PL",  pct: 31 },
  { name: "Juliana Brizola", party: "PDT", pct: 24 },
  { name: "Edegar Pretto",   party: "PT",  pct: 19 },
  { name: "Gabriel Souza",   party: "MDB", pct: 13 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Rio Grande do Sul em 2026?",
    answer: "Luciano Zucco (PL) lidera as pesquisas para governador do RS 2026 com 31% das intenções de voto no cenário estimulado, segundo Real Time Big Data de março de 2026 (1.500 entrevistas presenciais, ±2 pp). Juliana Brizola (PDT) aparece em segundo com 24%, seguida de Edegar Pretto (PT) com 19% e Gabriel Souza (MDB) com 13%. A corrida gaúcha é a mais fragmentada entre os grandes estados.",
  },
  {
    question: "Por que Eduardo Leite não aparece nas pesquisas para governador do RS 2026?",
    answer: "O governador Eduardo Leite (PSD) não pode disputar a reeleição ao governo gaúcho em 2026, por já ter cumprido dois mandatos consecutivos (2018–2022 e 2022–2026). As pesquisas o listam como possível candidato ao Senado Federal pelo RS em 2026, onde lidera com folga. A ausência de Leite na disputa estadual abre o campo para uma corrida multidirecional entre Zucco, Brizola, Pretto e Gabriel Souza.",
  },
  {
    question: "Quem são os principais candidatos ao governo do RS em 2026?",
    answer: "Os candidatos mais testados nas pesquisas para governador do RS 2026 são: Luciano Zucco (PL, deputado federal ligado à base bolsonarista), Juliana Brizola (PDT, filha de Alceu Collares e neta de Leonel Brizola, ex-deputada federal), Edegar Pretto (PT, ex-deputado federal, pré-candidato do campo petista), e Gabriel Souza (MDB, vice-governador atual). A entrada formal dos candidatos deve consolidar os cenários a partir do segundo semestre de 2025.",
  },
  {
    question: "Como o ElectioLab calcula a média das pesquisas para governador do RS 2026?",
    answer: "A média ponderada do ElectioLab leva em conta: recência (meia-vida de 10 dias), tamanho da amostra (raiz quadrada normalizada), metodologia de coleta (presencial > telefônica > online) e histórico de acurácia do instituto em eleições anteriores. Para o RS, a pesquisa disponível é da Real Time Big Data (mar/2026); conforme novas pesquisas forem publicadas, a média será recalculada automaticamente.",
  },
  {
    question: "Quando é a eleição para governador do Rio Grande do Sul em 2026?",
    answer: "A eleição para governador do Rio Grande do Sul ocorre em 4 de outubro de 2026 (1º turno) e, se necessário, 25 de outubro de 2026 (2º turno). O RS tem aproximadamente 8,5 milhões de eleitores aptos e é o quarto maior colégio eleitoral do Brasil, com forte tradição política — berço histórico do PDT, do PT gaúcho e do bolsonarismo no sul do país.",
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

export default function GovernadorRS2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Rio Grande do Sul · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador RS 2026 — Zucco Lidera Corrida Fragmentada</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Sem Eduardo Leite (impedido de disputar o terceiro mandato consecutivo), o RS 2026 é a corrida estadual mais aberta do Brasil.
            Real Time Big Data (14–16 mar/2026, 1.500 entrevistas, ±2 pp) mostra Zucco (PL) com 31%, Brizola (PDT) 24%, Pretto (PT) 19% e Gabriel Souza (MDB) 13%.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Real Time Big Data · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.500 entrevistas · ±2,0 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">14–16 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 35) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Real Time Big Data · Cenário estimulado, 1º turno</p>
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
              { label: "Governador SP 2026", href: "/eleicoes-governador-sp-2026" },
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
