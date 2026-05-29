import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Minus, Calendar, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Relatório Semanal — Semana 17 · 21–27 Abr 2026 | ElectioLab" },
  description:
    "Média agregada das pesquisas presidenciais e para governador na semana 17 de 2026 (21–27 de abril). Lula 36,8%, Bolsonaro 30,4%, Tarcísio 18,2%. Variação semanal e pesquisas da semana.",
  alternates: { canonical: "https://electiolab.com/relatorio/semana-17-2026" },
  openGraph: {
    title: "Relatório Semanal Semana 17 · ElectioLab",
    description: "Lula 36,8% (+0,4), Bolsonaro 30,4% (-0,3), Tarcísio 18,2% (+0,8) — média agregada 21–27 abr/2026.",
    url: "https://electiolab.com/relatorio/semana-17-2026",
  },
};

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NewsArticle",
      "@id": "https://electiolab.com/relatorio/semana-17-2026#article",
      "url": "https://electiolab.com/relatorio/semana-17-2026",
      "mainEntityOfPage": "https://electiolab.com/relatorio/semana-17-2026",
      "headline": "Relatório Semanal ElectioLab — Semana 17 (21–27 de abril de 2026)",
      "description":
        "Média ponderada das pesquisas presidenciais e para governador na semana 17 de 2026. Lula 36,8% (+0,4), Bolsonaro 30,4% (-0,3), Tarcísio 18,2% (+0,8). Inclui análise das pesquisas Quaest e Atlas Intel publicadas na semana.",
      "datePublished": "2026-04-27",
      "dateModified": "2026-04-27",
      "author": { "@id": "https://electiolab.com/sobre#founder" },
      "publisher": { "@id": "https://electiolab.com/#organization" },
      "image": [
        {
          "@type": "ImageObject",
          "url": "https://electiolab.com/opengraph-image",
          "width": 1200,
          "height": 630,
        },
      ],
      "inLanguage": "pt-BR",
      "isPartOf": { "@id": "https://electiolab.com/#website" },
      "articleSection": "Pesquisas Eleitorais",
      "keywords": [
        "pesquisa eleitoral",
        "presidencial 2026",
        "Lula",
        "Bolsonaro",
        "Tarcísio",
        "Quaest",
        "Atlas Intel",
        "média ponderada",
      ],
      "about": {
        "@type": "Event",
        "name": "Eleições Presidenciais Brasil 2026",
        "startDate": "2026-10-04",
        "location": { "@type": "Country", "name": "Brazil" },
      },
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", position: 1, name: "ElectioLab", item: "https://electiolab.com" },
        { "@type": "ListItem", position: 2, name: "Relatórios semanais", item: "https://electiolab.com/imprensa" },
        { "@type": "ListItem", position: 3, name: "Semana 17 · 21–27 abr 2026" },
      ],
    },
  ],
};

// Dados da semana 17 (21–27 abr 2026)
const PRESIDENCIAL = [
  { name: "Lula",      party: "PT",           pct: 36.8, delta: +0.4,  cor: "#ef4444" },
  { name: "Bolsonaro", party: "PL",           pct: 30.4, delta: -0.3,  cor: "#3b82f6" },
  { name: "Tarcísio",  party: "Republicanos", pct: 18.2, delta: +0.8,  cor: "#8b5cf6" },
  { name: "Outros",    party: "—",            pct: 14.6, delta: -0.9,  cor: "#6b7280" },
];

const PESQUISAS_SEMANA = [
  {
    instituto: "Quaest",
    cliente: "Genial Investimentos",
    publicacao: "22 abr 2026",
    metodologia: "Telefônica",
    n: 2.000,
    lider: "Lula",
    pct_lider: 37,
    destaque: "Lula sobe 1pp em relação à pesquisa anterior do mesmo instituto (mar/2026). Bolsonaro estável.",
  },
  {
    instituto: "Atlas Intel",
    cliente: "Espontânea",
    publicacao: "25 abr 2026",
    metodologia: "Online",
    n: 4.812,
    lider: "Lula",
    pct_lider: 35,
    destaque: "Tarcísio tem melhor desempenho na faixa 18–34 anos (22%). Cenário mais competitivo no Sul.",
  },
];

const DESTAQUES_GOVERNADOR = [
  { uf: "SP", lider: "Tarcísio",      pct: 40.0, delta: +0.6, partido: "Rep" },
  { uf: "MG", lider: "Cleitinho",     pct: 48.0, delta: +1.2, partido: "Rep" },
  { uf: "RJ", lider: "Eduardo Paes",  pct: 49.0, delta: +0.8, partido: "PSD" },
];

function Delta({ v }: { v: number }) {
  if (v > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-400">
      <TrendingUp className="h-2.5 w-2.5" />+{v.toFixed(1)}
    </span>
  );
  if (v < 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-rose-400">
      <TrendingDown className="h-2.5 w-2.5" />{v.toFixed(1)}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
      <Minus className="h-2.5 w-2.5" />0.0
    </span>
  );
}

