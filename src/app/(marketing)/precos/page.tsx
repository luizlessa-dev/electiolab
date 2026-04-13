import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "para sempre",
    description: "Dashboard publico para acompanhar a eleicao",
    features: [
      "Dashboard da eleicao ativa",
      "Media ponderada atualizada",
      "Tendencia ultimos 30 dias",
      "Ranking simplificado de institutos",
    ],
    cta: "Acessar Gratis",
    href: "/",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 97",
    period: "/mes",
    description: "Para jornalistas, analistas e cidadaos informados",
    features: [
      "Tudo do Free",
      "Historico completo (desde 2018)",
      "Alertas inteligentes",
      "Filtros avancados",
      "Exportacao CSV/PDF/PNG",
      "API basica (1.000 req/mes)",
      "Relatorio semanal por email",
      "Graficos embedaveis",
    ],
    cta: "Assinar Pro",
    href: "/auth/login",
    highlight: true,
    badge: "Mais popular",
  },
  {
    name: "Business",
    price: "R$ 497",
    period: "/mes",
    description: "Para redacoes, consultorias e assessorias",
    features: [
      "Tudo do Pro",
      "Ate 5 usuarios",
      "Embeds premium com marca",
      "API expandida (10.000 req/mes)",
      "Dados em tempo real (webhook)",
      "Suporte prioritario (4h uteis)",
    ],
    cta: "Assinar Business",
    href: "/auth/login",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para grandes veiculos, fintechs e plataformas",
    features: [
      "Tudo do Business",
      "API ilimitada",
      "White-label",
      "SLA 99.9%",
      "Suporte dedicado",
      "Dados granulares (microregiao)",
      "Relatorios white-label",
    ],
    cta: "Falar com vendas",
    href: "mailto:contato@electiolab.com.br",
    highlight: false,
  },
];

export default function PrecosPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/sobre" className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">ElectioLab</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">
              Inteligencia eleitoral para cada necessidade
            </h1>
            <p className="text-muted-foreground">
              Dashboard gratuito para todos. Features premium para quem precisa ir alem.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.highlight ? "border-primary shadow-lg" : ""}`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    {plan.badge}
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`block w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      plan.highlight
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border hover:bg-accent"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>Todos os planos incluem acesso ao dashboard publico.</p>
            <p>Cancele a qualquer momento. Sem multa, sem burocracia.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
