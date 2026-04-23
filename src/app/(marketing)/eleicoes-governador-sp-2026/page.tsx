import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador SP 2026 — Tarcísio vs Haddad | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador de São Paulo 2026. Tarcísio de Freitas 47,8%, Fernando Haddad 33,1% — Paraná Pesquisas abr/2026. Atualizado semanalmente.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-sp-2026" },
  openGraph: {
    title: "Pesquisas Governador SP 2026 — Tarcísio vs Haddad | ElectioLab",
    description:
      "Média agregada das pesquisas para governador de São Paulo 2026. Tarcísio de Freitas 47,8%, Fernando Haddad 33,1% — Paraná Pesquisas abr/2026.",
    url: "https://electiolab.com/eleicoes-governador-sp-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "Tarcísio de Freitas", party: "Republicanos", pct: 47.8 },
  { name: "Fernando Haddad",     party: "PT",            pct: 33.1 },
  { name: "Paulo Serra",         party: "PSDB",          pct:  4.6 },
  { name: "Kim Kataguiri",       party: "Missão",        pct:  3.5 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador de São Paulo em 2026?",
    answer:
      "Tarcísio de Freitas (Republicanos) lidera as pesquisas para governador de São Paulo 2026 com 47,8% na sondagem da Paraná Pesquisas de abril de 2026 (1.600 entrevistas, margem de erro ±2,5 pp). Fernando Haddad (PT) aparece em segundo lugar com 33,1%. A diferença de 14,7 pontos percentuais coloca Tarcísio em posição confortável, mas ainda há mais de 18 meses até a eleição de outubro de 2026.",
  },
  {
    question: "Quais institutos fazem pesquisas para governador de SP 2026?",
    answer:
      "Os principais institutos que acompanham a eleição para governador de São Paulo 2026 são Paraná Pesquisas, Datafolha, Quaest, Atlas Intel, PoderData e Instituto FSB, entre outros registrados no TSE. Cada instituto usa metodologia distinta — presencial, telefônica ou online — e publica com cadências diferentes. O ElectioLab agrega todas as pesquisas publicadas e calcula uma média ponderada por recência, amostra e acurácia histórica do instituto.",
  },
  {
    question: "Tarcísio de Freitas vai disputar a reeleição ao governo de SP?",
    answer:
      "Tarcísio de Freitas, eleito governador de São Paulo em 2022 com 56,08% dos votos no segundo turno, pode disputar a reeleição em 2026. Ao mesmo tempo, Tarcísio é cotado para a corrida presidencial de 2026, o que torna seu posicionamento estratégico incerto. As pesquisas eleitorais de SP 2026 acompanham este cenário em tempo real. Atualizações sobre candidatura oficial serão refletidas no dashboard do ElectioLab.",
  },
  {
    question: "Como o ElectioLab calcula a média das pesquisas para governador SP 2026?",
    answer:
      "A média ponderada do ElectioLab considera quatro critérios: (1) Recência — pesquisas mais antigas têm peso decrescente com meia-vida de 10 dias; (2) Tamanho da amostra — amostras maiores têm mais peso, calculado via raiz quadrada do n; (3) Metodologia — pesquisa presencial supera telefônica, que supera online, refletindo taxas históricas de acerto; (4) Acurácia histórica do instituto — institutos com menor Erro Médio Absoluto em eleições anteriores recebem mais peso. Quando apenas uma pesquisa está disponível, ela é exibida como dado pontual.",
  },
  {
    question: "Quando será a eleição para governador de São Paulo em 2026?",
    answer:
      "As eleições estaduais de 2026 ocorrem no mesmo dia das eleições presidenciais: 1º turno em 4 de outubro de 2026 e 2º turno, se necessário, em 25 de outubro de 2026. São Paulo, o maior colégio eleitoral do Brasil com mais de 35 milhões de eleitores aptos, terá impacto decisivo no resultado nacional. O ElectioLab monitora tanto o cenário presidencial quanto os principais estados, incluindo São Paulo, Minas Gerais e Rio de Janeiro.",
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

export default function GovernadorSP2026Page() {
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
            Governador São Paulo · Eleições 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Pesquisas Governador SP 2026 — Tarcísio vs Haddad
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            O ElectioLab agrega todas as pesquisas eleitorais para governador de São Paulo 2026.
            A mais recente — Paraná Pesquisas, 11–14 abr/2026, 1.600 entrevistas, ±2,5 pp —
            aponta Tarcísio de Freitas com 47,8% e Fernando Haddad com 33,1% no cenário estimulado
            de 1º turno.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Ver média ao vivo →
          </Link>
        </div>

        {/* Snapshot da pesquisa mais recente */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Última pesquisa — Paraná Pesquisas · Abr/2026
          </h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">1.600 entrevistas · ±2,5 pp · presencial</span>
              <span className="text-xs font-mono text-muted-foreground">11–14 abr/2026</span>
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
            Fonte: Paraná Pesquisas · Registro TSE nº SP-07123/2026
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
              { label: "Presidente 2026", href: "/pesquisas-presidenciais-2026" },
              { label: "Governador MG 2026", href: "/eleicoes-governador-mg-2026" },
              { label: "Governador RJ 2026", href: "/eleicoes-governador-rj-2026" },
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
