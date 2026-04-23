import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador PB 2026 — Cícero Lucena vs Lucas Ribeiro | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador da Paraíba 2026. Cícero Lucena (MDB) 32%, Lucas Ribeiro (PP) 20,6%, Efraim Filho (União) 12,6% — Anova mar/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-pb-2026" },
  openGraph: {
    title: "Pesquisas Governador PB 2026 — Cícero Lucena vs Lucas Ribeiro | ElectioLab",
    description: "Cícero Lucena (MDB) 32%, Lucas Ribeiro (PP) 20,6% — Anova mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-pb-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Cícero Lucena",  party: "MDB",   pct: 32.0 },
  { name: "Lucas Ribeiro",  party: "PP",    pct: 20.6 },
  { name: "Efraim Filho",   party: "União", pct: 12.6 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador da Paraíba em 2026?",
    answer: "Cícero Lucena (MDB), prefeito de João Pessoa, lidera com 32% no Instituto Anova (19–21 mar/2026, 2.000 entrevistados em 70 municípios, ±2,2 pp). Lucas Ribeiro (PP), vice-governador, aparece com 20,6% e Efraim Filho (União Brasil) com 12,6%. Atenção: o Instituto Veritá (abr/2026) mostrou cenário invertido — Lucas Ribeiro 40,2% x Efraim 28,9% x Cícero 27,3% — evidenciando divergência metodológica.",
  },
  {
    question: "Por que João Azevêdo não disputa a reeleição na Paraíba?",
    answer: "João Azevêdo (PSB) governa a Paraíba desde 2018 e completa seu 2º mandato consecutivo em 2026 — ficando impedido de se reeleger. Renunciou ao cargo para disputar o Senado Federal pela Paraíba. Sua saída abre espaço para uma corrida aberta entre o campo do MDB (Cícero Lucena), do PP (Lucas Ribeiro, seu vice) e do União Brasil (Efraim Filho, senador).",
  },
  {
    question: "Quem é Cícero Lucena e qual sua força na Paraíba?",
    answer: "Cícero Lucena (MDB) é prefeito de João Pessoa, capital da Paraíba, e um dos políticos mais experientes do estado — já foi governador (2002–2006) e senador. Em 2026, transfere o capital eleitoral construído na gestão da capital para a corrida ao governo estadual. Lidera as pesquisas do Anova, mas o Veritá aponta resultado diferente — o que sugere que sua liderança ainda não está consolidada fora da capital.",
  },
  {
    question: "Quais institutos acompanham a eleição na Paraíba 2026?",
    answer: "Os principais institutos com pesquisas publicadas para PB 2026 são: Instituto Anova/PB Agora (mar e abr/2026, presencial, 2.000+ entrevistados), Índice Inteligência (abr/2026, 2.400 entrevistados) e Instituto Veritá (abr/2026). Os resultados variam significativamente entre os institutos — o Anova aponta Cícero Lucena na frente; o Veritá aponta Lucas Ribeiro. O ElectioLab pondera as pesquisas pelo histórico de acurácia do instituto em eleições passadas.",
  },
  {
    question: "Quando é a eleição para governador da Paraíba em 2026?",
    answer: "A eleição para governador da Paraíba ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). A Paraíba tem aproximadamente 3 milhões de eleitores. O estado é relevante no contexto nordestino por sua tradição de eleger governadores do campo progressista — PSB e PT alternaram poder nas últimas décadas — e a abertura de 2026 representa a maior disputa em gerações.",
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

export default function GovernadorPB2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Paraíba · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador PB 2026 — Cícero Lucena 32% vs Lucas Ribeiro 20%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Anova (19–21 mar/2026, 2.000 entrevistados, ±2,2 pp): Cícero Lucena (MDB) 32%,
            Lucas Ribeiro (PP) 20,6%, Efraim Filho (União) 12,6%.
            Institutos divergem — Veritá aponta Lucas Ribeiro na frente. Corrida em aberto.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Instituto Anova · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">2.000 entrevistados · ±2,2 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">19–21 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 37) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Instituto Anova · Cenário estimulado, 1º turno</p>
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
              { label: "Governador BA 2026", href: "/eleicoes-governador-ba-2026" },
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
