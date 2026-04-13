import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "Dashboard publico (eleicao ativa)",
      "Media ponderada atualizada",
      "Tendencia ultimos 30 dias",
      "Ranking simplificado",
    ],
  },
  pro: {
    name: "Pro",
    priceMonthly: 9700, // R$ 97,00 in centavos
    priceYearly: 97000, // R$ 970,00
    stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    features: [
      "Tudo do Free",
      "Dashboard completo",
      "Historico ilimitado",
      "Alertas inteligentes",
      "Filtros avancados",
      "Exportacao CSV/PDF",
      "API basica (1.000 req/mes)",
      "Relatorio semanal",
    ],
  },
  business: {
    name: "Business",
    priceMonthly: 49700, // R$ 497,00
    stripePriceMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    features: [
      "Tudo do Pro",
      "Ate 5 usuarios",
      "Embeds premium",
      "API expandida (10.000 req/mes)",
      "Dados em tempo real",
      "Suporte prioritario",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceMonthly: null, // Custom
    features: [
      "Tudo do Business",
      "API ilimitada",
      "White-label",
      "SLA 99.9%",
      "Suporte dedicado",
      "Dados granulares",
    ],
  },
} as const;
