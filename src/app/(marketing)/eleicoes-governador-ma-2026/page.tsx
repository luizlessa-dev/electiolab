import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador MA 2026 — Braide vs Orleans Brandão | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Maranhão 2026. Eduardo Braide (PSD) 35%, Orleans Brandão (MDB) 24% — Quaest mar/2026. Atualizado.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-ma-2026" },
  openGraph: {
    title: "Pesquisas Governador MA 2026 — Braide vs Orleans Brandão | ElectioLab",
    description: "Eduardo Braide (PSD) 35%, Orleans Brandão (MDB) 24% — Quaest mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-ma-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Eduardo Braide",   party: "PSD",  pct: 35.0 },
  { name: "Orleans Brandão",  party: "MDB",  pct: 24.0 },
  { name: "Lahesio Bonfim",   party: "Novo", pct: 11.0 },
  { name: "Felipe Camarão",   party: "PT",   pct:  7.0 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Maranhão em 2026?",
    answer: "Eduardo Braide (PSD), prefeito de São Luís, lidera com 35% das intenções de voto no cenário estimulado da Quaest (12–16 mar/2026, 900 entrevistados em 49 municípios, ±3 pp). Orleans Brandão (MDB) aparece em segundo com 24%, seguido de Lahesio Bonfim (Novo) com 11% e Felipe Camarão (PT) com 7%. A Paraná Pesquisas (mar/2026) também apontou Braide na frente: 34,6% x 30,3%.",
  },
  {
    question: "Por que Carlos Brandão não disputa a reeleição no Maranhão?",
    answer: "Carlos Brandão governou o Maranhão como vice, completando o mandato de Flávio Dino após a nomeação deste para o STF. Em 2022 foi eleito governador — e agora cumpre seu 2º mandato consecutivo, ficando impedido de reeleger. Seu filho, Orleans Brandão (MDB), disputa a sucessão representando a continuidade da gestão. A família Brandão é uma das mais influentes da política maranhense.",
  },
  {
    question: "Quem é Eduardo Braide e por que lidera no Maranhão?",
    answer: "Eduardo Braide (PSD) é prefeito de São Luís, capital do Maranhão, e um dos políticos de ascensão mais rápida do estado. Eleito prefeito em 2020 e reeleito em 2024, construiu base de aprovação sólida na capital. Em 2026, transfere esse capital eleitoral para a corrida ao governo estadual. O PSD aposta em Braide como alternativa ao ciclo dos Sarney e dos Brandão, dominantes no estado por décadas.",
  },
  {
    question: "Qual a tradição política do Maranhão e como isso afeta 2026?",
    answer: "O Maranhão é historicamente dominado por famílias políticas — Sarney (que governou por décadas via PMDB/MDB) e mais recentemente Dino/Brandão (PT/campo progressista). Em 2026, a disputa entre Braide (PSD) e Orleans Brandão (MDB) representa a renovação versus a continuidade. O PT, com Felipe Camarão, mantém presença mas com votação menor. O Novo, com Lahesio Bonfim, disputa o eleitorado insatisfeito com ambos os campos.",
  },
  {
    question: "Quando é a eleição para governador do Maranhão em 2026?",
    answer: "A eleição para governador do Maranhão ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O Maranhão tem aproximadamente 4,5 milhões de eleitores e é o estado com menor IDH do Brasil — o que torna as políticas sociais e o desempenho econômico da gestão fatores decisivos no voto.",
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

export default function GovernadorMA2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Maranhão · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador MA 2026 — Braide 35% vs Orleans 24%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Quaest (12–16 mar/2026, 900 entrevistados, 49 municípios, ±3 pp): Eduardo Braide (PSD) 35%,
            Orleans Brandão (MDB) 24%, Lahesio Bonfim (Novo) 11%. Com Carlos Brandão impedido,
            a corrida maranhense opõe renovação e continuidade.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Quaest · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">900 entrevistados · ±3,0 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">12–16 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 40) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Fonte: Quaest · Cenário estimulado, 1º turno</p>
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
