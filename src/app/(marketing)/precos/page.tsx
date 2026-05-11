import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Check, ArrowRight } from "lucide-react";
import { CheckoutButton } from "@/components/marketing/checkout-button";
import { NewsletterSignup } from "@/components/newsletter/signup-form";

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
    images: [
      {
        url: "https://electiolab.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ElectioLab — Planos e Preços",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Planos e Preços — ElectioLab",
    images: ["https://electiolab.com/opengraph-image"],
  },
};

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "para sempre",
    desc: "Dashboard público",
    features: ["Eleição ativa", "Média ponderada", "Tendência 30 dias", "Ranking básico"],
    cta: "Acessar Grátis",
    href: "/dashboard",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 97",
    period: "/mês",
    desc: "Para analistas e jornalistas",
    features: ["Tudo do Free", "Histórico completo", "Alertas inteligentes", "Filtros avançados", "Exportação CSV/PDF", "API 1.000 req/mês", "Relatório semanal"],
    cta: "Assinar Pro",
    href: "/auth/login",
    highlight: true,
    badge: "Popular",
  },
  {
    name: "Business",
    price: "R$ 497",
    period: "/mês",
    desc: "Para redações e consultorias",
    features: ["Tudo do Pro", "5 usuários", "Embeds premium", "API 10.000 req/mês", "Dados em tempo real", "Suporte 4h"],
    cta: "Assinar Business",
    href: "/auth/login",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Para grandes operações",
    features: ["Tudo do Business", "API ilimitada", "White-label", "SLA 99,9%", "Suporte dedicado", "Dados granulares"],
    cta: "Falar com vendas",
    href: "mailto:contato@electiolab.com",
    highlight: false,
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: "ElectioLab",
      description: "Plataforma de dados eleitorais brasileiros — dashboard, API e alertas.",
      brand: { "@type": "Brand", name: "ElectioLab" },
      offers: plans
        .filter((p) => p.price.startsWith("R$") && p.price !== "R$ 0")
        .map((p) => ({
          "@type": "Offer",
          name: `Plano ${p.name}`,
          description: p.desc,
          price: p.price.replace(/[^0-9]/g, ""),
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
          url: `https://electiolab.com${p.href}`,
        })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: "https://electiolab.com/" },
        { "@type": "ListItem", position: 2, name: "Preços", item: "https://electiolab.com/precos" },
      ],
    },
  ],
};

export default function PrecosPage() {
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
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-xs font-medium uppercase tracking-wider">
            Acessar Terminal <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Inteligência eleitoral para cada necessidade
            </h1>
            <p className="text-xs text-muted-foreground">
              Dashboard gratuito para todos. Features premium para quem precisa ir além.
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

                {plan.name === "Pro" || plan.name === "Business" ? (
                  <CheckoutButton
                    tier={plan.name.toLowerCase() as "pro" | "business"}
                    className={`block w-full text-center px-3 py-2 rounded-sm text-xs font-medium uppercase tracking-wider transition-colors ${
                      plan.highlight
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {plan.cta}
                  </CheckoutButton>
                ) : (
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
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground font-mono">
            Cancele a qualquer momento · Sem multa · Dados públicos incluídos em todos os planos
          </p>
        </div>
      </section>

      {/* Newsletter slot — engagement free tier */}
      <section className="py-12 px-4 border-t border-border bg-muted/20">
        <div className="max-w-md mx-auto">
          <NewsletterSignup variant="card" source="precos" />
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
            <Link href="/sobre" className="hover:text-foreground transition-colors">Sobre</Link>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
