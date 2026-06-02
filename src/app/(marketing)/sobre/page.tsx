import type { Metadata } from "next";
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
  Mail,
  ExternalLink,
} from "lucide-react";
import { getInstitutesRanking } from "@/lib/marketing-data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Sobre o ElectioLab — Metodologia e Equipe | ElectioLab" },
  description:
    "ElectioLab agrega pesquisas eleitorais do Brasil com média ponderada por recência, amostra e acurácia. Conheça a metodologia e a equipe.",
  alternates: { canonical: "https://electiolab.com/sobre" },
  openGraph: {
    title: "Sobre o ElectioLab — Metodologia e Equipe",
    description:
      "Agregador independente de pesquisas eleitorais. Metodologia: recência, amostra, metodologia e acurácia dos institutos.",
    url: "https://electiolab.com/sobre",
  },
};

function buildJsonLd(institutesText: string) {
  return {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://electiolab.com/sobre",
      "name": "Sobre o ElectioLab — Metodologia e Equipe",
      "url": "https://electiolab.com/sobre",
      "datePublished": "2026-04-01",
      "dateModified": "2026-04-29",
      "inLanguage": "pt-BR",
      "isPartOf": { "@id": "https://electiolab.com/#website" },
      "author": { "@id": "https://electiolab.com/sobre#founder" },
    },
    {
      "@type": "Person",
      "@id": "https://electiolab.com/sobre#founder",
      "name": "Luiz Lessa",
      "url": "https://electiolab.com/sobre",
      "jobTitle": "Fundador e Editor Responsável",
      "description": "Fundador e editor responsável do ElectioLab. Construiu o motor de ponderação (recência, amostra, metodologia e acurácia) e o sistema de backtesting de acurácia dos institutos contra os resultados oficiais do TSE de 2018 e 2022.",
      "sameAs": [
        "https://github.com/luizlessa",
        "https://linkedin.com/in/luizlessa"
      ],
      "worksFor": { "@id": "https://electiolab.com/#organization" },
      "knowsAbout": [
        "Eleições brasileiras",
        "Pesquisas eleitorais",
        "Estatística aplicada à política",
        "Análise de dados públicos",
        "Sistema PesqEle TSE",
        "Média ponderada de pesquisas",
        "Margem de erro estatística",
        "Metodologia de coleta",
      ],
      "knowsLanguage": ["pt-BR", "en"],
      "nationality": { "@type": "Country", "name": "Brasil" },
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
    {
      "@type": "Question",
      name: "Como o ElectioLab calcula a média ponderada?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O ElectioLab usa quatro fatores: recência (meia-vida de 10 dias, fórmula e^(-t/10)), tamanho da amostra (√n/1000), metodologia (presencial 1,0 > telefônica 0,8 > online 0,6) e histórico de acurácia do instituto (score baseado no Erro Médio Absoluto em eleições anteriores). A combinação produz uma estimativa mais estável que qualquer pesquisa individual.",
      },
    },
    {
      "@type": "Question",
      name: "Quais institutos o ElectioLab monitora?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O ElectioLab monitora os principais institutos brasileiros, incluindo Quaest, Datafolha, Atlas Intel e Ipespe, entre outros. Cada instituto tem um score de confiabilidade baseado no histórico de acurácia em eleições anteriores.",
      },
    },
    {
      "@type": "Question",
      name: "Por que a média do ElectioLab é mais confiável que uma pesquisa individual?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Uma pesquisa individual tem margem de erro de ±2–3 pontos percentuais e pode ser outlier por variação amostral. Ao agregar múltiplas pesquisas com ponderação por recência, amostra e metodologia, o ElectioLab cancela ruídos aleatórios e amplifica o sinal real da opinião pública.",
      },
    },
    {
      "@type": "Question",
      name: "Os dados do ElectioLab são atualizados com que frequência?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "As médias ponderadas são recalculadas automaticamente a cada 6 horas via cron. Pesquisas novas são ingeridas em até 24 horas após publicação dos institutos, e o sistema dispara alertas semanais quando alguma UF fica sem pesquisa nova por mais de 30 dias.",
      },
    },
    {
      "@type": "Question",
      name: "Qual o instituto de pesquisa eleitoral mais acurado no Brasil?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Pelo score histórico do ElectioLab (calculado pelo Erro Médio Absoluto vs resultado oficial TSE em 2018 e 2022): ${institutesText}. O ranking completo está em /institutos.`,
      },
    },
    {
      "@type": "Question",
      name: "O ElectioLab cobre eleições para governador e senador?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim. Cobertura completa das 27 corridas para governador 2026 (todas as UFs: AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO) e 27 corridas para senador 2026, além da presidência (1º e 2º turno simulado).",
      },
    },
    {
      "@type": "Question",
      name: "O ElectioLab tem API pública para jornalistas e desenvolvedores?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim, API REST gratuita em /api/v1 com endpoints para eleições, pesquisas, médias ponderadas e drift histórico. Suporta JSON e CSV. Acesso anônimo (60 req/h) ou autenticado via Bearer token (planos Pro 1.000 req/mês ou Business 10.000 req/mês). Documentação completa em /imprensa.",
      },
    },
    {
      "@type": "Question",
      name: "Como saber se um candidato está apto pelo TSE (Ficha Limpa)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cada perfil em /candidato/[slug] mostra a situação da última candidatura registrada no TSE: ✓ Apto, ⚠️ Indeferido, ou Sem registro. Os filtros em /candidatos permitem listar apenas candidatos aptos ou apenas indeferidos. Os dados vêm direto do TSE Dados Abertos.",
      },
    },
      ],
    },
  ],
  };
}

