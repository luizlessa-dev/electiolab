#!/usr/bin/env npx tsx
/**
 * Sobe os PDFs de plano_governo (já baixados em disco na etapa 1, via
 * caminho_arquivo) pro bucket público `planos-governo` no Supabase Storage,
 * e grava a URL pública em plano_governo.pdf_url_publico.
 *
 * Por quê: url_origem é o ZIP inteiro do recurso do TSE (proposta_governo_
 * <ano>_<UF>.zip), não o PDF individual do candidato — linkar pra lá na
 * página pública seria enganoso (baixa todo mundo, não só um). Hospedar
 * nossa própria cópia dá um link direto e estável, sem depender do TSE
 * estar no ar.
 *
 * Só roda numa máquina que já tenha os PDFs em disco (mesma que rodou
 * ingest-planos-governo.ts --apply — caminho_arquivo é path local).
 *
 * Uso:
 *   npx tsx scripts/upload-planos-pdfs.ts             # dry-run: lista quem falta subir
 *   npx tsx scripts/upload-planos-pdfs.ts --apply      # sobe de verdade
 *   npx tsx scripts/upload-planos-pdfs.ts --apply --force  # resobe todo mundo
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const BUCKET = "planos-governo";

async function main() {
  console.log(`▶️  Upload de PDFs — modo: ${APPLY ? "APPLY (sobe de verdade)" : "DRY RUN (só lista)"}`);

  const { data: planos, error } = await supabase
    .from("plano_governo")
    .select("id, ano, candidato_id, caminho_arquivo, pdf_url_publico");
  if (error) throw error;
  if (!planos || planos.length === 0) {
    console.log("Nenhum plano em `plano_governo`.");
    return;
  }

  const { data: candidatos } = await supabase
    .from("candidates")
    .select("id, name, tse_id")
    .in("id", planos.map((p) => p.candidato_id));
  const candidatoById = new Map((candidatos ?? []).map((c) => [c.id as string, c]));

  const alvo = FORCE ? planos : planos.filter((p) => !p.pdf_url_publico);
  if (planos.length !== alvo.length) {
    console.log(`⏭️  ${planos.length - alvo.length} já têm pdf_url_publico, pulando (use --force pra resubir).`);
  }
  console.log(`\n📚 ${alvo.length} plano(s) a processar.\n`);

  let subidos = 0;
  for (const plano of alvo) {
    const cand = candidatoById.get(plano.candidato_id as string);
    const label = cand ? `${cand.name} (tse_id=${cand.tse_id})` : (plano.candidato_id as string);

    if (!plano.caminho_arquivo || !fs.existsSync(plano.caminho_arquivo as string)) {
      console.warn(`   ⚠️  ${label}: arquivo não encontrado em disco (${plano.caminho_arquivo ?? "sem caminho_arquivo"}).`);
      continue;
    }
    const pdfPath = plano.caminho_arquivo as string;
    const objectPath = `${plano.ano}/${cand?.tse_id ?? plano.candidato_id}.pdf`;

    console.log(`   ${label} → ${objectPath}`);
    if (!APPLY) continue;

    const buf = fs.readFileSync(pdfPath);
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, buf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      console.error(`      ❌ upload: ${upErr.message}`);
      continue;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const { error: updErr } = await supabase
      .from("plano_governo")
      .update({ pdf_url_publico: pub.publicUrl })
      .eq("id", plano.id);
    if (updErr) {
      console.error(`      ❌ update: ${updErr.message}`);
      continue;
    }
    subidos++;
    console.log(`      ✅ ${pub.publicUrl}`);
  }

  console.log(`\n📊 ${subidos}/${alvo.length} PDF(s) enviado(s).`);
  if (!APPLY) {
    console.log(`💡 Rode com --apply pra subir de verdade.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
