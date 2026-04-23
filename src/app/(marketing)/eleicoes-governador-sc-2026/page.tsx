import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador SC 2026 — Jorginho Mello Favorito | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de Santa Catarina 2026. Jorginho Mello (PL) 49,4%, João Rodrigues (PSD) 21,4% — AtlasIntel mar/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-sc-2026" },
  openGraph: {
    title: "Pesquisas Governador SC 2026 — Jorginho Mello Favorito | ElectioLab",
    description: "Jorginho Mello (PL) 49,4%, João Rodrigues (PSD) 21,4% — AtlasIntel mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-sc-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Jorginho Mello",    party: "PL",  pct: 49.4 },
  { name: "João Rodrigues",    party: "PSD", pct: 21.4 },
  { name: "Gelson Merisio",    party: "PSB", pct: 13.8 },
  { name: "Décio Lima",        party: "PT",  pct:  8.2 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Santa Catarina em 2026?",
    answer: "Jorginho Mello (PL), atual governador de Santa Catarina, lidera com 49,4% das intenções de voto no cenário estimulado da AtlasIntel (25–30 mar/2026, 1.280 entrevistados, ±3 pp). João Rodrigues (PSD) aparece em segundo com 21,4%, seguido de Gelson Merisio (PSB) com 13,8% e Décio Lima (PT) com 8,2%. Jorginho está no 1º mandato e pode disputar a reeleição.",
  },
  {
    question: "Jorginho Mello pode ser reeleito governador de Santa Catarina?",
    answer: "Jorginho Mello (PL) assumiu o governo catarinense em 2023 em seu 1º mandato e é constitucionalmente elegível para a reeleição em 2026. Com quase 50% nas pesquisas, está próximo de vencer no 1º turno. Santa Catarina é o estado mais bolsonarista do Brasil em termos de resultado presidencial (Bolsonaro 69% em 2022) — o que favorece Mello, eleito na onda conservadora e alinhado ao PL nacional.",
  },
  {
    question: "Quem é João Rodrigues e qual sua candidatura em SC 2026?",
    answer: "João Rodrigues (PSD) é ex-deputado federal e ex-secretário de Estado de Agricultura de Santa Catarina. Representa o campo do centro e do agronegócio catarinense. Com 21,4% nas pesquisas, é o principal adversário de Jorginho Mello. Conta com o apoio do PSD e possivelmente de aliados do MDB no interior do estado — mas a vantagem de Jorginho torna a corrida difícil para a oposição.",
  },
  {
    question: "Qual o papel do PT e da esquerda na disputa pelo governo de SC 2026?",
    answer: "Santa Catarina é historicamente o estado menos favorável ao PT no Brasil. Em 2026, Décio Lima (PT) aparece com cerca de 8% nas pesquisas — refletindo a resistência estrutural do eleitorado catarinense ao campo petista. Mesmo com o vento favorável do governo Lula nacionalmente, o estado tende a manter seu viés conservador. A esquerda catarinense apostou em Décio Lima, ex-prefeito de Florianópolis, como seu melhor nome.",
  },
  {
    question: "Quando é a eleição para governador de Santa Catarina em 2026?",
    answer: "A eleição para governador de Santa Catarina ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). SC tem aproximadamente 5,5 milhões de eleitores. O estado é relevante por concentrar o eleitorado mais homogeneamente conservador do país — seus resultados são monitorados como termômetro do campo bolsonarista no Sul.",
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

export default function GovernadorSC2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Santa Catarina · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador SC 2026 — Jorginho Mello Lidera com 49%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            AtlasIntel (25–30 mar/2026, 1.280 entrevistados, ±3 pp): Jorginho Mello (PL) 49,4%,
            João Rodrigues (PSD) 21,4%, Gelson Merisio (PSB) 13,8%. Governador no 1º mandato
            é favorito à reeleição no estado mais conservador do Sul.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — AtlasIntel · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.280 entrevistados · ±3,0 pp · online</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 55) * 100}%` }} />
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
              { label: "Governador PR 2026", href: "/eleicoes-governador-pr-2026" },
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
