#!/usr/bin/env npx tsx
/**
 * Atribuição manual de plano (sem passar pelo Stripe), com auditoria em
 * subscription_changes (quem autorizou, quando, motivo).
 *
 * Server-side only: exige SUPABASE_SERVICE_ROLE_KEY, nunca é importado por
 * código de app/rota (não entra no bundle do cliente nem do servidor Next —
 * só roda via `npx tsx`).
 *
 * A conta fica marcada com api_keys.plan_source = 'manual', o que faz o
 * webhook do Stripe (src/app/api/webhooks/stripe/route.ts) ignorar essa
 * conta — ver isManualOverrideActive em src/lib/stripe/sync-subscription.ts.
 *
 * Uso:
 *   npx tsx scripts/grant-manual-plan.ts \
 *     --email=usuario@exemplo.com \
 *     --tier=pro \
 *     --reason="conta do fundador" \
 *     --by=quem.autorizou@exemplo.com
 *
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local
 * (ou já exportados no ambiente).
 */

import { createClient, type User } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "fs";
import * as path from "path";
import { syncSubscription } from "../src/lib/stripe/sync-subscription";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

function usageAndExit(message: string): never {
  console.error(`❌ ${message}`);
  console.error(
    '\nUso: npx tsx scripts/grant-manual-plan.ts --email=user@x.com --tier=pro --reason="motivo" --by=operador@x.com'
  );
  process.exit(1);
}

const arg = (k: string) =>
  process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");

const EMAIL = arg("email");
const TIER = arg("tier");
const REASON = arg("reason");
const BY_EMAIL = arg("by");

const VALID_TIERS = ["pro", "business", "enterprise"] as const;
type Tier = (typeof VALID_TIERS)[number];

if (!EMAIL) usageAndExit("--email é obrigatório");
if (!TIER || !VALID_TIERS.includes(TIER as Tier))
  usageAndExit(`--tier deve ser um de: ${VALID_TIERS.join(", ")}`);
if (!REASON) usageAndExit("--reason é obrigatório (vai para subscription_changes.notes)");
if (!BY_EMAIL)
  usageAndExit("--by é obrigatório: e-mail de quem está autorizando esta atribuição manual");

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  usageAndExit(
    "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar setados (.env.local ou ambiente). " +
      "Este script exige service_role — não use a anon key aqui."
  );
}

const tier = TIER as Tier;
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// auth.admin.listUsers só devolve ~50 usuários por página por padrão — sem
// paginar até o fim, um e-mail que caia numa página seguinte não é
// encontrado (e usuários já passam de 50 aqui). Varre TODAS as páginas,
// comparação exata case-insensitive, e devolve todas as ocorrências para
// que o chamador possa abortar em caso de zero ou mais de uma.
const PER_PAGE = 200;
const MAX_PAGES = 500; // limite de segurança (100k usuários) contra loop infinito

async function findUsersByEmail(email: string): Promise<User[]> {
  const target = email.trim().toLowerCase();
  const matches: User[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error(`listUsers falhou: ${error.message}`);

    matches.push(...data.users.filter((u) => u.email?.toLowerCase() === target));

    if (data.users.length < PER_PAGE) return matches; // última página
  }

  throw new Error(
    `listUsers excedeu ${MAX_PAGES} páginas sem chegar na última — abortando paginação por segurança`
  );
}

async function resolveUniqueUser(email: string, flagLabel: string): Promise<User> {
  const matches = await findUsersByEmail(email);

  if (matches.length === 0) {
    usageAndExit(`Nenhum usuário encontrado com e-mail ${email} (${flagLabel})`);
  }
  if (matches.length > 1) {
    usageAndExit(
      `${matches.length} usuários encontrados com e-mail ${email} (${flagLabel}) — esperado exatamente 1, abortando`
    );
  }

  return matches[0];
}

async function main() {
  const targetUser = await resolveUniqueUser(EMAIL!, "--email");
  const operator = await resolveUniqueUser(BY_EMAIL!, "--by");

  const { data: existingKey, error: existingError } = await admin
    .from("api_keys")
    .select("id")
    .eq("user_id", targetUser.id)
    .maybeSingle();

  if (existingError) {
    console.error(`❌ Erro buscando api_keys existente: ${existingError.message}`);
    process.exit(1);
  }

  // api_keys.key_hash é NOT NULL: se essa é a primeira key do usuário,
  // precisamos gerar uma (mesmo esquema do checkout do Stripe). Se já existe
  // uma key, não mexemos nela — só o tier/rate_limit mudam.
  let apiKeyHash: string | undefined;
  let rawKeyToShow: string | undefined;
  if (!existingKey) {
    const keyRaw = `el_${tier}_${randomUUID().replace(/-/g, "")}`;
    apiKeyHash = createHash("sha256").update(keyRaw).digest("hex");
    rawKeyToShow = keyRaw;
  }

  console.log(`Atribuindo tier "${tier}" a ${EMAIL} (${targetUser.id})`);
  console.log(`Motivo: ${REASON}`);
  console.log(`Autorizado por: ${BY_EMAIL} (${operator.id})`);

  const result = await syncSubscription(admin, {
    userId: targetUser.id,
    stripeSubscriptionId: null,
    tier,
    trigger: "manual",
    changedBy: operator.id,
    notes: `Atribuição manual por ${BY_EMAIL}: ${REASON}`,
    apiKeyHash,
    apiKeyName: apiKeyHash ? `${tier} key (manual)` : undefined,
  });

  if (!result.success) {
    console.error(`❌ Falhou: ${result.error}`);
    process.exit(1);
  }

  console.log(`✅ Plano "${tier}" atribuído manualmente a ${EMAIL}.`);
  console.log(
    "   plan_source='manual' — o webhook do Stripe vai ignorar essa conta (ver isManualOverrideActive)."
  );

  if (rawKeyToShow) {
    console.log("\n⚠️  Nova API key gerada — só aparece agora, guarde em local seguro:");
    console.log(`   ${rawKeyToShow}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erro inesperado:", err);
    process.exit(1);
  });
