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
  // ─── lote 2 — escândalo Banco Master, verificado via WebSearch/WebFetch em 2026-09-04 ───
  {
    title: "Em cartaz, a caixa-preta",
    source_name: "piauí",
    source_url: "https://piaui.uol.com.br/revista/240/caixa-preta-flavio-bolsonaro-vorcaro-dark-horse/",
    published_at: "2026-09-01",
    summary: "Relatório inédito do Coaf mostra que os repasses de Daniel Vorcaro para o filme Dark Horse, sobre Jair Bolsonaro, foram maiores e mais frequentes do que Flávio Bolsonaro havia admitido publicamente.",
    election_name: "Presidencial 2026 - 1º Turno",
    candidate_names: ["Flávio"],
    status: "published",
  },
  {
    title: "Alvo da PF, Ciro Nogueira era tratado como 'grande amigo' de Vorcaro",
    source_name: "Estado de Minas",
    source_url: "https://www.em.com.br/politica/2026/05/7414101-alvo-da-pf-ciro-nogueira-era-tratado-como-grande-amigo-de-vorcaro.html",
    published_at: "2026-05-07",
    summary: "Mensagens obtidas pela Polícia Federal mostram Daniel Vorcaro se referindo ao senador Ciro Nogueira como 'grande amigo de vida', numa das fases da Operação Compliance Zero que apura favorecimento ao banqueiro do Master.",
    election_name: "Senador Piaui 2026",
    candidate_names: ["Ciro Nogueira"],
    status: "published",
  },
  {
    title: "Entenda como o PT na Bahia vendeu o Credcesta e negócio favoreceu o Master",
    source_name: "Poder360",
    source_url: "https://www.poder360.com.br/poder-justica/entenda-como-o-pt-na-bahia-vendeu-o-credcesta-e-negocio-favoreceu-o-master/",
    published_at: "2026-08-10",
    summary: "Reportagem detalha como a venda do Credcesta, cartão consignado de servidores da Bahia, a um futuro sócio de Daniel Vorcaro durante a gestão de Jaques Wagner na Secretaria de Desenvolvimento Econômico do estado ajudou a alavancar o crescimento do Master.",
    election_name: "Senador Bahia 2026",
    candidate_names: ["Jaques Wagner"],
    status: "published",
  },
  {
    title: "BRB, rombo bilionário e a questão: o que Ibaneis Rocha tem a ver com crise do Banco Master",
    source_name: "Agência Pública",
    source_url: "https://apublica.org/2026/02/brb-como-ibaneis-rocha-esta-ligado-a-crise-do-banco-master/",
    published_at: "2026-02-04",
    summary: "A compra de ativos do Master pelo BRB, banco estatal controlado pelo governo do Distrito Federal sob Ibaneis Rocha, deixou um rombo bilionário nas contas da instituição — hoje sob investigação sobre o papel do ex-governador na negociação.",
    election_name: "Senador Distrito Federal 2026",
    candidate_names: ["Ibaneis Rocha"],
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
