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
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/sobre" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground ml-1">Terminal</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {[
              { href: "#como-funciona", label: "Metodologia" },
              { href: "#features", label: "Features" },
              { href: "/precos", label: "Precos" },
            ].map((item) => (
              <a key={item.href} href={item.href} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Acessar Terminal
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-28 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-primary/10 border border-primary/20">
            <Activity className="h-3 w-3 text-primary" />
            <span className="text-xs font-mono uppercase tracking-wider text-primary">
              Motor Analitico de Opiniao Publica
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter leading-[1.1]">
            A verdade eleitoral{" "}
            <br className="hidden md:block" />
            esta nos{" "}
            <span className="text-primary">dados.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            O ElectioLab agrega todas as pesquisas eleitorais do Brasil em uma
            media ponderada inteligente — para voce enxergar a tendencia real.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 md:gap-10 pt-4">
            {[
              { value: "60.608", label: "Entrevistados" },
              { value: "8", label: "Pesquisas 2026" },
              { value: "13", label: "Institutos" },
              { value: "3", label: "APIs Publicas" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-lg md:text-2xl font-mono font-bold tabular-nums text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
            >
              Acessar Terminal Gratuito
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border rounded-sm text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              Ver Metodologia
            </a>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-14 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium text-center">
            O Problema
          </h2>
          <p className="text-center text-xl font-bold tracking-tight max-w-lg mx-auto">
            Pesquisa isolada e ruido.{" "}
            <span className="text-primary">Tendencia agregada e sinal.</span>
          </p>
          <div className="grid md:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { icon: BarChart3, title: "Pesquisas contradizem", desc: "Um instituto diz 39%, outro diz 33%. Sem agregacao, impossivel saber." },
              { icon: Newspaper, title: "Midia amplifica outliers", desc: "Manchetes sao do dado mais polemico, nao do mais preciso." },
              { icon: Target, title: "Decisoes no escuro", desc: "Campanhas e analistas operam sem visao consolidada." },
            ].map((item) => (
              <div key={item.title} className="bg-card px-4 py-5 space-y-2">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-14 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium text-center">
            Metodologia
          </h2>
          <p className="text-center text-xl font-bold tracking-tight">
            4 fatores de ponderacao em um unico numero
          </p>

          <div className="grid md:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { icon: Clock, title: "Recencia", code: "e^(-t/10)", desc: "Meia-vida ~10 dias. Pesquisas velhas decaem." },
              { icon: Users, title: "Amostra", code: "sqrt(n/1000)", desc: "Amostras maiores pesam mais, com retorno decrescente." },
              { icon: FlaskConical, title: "Metodologia", code: "0.6 — 1.0", desc: "Presencial > telefonica > online." },
              { icon: Building2, title: "Instituto", code: "MAE → score", desc: "Quem acertou no passado pesa mais." },
            ].map((item) => (
              <div key={item.title} className="bg-card px-4 py-5 space-y-2 text-center">
                <item.icon className="h-5 w-5 text-primary mx-auto" />
                <h3 className="text-xs font-semibold">{item.title}</h3>
                <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">
                  {item.code}
                </code>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
            <span>COLETA</span>
            <span className="text-primary">→</span>
            <span>PONDERACAO</span>
            <span className="text-primary">→</span>
            <span>CONSOLIDACAO</span>
            <span className="text-primary">→</span>
            <span className="text-foreground font-semibold">INSIGHT</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-14 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium text-center">
            Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { icon: BarChart3, title: "Media Ponderada", desc: "Percentual consolidado por candidato. Mais estavel que pesquisa individual." },
              { icon: TrendingUp, title: "Tendencia Temporal", desc: "Evolucao real ao longo do tempo. Sem zigue-zague." },
              { icon: Building2, title: "Ranking de Institutos", desc: "Quem erra mais, quem acerta mais. Baseado em dados." },
              { icon: FileSearch, title: "Base Exploravel", desc: "Todas as pesquisas com filtros por instituto, data e metodologia." },
              { icon: DollarSign, title: "Financeiro Eleitoral", desc: "Prestacao de contas, gastos e fontes de financiamento." },
              { icon: Shield, title: "Dados Abertos", desc: "Fonte primaria: TSE, Bacen, IBGE. Zero editorizacao." },
            ].map((item) => (
              <div key={item.title} className="bg-card px-4 py-4 flex gap-3">
                <item.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For who */}
      <section className="py-14 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium text-center">
            Para Quem
          </h2>
          <div className="grid md:grid-cols-3 gap-2">
            {[
              { icon: Newspaper, title: "Jornalistas", desc: "Dashboard + embeds para matérias" },
              { icon: Briefcase, title: "Campanhas", desc: "Tendencia + alertas para decisoes" },
              { icon: TrendingUp, title: "Analistas", desc: "API + relatorios automatizados" },
              { icon: Building2, title: "Consultorias", desc: "White-label + dados premium" },
              { icon: GraduationCap, title: "Academicos", desc: "Dataset limpo para pesquisa" },
              { icon: Users, title: "Cidadaos", desc: "Dashboard gratuito e claro" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 px-3 py-2.5 rounded-sm border border-border hover:border-primary/30 transition-colors">
                <item.icon className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 border-t border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="text-xl font-bold tracking-tight">
            Pesquisa individual e ruido.{" "}
            <span className="text-primary">Tendencia agregada e sinal.</span>
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Acessar Terminal Gratuito
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">
              ElectioLab — Terminal de Inteligencia Eleitoral
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Dados publicos: TSE · Bacen · IBGE · Meta Ad Library
          </p>
        </div>
      </footer>
    </div>
  );
}
