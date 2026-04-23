import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador AM 2026 — Omar Aziz vs Maria do Carmo | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Amazonas 2026. Omar Aziz (PSD) 33%, David Almeida (Avante) 23%, Maria do Carmo (PL) 21% — Quaest mar/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-am-2026" },
  openGraph: {
    title: "Pesquisas Governador AM 2026 — Omar Aziz vs Maria do Carmo | ElectioLab",
    description: "Omar Aziz (PSD) 33%, David Almeida (Avante) 23%, Maria do Carmo (PL) 21% — Quaest mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-am-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Omar Aziz",        party: "PSD",    pct: 33.0 },
  { name: "David Almeida",    party: "Avante", pct: 23.0 },
  { name: "Maria do Carmo",   party: "PL",     pct: 21.0 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Amazonas em 2026?",
    answer: "Omar Aziz (PSD) lidera com 33% na Quaest (5–11 mar/2026, 1.500 entrevistados, ±3 pp). David Almeida (Avante), prefeito de Manaus, aparece em segundo com 23%, e Maria do Carmo Seffair (PL) com 21%. A AtlasIntel (mar/2026, 1.138 entrevistados, ±3 pp) apontou empate técnico entre Maria do Carmo (41,8%) e Omar Aziz (40,4%) — resultado que diverge por metodologia.",
  },
  {
    question: "Por que Wilson Lima não disputa a reeleição no Amazonas?",
    answer: "Wilson Lima (União Brasil) completou dois mandatos consecutivos (2019–2026) e está impedido de se reeleger. Renunciou ao governo para disputar o Senado Federal pelo Amazonas. Lima foi marcado por escândalos durante a pandemia (caso das respiradores) e pela operação policial contra seu governo em 2022 — fatores que influenciam a avaliação de sua herança eleitoral e favorecem candidatos que se diferenciam da gestão.",
  },
  {
    question: "Quem é Omar Aziz e como está posicionado na corrida amazonense?",
    answer: "Omar Aziz (PSD) é senador federal pelo Amazonas, ex-governador do estado (2003–2006) e foi presidente da CPI da Covid (2021). Seu retorno ao cenário eleitoral estadual é motivado pela abertura criada pela saída de Wilson Lima. Com 33% na Quaest e respaldo do PSD nacional, Aziz é o candidato do campo político tradicional — mas o empate técnico com Maria do Carmo em outras pesquisas mostra que a corrida está em aberto.",
  },
  {
    question: "Qual é o cenário com David Almeida (prefeito de Manaus) como candidato?",
    answer: "David Almeida (Avante) é o prefeito de Manaus — a maior cidade da região Norte, com mais de 2 milhões de habitantes. Reeleito em 2024 com ampla votação, Almeida tem forte base eleitoral na capital. Com 23% nas pesquisas, está no campo da disputa e poderia se tornar o candidato de consenso do centro caso as candidaturas de Aziz e Maria do Carmo enfraqueçam. Sua decisão de permanecer como prefeito ou renunciar para candidatura é o evento mais importante do cenário amazonense.",
  },
  {
    question: "Quando é a eleição para governador do Amazonas em 2026?",
    answer: "A eleição para governador do Amazonas ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O Amazonas tem aproximadamente 2,8 milhões de eleitores e é o maior estado em área territorial do Brasil. O resultado amazonense tem impacto direto na política da região Norte e nas disputas por recursos da Zona Franca de Manaus.",
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

export default function GovernadorAM2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Amazonas · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador AM 2026 — Corrida Tripartida entre Aziz, Almeida e Maria do Carmo</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Quaest (5–11 mar/2026, 1.500 entrevistados, ±3 pp): Omar Aziz (PSD) 33%,
            David Almeida (Avante) 23%, Maria do Carmo Seffair (PL) 21%.
            AtlasIntel aponta empate técnico Aziz/Maria do Carmo — cenário mais disputado do Norte.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Quaest · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.500 entrevistados · ±3,0 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">5–11 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 38) * 100}%` }} />
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
              { label: "Governador RR 2026", href: "/eleicoes-governador-rr-2026" },
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
