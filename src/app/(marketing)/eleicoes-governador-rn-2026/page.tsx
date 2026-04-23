import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador RN 2026 — Alysson Bezerra vs Rogério Marinho | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Rio Grande do Norte 2026. Alysson Bezerra (União) 36%, Rogério Marinho (PL) 34% — Real Time Big Data dez/2025.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-rn-2026" },
  openGraph: {
    title: "Pesquisas Governador RN 2026 — Alysson Bezerra vs Rogério Marinho | ElectioLab",
    description: "Alysson Bezerra (União) 36%, Rogério Marinho (PL) 34% — Real Time Big Data dez/2025.",
    url: "https://electiolab.com/eleicoes-governador-rn-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Alysson Bezerra",   party: "União Brasil", pct: 36.0 },
  { name: "Rogério Marinho",   party: "PL",           pct: 34.0 },
  { name: "Álvaro Dias",       party: "Progressistas", pct: 17.0 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Rio Grande do Norte em 2026?",
    answer: "Alysson Bezerra (União Brasil), prefeito de Mossoró, lidera com 36% nas pesquisas mais recentes disponíveis (Real Time Big Data, dez/2025, ±2,5 pp). Rogério Marinho (PL), senador, aparece empatado tecnicamente com 34%. A disputa potiguar é a mais equilibrada entre os estados nordestinos — com Fátima Bezerra impedida de reeleger, o campo progressista e o conservador partem praticamente do zero.",
  },
  {
    question: "Por que Fátima Bezerra não disputa a reeleição no Rio Grande do Norte?",
    answer: "Fátima Bezerra (PT) governou o RN por dois mandatos consecutivos (2019–2026) e está constitucionalmente impedida de se reeleger. Completará o mandato em dezembro de 2026. O PT potiguá perdeu o direito à sucessão automática — o campo progressista precisará se reorganizar em torno de um novo nome para disputar o governo. Natália Bonavides (PSOL) e outros nomes são cotados, mas sem candidatura definida até esta publicação.",
  },
  {
    question: "Quem é Rogério Marinho e por que disputa o governo do RN?",
    answer: "Rogério Marinho (PL) é senador federal pelo Rio Grande do Norte e ex-ministro do Desenvolvimento Regional no governo Bolsonaro. É o principal nome do campo conservador-bolsonarista no estado. Com 34% nas pesquisas de dez/2025, está em empate técnico com Alysson Bezerra — o que torna o RN um dos estados mais imprevisíveis de 2026. A decisão de Marinho de abrir mão do mandato de senador para concorrer ao governo é o evento mais aguardado da política potiguar.",
  },
  {
    question: "Quem é Alysson Bezerra (União Brasil) e qual sua base no RN?",
    answer: "Alysson Bezerra (União Brasil) é o prefeito de Mossoró, segunda maior cidade do Rio Grande do Norte. Em 2026, representa o campo do centro-direita que se distingue tanto do PT quanto do bolsonarismo radical. Com apoio do União Brasil e possível aliança com o MDB local, Bezerra tenta construir uma candidatura de síntese que atraia eleitores insatisfeitos com ambos os polos.",
  },
  {
    question: "Quando é a eleição para governador do Rio Grande do Norte em 2026?",
    answer: "A eleição para governador do Rio Grande do Norte ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O RN tem aproximadamente 2,5 milhões de eleitores. O estado é relevante no contexto nordestino por ser o único da região onde o campo conservador tem perspectiva real de vitória — o que lhe dá peso desproporcional nas análises políticas nacionais.",
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

export default function GovernadorRN2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Rio Grande do Norte · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador RN 2026 — Empate Técnico Bezerra 36% x Marinho 34%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Real Time Big Data (dez/2025, ±2,5 pp): Alysson Bezerra (União Brasil) 36%,
            Rogério Marinho (PL) 34%, Álvaro Dias (PP) 17%.
            Com Fátima Bezerra impedida de reeleger, a disputa potiguar começa do zero.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Real Time Big Data · Dez/2025</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.600 entrevistados · ±2,5 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">Dez/2025</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 41) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Real Time Big Data · Cenário estimulado, 1º turno · Dado mais recente disponível</p>
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
              { label: "Governador PE 2026", href: "/eleicoes-governador-pe-2026" },
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
