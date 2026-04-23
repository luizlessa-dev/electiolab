import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador RR 2026 — Arthur Henrique Lidera | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de Roraima 2026. Arthur Henrique (PL) 33%, Edilson Damião (Rep) 28%, Soldado Sampaio 11% — Real Time Big Data dez/2025.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-rr-2026" },
  openGraph: {
    title: "Pesquisas Governador RR 2026 — Arthur Henrique Lidera | ElectioLab",
    description: "Arthur Henrique (PL) 33%, Edilson Damião (Rep) 28% — Real Time Big Data dez/2025.",
    url: "https://electiolab.com/eleicoes-governador-rr-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Arthur Henrique",    party: "PL",           pct: 33.0 },
  { name: "Edilson Damião",     party: "Republicanos", pct: 28.0 },
  { name: "Soldado Sampaio",    party: "PSD",          pct: 11.0 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de Roraima em 2026?",
    answer: "Arthur Henrique (PL), atual governador, lidera com 33% no Real Time Big Data (dez/2025). Edilson Damião (Republicanos), vice-governador, aparece em segundo com 28% e Soldado Sampaio (PSD) com 11%. A diferença de apenas 5 pp entre os dois primeiros — ambos do campo conservador — sugere que a corrida em Roraima pode ser uma das mais competitivas do Norte.",
  },
  {
    question: "Arthur Henrique pode ser reeleito governador de Roraima?",
    answer: "Arthur Henrique (PL) está no 1º mandato (2023–2026) e é constitucionalmente elegível para reeleição em 2026. Com 33% e uma vantagem estreita sobre Edilson Damião, a reeleição não está garantida. A peculiaridade roraimense é que tanto o governador quanto o principal concorrente vêm do mesmo campo conservador-bolsonarista — o que transforma a disputa em uma guerra de estruturas dentro da direita, não uma polarização esquerda vs. direita.",
  },
  {
    question: "Quem é Edilson Damião e por que disputa contra o governador atual?",
    answer: "Edilson Damião (Republicanos) é vice-governador de Roraima — o que torna a dinâmica da corrida de 2026 única no Brasil: governador e vice do mesmo governo disputando o cargo entre si. Com 28% nas pesquisas, Damião está a 5 pp do governador que o nomeou. A ruptura entre os dois é um fenômeno comum em governos com vice de partido diferente, e Roraima é o exemplo mais dramático em 2026.",
  },
  {
    question: "Qual a situação de Roraima com a crise indígena e a fronteira com a Venezuela?",
    answer: "Roraima é o único estado brasileiro a fazer fronteira com a Venezuela — e a crise econômica venezuelana gerou um dos maiores fluxos migratórios da história do estado (mais de 100 mil venezuelanos em Boa Vista). A gestão da imigração, a situação da Terra Indígena Yanomami e o conflito garimpo vs. preservação ambiental são os temas mais sensíveis politicamente em Roraima. Candidatos com posição clara sobre esses temas têm vantagem eleitoral.",
  },
  {
    question: "Quando é a eleição para governador de Roraima em 2026?",
    answer: "A eleição para governador de Roraima ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). Roraima tem aproximadamente 400 mil eleitores — o menor colégio eleitoral do Brasil, menor até que o Amapá. Boa Vista concentra mais de 60% do eleitorado. Apesar do tamanho, Roraima tem peso simbólico por ser o estado mais setentrional do Brasil e o que mais debates a fronteira amazônica.",
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

export default function GovernadorRR2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Roraima · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador RR 2026 — Arthur Henrique 33% vs Damião 28%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Real Time Big Data (dez/2025): Arthur Henrique (PL) 33%, Edilson Damião (Rep) 28%,
            Soldado Sampaio (PSD) 11%. Corrida incomum: governador vs. vice-governador
            do mesmo governo — a disputa mais singular do Norte em 2026.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Real Time Big Data · Dez/2025</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Telefônica · Dado mais recente disponível</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 38) * 100}%` }} />
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
              { label: "Presidente 2026",    href: "/pesquisas-presidenciais-2026" },
              { label: "Governador AM 2026", href: "/eleicoes-governador-am-2026" },
              { label: "Governador PA 2026", href: "/eleicoes-governador-pa-2026" },
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
