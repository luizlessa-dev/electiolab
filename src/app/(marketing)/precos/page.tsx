import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Planos e Preços",
  description:
    "Escolha o plano ElectioLab ideal para você. Acesso ao dashboard de pesquisas, API de dados eleitorais e alertas de tendência em tempo real.",
  alternates: { canonical: "https://electiolab.com/precos" },
  openGraph: {
    title: "Planos e Preços — ElectioLab",
    description:
      "Acesso ao dashboard de pesquisas eleitorais, API de dados e alertas de tendência em tempo real.",
    url: "https://electiolab.com/precos",
  },
};

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "para sempre",
    desc: "Dashboard publico",
    features: ["Eleicao ativa", "Media ponderada", "Tendencia 30 dias", "Ranking basico"],
    cta: "Acessar Gratis",
    href: "/",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 97",
    period: "/mes",
    desc: "Para analistas e jornalistas",
    features: ["Tudo do Free", "Historico completo", "Alertas inteligentes", "Filtros avancados", "Exportacao CSV/PDF", "API 1.000 req/mes", "Relatorio semanal"],
    cta: "Assinar Pro",
    href: "/auth/login",
    highlight: true,
    badge: "Popular",
  },
  {
    name: "Business",
    price: "R$ 497",
    period: "/mes",
    desc: "Para redacoes e consultorias",
    features: ["Tudo do Pro", "5 usuarios", "Embeds premium", "API 10.000 req/mes", "Dados realtime", "Suporte 4h"],
    cta: "Assinar Business",
    href: "/auth/login",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Para grandes operacoes",
    features: ["Tudo do Business", "API ilimitada", "White-label", "SLA 99.9%", "Suporte dedicado", "Dados granulares"],
    cta: "Falar com vendas",
    href: "mailto:contato@electiolab.com",
    highlight: false,
  },
];

export default function PrecosPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/sobre" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider">
            Terminal <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Inteligencia eleitoral para cada necessidade
            </h1>
            <p className="text-xs text-muted-foreground">
              Dashboard gratuito para todos. Features premium para quem precisa ir alem.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-card px-4 py-5 flex flex-col relative ${
                  plan.highlight ? "ring-1 ring-primary/40 shadow-[0_0_30px_oklch(0.65_0.20_250/0.08)]" : ""
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-px left-0 right-0 h-[2px] bg-primary" />
                )}

                <div className="space-y-1 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider">{plan.name}</h3>
                    {plan.badge && (
                      <span className="text-xs font-mono uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-mono font-bold tabular-nums">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.desc}</p>
                </div>

                <ul className="space-y-1.5 flex-1 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
                      <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full text-center px-3 py-2 rounded-sm text-xs font-medium uppercase tracking-wider transition-colors ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground font-mono">
            Cancele a qualquer momento · Sem multa · Dados publicos inclusos em todos os planos
          </p>
        </div>
      </section>
    </div>
  );
}
