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
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/sobre" className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">ElectioLab</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">
              Como funciona
            </a>
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#para-quem" className="text-muted-foreground hover:text-foreground transition-colors">
              Para quem
            </a>
          </nav>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Acessar Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            Motor analitico de opiniao publica
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            A verdade eleitoral esta nos dados.{" "}
            <span className="text-muted-foreground">Nao nas manchetes.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            O ElectioLab agrega todas as pesquisas eleitorais do Brasil em uma
            media ponderada inteligente — para voce enxergar a tendencia real,
            nao o ruido.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Acessar Dashboard Gratuito
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border rounded-lg font-medium text-foreground hover:bg-accent transition-colors"
            >
              Ver como funciona
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
          <p className="text-sm text-muted-foreground pt-4">
            +2.000 pesquisas analisadas · 47 institutos · Dados abertos do TSE
          </p>
        </div>
      </section>

      {/* O Problema */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">
              Pesquisa isolada e ruido. Tendencia agregada e sinal.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold">Pesquisas contradizem</h3>
                <p className="text-sm text-muted-foreground">
                  Um instituto diz 35%, outro diz 28%. Quem esta certo? Sem
                  agregacao, e impossivel saber.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Newspaper className="h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold">Midia amplifica outliers</h3>
                <p className="text-sm text-muted-foreground">
                  Manchetes sao feitas do dado mais polemico, nao do mais
                  preciso. Voce le o ruido, nao o sinal.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Target className="h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold">Decisoes no escuro</h3>
                <p className="text-sm text-muted-foreground">
                  Campanhas, jornalistas e analistas operam sem visao
                  consolidada. Cada pesquisa e um fragmento.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">
              O motor analitico por tras da eleicao real
            </h2>
            <p className="text-muted-foreground">
              4 fatores de ponderacao combinados em um unico numero
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                icon: Clock,
                title: "Recencia",
                desc: "Pesquisas recentes pesam mais. Meia-vida de ~10 dias.",
                detail: "Decaimento exponencial",
              },
              {
                icon: Users,
                title: "Amostra",
                desc: "Amostras maiores = mais confiavel. Peso via raiz quadrada.",
                detail: "sqrt(n/1000)",
              },
              {
                icon: FlaskConical,
                title: "Metodologia",
                desc: "Presencial > telefonica > online. Baseado em evidencia.",
                detail: "Peso 0.6 a 1.0",
              },
              {
                icon: Building2,
                title: "Instituto",
                desc: "Quem acertou no passado pesa mais. Score calculado automaticamente.",
                detail: "MAE historico",
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="pt-6 space-y-3 text-center">
                  <item.icon className="h-8 w-8 mx-auto text-primary" />
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                  <Badge variant="secondary" className="text-xs">
                    {item.detail}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Coleta</span>
            <ArrowRight className="h-3 w-3" />
            <span>Ponderacao</span>
            <ArrowRight className="h-3 w-3" />
            <span>Consolidacao</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-semibold text-foreground">Insight</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">
              Dashboard que revela, nao que confunde
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: BarChart3,
                title: "Media Eleitoral Real",
                desc: "Percentual consolidado por candidato. Muito mais estavel que qualquer pesquisa individual.",
              },
              {
                icon: TrendingUp,
                title: "Tendencia Temporal",
                desc: "Grafico interativo mostrando subida e queda reais. Sem o zigue-zague de pesquisas isoladas.",
              },
              {
                icon: Building2,
                title: "Ranking de Institutos",
                desc: "Quem erra mais, quem acerta mais. Transparencia total baseada em dados historicos.",
              },
              {
                icon: FileSearch,
                title: "Base de Dados Exploravel",
                desc: "Todas as pesquisas com filtros por instituto, data, metodologia e regiao.",
              },
              {
                icon: DollarSign,
                title: "Dinheiro da Eleicao",
                desc: "Prestacao de contas, gastos de campanha e fontes de financiamento por candidato.",
              },
              {
                icon: Shield,
                title: "Dados Abertos",
                desc: "Fonte primaria: TSE, Bacen, IBGE. Transparencia total. Sem editorizacao.",
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="pt-6 flex gap-4">
                  <item.icon className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem */}
      <section id="para-quem" className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">
              Inteligencia eleitoral para quem precisa acertar
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Newspaper,
                title: "Jornalistas",
                desc: "Dashboard + embeds para contextualizar pesquisas em matérias",
              },
              {
                icon: Briefcase,
                title: "Campanhas",
                desc: "Tendencia consolidada + alertas para decisoes estrategicas",
              },
              {
                icon: TrendingUp,
                title: "Analistas Politicos",
                desc: "API + relatorios automatizados para analises profundas",
              },
              {
                icon: Building2,
                title: "Consultorias",
                desc: "White-label + dados premium para clientes exigentes",
              },
              {
                icon: GraduationCap,
                title: "Academicos",
                desc: "Dataset limpo e documentado para pesquisa cientifica",
              },
              {
                icon: Users,
                title: "Cidadao Informado",
                desc: "Dashboard gratuito, simples e claro. Sem manipulacao.",
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="pt-6 space-y-2">
                  <item.icon className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            Pesquisa individual e ruido. Tendencia agregada e sinal.
          </h2>
          <p className="text-primary-foreground/80">
            Acesse o dashboard agora e veja a eleicao como ela realmente e.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary-foreground text-primary rounded-lg font-medium hover:bg-primary-foreground/90 transition-colors text-lg"
          >
            Acessar Dashboard Gratuito
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              ElectioLab — Inteligencia Eleitoral
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Dados publicos do TSE, Bacen e IBGE. Nenhum dado e gerado ou editorializado.
          </p>
        </div>
      </footer>
    </div>
  );
}
