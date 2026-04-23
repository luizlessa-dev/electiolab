import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador PA 2026 — Dr. Daniel vs Hana Ghassan | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Pará 2026. Dr. Daniel (PSB) 39,1%, Hana Ghassan (MDB) 30,4% — Paraná Pesquisas mar/2026. Atualizado.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-pa-2026" },
  openGraph: {
    title: "Pesquisas Governador PA 2026 — Dr. Daniel vs Hana Ghassan | ElectioLab",
    description: "Dr. Daniel (PSB) 39,1%, Hana Ghassan (MDB) 30,4% — Paraná Pesquisas mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-pa-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Dr. Daniel",      party: "PSB", pct: 39.1 },
  { name: "Hana Ghassan",    party: "MDB", pct: 30.4 },
  { name: "Éder Mauro",      party: "PL",  pct: 19.2 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Pará em 2026?",
    answer: "Dr. Daniel (PSB) lidera com 39,1% no cenário estimulado da Paraná Pesquisas (18–21 mar/2026, 1.400 entrevistados, ±2,7 pp). Hana Ghassan (MDB) aparece em segundo com 30,4%. Em cenários com o delegado Éder Mauro (PL), a corrida se fragmenta e os três ficam em empate técnico. A eleição paraense é a mais disputada da região Norte.",
  },
  {
    question: "Por que Helder Barbalho não disputa a reeleição no Pará?",
    answer: "Helder Barbalho (MDB) cumpriu dois mandatos consecutivos (2019–2026) e está constitucionalmente impedido de se reeleger. O atual governador renunciou ao cargo para disputar o Senado Federal pelo Pará em 2026. Seu legado — aprovação acima de 60% — é disputado por Hana Ghassan (MDB), candidata apoiada pelo campo do governador, e Dr. Daniel (PSB), que chega com apoio de Lula.",
  },
  {
    question: "Quem é Dr. Daniel e por que lidera as pesquisas no Pará?",
    answer: "Dr. Daniel Santos (PSB) é médico, prefeito de Belém e ex-deputado estadual. Em 2026, é o candidato natural do campo progressista federal no Pará, contando com o apoio do PT e do governo Lula. Sua liderança nas pesquisas reflete o desempenho como prefeito da capital e a força da máquina petista-PSB no estado. O apoio de Helder Barbalho, porém, vai para Hana Ghassan — o que divide o campo.",
  },
  {
    question: "Quais institutos publicaram pesquisas para governador do Pará 2026?",
    answer: "Os institutos com pesquisas publicadas para PA 2026 incluem: Paraná Pesquisas (mar/2026), Real Time Big Data (mar/2026) e Instituto Gerp (fev/2026). Os cenários variam conforme os candidatos incluídos — com Éder Mauro, os três ficam em empate técnico; sem ele, Dr. Daniel abre vantagem sobre Hana. O ElectioLab agrega todas as pesquisas e aplica ponderação por recência e acurácia.",
  },
  {
    question: "Quando é a eleição para governador do Pará em 2026?",
    answer: "A eleição para governador do Pará ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O Pará tem aproximadamente 6 milhões de eleitores e é o maior colégio eleitoral da região Norte. O estado sediou a COP 30 em Belém (novembro/2025), que projetou a capital e o governador Helder Barbalho internacionalmente — contexto que molda a campanha de 2026.",
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

export default function GovernadorPA2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Pará · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador PA 2026 — Dr. Daniel 39% vs Hana 30%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Paraná Pesquisas (18–21 mar/2026, 1.400 entrevistados, ±2,7 pp): Dr. Daniel (PSB) 39,1%,
            Hana Ghassan (MDB) 30,4%, Éder Mauro (PL) 19,2%. Com Helder Barbalho impedido de reeleger,
            a corrida paraense reúne três campos distintos.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Paraná Pesquisas · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.400 entrevistados · ±2,7 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">18–21 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 45) * 100}%` }} />
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
              { label: "Governador AM 2026", href: "/eleicoes-governador-am-2026" },
              { label: "Governador MA 2026", href: "/eleicoes-governador-ma-2026" },
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
