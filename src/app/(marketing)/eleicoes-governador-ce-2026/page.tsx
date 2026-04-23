import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador CE 2026 — Ciro Gomes vs Elmano | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Ceará 2026. Ciro Gomes (PSDB) 44,5%, Elmano de Freitas (PT) 35,3% — Paraná Pesquisas mar/2026. Atualizado.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-ce-2026" },
  openGraph: {
    title: "Pesquisas Governador CE 2026 — Ciro Gomes vs Elmano | ElectioLab",
    description: "Ciro Gomes (PSDB) 44,5%, Elmano de Freitas (PT) 35,3% — Paraná Pesquisas mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-ce-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Ciro Gomes",        party: "PSDB", pct: 44.5 },
  { name: "Elmano de Freitas", party: "PT",   pct: 35.3 },
  { name: "Eduardo Girão",     party: "Novo",  pct:  7.0 },
  { name: "Jarir Pereira",     party: "PSOL",  pct:  1.9 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Ceará em 2026?",
    answer: "Ciro Gomes (PSDB) lidera com 44,5% no cenário estimulado da Paraná Pesquisas (27–30 mar/2026, 1.500 entrevistas, 68 municípios, ±2,6 pp). Elmano de Freitas (PT), atual governador, aparece em segundo com 35,3%. Eduardo Girão (Novo) soma 7% e Jarir Pereira (PSOL) 1,9%. A corrida cearense é politicamente de alta relevância — é o estado que deu origem ao campo petista no Nordeste.",
  },
  {
    question: "Ciro Gomes pode vencer as eleições no Ceará em 2026?",
    answer: "Ciro Gomes lidera as pesquisas para governador do CE 2026 em todos os cenários testados pela Paraná Pesquisas — tanto no 1º turno (44,5% x 35,3%) quanto no 2º turno (53,3% x 36,4%). Após deixar o PDT, Ciro se filiou ao PSDB e retorna ao cenário eleitoral cearense com força para disputar o estado. O Ceará foi governado pelo PT e seus aliados desde 2006 (Lula, Cid Gomes, Camilo Santana, Elmano), e uma vitória de Ciro em 2026 quebraria esse ciclo de 20 anos.",
  },
  {
    question: "Elmano de Freitas pode ser reeleito governador do Ceará?",
    answer: "Elmano de Freitas (PT) governa o Ceará desde 2023, eleito com o apoio de Lula e Camilo Santana. Apesar de estar em segundo nas pesquisas, Elmano conta com a estrutura do PT cearense, o apoio federal e a aprovação do governo Lula no Nordeste. A diferença de 9,2 pp para Ciro é significativa mas dentro do alcançável num ciclo de 6 meses — a aproximação do PT com grupos locais e a decisão formal de Ciro sobre sua candidatura definirão o quadro final.",
  },
  {
    question: "Qual o impacto da saída de Ciro do PDT para as eleições no CE 2026?",
    answer: "Ciro Gomes deixou o PDT após o desempenho na eleição presidencial de 2022 e se filiou ao PSDB. A saída fragmentou a base herdada de Cid Gomes no Ceará — parte migrou para o campo de Elmano (PT) e outra parte acompanhou Ciro no novo partido. As pesquisas mostram que, mesmo fora do PDT, Ciro mantém candidatura competitiva, puxando votos do centro e do campo antipetista cearense.",
  },
  {
    question: "Quando é a eleição para governador do Ceará em 2026?",
    answer: "As eleições para governador do Ceará ocorrem em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). O Ceará tem aproximadamente 6,7 milhões de eleitores. A disputa cearense tem impacto direto na força do PT no Nordeste e na composição da bancada federal eleita pelo estado — que historicamente é um dos maiores celeiros parlamentares do campo progressista no Brasil.",
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

export default function GovernadorCE2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Ceará · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador CE 2026 — Ciro 44,5% vs Elmano 35,3%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Paraná Pesquisas (27–30 mar/2026, 1.500 entrevistas, 68 municípios, ±2,6 pp): Ciro Gomes (PSDB) lidera com 44,5%,
            Elmano de Freitas (PT) com 35,3%, Girão (Novo) com 7%. A corrida cearense opõe o retorno de Ciro
            ao ciclo petista de 20 anos no estado.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Paraná Pesquisas · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.500 entrevistas · ±2,6 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">27–30 mar/2026</span>
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
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.pct / 50) * 100}%` }} />
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
              { label: "Governador BA 2026", href: "/eleicoes-governador-ba-2026" },
              { label: "Governador PE 2026", href: "/eleicoes-governador-pe-2026" },
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
