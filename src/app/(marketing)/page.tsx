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
  Mail,
} from "lucide-react";
import { NewsletterSignup } from "@/components/newsletter/signup-form";
import { getInstitutesRanking, getLatestPresidentialPoll } from "@/lib/marketing-data";

import type { Metadata } from "next";

// Pre-render with revalidation: fetch dinâmico do banco a cada 1h
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Pesquisas Eleitorais 2026 — Média Agregada | ElectioLab" },
  description:
    "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos. O FiveThirtyEight brasileiro.",
  alternates: { canonical: "https://electiolab.com" },
  openGraph: {
    title: "ElectioLab — A verdade eleitoral está nos dados",
    description:
      "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos.",
    url: "https://electiolab.com",
    images: [
      {
        url: "https://electiolab.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ElectioLab — A verdade eleitoral está nos dados",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ElectioLab — Inteligência Eleitoral",
    description:
      "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos.",
    images: ["https://electiolab.com/opengraph-image"],
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
      "areaServed": { "@type": "Country", "name": "Brazil" },
      "inLanguage": "pt-BR",
      "logo": {
        "@type": "ImageObject",
        "url": "https://electiolab.com/opengraph-image",
        "width": 1200,
        "height": 630,
      },
      "sameAs": [
        "https://github.com/luizlessa",
        "https://linkedin.com/in/luizlessa",
      ],
      "founder": { "@id": "https://electiolab.com/sobre#founder" },
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "contactType": "press",
          "email": "imprensa@electiolab.com",
          "availableLanguage": ["Portuguese", "English"],
          "areaServed": "BR",
        },
        {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "email": "contato@electiolab.com",
          "availableLanguage": "Portuguese",
          "areaServed": "BR",
        },
        {
          "@type": "ContactPoint",
          "contactType": "technical support",
          "email": "suporte@electiolab.com",
          "availableLanguage": "Portuguese",
          "areaServed": "BR",
        },
      ],
      "email": "contato@electiolab.com",
      "knowsAbout": [
        "Pesquisas eleitorais",
        "Eleições brasileiras 2026",
        "Datafolha",
        "Quaest",
        "Ipec",
        "Análise de dados políticos",
        "Média ponderada",
      ],
    },
    {
      "@type": "Dataset",
      "@id": "https://electiolab.com/#dataset",
      "name": "Pesquisas Eleitorais Brasil 2026",
      "alternateName": "ElectioLab Polls Dataset",
      "description":
        "Base agregada de pesquisas eleitorais brasileiras 2018-2026, com média ponderada calculada por recência, tamanho de amostra, metodologia e acurácia histórica do instituto. Inclui presidente, governadores (27 UFs) e senadores. Atualizada continuamente conforme institutos publicam novas rodadas.",
      "url": "https://electiolab.com",
      "sameAs": [
        "https://electiolab.com/pesquisas-presidenciais-2026",
        "https://electiolab.com/institutos",
      ],
      "keywords": [
        "pesquisas eleitorais",
        "intenção de voto",
        "Brasil 2026",
        "Datafolha",
        "Quaest",
        "Atlas Intel",
        "Ipec",
        "média ponderada",
        "TSE",
      ],
      "creator": { "@id": "https://electiolab.com/#organization" },
      "publisher": { "@id": "https://electiolab.com/#organization" },
      "license": "https://creativecommons.org/licenses/by/4.0/",
      "isAccessibleForFree": true,
      "inLanguage": "pt-BR",
      "spatialCoverage": { "@type": "Country", "name": "Brasil" },
      "temporalCoverage": "2018-01/..",
      "variableMeasured": [
        "Intenção de voto (%)",
        "Margem de erro (pp)",
        "Tamanho da amostra",
        "Acurácia histórica do instituto",
        "Patrimônio declarado (BRL)",
        "Fundo Eleitoral FEFC (BRL)",
        "Gastos em propaganda digital (Google Ads + Meta Ads)",
      ],
      "distribution": [
        {
          "@type": "DataDownload",
          "encodingFormat": "application/json",
          "contentUrl": "https://electiolab.com/api/v1/polls",
          "name": "API REST — pesquisas eleitorais",
        },
        {
          "@type": "DataDownload",
          "encodingFormat": "application/json",
          "contentUrl": "https://electiolab.com/api/v1/averages",
          "name": "API REST — médias ponderadas",
        },
      ],
      "citation": "ElectioLab. Pesquisas Eleitorais Brasil 2026. https://electiolab.com",
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Como funciona a média ponderada do ElectioLab?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Cada pesquisa recebe peso por 4 fatores: recência (meia-vida 10 dias), tamanho da amostra (raiz quadrada do n), metodologia (presencial > telefônica > mista > online) e acurácia histórica do instituto. A combinação cancela ruído amostral e amplifica o sinal real. Recalculada a cada 6 horas.",
          },
        },
        {
          "@type": "Question",
          "name": "Qual o instituto de pesquisa eleitoral mais acurado no Brasil?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pelo histórico de erro absoluto vs. resultado oficial TSE em 2018 e 2022: Datafolha 92%, Ipec 88%, Quaest 85%, Genial/Quaest 84%, PoderData 80%, Atlas Intel 78%, Ipespe 77%.",
          },
        },
        {
          "@type": "Question",
          "name": "Quem lidera as pesquisas para presidente em 2026?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pela Quaest de abril/2026 (1º turno estimulado, n=2.004): Lula 37%, Flávio Bolsonaro 32%, Caiado 6%, Zema 3%. No 2º turno, os cenários ficam dentro da margem de erro.",
          },
        },
        {
          "@type": "Question",
          "name": "Como saber se um candidato é Ficha Limpa?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Cada perfil mostra a situação da última candidatura no TSE: Apto, Indeferido ou Sem registro. Filtros permitem listar só aptos ou só indeferidos. Dados oficiais TSE Dados Abertos.",
          },
        },
        {
          "@type": "Question",
          "name": "O ElectioLab tem API pública?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim, gratuita em /api/v1 com endpoints para eleições, pesquisas, médias ponderadas e drift histórico. JSON e CSV. Anônimo: 60 req/h. Pro: 1.000 req/mês. Business: 10.000 req/mês.",
          },
        },
      ],
    },
  ],
};

