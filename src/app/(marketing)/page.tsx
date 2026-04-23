import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Building2,
  Shield,
  Users,
  Newspaper,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Clock,
  Target,
  FlaskConical,
  DollarSign,
  FileSearch,
  Activity,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ElectioLab — A verdade eleitoral está nos dados",
  description:
    "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos. O FiveThirtyEight brasileiro.",
  alternates: { canonical: "https://electiolab.com" },
  openGraph: {
    title: "ElectioLab — A verdade eleitoral está nos dados",
    description:
      "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos.",
    url: "https://electiolab.com",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://electiolab.com/#website",
      "name": "ElectioLab",
      "url": "https://electiolab.com",
      "description": "Agregador inteligente de pesquisas eleitorais do Brasil",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://electiolab.com/dashboard?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://electiolab.com/#organization",
      "name": "ElectioLab",
      "url": "https://electiolab.com",
      "description":
        "Plataforma de agregação e análise de pesquisas eleitorais brasileiras",
      "foundingDate": "2026",
      "areaServed": "BR",
      "inLanguage": "pt-BR",
    },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {[
              { href: "#metodologia", label: "Metodologia" },
              { href: "#features", label: "Features" },
              { href: "#para-quem", label: "Para quem" },
              { href: "/precos", label: "Preços" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Acessar Dashboard
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-primary/10 border border-primary/20">
            <Activity className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-primary">
              Eleições 2026 · Dados em tempo real
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.05]">
            A verdade eleitoral
            <br />
            está nos{" "}
            <span className="text-primary">dados.</span>
            <br className="hidden md:block" />
            <span className="text-muted-foreground text-3xl md:text-5xl">
              Não nas manchetes.
            </span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            O ElectioLab agrega{" "}
            <strong className="text-foreground">todas as pesquisas eleitorais</strong>{" "}
            do Brasil em uma média ponderada inteligente — para você enxergar a
            tendência real, não o ruído de pesquisas isoladas.
          </p>

          {/* Live stats */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-positive/10 border border-positive/20">
            <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
            <span className="text-xs font-mono text-positive uppercase tracking-wider">
              ao vivo — presidencial 2026
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden max-w-lg mx-auto">
            {[
              { value: "26", label: "Pesquisas" },
              { value: "13", label: "Institutos" },
              { value: "60k+", label: "Entrevistados" },
              { value: "3", label: "Eleições" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card text-center px-3 py-2.5">
                <p className="text-xl font-mono font-bold tabular-nums text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
            >
              Acessar Dashboard Gratuito
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="#metodologia"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-sm text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              Ver como funciona →
            </a>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Gratuito para começar · Sem cartão de crédito · Dados do TSE
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              O Problema
            </h2>
            <p className="text-2xl font-bold tracking-tight">
              Pesquisa isolada é ruído.{" "}
              <span className="text-primary">Tendência agregada é sinal.</span>
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              {
                icon: BarChart3,
                title: "Pesquisas contradizem",
                desc: "Um instituto diz 39%, outro diz 33% para o mesmo candidato. Quem está certo?",
              },
              {
                icon: Newspaper,
                title: "Mídia amplifica outliers",
                desc: "Manchetes são feitas do dado mais polêmico, não do mais preciso.",
              },
              {
                icon: Target,
                title: "Decisões no escuro",
                desc: "Campanhas, jornalistas e analistas operam sem visão consolidada.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-card px-5 py-5 space-y-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground italic text-sm">
            "E se existisse uma forma de ver a eleição como ela realmente é?"
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="metodologia" className="py-16 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Metodologia
            </h2>
            <p className="text-2xl font-bold tracking-tight">
              O motor analítico por trás da eleição real
            </p>
          </div>

          {/* Pipeline */}
          <div className="flex items-center justify-center gap-2 text-xs font-mono flex-wrap">
            {["COLETA", "PONDERAÇÃO", "CONSOLIDAÇÃO", "INSIGHT"].map(
              (step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span
                    className={
                      i === arr.length - 1
                        ? "text-primary font-bold"
                        : "text-muted-foreground"
                    }
                  >
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="text-primary">→</span>
                  )}
                </span>
              )
            )}
          </div>

          <div className="grid md:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden">
            {[
              {
                icon: Clock,
                title: "Recência",
                code: "meia-vida 10 dias",
                desc: "Pesquisa de 30 dias atrás vale menos que a de ontem.",
              },
              {
                icon: Users,
                title: "Amostra",
                code: "raiz quadrada de n",
                desc: "5.000 entrevistados pesa mais que 800, com retorno decrescente.",
              },
              {
                icon: FlaskConical,
                title: "Metodologia",
                code: "presencial → online",
                desc: "Presencial captura melhor o eleitor real.",
              },
              {
                icon: Building2,
                title: "Instituto",
                code: "score histórico",
                desc: "Quem acertou mais no passado pesa mais.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-card px-4 py-5 space-y-2 text-center"
              >
                <item.icon className="h-5 w-5 text-primary mx-auto" />
                <h3 className="text-xs font-semibold uppercase tracking-wider">
                  {item.title}
                </h3>
                <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm block">
                  {item.code}
                </code>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Features
            </h2>
            <p className="text-2xl font-bold tracking-tight">
              Dashboard que revela, não que confunde
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-px bg-border rounded-sm overflow-hidden">
            {[
              {
                icon: BarChart3,
                title: "Média Eleitoral Real",
                desc: "Percentual consolidado por candidato. Muito mais estável que qualquer pesquisa individual. A leitura mais próxima da realidade.",
              },
              {
                icon: TrendingUp,
                title: "Tendência Temporal",
                desc: "Gráfico interativo de subida e queda reais. Sem o zigue-zague de pesquisas isoladas. Você vê o filme, não a foto.",
              },
              {
                icon: Building2,
                title: "Ranking de Institutos",
                desc: "Quem erra mais. Quem acerta mais. Transparência total sobre a confiabilidade de cada instituto.",
              },
              {
                icon: FileSearch,
                title: "Base de Dados Explorável",
                desc: "Todas as pesquisas, com filtros por instituto, data, metodologia e região. Dados abertos para quem quer ir fundo.",
              },
              {
                icon: DollarSign,
                title: "Financeiro Eleitoral",
                desc: "Prestação de contas, gastos e fontes de financiamento. Quem está pagando por cada campanha.",
              },
              {
                icon: Shield,
                title: "Metodologia Aberta",
                desc: "Código de ponderação documentado. Todas as fontes rastreáveis ao TSE. Sem viés editorial. Auditável por qualquer pesquisador.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-card px-5 py-4 flex gap-3">
                <item.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive comparison */}
      <section className="py-16 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Posicionamento
            </h2>
            <p className="text-2xl font-bold tracking-tight">
              O FiveThirtyEight brasileiro
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground uppercase tracking-wider font-medium">
                    Capacidade
                  </th>
                  <th className="text-center py-2 px-3 text-muted-foreground uppercase tracking-wider font-medium">
                    Agregador genérico
                  </th>
                  <th className="text-center py-2 px-3 text-muted-foreground uppercase tracking-wider font-medium">
                    Portal de notícias
                  </th>
                  <th className="text-center py-2 px-3 text-primary uppercase tracking-wider font-medium">
                    ElectioLab
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Agrega pesquisas", true, false, true],
                  ["Pondera por qualidade", false, false, true],
                  ["Mostra tendência real", false, false, true],
                  ["Ranking de institutos", false, false, true],
                  ["API para desenvolvedores", false, false, true],
                  ["Sem viés editorial", false, false, true],
                ].map(([label, gen, portal, elab]) => (
                  <tr key={String(label)} className="border-b border-border/40">
                    <td className="py-2.5 pr-4 text-foreground">{label}</td>
                    {[gen, portal, elab].map((val, i) => (
                      <td key={i} className="text-center py-2.5 px-3">
                        {val ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-positive mx-auto" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive/60 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* For who */}
      <section id="para-quem" className="py-16 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Para Quem
            </h2>
            <p className="text-2xl font-bold tracking-tight">
              Inteligência eleitoral para quem precisa acertar
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              {
                icon: Newspaper,
                title: "Jornalistas",
                pain: "Precisam contextualizar pesquisas em tempo real",
                solution: "Dashboard + embeds para matérias",
              },
              {
                icon: Briefcase,
                title: "Campanhas",
                pain: "Decisões baseadas em dados ruidosos",
                solution: "Tendência consolidada + alertas",
              },
              {
                icon: TrendingUp,
                title: "Analistas Políticos",
                pain: "Planilhas manuais, comparação artesanal",
                solution: "API + relatórios automatizados",
              },
              {
                icon: Building2,
                title: "Consultorias",
                pain: "Clientes pedem visão macro confiável",
                solution: "White-label + dados premium",
              },
              {
                icon: GraduationCap,
                title: "Acadêmicos",
                pain: "Dataset limpo e documentado",
                solution: "Licença acadêmica + dados abertos",
              },
              {
                icon: Users,
                title: "Cidadão informado",
                pain: "Quer entender sem ser manipulado",
                solution: "Dashboard gratuito, simples e claro",
              },
            ].map((item) => (
              <div key={item.title} className="bg-card px-4 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {item.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.pain}</p>
                <p className="text-xs text-foreground">→ {item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4 border-t border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            A eleição de 2026 já começou
          </p>
          <p className="text-3xl font-bold tracking-tight">
            Você está olhando os dados certos?
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Acessar o ElectioLab →
          </Link>
          <p className="text-xs text-muted-foreground font-mono">
            Gratuito para começar · Sem cartão de crédito · Dados atualizados diariamente
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">
              ElectioLab — Inteligência Eleitoral Baseada em Dados
            </span>
          </div>
          <nav className="flex items-center gap-4">
            {[
              { href: "/sobre", label: "Sobre" },
              { href: "/precos", label: "Preços" },
              { href: "/dashboard", label: "Dashboard" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground font-mono">
            © 2026 ElectioLab · Dados: TSE · Bacen · IBGE
          </p>
        </div>
      </footer>
    </div>
  );
}