export default function RelatorioSemana17Page() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />

      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/imprensa" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <BookOpen className="h-3 w-3" /> Imprensa
            </Link>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" /> Início
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 space-y-14">

        {/* Cabeçalho do relatório */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/20 text-xs font-mono text-primary">
              <Calendar className="h-3 w-3" /> SEMANA 17
            </span>
            <span className="text-xs font-mono text-muted-foreground">21–27 de abril de 2026</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório Semanal de Pesquisas Eleitorais
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Média ponderada atualizada com todas as pesquisas publicadas entre 21 e 27 de abril de 2026.
            2 pesquisas novas incorporadas à base — Quaest (telefônica, n=2.000) e Atlas Intel (online, n=4.812).
            Variação calculada em relação ao relatório da semana 16 (14–20 abr).
          </p>
        </div>

        {/* Média presidencial */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Presidencial 2026 — Média ponderada
          </h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">26 pesquisas · 13 institutos · 60.608 entrevistados acumulados</span>
              <span className="text-xs font-mono text-muted-foreground">Semana 17 · Abr/2026</span>
            </div>
            <div className="divide-y divide-border">
              {PRESIDENCIAL.map((c, i) => (
                <div key={c.name} className="px-4 py-3.5 flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <Delta v={c.delta} />
                    </div>
                    <p className="text-xs text-muted-foreground">{c.party}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-36 hidden sm:block">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.pct / 42) * 100}%`, backgroundColor: c.cor }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <p className="text-[10px] font-mono text-muted-foreground">
                Variação vs. semana 16 em pp. Ponderação: recência (e^(-t/10)) · amostra (√n) · metodologia · acurácia histórica do instituto.
              </p>
            </div>
          </div>
        </section>

        {/* Análise da semana */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Análise da semana</h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Lula (PT) mantém liderança com +0,4pp</strong> após a Quaest de 22 de abril mostrar recuperação de 1pp em relação à pesquisa de março do mesmo instituto. O movimento está dentro da margem de erro, mas confirma a estabilidade da liderança ao longo de cinco semanas consecutivas.
            </p>
            <p>
              <strong className="text-foreground">Tarcísio (Republicanos) registra a maior variação positiva da semana (+0,8pp)</strong>, puxado principalmente pelo desempenho entre eleitores de 18 a 34 anos na Atlas Intel — onde alcança 22%, superando Bolsonaro nessa faixa etária pela segunda semana seguida. Esse movimento sugere que a candidatura de Tarcísio captura eleitorado conservador jovem que não é fiel ao ex-presidente.
            </p>
            <p>
              <strong className="text-foreground">Bolsonaro (PL) recua 0,3pp</strong>, dentro do ruído estatístico. A variação é consistente com o padrão das últimas semanas: o piso eleitoral do ex-presidente permanece estável na faixa de 29–31%, sem sinais de crescimento orgânico.
            </p>
            <div className="border-l-2 border-primary pl-4 py-1">
              <p className="text-foreground font-medium">
                Interpretação: com 6 meses de dados disponíveis, a tendência central do ElectioLab não registra nenhum movimento de virada. A corrida presidencial está estabilizada com Lula à frente por ~6pp da margem combinada dos dois candidatos conservadores mais fortes.
              </p>
            </div>
          </div>
        </section>

        {/* Pesquisas da semana */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Pesquisas incorporadas esta semana
          </h2>
          <div className="space-y-2">
            {PESQUISAS_SEMANA.map((p) => (
              <div key={p.instituto} className="border border-border rounded-sm bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground">{p.instituto}</span>
                    {p.cliente !== "Espontânea" && (
                      <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 bg-muted/40 rounded-sm">
                        {p.cliente}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{p.publicacao}</span>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span><span className="text-foreground font-medium">Método:</span> {p.metodologia}</span>
                  <span><span className="text-foreground font-medium">Amostra:</span> {p.n.toLocaleString("pt-BR")} entrevistas</span>
                  <span><span className="text-foreground font-medium">Líder:</span> {p.lider} {p.pct_lider}%</span>
                </div>
                <div className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">Destaque: </span>{p.destaque}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Governadores — variação semanal */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Governadores — variação da semana
          </h2>
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {DESTAQUES_GOVERNADOR.map((g) => (
                <Link key={g.uf} href={`/eleicoes-governador-${g.uf.toLowerCase()}-2026`}
                  className="px-4 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors group">
                  <span className="text-xs font-mono font-bold text-primary w-8">{g.uf}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{g.lider}</span>
                      <span className="text-[10px] text-muted-foreground">{g.partido}</span>
                      <Delta v={g.delta} />
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold tabular-nums">{g.pct}%</span>
                  <span className="text-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </Link>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <Link href="/" className="text-xs text-primary hover:underline font-mono">
                Ver todos os 27 estados →
              </Link>
            </div>
          </div>
        </section>

        {/* Próximo relatório + navegação */}
        <section className="border border-border rounded-sm bg-card px-6 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Próximo relatório</p>
              <p className="text-xs text-muted-foreground">Semana 18 · 28 abr – 4 mai 2026</p>
            </div>
            <Link href="/relatorio/semana-18-2026" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors shrink-0">
              <TrendingUp className="h-3.5 w-3.5" /> Semana 18 →
            </Link>
          </div>
          <div className="pt-2 border-t border-border flex flex-wrap gap-3">
            <Link href="/pesquisas-presidenciais-2026" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Presidencial 2026
            </Link>
            <Link href="/imprensa" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Imprensa & Press Kit
            </Link>
            <Link href="/sobre" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Metodologia
            </Link>
          </div>
        </section>

      </main>

      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">ElectioLab — Terminal de Inteligência Eleitoral</span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/sobre" className="hover:text-foreground transition-colors">Metodologia</Link>
            <span>·</span>
            <Link href="/imprensa" className="hover:text-foreground transition-colors">Imprensa</Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