export default async function HomePage() {
  // Dados dinâmicos do banco (refatorado de hardcoded em 2026-04-29)
  const [institutes, presPoll] = await Promise.all([
    getInstitutesRanking(),
    getLatestPresidentialPoll(),
  ]);

  // Top 7 institutos para o texto SEO
  const topInstitutes = institutes.slice(0, 7);
  const institutesText = topInstitutes
    .map((i, idx) => (idx === 0 ? `${i.name} ${i.pct}%` : `${i.name} ${i.pct}%`))
    .join(", ");

  // Texto resumo da última presidencial (top 4 candidatos)
  const presTop = presPoll?.results.slice(0, 4) ?? [];
  const presText = presTop.length
    ? presTop.map((c) => `${c.name} ${c.pct.toFixed(0)}%`).join(", ")
    : "dados não disponíveis";
  const presDate = presPoll?.publication_date
    ? new Date(presPoll.publication_date).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : "abril/2026";
  const presInstitute = presPoll?.institute_name ?? "Quaest";
  const presN = presPoll?.sample_size ? `, n=${presPoll.sample_size.toLocaleString("pt-BR")}` : "";

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
              { href: "/candidatos", label: "Candidatos" },
              { href: "/comparar", label: "Comparar" },
              { href: "/mapa", label: "Mapa" },
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

      <main>
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
            Pesquisas Eleitorais 2026{" "}
            <span className="text-primary">ao vivo</span>,
            <br className="hidden md:block" />
            <span className="text-muted-foreground text-3xl md:text-5xl">
              em uma média ponderada que faz sentido.
            </span>
          </h1>
          <p className="sr-only">
            Agregador de pesquisas de intenção de voto para presidente, governador
            e senador nas eleições brasileiras de 2026, com média ponderada por
            recência, amostra, metodologia e acurácia histórica dos institutos.
          </p>

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
              { value: "26", label: "Pesquisas em 2026" },
              { value: "13", label: "Institutos monitorados" },
              { value: "60k+", label: "Entrevistados acumulados" },
              { value: "3", label: "Eleições cobertas" },
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
              Ver as médias agora
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Sem criar conta para ver os dados · Atualizado a cada 6h · Dados do TSE
          </p>
          <p className="text-xs text-muted-foreground">
            <a href="#metodologia" className="hover:text-foreground transition-colors underline underline-offset-2">
              Como funciona a ponderação →
            </a>
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

      {/* Newsletter — posicionada após o problema, antes da solução */}
      <section className="py-12 px-4 border-t border-border bg-muted/20">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono uppercase tracking-wider text-primary">
            <Mail className="h-3 w-3" />
            Sinal Eleitoral · Newsletter semanal
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Todo Monday, os dados que a imprensa vai citar — antes de todo mundo
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Média ponderada da semana, ranking de institutos por acurácia, movimentações
            importantes e leitura cruzada com economia. Sem opinião — só os dados.
          </p>
          <div className="max-w-md mx-auto pt-1">
            <NewsletterSignup variant="card" source="home-mid" />
          </div>
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

      {/* About callout — E-E-A-T contextual link */}
      <div className="px-4 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Metodologia auditável · Sem financiamento partidário · Dados públicos do TSE
          </p>
          <Link
            href="/sobre"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Conheça a metodologia e a equipe
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Press section */}
      <section className="py-12 px-4 border-t border-border bg-muted/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            {/* Left — heading + cta */}
            <div className="space-y-3 md:max-w-xs">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Para a imprensa
              </p>
              <h2 className="text-xl font-bold tracking-tight">
                Dados abertos para jornalistas
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Médias ponderadas, histórico de pesquisas, perfis de candidatos e dados de
                financiamento — tudo com metodologia auditável e livre para citar.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <a
                  href="mailto:imprensa@electiolab.com"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  imprensa@electiolab.com
                </a>
                <Link
                  href="/imprensa"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Kit de imprensa completo
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Right — how to cite + data points */}
            <div className="flex-1 grid sm:grid-cols-2 gap-4">
              {/* Como citar */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-2 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Como citar o ElectioLab
                </p>
                <p className="text-xs text-muted-foreground font-mono bg-muted/40 rounded px-3 py-2 leading-relaxed">
                  &quot;Segundo a média ponderada do ElectioLab (electiolab.com), baseada em
                  pesquisas registradas no TSE...&quot;
                </p>
                <p className="text-xs text-muted-foreground">
                  A metodologia de ponderação está descrita em{" "}
                  <Link href="/metodologia" className="underline hover:text-foreground">
                    electiolab.com/metodologia
                  </Link>
                  .
                </p>
              </div>

              {/* Data points */}
              {[
                { label: "Pesquisas indexadas em 2026", value: "26+", icon: BarChart3 },
                { label: "Institutos monitorados", value: "13", icon: Building2 },
                { label: "Candidatos com perfil completo", value: "100+", icon: Users },
                { label: "Dados disponíveis via API", value: "Gratuito", icon: Shield },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* States grid */}
      <section id="estados" className="py-16 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Eleições Estaduais 2026
            </h2>
            <p className="text-2xl font-bold tracking-tight">
              Pesquisas para governador em todos os estados
            </p>
          </div>

          <div className="space-y-5">
            {([
              {
                region: "Norte", count: 7,
                headerCls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                lineCls:   "bg-cyan-500/20",
                states: [
                  { uf: "PA", name: "Pará",       href: "/eleicoes-governador-pa-2026" },
                  { uf: "AM", name: "Amazonas",   href: "/eleicoes-governador-am-2026" },
                  { uf: "TO", name: "Tocantins",  href: "/eleicoes-governador-to-2026" },
                  { uf: "RO", name: "Rondônia",   href: "/eleicoes-governador-ro-2026" },
                  { uf: "AC", name: "Acre",        href: "/eleicoes-governador-ac-2026" },
                  { uf: "AP", name: "Amapá",       href: "/eleicoes-governador-ap-2026" },
                  { uf: "RR", name: "Roraima",    href: "/eleicoes-governador-rr-2026" },
                ],
                badgeCls: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
              },
              {
                region: "Nordeste", count: 9,
                headerCls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                lineCls:   "bg-amber-500/20",
                states: [
                  { uf: "BA", name: "Bahia",          href: "/eleicoes-governador-ba-2026" },
                  { uf: "PE", name: "Pernambuco",     href: "/eleicoes-governador-pe-2026" },
                  { uf: "CE", name: "Ceará",          href: "/eleicoes-governador-ce-2026" },
                  { uf: "MA", name: "Maranhão",       href: "/eleicoes-governador-ma-2026" },
                  { uf: "PB", name: "Paraíba",        href: "/eleicoes-governador-pb-2026" },
                  { uf: "RN", name: "Rio Gr. Norte",  href: "/eleicoes-governador-rn-2026" },
                  { uf: "PI", name: "Piauí",          href: "/eleicoes-governador-pi-2026" },
                  { uf: "AL", name: "Alagoas",        href: "/eleicoes-governador-al-2026" },
                  { uf: "SE", name: "Sergipe",        href: "/eleicoes-governador-se-2026" },
                ],
                badgeCls: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
              },
              {
                region: "Centro-Oeste", count: 4,
                headerCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                lineCls:   "bg-emerald-500/20",
                states: [
                  { uf: "GO", name: "Goiás",            href: "/eleicoes-governador-go-2026" },
                  { uf: "MT", name: "Mato Grosso",      href: "/eleicoes-governador-mt-2026" },
                  { uf: "MS", name: "Mato Gr. Sul",     href: "/eleicoes-governador-ms-2026" },
                  { uf: "DF", name: "Dist. Federal",    href: "/eleicoes-governador-df-2026" },
                ],
                badgeCls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
              },
              {
                region: "Sudeste", count: 4,
                headerCls: "bg-violet-500/10 text-violet-400 border-violet-500/20",
                lineCls:   "bg-violet-500/20",
                states: [
                  { uf: "SP", name: "São Paulo",        href: "/eleicoes-governador-sp-2026" },
                  { uf: "RJ", name: "Rio de Janeiro",   href: "/eleicoes-governador-rj-2026" },
                  { uf: "MG", name: "Minas Gerais",     href: "/eleicoes-governador-mg-2026" },
                  { uf: "ES", name: "Espírito Santo",   href: "/eleicoes-governador-es-2026" },
                ],
                badgeCls: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
              },
              {
                region: "Sul", count: 3,
                headerCls: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                lineCls:   "bg-rose-500/20",
                states: [
                  { uf: "PR", name: "Paraná",           href: "/eleicoes-governador-pr-2026" },
                  { uf: "SC", name: "Santa Catarina",   href: "/eleicoes-governador-sc-2026" },
                  { uf: "RS", name: "Rio Gr. Sul",      href: "/eleicoes-governador-rs-2026" },
                ],
                badgeCls: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
              },
            ] as const).map((grp) => (
              <div key={grp.region} className="space-y-2">
                {/* Region header */}
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${grp.headerCls}`}>
                    {grp.region.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">{grp.count} estados</span>
                  <div className={`flex-1 h-px ${grp.lineCls}`} />
                </div>
                {/* State buttons */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-px bg-border rounded-sm overflow-hidden">
                  {grp.states.map((s) => (
                    <Link
                      key={s.uf}
                      href={s.href}
                      className="bg-card px-2 py-3 flex flex-col items-center gap-1.5 hover:bg-muted/30 transition-colors group"
                    >
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${grp.badgeCls}`}>
                        {s.uf}
                      </span>
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight font-mono">
                        {s.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground font-mono">
            Presidencial · <Link href="/pesquisas-presidenciais-2026" className="text-primary hover:underline">Lula vs Bolsonaro →</Link>
          </p>
        </div>
      </section>

      {/* FAQ — perguntas otimizadas pra GEO/AI Overviews */}
      <section id="faq" className="py-16 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Perguntas Frequentes</p>
            <p className="text-2xl font-bold tracking-tight">Sobre o ElectioLab</p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-2">Como funciona a média ponderada do ElectioLab?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cada pesquisa recebe peso por 4 fatores: recência (meia-vida 10 dias),
                tamanho da amostra (raiz quadrada do n), metodologia (presencial &gt;
                telefônica &gt; mista &gt; online) e acurácia histórica do instituto.
                A combinação cancela ruído amostral e amplifica o sinal real da opinião pública.
                A média é recalculada automaticamente a cada 6 horas.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-2">Qual o instituto de pesquisa eleitoral mais acurado no Brasil?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pelo histórico de erro absoluto vs. resultado oficial TSE em 2018 e 2022:{" "}
                {topInstitutes.length > 0 ? (
                  <>
                    <strong>{topInstitutes[0].name} {topInstitutes[0].pct}%</strong>
                    {topInstitutes.slice(1).map((i, idx) => (
                      <span key={i.id}>
                        {idx === topInstitutes.length - 2 ? " e " : ", "}
                        {i.name} {i.pct}%
                      </span>
                    ))}
                    .
                  </>
                ) : (
                  "ranking sendo calculado."
                )}{" "}
                Ranking completo em{" "}
                <Link href="/institutos" className="text-primary hover:underline">/institutos</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-2">Quem lidera as pesquisas para presidente em 2026?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pela {presInstitute} de {presDate} (1º turno estimulado{presN}): {presText}.
                Veja a <Link href="/pesquisas-presidenciais-2026" className="text-primary hover:underline">tendência completa</Link> e
                o <Link href="/comparar" className="text-primary hover:underline">comparativo lado a lado</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-2">Como saber se um candidato é Ficha Limpa?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cada perfil em <Link href="/candidatos" className="text-primary hover:underline">/candidatos</Link>{" "}
                mostra a situação da última candidatura registrada no TSE: ✓ Apto,
                ⚠️ Indeferido, ou Sem registro. Os filtros permitem listar só os aptos
                ou só os indeferidos. Dados oficiais TSE Dados Abertos.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-2">O ElectioLab tem API pública?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sim, gratuita em <code>/api/v1</code> com endpoints para eleições, pesquisas,
                médias e drift histórico. JSON e CSV. Anônimo: 60 req/h. Pro: 1.000 req/mês.
                Documentação em <Link href="/imprensa" className="text-primary hover:underline">/imprensa</Link>.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link href="/sobre" className="text-xs text-primary hover:underline">
              Ver metodologia completa →
            </Link>
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

      {/* Newsletter — footer reforço (formulário no rodapé já cobre) */}

      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">
                ElectioLab
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Inteligência Eleitoral Baseada em Dados — TSE · Bacen · IBGE.
            </p>
            <p className="text-[11px] text-muted-foreground font-mono pt-1">
              © 2026 ElectioLab
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              { href: "/sobre", label: "Sobre" },
              { href: "/candidatos", label: "Candidatos" },
              { href: "/precos", label: "Preços" },
              { href: "/dashboard", label: "Dashboard" },
              { href: "/imprensa", label: "Imprensa" },
              { href: "/privacidade", label: "Privacidade" },
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

          <div className="space-y-2">
            <p className="text-xs font-medium">Newsletter Sinal Eleitoral</p>
            <NewsletterSignup variant="footer" source="footer" />
          </div>
        </div>
      </footer>
    </div>
  );
}
