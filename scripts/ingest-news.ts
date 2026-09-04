#!/usr/bin/env npx tsx
/**
 * Script de ingestão manual do feed de notícias eleitorais (MVP).
 *
 * Uso:
 *   npx tsx scripts/ingest-news.ts
 *
 * Mesmo molde do ingest-manual.ts (pesquisas): adicione itens em PENDING_NEWS,
 * rode o script. Dedup por source_url (unique na tabela). Cada item pode
 * linkar a uma eleição e, dentro dela, a candidatos específicos citados na
 * matéria — não existe tabela de partido no schema, então não há link por
 * partido neste MVP.
 *
 * Configurar .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // Service role bypassa RLS para inserções administrativas
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ────────────────────────────────────────────────────
// NOTÍCIAS PENDENTES DE INGESTÃO
// Adicione novas notícias aqui antes de rodar o script
// ────────────────────────────────────────────────────
const PENDING_NEWS: Array<{
  title: string;
  source_name: string;
  source_url: string;
  /** Data de publicação da matéria, YYYY-MM-DD. */
  published_at: string;
  /** Resumo editorial curto (1-2 frases nossas) — nunca copiar/colar corpo da matéria. */
  summary?: string;
  /** Nome exato da eleição (igual a elections.name) — necessário se candidate_names for usado. */
  election_name?: string;
  /** Candidatos citados na matéria, resolvidos dentro de election_name. */
  candidate_names?: string[];
  /** 'published' assume revisão humana já feita ao escrever a entrada; default 'draft'. */
  status?: "draft" | "published";
}> = [
  // ─── lote 1 — verificado via WebSearch/WebFetch em 2026-09-04 ───
  {
    title: "Band promove primeiro debate neste domingo. Veja horário e candidatos confirmados",
    source_name: "Gazeta do Povo",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/debate-presidenciaveis-band-horarios-candidatos-confirmados/",
    published_at: "2026-08-23",
    summary: "Caiado, Renan Santos e Augusto Cury confirmaram presença no primeiro debate presidencial, na Band; Lula, Flávio Bolsonaro e Zema recusaram participar.",
    election_name: "Presidencial 2026 - 1º Turno",
    candidate_names: ["Caiado", "Renan Santos", "Augusto Cury", "Lula", "Flávio", "Zema"],
    status: "published",
  },
  {
    title: "TSE concede liminar proibindo Pablo Marçal de usar recursos oficiais para campanha",
    source_name: "TSE",
    source_url: "https://www.tse.jus.br/comunicacao/noticias/2026/Agosto/tse-concede-liminar-proibindo-pablo-marcal-de-usar-recursos-oficiais-para-campanha",
    published_at: "2026-08-20",
    summary: "TSE vetou o acesso de Pablo Marçal ao Fundo Eleitoral e à propaganda gratuita em rádio/TV, atendendo pedido do Ministério Público Eleitoral sobre a validade de sua filiação partidária e sua inelegibilidade.",
    election_name: "Presidencial 2026 - 1º Turno",
    candidate_names: ["Pablo Marçal"],
    status: "published",
  },
  {
    title: "Tarcísio de Freitas lidera disputa pelo governo de SP, diz Gerp",
    source_name: "Poder360",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/tarcisio-de-freitas-lidera-disputa-pelo-governo-de-sp-diz-gerp/",
    published_at: "2026-08-25",
    summary: "Pesquisa Gerp mostra Tarcísio na frente de Haddad tanto no primeiro turno quanto num eventual segundo turno para o governo de São Paulo.",
    election_name: "Governador SP 2026 - 1º Turno",
    candidate_names: ["Tarcísio", "Haddad"],
    status: "published",
  },
  {
    title: "Caiado anuncia Ratinho Júnior para Ministério da Infraestrutura em eventual vitória ao Planalto",
    source_name: "Diário do Grande ABC",
    source_url: "https://www.dgabc.com.br/Noticia/4344577/caiado-anuncia-ratinho-junior-para-ministerio-da-infraestrutura-em-eventual-vitoria-ao-planalto",
    published_at: "2026-09-01",
    summary: "Caiado anunciou que reservaria o Ministério da Infraestrutura para o governador do Paraná, Ratinho Júnior, em caso de vitória na disputa presidencial.",
    election_name: "Presidencial 2026 - 1º Turno",
    candidate_names: ["Caiado", "Ratinho"],
    status: "published",
  },
  {
    title: "O que mostra a nova pesquisa Quaest para presidente",
    source_name: "Gazeta do Povo",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-presidente-setembro-2026/",
    published_at: "2026-09-02",
    summary: "Quaest mostra Lula na frente com 37%, Flávio Bolsonaro em segundo com 30% e Augusto Cury em ascensão, com queda no número de indecisos desde o início da campanha.",
    election_name: "Presidencial 2026 - 1º Turno",
    candidate_names: ["Lula", "Flávio", "Augusto Cury"],
    status: "published",
  },
];

async function main() {
  console.log("📰 ElectioLab — Ingestão Manual de Notícias\n");

  if (PENDING_NEWS.length === 0) {
    console.log("⚠️  Nenhuma notícia na fila. Edite PENDING_NEWS neste script.");
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of PENDING_NEWS) {
    process.stdout.write(`📰 ${item.source_name} ${item.published_at}... `);

    const { data: existing } = await supabase
      .from("news_items")
      .select("id")
      .eq("source_url", item.source_url)
      .maybeSingle();
    if (existing) { console.log("⏭️  já existe"); skipped++; continue; }

    let electionId: string | null = null;
    if (item.election_name) {
      const { data: election } = await supabase
        .from("elections")
        .select("id")
        .eq("name", item.election_name)
        .single();
      if (!election) { console.log("❌ eleição não encontrada"); errors++; continue; }
      electionId = election.id;
    }

    const { data: newItem, error } = await supabase
      .from("news_items")
      .insert({
        title: item.title,
        source_name: item.source_name,
        source_url: item.source_url,
        published_at: item.published_at,
        summary: item.summary ?? null,
        status: item.status ?? "draft",
        created_by: "manual",
      })
      .select("id")
      .single();
    if (error || !newItem) { console.log(`❌ ${error?.message}`); errors++; continue; }

    const links: { news_item_id: string; candidate_id?: string; election_id?: string }[] = [];

    if (item.candidate_names && item.candidate_names.length > 0) {
      if (!electionId) { console.log("❌ candidate_names exige election_name"); errors++; continue; }
      for (const name of item.candidate_names) {
        const { data: candidate } = await supabase
          .from("candidates")
          .select("id")
          .eq("election_id", electionId)
          .ilike("name", name)
          .maybeSingle();
        if (!candidate) { console.log(`\n   ⚠️  candidato não encontrado: ${name}`); continue; }
        links.push({ news_item_id: newItem.id, candidate_id: candidate.id });
      }
    } else if (electionId) {
      links.push({ news_item_id: newItem.id, election_id: electionId });
    }

    if (links.length > 0) {
      await supabase.from("news_item_links").insert(links);
    }

    console.log(`✅ inserida (id: ${newItem.id}, ${links.length} link(s))`);
    inserted++;
  }

  console.log(`\n📋 Resumo: ${inserted} inseridas · ${skipped} duplicadas · ${errors} erros`);
}

main();
