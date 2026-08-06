#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function checkIngestion() {
  console.log("🔍 Verificando status de ingestão...\n");

  // 1. Verificar Presidência
  const { data: pres } = await sb
    .from("elections")
    .select("id, type, state, year")
    .eq("type", "presidencial")
    .eq("year", 2026);

  console.log("📍 Presidência 2026:");
  console.log(`   Total: ${pres?.length || 0} eleições`);
  if (pres && pres.length > 0) {
    console.log(`   ✅ Ingestão presente`);
  }

  // 2. Verificar Governadores
  const { data: govs } = await sb
    .from("elections")
    .select("id, type, state, year")
    .eq("type", "governador")
    .eq("year", 2026);

  const govStates = new Set(govs?.map(g => g.state) || []);
  console.log("\n📍 Governadores 2026:");
  console.log(`   Estados: ${govStates.size}/27`);
  if (govStates.size === 27) {
    console.log(`   ✅ Todos os 27 estados ingeridos`);
  } else {
    console.log(`   ⚠️  Faltam estados: ${27 - govStates.size}`);
    const allStates = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
    const missing = allStates.filter(s => !govStates.has(s));
    console.log(`      ${missing.join(', ')}`);
  }

  // 3. Verificar Senadores
  const { data: sens } = await sb
    .from("elections")
    .select("id, type, state, year")
    .eq("type", "senador")
    .eq("year", 2026);

  const senStates = new Set(sens?.map(s => s.state) || []);
  console.log("\n📍 Senadores 2026:");
  console.log(`   Estados: ${senStates.size}/27`);
  if (senStates.size === 27) {
    console.log(`   ✅ Todos os 27 estados ingeridos`);
  } else {
    console.log(`   ⚠️  Faltam estados: ${27 - senStates.size}`);
    const allStates = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
    const missing = allStates.filter(s => !senStates.has(s));
    console.log(`      ${missing.join(', ')}`);
  }

  // 4. Verificar data mais recente de pesquisas
  console.log("\n📊 Últimas pesquisas ingeridas:");

  const { data: polls } = await sb
    .from("polls")
    .select("publication_date, election(type)")
    .order("publication_date", { ascending: false })
    .limit(5);

  if (polls && polls.length > 0) {
    const latestDate = polls[0].publication_date;
    console.log(`   Mais recente: ${latestDate}`);
    console.log(`   ✅ Dados atualizados`);
  } else {
    console.log(`   ⚠️  Nenhuma pesquisa ingerida`);
  }

  // 5. Resumo
  console.log("\n" + "=".repeat(50));
  console.log("📋 RESUMO:");
  console.log("=".repeat(50));

  const presComplete = pres && pres.length > 0;
  const govComplete = govStates.size === 27;
  const senComplete = senStates.size === 27;

  console.log(`Presidência:   ${presComplete ? "✅" : "❌"}`);
  console.log(`Governadores:  ${govComplete ? "✅" : "❌"}`);
  console.log(`Senadores:     ${senComplete ? "✅" : "❌"}`);

  if (presComplete && govComplete && senComplete) {
    console.log("\n🎉 Todas as ingestões OK!");
  } else {
    console.log("\n⚠️  Há gaps na ingestão");
  }
}

checkIngestion().catch(console.error);