export default async function SobrePage() {
  const institutes = await getInstitutesRanking();
  const top7 = institutes.slice(0, 7);
  const institutesText = top7.length
    ? top7.map((i) => `${i.name} ${i.pct}%`).join(", ")
    : "ranking sendo calculado";
  const jsonLd = buildJsonLd(institutesText);
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
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground ml-1">Terminal</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {[
              { href: "#como-funciona", label: "Metodologia" },
              { href: "#features", label: "Features" },
              { href: "/precos", label: "Preços" },
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
              Motor Analítico de Opinião Pública
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter leading-[1.1]">
            A verdade eleitoral{" "}
            <br className="hidden md:block" />
            está nos{" "}
            <span className="text-primary">dados.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            O ElectioLab agrega todas as pesquisas eleitorais do Brasil em uma
            média ponderada inteligente — para você enxergar a tendência real.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 md:gap-10 pt-4">
            {[
              { value: "60.608", label: "Entrevistados" },
              { value: "9", label: "Pesquisas 2026" },
              { value: "13", label: "Institutos" },
              { value: "3", label: "APIs Públicas" },
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
            Pesquisa isolada é ruído.{" "}
            <span className="text-primary">Tendência agregada é sinal.</span>
          </p>
          <div className="grid md:grid-cols-3 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { icon: BarChart3, title: "Pesquisas contradizem", desc: "Um instituto diz 39%, outro diz 33%. Sem agregação, impossível saber qual está certo." },
              { icon: Newspaper, title: "Mídia amplifica outliers", desc: "Manchetes são do dado mais polêmico, não do mais preciso." },
              { icon: Target, title: "Decisões no escuro", desc: "Campanhas e analistas operam sem visão consolidada." },
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
            4 fatores de ponderação em um único número
          </p>

          <div className="grid md:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden">
            {[
              { icon: Clock, title: "Recência", code: "e^(-t/10)", desc: "Meia-vida ~10 dias. Pesquisas antigas decaem gradualmente." },
              { icon: Users, title: "Amostra", code: "sqrt(n/1000)", desc: "Amostras maiores pesam mais, com retorno decrescente." },
              { icon: FlaskConical, title: "Metodologia", code: "0.6 — 1.0", desc: "Presencial > telefônica > online." },
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
            <span>PONDERAÇÃO</span>
            <span className="text-primary">→</span>
            <span>CONSOLIDAÇÃO</span>
            <span className="text-primary">→</span>
            <span className="text-foreground font-semibold">INSIGHT</span>
          </div>
        </div>
      </section>

      {/* FAQ — visível e indexável pelo Google */}
      <section id="faq" className="py-14 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium text-center">
            Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Como o ElectioLab calcula a média ponderada?",
                a: "Quatro fatores: recência (meia-vida de 10 dias), tamanho da amostra (√n), metodologia (presencial > telefônica > online) e histórico de acurácia do instituto. A combinação produz uma estimativa mais estável que qualquer pesquisa individual.",
              },
              {
                q: "Quais institutos são monitorados?",
                a: "Quaest, Datafolha, Atlas Intel, Ipespe e outros institutos registrados no TSE. Cada um tem um score de confiabilidade baseado no Erro Médio Absoluto em eleições anteriores.",
              },
              {
                q: "Por que a média é mais confiável do que uma pesquisa individual?",
                a: "Uma pesquisa individual tem margem de erro de ±2–3 pp e pode ser outlier por variação amostral. Ao agregar múltiplas pesquisas com ponderação, o ElectioLab cancela ruídos aleatórios e amplifica o sinal real da opinião pública.",
              },
              {
                q: "Com que frequência os dados são atualizados?",
                a: "Semanalmente, à medida que novos polls são publicados pelos institutos. Cada nova pesquisa entra no agregado automaticamente, atualizando a média ponderada de todos os candidatos.",
              },
            ].map((item) => (
              <details key={item.q} className="border border-border rounded-sm bg-card group">
                <summary className="px-4 py-3 text-sm font-medium cursor-pointer list-none flex items-center justify-between hover:text-primary transition-colors">
                  {item.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform ml-3">+</span>
                </summary>
                <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </details>
            ))}
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
              { icon: BarChart3, title: "Média Ponderada", desc: "Percentual consolidado por candidato. Mais estável que pesquisa individual." },
              { icon: TrendingUp, title: "Tendência Temporal", desc: "Evolução real ao longo do tempo. Sem zigue-zague." },
              { icon: Building2, title: "Ranking de Institutos", desc: "Quem erra mais, quem acerta mais. Baseado em dados." },
              { icon: FileSearch, title: "Base Explorável", desc: "Todas as pesquisas com filtros por instituto, data e metodologia." },
              { icon: DollarSign, title: "Financeiro Eleitoral", desc: "Prestação de contas, gastos e fontes de financiamento." },
              { icon: Shield, title: "Dados Abertos", desc: "Fonte primária: TSE, Bacen, IBGE. Zero editorização." },
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
              { icon: Briefcase, title: "Campanhas", desc: "Tendência + alertas para decisões" },
              { icon: TrendingUp, title: "Analistas", desc: "API + relatórios automatizados" },
              { icon: Building2, title: "Consultorias", desc: "White-label + dados premium" },
              { icon: GraduationCap, title: "Acadêmicos", desc: "Dataset limpo para pesquisa" },
              { icon: Users, title: "Cidadãos", desc: "Dashboard gratuito e claro" },
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

      {/* Sobre o Projeto — E-E-A-T section */}
      <section id="projeto" className="py-14 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium text-center">
            Sobre o Projeto
          </h2>

          {/* Founder card */}
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-6 py-5 flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary font-mono">LL</span>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">Luiz Lessa</p>
                <p className="text-xs text-muted-foreground">Fundador e editor responsável — ElectioLab</p>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1 max-w-xl">
                  Luiz construiu o ElectioLab integralmente — do motor de ponderação estatística
                  (recência, amostra, metodologia e acurácia) à ingestão automatizada de pesquisas
                  registradas no TSE. Desenhou o sistema de acurácia que faz backtesting de cada
                  instituto contra os resultados oficiais do TSE de 2018 e 2022, e responde
                  editorialmente por todo o conteúdo publicado. O projeto nasceu da cobertura
                  fragmentada de pesquisas na mídia brasileira — e da convicção de que dados abertos
                  do TSE merecem uma interface à altura.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <a
                    href="mailto:contato@electiolab.com"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="E-mail de contato"
                  >
                    <Mail className="h-3 w-3" />
                    contato@electiolab.com
                  </a>
                  <a
                    href="https://github.com/luizlessa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="GitHub de Luiz Lessa"
                  >
                    <ExternalLink className="h-3 w-3" />
                    GitHub
                  </a>
                  <a
                    href="https://linkedin.com/in/luizlessa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="LinkedIn de Luiz Lessa"
                  >
                    <ExternalLink className="h-3 w-3" />
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-border bg-muted/20 flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="text-xs font-mono text-muted-foreground">Fundado em 2026</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs font-mono text-muted-foreground">Projeto independente</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs font-mono text-muted-foreground">Dados: TSE · Bacen · IBGE (públicos)</span>
            </div>
          </div>

          {/* Mission statement */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Missão</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O ElectioLab acredita que a democracia funciona melhor quando cidadãos, jornalistas e analistas
              têm acesso a dados eleitorais consolidados e metodologicamente sólidos — sem precisar filtrar
              manualmente dezenas de pesquisas contraditórias.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Todo o conteúdo é baseado exclusivamente em fontes primárias públicas (TSE, institutos registrados)
              e a metodologia de ponderação é descrita abertamente nesta página. Não fazemos editorização
              nem interpolação de dados não publicados.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para quem está chegando agora, mantemos um{" "}
              <Link href="/glossario-pesquisa-eleitoral" className="text-primary hover:underline font-medium">
                glossário de pesquisa eleitoral
              </Link>{" "}
              explicando termos como{" "}
              <Link href="/margem-de-erro-pesquisa-eleitoral" className="text-primary hover:underline">
                margem de erro
              </Link>
              ,{" "}
              <Link href="/empate-tecnico-pesquisa-eleitoral" className="text-primary hover:underline">
                empate técnico
              </Link>{" "}
              e{" "}
              <Link href="/pesquisa-estimulada-vs-espontanea" className="text-primary hover:underline">
                estimulada vs espontânea
              </Link>{" "}
              — base mínima pra interpretar qualquer pesquisa publicada na mídia.
            </p>
          </div>

          {/* Correções e fontes — sinal de confiança (E-E-A-T / YMYL) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Correções e fontes primárias
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Levamos a precisão a sério. Encontrou um dado incorreto ou desatualizado? Escreva para{" "}
              <a href="mailto:contato@electiolab.com" className="text-primary hover:underline">
                contato@electiolab.com
              </a>{" "}
              com o assunto &quot;Correção&quot; — verificamos, corrigimos e registramos a alteração.
              Todas as pesquisas citadas são registradas no{" "}
              <a
                href="https://www.tse.jus.br/eleicoes/pesquisas-eleitorais"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                sistema PesqEle do TSE
              </a>
              ; dados de candidatos, patrimônio e prestação de contas vêm do{" "}
              <a
                href="https://dadosabertos.tse.jus.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                TSE Dados Abertos
              </a>
              .
            </p>
          </div>

          {/* Contact */}
          <div className="border border-border rounded-sm bg-card px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">Contato &amp; Parcerias</p>
              <p className="text-xs text-muted-foreground">Imprensa, API, dados ou sugestões de pesquisas:</p>
            </div>
            <a
              href="mailto:contato@electiolab.com"
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Mail className="h-3 w-3" />
              contato@electiolab.com
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 border-t border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="text-xl font-bold tracking-tight">
            Pesquisa individual é ruído.{" "}
            <span className="text-primary">Tendência agregada é sinal.</span>
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
              ElectioLab — Terminal de Inteligência Eleitoral
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
            <span>·</span>
            <a href="mailto:contato@electiolab.com" className="hover:text-foreground transition-colors">contato@electiolab.com</a>
            <span>·</span>
            <span>Dados: TSE · Bacen · IBGE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
