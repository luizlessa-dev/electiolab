import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador MT 2026 — Fagundes vs Pivetta | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Mato Grosso 2026. Wellington Fagundes (PL) 37%, Otaviano Pivetta (Rep) 22% — Real Time Big Data mar/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-mt-2026" },
  openGraph: {
    title: "Pesquisas Governador MT 2026 — Fagundes vs Pivetta | ElectioLab",
    description: "Wellington Fagundes (PL) 37%, Otaviano Pivetta (Rep) 22% — Real Time Big Data mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-mt-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Wellington Fagundes", party: "PL",           pct: 37.0 },
  { name: "Otaviano Pivetta",    party: "Republicanos", pct: 22.0 },
  { name: "Jayme Campos",        party: "União Brasil", pct: 22.0 },
  { name: "Natasha Slhessarenko",party: "PSD",          pct:  9.0 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Mato Grosso em 2026?",
    answer: "Wellington Fagundes (PL), senador federal pelo MT, lidera com 37% no cenário estimulado do Real Time Big Data (21–23 mar/2026, 1.600 entrevistados, ±2 pp). Otaviano Pivetta (Republicanos), vice-governador, e Jayme Campos (União Brasil), outro senador, aparecem empatados em segundo com 22% cada. Natasha Slhessarenko (PSD) soma 9%. Em cenário sem Campos, Fagundes abre para 43%.",
  },
  {
    question: "Por que Mauro Mendes não disputa a reeleição no Mato Grosso?",
    answer: "Mauro Mendes (União Brasil) governou o Mato Grosso por dois mandatos consecutivos (2019–2026) e está impedido de se reeleger. Renunciou ao cargo para disputar o Senado Federal pelo MT. A saída de Mendes — que terminou o mandato com alta aprovação, especialmente no agronegócio — abre disputa entre seu vice-governador Pivetta (Republicanos) e os senadores Fagundes (PL) e Jayme Campos (União).",
  },
  {
    question: "Quem é Wellington Fagundes e por que lidera no MT?",
    answer: "Wellington Fagundes (PL) é senador federal pelo Mato Grosso e um dos principais articuladores do agronegócio no Congresso. Faz parte da bancada ruralista e é alinhado ao campo bolsonarista. Com 37% nas pesquisas, lidera a corrida mas não tem posição confortável — o empate entre Pivetta e Jayme Campos no segundo lugar sugere que uma eventual aliança entre os dois poderia mudar o quadro. O campo conservador e agropecuarista do MT tende a ser o árbitro final.",
  },
  {
    question: "Qual o papel do agronegócio na política do Mato Grosso?",
    answer: "O Mato Grosso é o maior produtor de soja do Brasil e um dos maiores do mundo. O agronegócio não apenas domina a economia estadual como estrutura toda a política local — os principais candidatos ao governo são conhecidos e avaliados pela posição que tomam em relação às pautas do setor: demarcação de terras, licenciamento ambiental, crédito rural e logística. Candidatos alinhados à Aprosoja e à Famato (federação da agricultura) partem em vantagem na corrida.",
  },
  {
    question: "Quando é a eleição para governador do Mato Grosso em 2026?",
    answer: "A eleição para governador do Mato Grosso ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O MT tem aproximadamente 2,5 milhões de eleitores. O estado tem crescimento econômico acima da média nacional, impulsionado pelo agronegócio e pela expansão da infraestrutura — o que tende a beneficiar governantes e candidatos associados ao poder econômico regional.",
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

export default function GovernadorMT2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Mato Grosso · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador MT 2026 — Fagundes 37% Lidera Corrida Tripartida</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Real Time Big Data (21–23 mar/2026, 1.600 entrevistados, ±2 pp): Wellington Fagundes (PL) 37%,
            Pivetta (Rep) e Jayme Campos (União) empatados com 22%, Natasha (PSD) 9%.
            Com Mauro Mendes impedido, corrida aberta no agronegócio.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Real Time Big Data · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.600 entrevistados · ±2,0 pp · telefônica</span>
              <span className="text-xs font-mono text-muted-foreground">21–23 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 42) * 100}%` }} />
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
              { label: "Governador GO 2026", href: "/eleicoes-governador-go-2026" },
              { label: "Governador MS 2026", href: "/eleicoes-governador-ms-2026" },
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
