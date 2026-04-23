import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador AL 2026 — JHC vs Renan Filho | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de Alagoas 2026. JHC (PL) 47,6%, Renan Filho (MDB) 40,9% — Paraná Pesquisas dez/2025. Corrida competitiva.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-al-2026" },
  openGraph: {
    title: "Pesquisas Governador AL 2026 — JHC vs Renan Filho | ElectioLab",
    description: "JHC (PL) 47,6%, Renan Filho (MDB) 40,9% — Paraná Pesquisas dez/2025.",
    url: "https://electiolab.com/eleicoes-governador-al-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "JHC — João Henrique Caldas", party: "PL",  pct: 47.6 },
  { name: "Renan Filho",                party: "MDB", pct: 40.9 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Alagoas em 2026?",
    answer: "João Henrique Caldas, o JHC (PL), prefeito de Maceió, lidera com 47,6% na Paraná Pesquisas (dez/2025). Renan Filho (MDB), ex-governador e ministro dos Transportes, aparece em segundo com 40,9%. A diferença de 6,7 pp é real mas dentro do que pode ser revertido — a pesquisa de outubro/2025 havia apontado empate técnico. Alagoas é uma das disputas mais polarizadas do Nordeste.",
  },
  {
    question: "Por que Paulo Dantas não disputa a reeleição em Alagoas?",
    answer: "Paulo Dantas (MDB) governou Alagoas por dois mandatos (2019–2026) e está impedido de se reeleger. Concluirá o mandato em dezembro de 2026. O campo do MDB alagoano aposta em Renan Filho — ex-governador (2015–2018) e atual ministro dos Transportes do governo Lula — para manter o estado. A renúncia de Renan Filho ao ministério para se candidatar é o movimento mais esperado da política alagoana.",
  },
  {
    question: "Quem é JHC e por que disputa o governo de Alagoas?",
    answer: "João Henrique Caldas (JHC, PL) é prefeito de Maceió, capital de Alagoas, eleito em 2020 e reeleito em 2024 com maioria absoluta. Representa o campo bolsonarista no estado e tem altíssima aprovação como gestor municipal. A candidatura ao governo estadual em 2026 é o salto natural de sua trajetória. Em pesquisas recentes, lidera com Renan Filho — o que representa uma inversão histórica na política alagoana, dominada pelos Renan/Collor por décadas.",
  },
  {
    question: "Qual o peso da família Renan na política alagoana?",
    answer: "A família Renan — liderada pelo senador Renan Calheiros (MDB) — é uma das mais influentes da política brasileira. Renan Calheiros é senador há décadas; seu filho Renan Filho foi governador de Alagoas (2015–2018) e hoje é ministro de Lula. A disputa de 2026 opõe esse legado à ascensão do bolsonarismo alagoano representado por JHC. Uma vitória de JHC seria a maior derrota da família Renan na política estadual em 30 anos.",
  },
  {
    question: "Quando é a eleição para governador de Alagoas em 2026?",
    answer: "A eleição para governador de Alagoas ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). Alagoas tem aproximadamente 2,4 milhões de eleitores. O estado tem o menor PIB per capita do Brasil e altíssima dependência de transferências federais — o que amplifica o peso das políticas sociais do governo Lula na definição do voto.",
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

export default function GovernadorAL2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Alagoas · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador AL 2026 — JHC 47,6% vs Renan Filho 40,9%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Paraná Pesquisas (dez/2025): JHC — João Henrique Caldas (PL) 47,6%,
            Renan Filho (MDB) 40,9%. Corrida polarizada entre o campo bolsonarista e
            a dynasty política dos Renan — pesquisa de out/2025 apontou empate técnico.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Paraná Pesquisas · Dez/2025</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Presencial · Dado mais recente disponível</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 53) * 100}%` }} />
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
