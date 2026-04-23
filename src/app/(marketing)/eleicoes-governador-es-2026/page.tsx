import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador ES 2026 — Pazolini vs Ferraço | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Espírito Santo 2026. Lorenzo Pazolini (Rep) 42%, Ricardo Ferraço (MDB) 36,1% — Paraná Pesquisas mar/2026.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-es-2026" },
  openGraph: {
    title: "Pesquisas Governador ES 2026 — Pazolini vs Ferraço | ElectioLab",
    description: "Lorenzo Pazolini (Rep) 42%, Ricardo Ferraço (MDB) 36,1% — Paraná Pesquisas mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-es-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Lorenzo Pazolini", party: "Republicanos", pct: 42.0 },
  { name: "Ricardo Ferraço",  party: "MDB",          pct: 36.1 },
  { name: "Helder Salomão",   party: "PT",           pct:  9.1 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Espírito Santo em 2026?",
    answer: "Lorenzo Pazolini (Republicanos), prefeito de Vitória, lidera com 42% na Paraná Pesquisas (8–11 mar/2026, 1.500 entrevistados em 46 municípios, ±2,6 pp). Ricardo Ferraço (MDB), vice-governador, aparece com 36,1% e Helder Salomão (PT) com 9,1%. Atenção: a Quaest (mar/2026, 1.104 entrevistados) mostrou cenário diferente — Ferraço 26%, Magno Malta (PL) 18%, Pazolini 17% — divergência metodológica significativa.",
  },
  {
    question: "Por que Renato Casagrande não disputa a reeleição no Espírito Santo?",
    answer: "Renato Casagrande (PSB) completou dois mandatos consecutivos como governador do ES (2011–2014 e 2019–2026) e está impedido de se reeleger. Renunciou ao cargo para disputar o Senado Federal pelo Espírito Santo. Casagrande foi um dos governadores com maior aprovação do Brasil durante seu mandato — sua saída abre uma corrida aberta entre Pazolini, Ferraço e potencialmente Magno Malta (PL).",
  },
  {
    question: "Quem é Lorenzo Pazolini e por que é favorito no ES?",
    answer: "Lorenzo Pazolini (Republicanos) é prefeito de Vitória, capital do Espírito Santo, e médico de formação. Eleito em 2020 e reeleito em 2024, construiu reputação de boa gestão na capital. Em 2026, transfere esse capital eleitoral para a corrida estadual. A Paraná Pesquisas (presencial, 1.500 entrevistados) coloca Pazolini 6 pp à frente de Ferraço — vantagem real mas dentro do alcançável num 2º turno.",
  },
  {
    question: "Qual a diferença entre os resultados da Paraná Pesquisas e da Quaest para o ES?",
    answer: "A divergência entre os institutos reflete diferenças metodológicas: a Paraná Pesquisas (presencial, 1.500 entrevistados) coloca Pazolini na frente com 42% contra 36% de Ferraço. A Quaest (telefônica, 1.104 entrevistados) mostrou Ferraço em 1º com 26%, seguido de Magno Malta (18%) e Pazolini (17%). Pesquisas presenciais tendem a capturar melhor o interior do estado; pesquisas telefônicas têm maior proporção de respondentes nas capitais. O ElectioLab pondera as duas.",
  },
  {
    question: "Quando é a eleição para governador do Espírito Santo em 2026?",
    answer: "A eleição para governador do Espírito Santo ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O ES tem aproximadamente 3 milhões de eleitores e é o menor estado do Sudeste. A economia capixaba é baseada em minério, petróleo e café — setores com forte influência política regional e com peso relevante na composição das bancadas eleitas.",
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

export default function GovernadorES2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Espírito Santo · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador ES 2026 — Pazolini 42% vs Ferraço 36%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Paraná Pesquisas (8–11 mar/2026, 1.500 entrevistados, ±2,6 pp): Pazolini (Rep) 42%,
            Ferraço (MDB) 36,1%, Salomão (PT) 9,1%. Institutos divergem —
            Quaest aponta corrida tripartida diferente. Disputa decidida no 2º turno.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Paraná Pesquisas · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.500 entrevistados · ±2,6 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">8–11 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 47) * 100}%` }} />
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
              { label: "Governador RJ 2026", href: "/eleicoes-governador-rj-2026" },
              { label: "Governador MG 2026", href: "/eleicoes-governador-mg-2026" },
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
