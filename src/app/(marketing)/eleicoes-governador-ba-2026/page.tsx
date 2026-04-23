import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, HelpCircle, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Governador BA 2026 — ACM Neto vs Jerônimo | ElectioLab" },
  description:
    "Média agregada das pesquisas para governador da Bahia 2026. ACM Neto (União) 47,3%, Jerônimo Rodrigues (PT) 30,9% — Veritá mar/2026. Atualizado semanalmente.",
  alternates: { canonical: "https://electiolab.com/eleicoes-governador-ba-2026" },
  openGraph: {
    title: "Pesquisas Governador BA 2026 — ACM Neto vs Jerônimo | ElectioLab",
    description: "ACM Neto (União) 47,3%, Jerônimo Rodrigues (PT) 30,9% — Veritá mar/2026.",
    url: "https://electiolab.com/eleicoes-governador-ba-2026",
  },
};

const POLL_SNAPSHOT = [
  { name: "ACM Neto",            party: "União Brasil", pct: 47.3 },
  { name: "Jerônimo Rodrigues",  party: "PT",           pct: 30.9 },
  { name: "Ronaldo Mansur",      party: "PSOL",         pct:  1.8 },
];

const FAQ_ITEMS = [
  {
    question: "Quem lidera as pesquisas para governador da Bahia em 2026?",
    answer: "ACM Neto (União Brasil) lidera as pesquisas para governador da Bahia 2026 com 47,3% no levantamento do Instituto Veritá (18–24 mar/2026, 2.020 entrevistas, ±2,2 pp). O atual governador Jerônimo Rodrigues (PT) aparece em segundo com 30,9%. A diferença de 16,4 pontos coloca ACM Neto como favorito, embora a corrida baiana historicamente se defina no segundo turno.",
  },
  {
    question: "Quem é ACM Neto e por que é favorito no Bahia 2026?",
    answer: "ACM Neto (Antônio Carlos Magalhães Neto) é ex-prefeito de Salvador (2013–2020) e ex-deputado federal, pertencente à dinastia política dos Magalhães na Bahia. É o principal líder da oposição estadual e candidato natural da União Brasil. Sua liderança nas pesquisas reflete o desgaste do governo Jerônimo Rodrigues (PT), especialmente em temas de segurança pública e gestão. O PT governa a Bahia há 16 anos (desde 2006) e enfrenta um ciclo eleitoral desfavorável.",
  },
  {
    question: "Jerônimo Rodrigues pode virar a eleição na Bahia?",
    answer: "Sim — a disputa baiana é historicamente volátil. Jerônimo Rodrigues conta com o apoio do presidente Lula, da estrutura federal do PT e do ex-governador Rui Costa. O interior do estado, onde o PT tem base sólida, tende a compensar a vantagem de ACM Neto na Região Metropolitana de Salvador. Pesquisas de institutos diferentes apresentam resultados variados: a Veritá (mar/2026) aponta ACM Neto com 47,3%; a Real Time Big Data (mar/2026) mostrou empate técnico (ACM 44%, Jerônimo 39%). O ElectioLab pondera as pesquisas por acurácia histórica do instituto.",
  },
  {
    question: "Quais institutos acompanham a eleição na Bahia 2026?",
    answer: "Os institutos que publicaram pesquisas para governador da Bahia 2026 incluem: Real Time Big Data (mar/2026), Instituto Veritá (mar–abr/2026), Instituto TML (fev/2026) e Paraná Pesquisas. Os resultados variam por metodologia — a TML (telefônica) mostrou Jerônimo à frente; a Veritá (online) e Real Time Big Data (presencial) colocam ACM Neto na liderança. O ElectioLab pondera cada pesquisa pelo histórico de acurácia do instituto.",
  },
  {
    question: "Quando é a eleição para governador da Bahia em 2026?",
    answer: "A eleição para governador da Bahia ocorre em 4 de outubro de 2026 (1º turno) e 25 de outubro (2º turno, se necessário). A Bahia tem mais de 10 milhões de eleitores — é o quinto maior colégio eleitoral do Brasil e o maior do Nordeste. O resultado baiano tem impacto direto no desempenho do PT nas eleições presidenciais e parlamentares de 2026.",
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

export default function GovernadorBA2026Page() {
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
          <p className="text-xs font-mono uppercase tracking-wider text-primary">Governador Bahia · Eleições 2026</p>
          <h1 className="text-3xl font-bold tracking-tight">Pesquisas Governador BA 2026 — ACM Neto Lidera com 47%</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            O ElectioLab agrega todas as pesquisas para governador da Bahia 2026. Veritá (18–24 mar/2026, 2.020 entrevistas, ±2,2 pp) aponta
            ACM Neto (União Brasil) com 47,3% e Jerônimo Rodrigues (PT) com 30,9%. Corrida que promete se definir no 2º turno.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Ver média ao vivo →
          </Link>
        </div>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Última pesquisa — Veritá · Mar/2026</h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">2.020 entrevistas · ±2,2 pp · online</span>
              <span className="text-xs font-mono text-muted-foreground">18–24 mar/2026</span>
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
          <p className="text-xs text-muted-foreground font-mono">Fonte: Instituto Veritá · Cenário estimulado, 1º turno</p>
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
              { label: "Presidente 2026", href: "/pesquisas-presidenciais-2026" },
              { label: "Governador PE 2026", href: "/eleicoes-governador-pe-2026" },
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
