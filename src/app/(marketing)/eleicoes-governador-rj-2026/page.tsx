import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador RJ 2026 — Eduardo Paes Favorito | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador do Rio de Janeiro 2026. Eduardo Paes 46%, Douglas Ruas 13% — Real Time Big Data mar/2026. Atualizado semanalmente.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-rj-2026" },
  openGraph: {
    title: "Pesquisas Governador RJ 2026 — Eduardo Paes Favorito | ElectioLab",
    description:
      "Média agregada das pesquisas para governador do Rio de Janeiro 2026. Eduardo Paes 46%, Douglas Ruas 13% — Real Time Big Data mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-rj-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Eduardo Paes",   party: "PSD",    pct: 46 },
  { name: "Douglas Ruas",   party: "PL",     pct: 13 },
  { name: "Ítalo Marsili",  party: "Indep.", pct:  5 },
  { name: "Wilson Witzel",  party: "Indep.", pct:  5 },
  { name: "William Siri",   party: "PSOL",   pct:  3 },
  { name: "Rafa Luz",       party: "Missão", pct:  2 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador do Rio de Janeiro em 2026?",
    answer:
      "Eduardo Paes (PSD) lidera com ampla vantagem as pesquisas para governador do Rio de Janeiro 2026, com 46% na pesquisa da Real Time Big Data de março de 2026 (2.000 entrevistas, margem de erro ±2 pp). Douglas Ruas (PL) aparece em segundo com 13%. A diferença de 33 pontos percentuais coloca Eduardo Paes como forte favorito para disputar a reeleição ao governo do RJ.",
  },
  {
    question: "Eduardo Paes vai disputar a reeleição ao governo do Rio em 2026?",
    answer:
      "Eduardo Paes governa o estado do Rio de Janeiro desde janeiro de 2023, após vencer Cláudio Castro no primeiro turno com 56,5% dos votos. Em 2026, pode disputar a reeleição, e as pesquisas o colocam com números dominantes — 33 pontos acima do segundo colocado. O ElectioLab monitora o cenário RJ 2026 e atualiza os dados assim que novas pesquisas são registradas no TSE.",
  },
  {
    question: "Quais candidatos aparecem nas pesquisas para governador do RJ 2026?",
    answer:
      "As pesquisas para governador RJ 2026 testam Eduardo Paes (PSD), Douglas Ruas (PL), Ítalo Marsili (independente), Wilson Witzel (ex-governador, independente), William Siri (PSOL) e Bombeiro Rafa Luz (Missão), entre outros. A candidatura de Wilson Witzel é incerta, pois ele passou por processo de impeachment em 2021. O ElectioLab inclui todos os nomes testados nos institutos registrados.",
  },
  {
    question: "Quais institutos fazem pesquisas para governador do RJ 2026?",
    answer:
      "Os principais institutos que acompanham o cenário eleitoral do Rio de Janeiro 2026 incluem Real Time Big Data, Datafolha, Quaest, Atlas Intel e PoderData. A Real Time Big Data é especializada em pesquisas estaduais e municipais no Rio de Janeiro e historicamente publica com frequência mensal. O ElectioLab agrega todas as pesquisas publicadas, ponderando por recência, tamanho da amostra e acurácia histórica do instituto.",
  },
  {
    question: "Quando será a eleição para governador do Rio de Janeiro em 2026?",
    answer:
      "As eleições estaduais de 2026 ocorrem em 4 de outubro de 2026 (1º turno) e 25 de outubro de 2026 (2º turno, se necessário). O Rio de Janeiro tem mais de 12 milhões de eleitores aptos e é o terceiro maior colégio eleitoral do país. A eleição estadual do RJ costuma ter forte influência do cenário nacional — a polarização presidencial tende a refletir nas corridas estaduais. O ElectioLab monitora SP, MG e RJ simultaneamente.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function GovernadorRJ2026Page() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">

        {/* Hero */}
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-primary">
            Governador Rio de Janeiro · Eleições 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Pesquisas Governador RJ 2026 — Eduardo Paes Lidera com Folga
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            O ElectioLab agrega todas as pesquisas eleitorais para governador do Rio de Janeiro 2026.
            A mais recente — Real Time Big Data, 9–10 mar/2026, 2.000 entrevistas, ±2 pp —
            aponta Eduardo Paes (PSD) com 46% e Douglas Ruas (PL) com 13% no cenário estimulado
            de 1º turno. Diferença de 33 pontos.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Ver média ao vivo →
          </Link>
        </div>

        {/* Snapshot */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Última pesquisa — Real Time Big Data · Mar/2026
          </h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">2.000 entrevistas · ±2,0 pp · telefônica</span>
              <span className="text-xs font-mono text-muted-foreground">9–10 mar/2026</span>
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
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(c.pct / 50) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">
                      {c.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Fonte: Real Time Big Data · Cenário estimulado, 1º turno
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-4" id="faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="border border-border rounded-sm bg-card overflow-hidden group"
              >
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between gap-3">
                  {item.question}
                  <span className="text-muted-foreground text-xs shrink-0 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Links relacionados */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Outras eleições 2026
          </h2>
          <div className="grid sm:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { label: "Presidente 2026",    href: "/pesquisas-presidenciais-2026" },
              { label: "Governador SP 2026", href: "/eleicoes-governador-sp-2026" },
              { label: "Governador MG 2026", href: "/eleicoes-governador-mg-2026" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-card px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-between"
              >
                {l.label} <span className="text-primary">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border border-border rounded-sm bg-card px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Dados ao vivo no Dashboard</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Acompanhe a média ponderada atualizada, tendência histórica e ranking de acurácia dos
              institutos em tempo real.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir dashboard
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            ElectioLab — Terminal de Inteligência Eleitoral
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/metodologia" className="hover:text-foreground transition-colors">
              Metodologia
            </Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
