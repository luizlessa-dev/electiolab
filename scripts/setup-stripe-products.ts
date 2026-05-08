/**
 * Setup Stripe Products + Prices via API.
 *
 * Uso:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe-products.ts
 *
 * Cria (ou atualiza) os Products + Prices no Stripe para os planos do ElectioLab.
 * Imprime os Price IDs no final — copie-os para .env.local e Vercel.
 */

import Stripe from "stripe";

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) {
  console.error("❌ Defina STRIPE_SECRET_KEY (test mode: sk_test_...)");
  process.exit(1);
}

const stripe = new Stripe(SECRET, { apiVersion: "2026-03-25.dahlia" });

// Configuração canônica dos planos
const PLANS = [
  {
    productKey: "electiolab_pro",
    name: "ElectioLab Pro",
    description:
      "Dashboard completo + histórico ilimitado + alertas + filtros avançados + API 1k req/mês.",
    prices: [
      { key: "pro_monthly", amount: 9700, interval: "month" as const, label: "Pro mensal" },
      { key: "pro_yearly",  amount: 97000, interval: "year"  as const, label: "Pro anual (2 meses grátis)" },
    ],
  },
  {
    productKey: "electiolab_business",
    name: "ElectioLab Business",
    description:
      "Tudo do Pro + 5 usuários + embeds premium + API 10k req/mês + dados em tempo real.",
    prices: [
      { key: "business_monthly", amount: 49700, interval: "month" as const, label: "Business mensal" },
    ],
  },
];

async function findProductByMetadata(key: string) {
  const list = await stripe.products.search({
    query: `active:'true' AND metadata['key']:'${key}'`,
  });
  return list.data[0] ?? null;
}

async function main() {
  console.log("🚀 Setup Stripe Products — ElectioLab\n");

  const created: Record<string, string> = {};

  for (const plan of PLANS) {
    let product = await findProductByMetadata(plan.productKey);

    if (product) {
      console.log(`📦 Product existente: ${plan.name} (${product.id})`);
      // Atualiza descrição/nome se mudou
      product = await stripe.products.update(product.id, {
        name: plan.name,
        description: plan.description,
      });
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { key: plan.productKey },
      });
      console.log(`✅ Criado: ${plan.name} (${product.id})`);
    }

    for (const priceCfg of plan.prices) {
      // Procura price existente com mesmo amount/interval
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100,
      });
      const existing = prices.data.find(
        (p) =>
          p.unit_amount === priceCfg.amount &&
          p.recurring?.interval === priceCfg.interval &&
          p.currency === "brl"
      );

      let price: Stripe.Price;
      if (existing) {
        price = existing;
        console.log(
          `   💰 Price existente: ${priceCfg.label} R$${priceCfg.amount / 100}/${priceCfg.interval} (${price.id})`
        );
      } else {
        price = await stripe.prices.create({
          product: product.id,
          currency: "brl",
          unit_amount: priceCfg.amount,
          recurring: { interval: priceCfg.interval },
          nickname: priceCfg.label,
          metadata: { key: priceCfg.key },
        });
        console.log(
          `   ✅ Price criado: ${priceCfg.label} R$${priceCfg.amount / 100}/${priceCfg.interval} (${price.id})`
        );
      }
      created[priceCfg.key] = price.id;
    }
  }

  console.log("\n─────────────────────────────────────────────────────────");
  console.log("📋 Adicione ao .env.local e Vercel Settings → Environment:");
  console.log("─────────────────────────────────────────────────────────\n");
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${created.pro_monthly}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${created.pro_yearly}`);
  console.log(`STRIPE_PRICE_BUSINESS_MONTHLY=${created.business_monthly}`);
  console.log("\n✅ Setup concluído!\n");
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
