import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador GO 2026 — Daniel Vilela Favorito | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de Goiás 2026. Daniel Vilela (MDB) 43,4%, Marconi Perillo (PSDB) 24,4% — Paraná Pesquisas abr/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-go-2026" },
  openGraph: {
    title: "Pesquisas Governador GO 2026 — Daniel Vilela Favorito | ElectioLab",
    description: "Daniel Vilela (MDB) 43,4%, Marconi Perillo (PSDB) 24,4% — Paraná Pesquisas abr/2026.",
    url: "https://electiolab.com/eleicoes-governador-go-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Daniel Vilela",   party: "MDB",  pct: 43.4 },
  { name: "Marconi Perillo", party: "PSDB", pct: 24.4 },
  { name: "Wilder Morais",   party: "PL",   pct: 11.5 },
  { name: "Adriana Accorsi", party: "PT",   pct:  9.2 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Goiás em 2026?",
    answer: "Daniel Vilela (MDB), atual governador de Goiás, lidera com 43,4% das intenções de voto no cenário estimulado da Paraná Pesquisas (1–3 abr/2026, 1.310 entrevistas, ±2,8 pp). Marconi Perillo (PSDB, ex-governador) aparece em segundo com 24,4%, seguido de Wilder Morais (PL) com 11,5% e Adriana Accorsi (PT) com 9,2%.",
  },
  {
    question: "Daniel Vilela pode ser reeleito governador de Goiás em 2026?",
    answer: "Daniel Vilela (MDB) assumiu o governo de Goiás em 2022 como vice e completou o mandato de Caiado — foi eleito em 2022 com mais de 50% dos votos. Com 43,4% nas pesquisas e uma vantagem de quase 20 pp sobre o segundo colocado, está em posição confortável para reeleição. O governador conta com o apoio da máquina estadual e alto índice de aprovação (a gestão Caiado/Vilela tem mais de 80% de aprovação em Goiás). O risco principal é a fragmentação da oposição se consolidar em torno de um único candidato.",
  },
  {
    question: "Ronaldo Caiado vai para o governo de Goiás ou para a presidência em 2026?",
    answer: "Ronaldo Caiado (UB) governou Goiás por dois mandatos (2018–2022 e 2022–2026) e não pode disputar a reeleição. Em 2026, é cotado como candidato à presidência da República ou ao Senado por Goiás. Sua decisão impacta diretamente a força do campo conservador goiano. Independentemente da escolha de Caiado, Daniel Vilela (MDB) lidera as pesquisas para o governo do estado. O ElectioLab monitora tanto o cenário presidencial quanto os estados.",
  },
  {
    question: "Quais institutos publicaram pesquisas para governador de Goiás 2026?",
    answer: "Os institutos com pesquisas publicadas para governador de Goiás 2026 incluem: Paraná Pesquisas (abr/2026), Real Time Big Data (mar/2026), Gerp (abr/2026) e Genial/Quaest. O ElectioLab agrega todas as pesquisas e aplica ponderação por recência, tamanho da amostra e histórico de acurácia do instituto. A Paraná Pesquisas é referência em pesquisas estaduais e regionais no Brasil.",
  },
  {
    question: "Quando é a eleição para governador de Goiás em 2026?",
    answer: "As eleições para governador de Goiás ocorrem em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). Goiás tem aproximadamente 5 milhões de eleitores e é o segundo maior colégio eleitoral do Centro-Oeste, atrás do Distrito Federal. A eleição goiana tem impacto regional relevante e tende a seguir a polarização nacional entre lulismo e bolsonarismo.",
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

export default function GovernadorGO2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Goiás · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador GO 2026 — Daniel Vilela Lidera com 43%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Paraná Pesquisas (1–3 abr/2026, 1.310 entrevistas, 60 municípios, ±2,8 pp): Daniel Vilela (MDB) 43,4%,
            Marconi Perillo (PSDB) 24,4%, Wilder Morais (PL) 11,5%, Adriana Accorsi (PT) 9,2%.
            Vilela próximo de vencer no 1º turno.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Paraná Pesquisas · Abr/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.310 entrevistas · ±2,8 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">1–3 abr/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 48) * 100}%` }} />
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
              { label: "Governador MG 2026", href: "/eleicoes-governador-mg-2026" },
              { label: "Governador SP 2026", href: "/eleicoes-governador-sp-2026" },
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
