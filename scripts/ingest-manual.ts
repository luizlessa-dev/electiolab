#!/usr/bin/env npx tsx
/**
 * Script de ingestão manual de pesquisas eleitorais.
 *
 * Uso:
 *   npx tsx scripts/ingest-manual.ts
 *
 * Ou com dados inline:
 *   npx tsx scripts/ingest-manual.ts --file polls.json
 *
 * Configurar .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Carregar .env.local
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

/** Mesmo formato canônico UF-NNNNN/AAAA usado por promote-approved-polls.ts (constraint polls_tse_registration_formato). */
function toTseRegistrationFormat(protocolo: string | undefined): string | null {
  if (!protocolo) return null;
  const digits = protocolo.replace(/[^A-Z0-9]/gi, "");
  const m = digits.match(/^([A-Z]{2})(\d{4,5})(\d{4})$/);
  return m ? `${m[1]}-${m[2]}/${m[3]}` : protocolo;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // Service role bypassa RLS para inserções administrativas
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ────────────────────────────────────────────────────
// PESQUISAS PENDENTES DE INGESTÃO
// Adicione novas pesquisas aqui antes de rodar o script
// ────────────────────────────────────────────────────
const PENDING_POLLS: Array<{
  institute_name: string;
  election_name: string;
  publication_date: string;
  fieldwork_start?: string;
  fieldwork_end: string;
  sample_size: number;
  margin_of_error?: number;
  methodology: "presencial" | "telefonica" | "online" | "mista";
  source_url?: string;
  /** Protocolo TSE cru (ex.: "BR07185/2026" ou "BR-07185/2026") — vira polls.tse_registration
   *  no formato canônico UF-NNNNN/AAAA. Sem isso, a pesquisa nunca some de pesqele_missing. */
  tse_protocolo?: string;
  /** 'nacional' (default) ou sigla de UF, quando a pesquisa presidencial tem amostra regional. */
  scope?: string;
  /** 'estimulada' (default, nomes apresentados ao entrevistado) ou 'espontanea' (sem lista de nomes). */
  poll_type?: "estimulada" | "espontanea";
  /** Só pra eleições de 2º turno (round=2) com mais de um adversário hipotético testado na
   *  mesma rodada (ex.: "Lula vs Zema" além de "Lula vs Flavio Bolsonaro"). Sem isso, duas
   *  linhas do mesmo instituto/data/eleição são tratadas como duplicata uma da outra —
   *  cada cenário precisa do próprio scenario_label pra coexistir. recalculate-averages
   *  na verdade deriva o agrupamento do PAR de candidatos em poll_results, não lê esse
   *  campo — mas ele é gravado em polls.scenario_label pra consistência com o resto da base. */
  scenario_label?: string;
  results: { candidate_name: string; percentage: number }[];
}> = [
  // ─── Meio/Ideia · 23-27 mai 2026 · TSE BR-02918/2026 · n=1.500 · telefônica ──
  // Fonte: https://www.brasildefato.com.br/2026/05/28/lula-lidera-todos-os-cenarios-e-abre-cinco-pontos-sobre-flavio-bolsonaro-no-2o-turno-aponta-pesquisa-meioideia/
  {
    institute_name: "Meio/Ideia",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-05-28",
    fieldwork_start: "2026-05-23",
    fieldwork_end: "2026-05-27",
    sample_size: 1500,
    margin_of_error: 2.5,
    methodology: "telefonica",
    source_url: "https://www.brasildefato.com.br/2026/05/28/lula-lidera-todos-os-cenarios-e-abre-cinco-pontos-sobre-flavio-bolsonaro-no-2o-turno-aponta-pesquisa-meioideia/",
    results: [
      { candidate_name: "Lula",            percentage: 38.5 },
      { candidate_name: "Flavio Bolsonaro", percentage: 31.5 },
      { candidate_name: "Caiado",          percentage:  5.5 },
      { candidate_name: "Zema",            percentage:  2.4 },
      { candidate_name: "Renan Santos",    percentage:  2.1 },
    ],
  },
  {
    institute_name: "Meio/Ideia",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-05-28",
    fieldwork_start: "2026-05-23",
    fieldwork_end: "2026-05-27",
    sample_size: 1500,
    margin_of_error: 2.5,
    methodology: "telefonica",
    source_url: "https://www.brasildefato.com.br/2026/05/28/lula-lidera-todos-os-cenarios-e-abre-cinco-pontos-sobre-flavio-bolsonaro-no-2o-turno-aponta-pesquisa-meioideia/",
    results: [
      { candidate_name: "Lula",            percentage: 46.5 },
      { candidate_name: "Flavio Bolsonaro", percentage: 41.4 },
    ],
  },

  // ─── Real Time Big Data · 2-4 mai 2026 ────────────────────────────────────
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-presidente-maio-2026/
  // TSE: BR-03627/2026 · n=2.000 · telefônica · ME: ±2pp
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-05-05",
    fieldwork_start: "2026-05-02",
    fieldwork_end: "2026-05-04",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-presidente-maio-2026/",
    results: [
      { candidate_name: "Lula",            percentage: 40 },
      { candidate_name: "Flavio Bolsonaro", percentage: 34 },
      { candidate_name: "Caiado",          percentage:  5 },
      { candidate_name: "Zema",            percentage:  4 },
      { candidate_name: "Renan Santos",    percentage:  3 },
      { candidate_name: "Augusto Cury",    percentage:  1 },
      { candidate_name: "Aldo Rebelo",     percentage:  1 },
      { candidate_name: "Cabo Daciolo",    percentage:  1 },
    ],
  },

  // ─── Meio/Ideia · 1-5 mai 2026 ────────────────────────────────────────────
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/meio-ideia-presidente-maio-2026/
  // TSE: BR-05356/2026 · n=1.500 · telefônica · ME: ±2,5pp
  {
    institute_name: "Meio/Ideia",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-05-06",
    fieldwork_start: "2026-05-01",
    fieldwork_end: "2026-05-05",
    sample_size: 1500,
    margin_of_error: 2.5,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/meio-ideia-presidente-maio-2026/",
    results: [
      { candidate_name: "Lula",            percentage: 40 },
      { candidate_name: "Flavio Bolsonaro", percentage: 36 },
      { candidate_name: "Caiado",          percentage:  5.6 },
      { candidate_name: "Zema",            percentage:  3 },
      { candidate_name: "Augusto Cury",    percentage:  1.5 },
      { candidate_name: "Renan Santos",    percentage:  1.4 },
      { candidate_name: "Aldo Rebelo",     percentage:  0.8 },
      { candidate_name: "Cabo Daciolo",    percentage:  0.3 },
    ],
  },

  // ─── GOVERNADORES — Tier 2 (estados-chave) ────────────────────────────────

  // PE · Datafolha · 25-27 mai 2026 · TSE PE-07888/2026 · n=1.022 · presencial
  {
    institute_name: "Datafolha",
    election_name: "Governador PE 2026 - 1º Turno",
    publication_date: "2026-05-28",
    fieldwork_start: "2026-05-25",
    fieldwork_end: "2026-05-27",
    sample_size: 1022,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-governador-senador-pernambuco-maio-2026/",
    results: [
      { candidate_name: "Raquel Lyra",  percentage: 48 },
      { candidate_name: "João Campos",  percentage: 43 },
      { candidate_name: "Ivan Moraes",  percentage:  2 },
    ],
  },

  // PR · Paraná Pesquisas · 8-10 mai 2026 · TSE PR-00323/2026 · n=1.500 · presencial
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Governador Parana 2026",
    publication_date: "2026-05-11",
    fieldwork_start: "2026-05-08",
    fieldwork_end: "2026-05-10",
    sample_size: 1500,
    margin_of_error: 2.6,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/parana-pesquisas-governador-parana-maio-2026/",
    results: [
      { candidate_name: "Sergio Moro",    percentage: 42.6 },
      { candidate_name: "Requiao Filho",  percentage: 19.7 },
      { candidate_name: "Rafael Greca",   percentage: 16.3 },
      { candidate_name: "Sandro Alex",    percentage:  8.6 },
    ],
  },

  // RS · Real Time Big Data · 14-16 mai 2026 · TSE RS-02550/2026 · n=1.500 · telefônica
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador RS 2026 - 1º Turno",
    publication_date: "2026-05-17",
    fieldwork_start: "2026-05-14",
    fieldwork_end: "2026-05-16",
    sample_size: 1500,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.cartacapital.com.br/politica/as-intencoes-de-voto-para-o-governo-e-o-senado-no-rs-segundo-nova-pesquisa/",
    results: [
      { candidate_name: "Luciano Zucco",     percentage: 31 },
      { candidate_name: "Juliana Brizola",   percentage: 24 },
      { candidate_name: "Edegar Pretto",     percentage: 19 },
      { candidate_name: "Gabriel Souza",     percentage: 13 },
      { candidate_name: "Covatti Filho",     percentage:  3 },
      { candidate_name: "Marcelo Maranata",  percentage:  1 },
    ],
  },

  // CE · Genial/Quaest · 24-28 abr 2026 · TSE CE-01725/2026 · n=1.002 · presencial
  {
    institute_name: "Genial/Quaest",
    election_name: "Governador CE 2026 - 1º Turno",
    publication_date: "2026-04-30",
    fieldwork_start: "2026-04-24",
    fieldwork_end: "2026-04-28",
    sample_size: 1002,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://diariodonordeste.verdesmares.com.br/pontopoder/pesquisa-quaest-ce-para-o-governo-ciro-tem-41-elmano-tem-32-girao-4-1.3760826",
    results: [
      { candidate_name: "Ciro Gomes",          percentage: 41 },
      { candidate_name: "Elmano de Freitas",   percentage: 32 },
      { candidate_name: "Eduardo Girao",       percentage:  4 },
      { candidate_name: "Jarir",               percentage:  1 },
    ],
  },

  // RJ · Real Time Big Data · 9-10 mar 2026 · TSE RJ-04191/2026 · n=2.000 · telefônica
  // (mais antiga que a Quaest 27/abr já no banco — adiciona densidade histórica)
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador RJ 2026 - 1º Turno",
    publication_date: "2026-03-11",
    fieldwork_start: "2026-03-09",
    fieldwork_end: "2026-03-10",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-rio-de-janeiro-marco-2026/",
    results: [
      { candidate_name: "Eduardo Paes",   percentage: 46 },
      { candidate_name: "Douglas Ruas",   percentage: 13 },
      { candidate_name: "Ítalo Marsili",  percentage:  5 },
      { candidate_name: "Wilson Witzel",  percentage:  5 },
      { candidate_name: "William Siri",   percentage:  3 },
      { candidate_name: "Rafa Luz",       percentage:  2 },
    ],
  },

  // ─── GOVERNADORES — Tier 3 (estados menores) ──────────────────────────────

  // AM · AtlasIntel · 8-14 mai 2026 · TSE AM-09404/2026 · n=1.244 · online
  {
    institute_name: "Atlas Intel",
    election_name: "Governador Amazonas 2026",
    publication_date: "2026-05-15",
    fieldwork_start: "2026-05-08",
    fieldwork_end: "2026-05-14",
    sample_size: 1244,
    margin_of_error: 3.0,
    methodology: "online",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-governador-senador-amazonas-maio-2026/",
    results: [
      { candidate_name: "Maria do Carmo Seffair", percentage: 38.4 },
      { candidate_name: "Omar Aziz",              percentage: 27.5 },
      { candidate_name: "Roberto Cidade",         percentage: 13.7 },
      { candidate_name: "David Almeida",          percentage: 11.8 },
    ],
  },

  // MS · Real Time Big Data · 9-11 mai 2026 · TSE MS-06412/2026 · n=1.600 · telefônica
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Mato Grosso do Sul 2026",
    publication_date: "2026-05-12",
    fieldwork_start: "2026-05-09",
    fieldwork_end: "2026-05-11",
    sample_size: 1600,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-mato-grosso-do-sul-maio-2026/",
    results: [
      { candidate_name: "Eduardo Riedel", percentage: 43 },
      { candidate_name: "Fabio Trad",     percentage: 21 },
      { candidate_name: "Catan",          percentage: 11 },
    ],
  },

  // ─── Atlas Intel · Latam Pulse · 13-18 mai 2026 ───────────────────────────
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-presidente-maio-2026/
  // TSE: BR-06939/2026 · n=5.032 · online · ME: ±1pp
  {
    institute_name: "Atlas Intel",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-05-19",
    fieldwork_start: "2026-05-13",
    fieldwork_end: "2026-05-18",
    sample_size: 5032,
    margin_of_error: 1.0,
    methodology: "online",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-presidente-maio-2026/",
    results: [
      { candidate_name: "Lula",            percentage: 47.0 },
      { candidate_name: "Flavio Bolsonaro", percentage: 34.3 },
      { candidate_name: "Renan Santos",     percentage:  6.9 },
      { candidate_name: "Zema",             percentage:  5.2 },
      { candidate_name: "Caiado",           percentage:  2.7 },
    ],
  },
  {
    institute_name: "Atlas Intel",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-05-19",
    fieldwork_start: "2026-05-13",
    fieldwork_end: "2026-05-18",
    sample_size: 5032,
    margin_of_error: 1.0,
    methodology: "online",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-presidente-maio-2026/",
    results: [
      { candidate_name: "Lula",            percentage: 48.9 },
      { candidate_name: "Flavio Bolsonaro", percentage: 41.8 },
    ],
  },

  // ─── Gerp · 18-21 mai 2026 ────────────────────────────────────────────────
  // Fonte: Gazeta do Povo / Wikipedia · n=2.000 · presencial · ME: ±2.2pp
  {
    institute_name: "Gerp",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-05-21",
    fieldwork_start: "2026-05-18",
    fieldwork_end: "2026-05-21",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/gerp-presidente-maio-2026/",
    results: [
      { candidate_name: "Lula",            percentage: 38.0 },
      { candidate_name: "Flavio Bolsonaro", percentage: 38.0 },
      { candidate_name: "Zema",             percentage:  3.0 },
      { candidate_name: "Caiado",           percentage:  2.0 },
    ],
  },

  // ─── Datafolha · 20-21 mai 2026 ───────────────────────────────────────────
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-presidente-maio-2026-2/
  // TSE: BR-07489/2026 · n=2.004 · presencial · ME: ±2pp
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-05-22",
    fieldwork_start: "2026-05-20",
    fieldwork_end: "2026-05-21",
    sample_size: 2004,
    margin_of_error: 2.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-presidente-maio-2026-2/",
    results: [
      { candidate_name: "Lula",            percentage: 40 },
      { candidate_name: "Flavio Bolsonaro", percentage: 31 },
      { candidate_name: "Caiado",          percentage:  4 },
      { candidate_name: "Zema",            percentage:  3 },
      { candidate_name: "Renan Santos",    percentage:  3 },
      { candidate_name: "Samara Martins",  percentage:  3 },
      { candidate_name: "Augusto Cury",    percentage:  2 },
      { candidate_name: "Aldo Rebelo",     percentage:  1 },
      { candidate_name: "Cabo Daciolo",    percentage:  1 },
    ],
  },

  // ─── Nexus/BTG Pactual · 22-24 mai 2026 ──────────────────────────────────
  // Fonte: Wikipedia / Gazeta do Povo · n=2.045 · telefônica · ME: ±2pp
  {
    institute_name: "Nexus",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-05-25",
    fieldwork_start: "2026-05-22",
    fieldwork_end: "2026-05-24",
    sample_size: 2045,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/nexus-btg-pactual-presidente-maio-2026/",
    results: [
      { candidate_name: "Lula",            percentage: 41 },
      { candidate_name: "Flavio Bolsonaro", percentage: 35 },
      { candidate_name: "Caiado",          percentage:  5 },
      { candidate_name: "Zema",            percentage:  4 },
    ],
  },

  // ─── PoderData/Aya · 25-28 mai 2026 ──────────────────────────────────────
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/poder-data-presidente-maio-2026/
  // TSE: BR-04882/2026 · n=2.400 · telefônica · ME: ±2pp
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-05-29",
    fieldwork_start: "2026-05-25",
    fieldwork_end: "2026-05-28",
    sample_size: 2400,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/poder-data-presidente-maio-2026/",
    results: [
      { candidate_name: "Lula",            percentage: 40 },
      { candidate_name: "Flavio Bolsonaro", percentage: 35 },
      { candidate_name: "Zema",            percentage:  4 },
      { candidate_name: "Renan Santos",    percentage:  3 },
      { candidate_name: "Augusto Cury",    percentage:  3 },
      { candidate_name: "Caiado",          percentage:  3 },
    ],
  },
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-05-29",
    fieldwork_start: "2026-05-25",
    fieldwork_end: "2026-05-28",
    sample_size: 2400,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/poder-data-presidente-maio-2026/",
    results: [
      { candidate_name: "Lula",            percentage: 46 },
      { candidate_name: "Flavio Bolsonaro", percentage: 42 },
    ],
  },

  // ─── Paraná Pesquisas · Governador SP · 18-20 mai 2026 ───────────────────
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/parana-pesquisas-governador-sao-paulo-maio-2026/
  // TSE: SP-02706/2026 · n=1.640 · presencial · ME: ±2,5pp
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Governador SP 2026 - 1º Turno",
    publication_date: "2026-05-21",
    fieldwork_start: "2026-05-18",
    fieldwork_end: "2026-05-20",
    sample_size: 1640,
    margin_of_error: 2.5,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/parana-pesquisas-governador-sao-paulo-maio-2026/",
    results: [
      { candidate_name: "Tarcísio",     percentage: 47.3 },
      { candidate_name: "Haddad",       percentage: 33.5 },
      { candidate_name: "Paulo Serra",  percentage:  4.3 },
      { candidate_name: "Kim Kataguiri", percentage: 3.4 },
    ],
  },

  // ─── Real Time Big Data · Governador MG · pub 21 mai 2026 ─────────────────
  // Fonte: moonbh.com.br / Gazeta do Povo · n=1.600 · ME: ±2pp
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador MG 2026 - 1º Turno",
    publication_date: "2026-05-21",
    fieldwork_start: "2026-05-19",
    fieldwork_end: "2026-05-20",
    sample_size: 1600,
    margin_of_error: 2.0,
    methodology: "presencial",
    source_url: "https://moonbh.com.br/politica-e-poder/2026/05/21/pesquisa-governo-minas-cleitinho-pacheco-kalil-simoes-real-time-big-data/",
    results: [
      { candidate_name: "Cleitinho",           percentage: 35 },
      { candidate_name: "Rodrigo Pacheco",      percentage: 15 },
      { candidate_name: "Alexandre Kalil",      percentage: 14 },
      { candidate_name: "Mateus Simões",         percentage: 11 },
      { candidate_name: "Gabriel Azevedo",       percentage:  6 },
      { candidate_name: "Maria da Consolação",   percentage:  3 },
      { candidate_name: "Ben Mendes",            percentage:  2 },
      { candidate_name: "Flávio Roscoe",         percentage:  2 },
    ],
  },

  // ─── Arquivo: polls de abril/2026 (já inseridos — serão ignorados) ────────
  {
    institute_name: "Futura Inteligência",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-04-14",
    fieldwork_start: "2026-04-07",
    fieldwork_end: "2026-04-11",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "mista",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/futura-inteligencia-presidente-abril-2026/",
    results: [
      { candidate_name: "Lula", percentage: 39.8 },
      { candidate_name: "Flavio Bolsonaro", percentage: 37.3 },
      { candidate_name: "Caiado", percentage: 4.8 },
      { candidate_name: "Zema", percentage: 2.9 },
      { candidate_name: "Renan Santos", percentage: 1.4 },
      { candidate_name: "Aldo Rebelo", percentage: 0.3 },
    ],
  },
  {
    institute_name: "MDA/CNT",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-04-12",
    fieldwork_start: "2026-04-08",
    fieldwork_end: "2026-04-10",
    sample_size: 2002,
    margin_of_error: 2.2,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poder-pesquisas/lula-lidera-todos-os-cenarios-de-1o-e-2o-turnos-diz-pesquisa-cnt-mda/",
    results: [
      { candidate_name: "Lula", percentage: 39.2 },
      { candidate_name: "Flavio Bolsonaro", percentage: 30.2 },
      { candidate_name: "Caiado", percentage: 4.6 },
      { candidate_name: "Zema", percentage: 3.3 },
      { candidate_name: "Renan Santos", percentage: 1.5 },
    ],
  },

  // ─── 2022 – 2º Turno (Lula x Bolsonaro) ──────────
  {
    institute_name: "Atlas Intel",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-15",
    fieldwork_start: "2022-10-13",
    fieldwork_end: "2022-10-14",
    sample_size: 5000,
    margin_of_error: 1.4,
    methodology: "online",
    results: [
      { candidate_name: "Lula", percentage: 52.4 },
      { candidate_name: "Bolsonaro", percentage: 47.6 },
    ],
  },
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-13",
    fieldwork_start: "2022-10-12",
    fieldwork_end: "2022-10-13",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "telefonica",
    results: [
      { candidate_name: "Lula", percentage: 52 },
      { candidate_name: "Bolsonaro", percentage: 48 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-16",
    fieldwork_start: "2022-10-14",
    fieldwork_end: "2022-10-15",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 53 },
      { candidate_name: "Bolsonaro", percentage: 47 },
    ],
  },
  {
    institute_name: "Ipec",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-19",
    fieldwork_start: "2022-10-17",
    fieldwork_end: "2022-10-18",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 54 },
      { candidate_name: "Bolsonaro", percentage: 46 },
    ],
  },
  {
    institute_name: "Ipespe",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-19",
    fieldwork_start: "2022-10-17",
    fieldwork_end: "2022-10-18",
    sample_size: 1500,
    margin_of_error: 2.5,
    methodology: "telefonica",
    results: [
      { candidate_name: "Lula", percentage: 53 },
      { candidate_name: "Bolsonaro", percentage: 47 },
    ],
  },
  {
    institute_name: "MDA/CNT",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-18",
    fieldwork_start: "2022-10-17",
    fieldwork_end: "2022-10-17",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "telefonica",
    results: [
      { candidate_name: "Lula", percentage: 53.5 },
      { candidate_name: "Bolsonaro", percentage: 46.5 },
    ],
  },
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-19",
    fieldwork_start: "2022-10-16",
    fieldwork_end: "2022-10-18",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 47 },
      { candidate_name: "Bolsonaro", percentage: 42 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-25",
    fieldwork_start: "2022-10-22",
    fieldwork_end: "2022-10-24",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 53 },
      { candidate_name: "Bolsonaro", percentage: 47 },
    ],
  },
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-28",
    fieldwork_start: "2022-10-26",
    fieldwork_end: "2022-10-28",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 52 },
      { candidate_name: "Bolsonaro", percentage: 48 },
    ],
  },
  {
    institute_name: "MDA/CNT",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-29",
    fieldwork_start: "2022-10-28",
    fieldwork_end: "2022-10-29",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "telefonica",
    results: [
      { candidate_name: "Lula", percentage: 51.1 },
      { candidate_name: "Bolsonaro", percentage: 48.9 },
    ],
  },
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Presidencial 2022 - 2º Turno",
    publication_date: "2022-10-29",
    fieldwork_start: "2022-10-27",
    fieldwork_end: "2022-10-29",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "presencial",
    results: [
      { candidate_name: "Lula", percentage: 50.4 },
      { candidate_name: "Bolsonaro", percentage: 49.6 },
    ],
  },

  // ─── Curadoria 01/09/2026 — via fila pesqele_missing (Tier 1 Presidencial) ──
  // Achado por busca real na web, protocolo TSE confirmado por fetch da fonte primária.
  // Metodologia (presencial/telefônica/online) inferida por precedente do instituto
  // quando a fonte não confirmava explicitamente — revisar se o instituto divulgar retratação.

  // Nexus/BTG · 28-30 ago 2026 · TSE BR-08900/2026 · n=2.005
  // Fonte: https://www.nexus.fsb.com.br/estudos-divulgados/pesquisa-btg-nexus-de-intencao-de-votos-para-presidente-do-brasil-31-de-agosto-de-2026/
  {
    institute_name: "Nexus",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-31",
    fieldwork_start: "2026-08-28",
    fieldwork_end: "2026-08-30",
    sample_size: 2005,
    methodology: "telefonica",
    source_url: "https://www.nexus.fsb.com.br/estudos-divulgados/pesquisa-btg-nexus-de-intencao-de-votos-para-presidente-do-brasil-31-de-agosto-de-2026/",
    tse_protocolo: "BR089002026",
    scope: "nacional",
    results: [
      { candidate_name: "Lula",         percentage: 39 },
      { candidate_name: "Flávio",       percentage: 33 },
      { candidate_name: "Augusto Cury", percentage: 11 },
      { candidate_name: "Caiado",       percentage:  5 },
      { candidate_name: "Renan",        percentage:  3 },
      { candidate_name: "Zema",         percentage:  1 },
    ],
  },

  // Atlas Intel · 25-30 ago 2026 · TSE BR-07972/2026 · n=5.014 (amostra grande)
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-presidente-agosto-2026/
  {
    institute_name: "Atlas Intel",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-31",
    fieldwork_start: "2026-08-25",
    fieldwork_end: "2026-08-30",
    sample_size: 5014,
    methodology: "online",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-presidente-agosto-2026/",
    tse_protocolo: "BR079722026",
    scope: "nacional",
    results: [
      { candidate_name: "Lula",                       percentage: 43.4 },
      { candidate_name: "Flávio",                      percentage: 33.7 },
      { candidate_name: "Augusto Cury",                percentage:  7.8 },
      { candidate_name: "Renan",                       percentage:  7.6 },
      { candidate_name: "Caiado",                      percentage:  3.3 },
      { candidate_name: "Pablo Marçal",                percentage:  1.9 },
      { candidate_name: "Zema",                        percentage:  1.0 },
      { candidate_name: "Samara Martins",               percentage:  0.9 },
      { candidate_name: "Rui Costa Pimenta",            percentage:  0.1 },
      { candidate_name: "Veterinário Wilson Grassi",    percentage:  0.1 },
    ],
  },

  // Vox Brasil · 25-27 ago 2026 · TSE BR-05519/2026 · n=2.100 · ME: ±2,15pp
  // Fonte (release oficial em PDF): https://static.poder360.com.br/uploads/2026/08/RELATORIO-VOX-BRASIL-NACIONAL-6-29-08-2026-1.pdf
  // Metodologia não confirmada na fonte — revisar antes de publicar se precisar do dado exato.
  {
    institute_name: "Vox Brasil Pesquisas",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-29",
    fieldwork_start: "2026-08-25",
    fieldwork_end: "2026-08-27",
    sample_size: 2100,
    margin_of_error: 2.15,
    methodology: "presencial",
    source_url: "https://static.poder360.com.br/uploads/2026/08/RELATORIO-VOX-BRASIL-NACIONAL-6-29-08-2026-1.pdf",
    tse_protocolo: "BR055192026",
    scope: "nacional",
    results: [
      { candidate_name: "Lula",         percentage: 37.1 },
      { candidate_name: "Flávio",       percentage: 34.8 },
      { candidate_name: "Caiado",       percentage:  5.0 },
      { candidate_name: "Renan",        percentage:  3.3 },
      { candidate_name: "Zema",         percentage:  2.8 },
      { candidate_name: "Augusto Cury", percentage:  2.6 },
      { candidate_name: "Pablo Marçal", percentage:  2.0 },
      { candidate_name: "Clariana Barao", percentage: 0.8 },
      { candidate_name: "Edmilson Costa", percentage: 0.5 },
    ],
  },

  // PoderData/Aya · 23-26 ago 2026 · TSE BR-04974/2026 · n=2.400 · ME: ±2pp
  // Fonte: https://www.poder360.com.br/poderdata/poderdata-aya-lula-tem-38-contra-35-de-flavio-no-1o-turno/
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 2400,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poderdata/poderdata-aya-lula-tem-38-contra-35-de-flavio-no-1o-turno/",
    tse_protocolo: "BR049742026",
    scope: "nacional",
    results: [
      { candidate_name: "Lula",         percentage: 38 },
      { candidate_name: "Flávio",       percentage: 35 },
      { candidate_name: "Caiado",       percentage:  4 },
      { candidate_name: "Renan",        percentage:  4 },
      { candidate_name: "Augusto Cury", percentage:  4 },
      { candidate_name: "Pablo Marçal", percentage:  3 },
      { candidate_name: "Zema",         percentage:  2 },
      { candidate_name: "Hertz Dias",   percentage:  2 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 2 (Tier 1, achados nacionais confirmados) ──

  // Real Time Big Data · 27-31 ago 2026 · TSE BR-03490/2026 · n=2.000
  // Fonte: https://jovempan.com.br/politica/realtime-big-data-lula-tem-38-dos-votos-totais-no-1o-turno-e-flavio-marca-30/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-09-01",
    fieldwork_start: "2026-08-27",
    fieldwork_end: "2026-08-31",
    sample_size: 2000,
    methodology: "telefonica",
    source_url: "https://jovempan.com.br/politica/realtime-big-data-lula-tem-38-dos-votos-totais-no-1o-turno-e-flavio-marca-30/",
    tse_protocolo: "BR034902026",
    scope: "nacional",
    results: [
      { candidate_name: "Lula",         percentage: 38 },
      { candidate_name: "Flávio",       percentage: 30 },
      { candidate_name: "Augusto Cury", percentage: 11 },
      { candidate_name: "Renan",        percentage:  7 },
      { candidate_name: "Caiado",       percentage:  4 },
      { candidate_name: "Zema",         percentage:  2 },
    ],
  },

  // GERP Mercadologia · 21-25 ago 2026 (protocolo confere; campo pedido "23/08" era só a data central) · TSE BR-03547/2026 · n=2.400 · contratante AESP
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/gerp-presidente-agosto-2026-2/
  {
    institute_name: "GERP",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-25",
    sample_size: 2400,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/gerp-presidente-agosto-2026-2/",
    tse_protocolo: "BR035472026",
    scope: "nacional",
    results: [
      { candidate_name: "Flávio",       percentage: 38 },
      { candidate_name: "Lula",         percentage: 37 },
      { candidate_name: "Pablo Marçal", percentage:  4 },
      { candidate_name: "Renan",        percentage:  3 },
      { candidate_name: "Caiado",       percentage:  3 },
      { candidate_name: "Augusto Cury", percentage:  1 },
      { candidate_name: "Zema",         percentage:  1 },
    ],
  },

  // Nexus/BTG · 21-23 ago 2026 · TSE BR-09028/2026 · n=2.006 · 11ª rodada BTG/Nexus
  // Fonte: https://www.nexus.fsb.com.br/estudos-divulgados/pesquisa-btg-nexus-de-intencao-de-votos-para-presidente-do-brasil-24-de-agosto-de-2026/
  {
    institute_name: "Nexus",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-23",
    sample_size: 2006,
    methodology: "telefonica",
    source_url: "https://www.nexus.fsb.com.br/estudos-divulgados/pesquisa-btg-nexus-de-intencao-de-votos-para-presidente-do-brasil-24-de-agosto-de-2026/",
    tse_protocolo: "BR090282026",
    scope: "nacional",
    results: [
      { candidate_name: "Lula",   percentage: 41 },
      { candidate_name: "Flávio", percentage: 37 },
      { candidate_name: "Caiado", percentage:  5 },
      { candidate_name: "Renan",  percentage:  3 },
      { candidate_name: "Zema",   percentage:  3 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 3 (Tier 1 "Presidencial" com recorte estadual) ──
  // Instituto pergunta "presidente", mas a amostra é só do eleitorado de uma UF —
  // por isso scope=UF em vez de 'nacional' (não entram na média presidencial nacional).

  // Datafolha · 18-19 ago 2026 (campo real; TSE registrou "encerrado 21/08") · TSE BR-07185/2026 · n=1.610 · recorte SP
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-presidente-agosto-26-sp-mg-rj-pe-df/
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-22",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-19",
    sample_size: 1610,
    methodology: "presencial",
    scope: "SP",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-presidente-agosto-26-sp-mg-rj-pe-df/",
    tse_protocolo: "BR071852026",
    results: [
      { candidate_name: "Flávio",                    percentage: 35 },
      { candidate_name: "Lula",                       percentage: 34 },
      { candidate_name: "Renan",                       percentage:  5 },
      { candidate_name: "Pablo Marçal",                percentage:  4 },
      { candidate_name: "Zema",                        percentage:  3 },
      { candidate_name: "Caiado",                      percentage:  3 },
      { candidate_name: "Augusto Cury",                percentage:  3 },
      { candidate_name: "Samara Martins",               percentage:  2 },
      { candidate_name: "Edmilson Costa",               percentage:  1 },
      { candidate_name: "Veterinário Wilson Grassi",    percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE BR-09818/2026 · n=1.506 · recorte MG
  // Fonte: https://www.otempo.com.br/eleicoes/2026/pesquisas/2026/8/25/lula-e-flavio-tem-empate-tecnico-em-sao-paulo-minas-e-rio-os-tres-maiores-colegios-do-brasil
  // Nota: a matéria só dá % exato pros 2 primeiros — 3º/4º lugar aparecem só como ordem, sem número.
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1506,
    methodology: "presencial",
    scope: "MG",
    source_url: "https://www.otempo.com.br/eleicoes/2026/pesquisas/2026/8/25/lula-e-flavio-tem-empate-tecnico-em-sao-paulo-minas-e-rio-os-tres-maiores-colegios-do-brasil",
    tse_protocolo: "BR098182026",
    results: [
      { candidate_name: "Flávio", percentage: 31 },
      { candidate_name: "Lula",   percentage: 30 },
    ],
  },

  // Real Time Big Data · 24-27 ago 2026 · TSE BR-07171/2026 · n=1.600 · recorte PR
  // Fonte: https://exame.com/eleicoes/pesquisa-real-time-big-data-flavio-bolsonaro-tem-44-e-lula-30-no-1o-turno-no-parana/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-27",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PR",
    source_url: "https://exame.com/eleicoes/pesquisa-real-time-big-data-flavio-bolsonaro-tem-44-e-lula-30-no-1o-turno-no-parana/",
    tse_protocolo: "BR071712026",
    results: [
      { candidate_name: "Flávio",       percentage: 44 },
      { candidate_name: "Lula",         percentage: 30 },
      { candidate_name: "Renan",        percentage:  4 },
      { candidate_name: "Pablo Marçal", percentage:  4 },
      { candidate_name: "Caiado",       percentage:  4 },
      { candidate_name: "Zema",         percentage:  2 },
      { candidate_name: "Augusto Cury", percentage:  1 },
    ],
  },

  // Real Time Big Data · 22-26 ago 2026 · TSE BR-03147/2026 · n=2.000 · recorte MG
  // Fonte: https://exame.com/brasil/real-time-big-data-lula-tem-39-e-flavio-bolsonaro-34-no-1o-turno-em-minas-gerais/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-22",
    fieldwork_end: "2026-08-26",
    sample_size: 2000,
    methodology: "telefonica",
    scope: "MG",
    source_url: "https://exame.com/brasil/real-time-big-data-lula-tem-39-e-flavio-bolsonaro-34-no-1o-turno-em-minas-gerais/",
    tse_protocolo: "BR031472026",
    results: [
      { candidate_name: "Lula",         percentage: 39 },
      { candidate_name: "Flávio",       percentage: 34 },
      { candidate_name: "Zema",         percentage:  9 },
      { candidate_name: "Renan",        percentage:  5 },
      { candidate_name: "Pablo Marçal", percentage:  4 },
      { candidate_name: "Caiado",       percentage:  2 },
      { candidate_name: "Augusto Cury", percentage:  2 },
    ],
  },

  // Real Time Big Data · 22-26 ago 2026 · TSE BR-03706/2026 · n=1.600 · recorte ES
  // Fonte: https://exame.com/brasil/real-time-big-data-flavio-bolsonaro-e-lula-empatam-no-1o-turno-no-espirito-santo/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-22",
    fieldwork_end: "2026-08-26",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "ES",
    source_url: "https://exame.com/brasil/real-time-big-data-flavio-bolsonaro-e-lula-empatam-no-1o-turno-no-espirito-santo/",
    tse_protocolo: "BR037062026",
    results: [
      { candidate_name: "Flávio",       percentage: 35 },
      { candidate_name: "Lula",         percentage: 34 },
      { candidate_name: "Renan",        percentage:  5 },
      { candidate_name: "Pablo Marçal", percentage:  4 },
      { candidate_name: "Zema",         percentage:  4 },
      { candidate_name: "Caiado",       percentage:  2 },
      { candidate_name: "Augusto Cury", percentage:  2 },
    ],
  },

  // Real Time Big Data · 21-25 ago 2026 · TSE BR-09140/2026 · n=1.600 · recorte AM
  // Fonte: https://www.bra1.com.br/politica/id-684602/lula_tem_40__e_bolsonaro_39__no_amazonas__aponta_pesquisa_real_time
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-25",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "AM",
    source_url: "https://www.bra1.com.br/politica/id-684602/lula_tem_40__e_bolsonaro_39__no_amazonas__aponta_pesquisa_real_time",
    tse_protocolo: "BR091402026",
    results: [
      { candidate_name: "Lula",         percentage: 40 },
      { candidate_name: "Flávio",       percentage: 39 },
      { candidate_name: "Renan",        percentage:  5 },
      { candidate_name: "Pablo Marçal", percentage:  5 },
      { candidate_name: "Caiado",       percentage:  3 },
      { candidate_name: "Zema",         percentage:  1 },
      { candidate_name: "Augusto Cury", percentage:  1 },
    ],
  },

  // Real Time Big Data · 20-24 ago 2026 · TSE BR-02823/2026 · n=1.600 · recorte RS
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/real-time-big-data-flavio-tem-42-e-lula-39-no-1o-turno-no-rs/
  // Nota: matéria também cita 2º turno (Flávio "51-52%" x Lula 42%) mas só em faixa, sem número exato — não inserido pra não estimar.
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-24",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "RS",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/real-time-big-data-flavio-tem-42-e-lula-39-no-1o-turno-no-rs/",
    tse_protocolo: "BR028232026",
    results: [
      { candidate_name: "Flávio", percentage: 42 },
      { candidate_name: "Lula",   percentage: 39 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 4 (Instituto Veritá, qualidade contestada) ──
  // Veritá teve pesquisas suspensas pela Justiça Eleitoral em 2026 por vício
  // metodológico — instituto já existe no catálogo com reliability_score baixo
  // (0.65). Curamos mesmo assim; o flag de reputação já filtra a exibição.
  // Nota de cautela do pesquisador: um resumo alternativo (não citado, sem
  // protocolo) circulou com 1º turno "Lula 41,0% x Flávio 40,9%" — divergente do
  // usado abaixo. Usamos os números da fonte que cita o protocolo TSE explicitamente
  // (CNN Brasil). Revisar se aparecer uma segunda fonte que contradiga.

  // Instituto Veritá · 16-20 ago 2026 · TSE BR-04006/2026 · n=3.840 · ME: ±2pp
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/verita-lula-perde-para-flavio-no-2o-turno-com-marcal-no-pleito-ha-empate/
  {
    institute_name: "Instituto Veritá",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-21",
    fieldwork_start: "2026-08-16",
    fieldwork_end: "2026-08-20",
    sample_size: 3840,
    margin_of_error: 2.0,
    methodology: "telefonica",
    scope: "nacional",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/verita-lula-perde-para-flavio-no-2o-turno-com-marcal-no-pleito-ha-empate/",
    tse_protocolo: "BR040062026",
    results: [
      { candidate_name: "Lula",           percentage: 39.3 },
      { candidate_name: "Flávio",         percentage: 39.1 },
      { candidate_name: "Pablo Marçal",   percentage:  5.2 },
      { candidate_name: "Renan",          percentage:  3.8 },
      { candidate_name: "Caiado",         percentage:  3.3 },
      { candidate_name: "Augusto Cury",   percentage:  2.2 },
      { candidate_name: "Zema",           percentage:  1.3 },
      { candidate_name: "Clariana Barao", percentage:  0.8 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 5 (Tier 2, Governador) ──

  // Real Time Big Data · 24-27 ago 2026 · TSE GO-00954/2026 · n=1.600
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/vilela-lidera-todos-os-cenarios-de-1o-e-2o-turno-em-goias/
  // Nota: o texto corrido do Poder360 cita "GO-08492/2026" (provável erro de digitação);
  // o agregador depoisdas17.com.br cataloga a mesma pesquisa (mesmo instituto/campo/%) com
  // protocolo GO-00954/2026, que é o que bate com o registro pedido — usado abaixo.
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador GO 2026 - 1º Turno",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-27",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/vilela-lidera-todos-os-cenarios-de-1o-e-2o-turno-em-goias/",
    tse_protocolo: "GO009542026",
    results: [
      { candidate_name: "Daniel Vilela",   percentage: 45 },
      { candidate_name: "Marconi Perillo", percentage: 22 },
      { candidate_name: "Wilder Morais",   percentage: 17 },
      { candidate_name: "Luis Cesar Bueno", percentage: 6 },
    ],
  },

  // Real Time Big Data · 24-27 ago 2026 · TSE PR-07845/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-parana-agosto-2026-2/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Parana 2026",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-27",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-parana-agosto-2026-2/",
    tse_protocolo: "PR078452026",
    results: [
      { candidate_name: "Sergio Moro",     percentage: 35 },
      { candidate_name: "Sandro Alex",     percentage: 23 },
      { candidate_name: "Requiao Filho",   percentage: 20 },
      { candidate_name: "Luiz Franca",     percentage:  2 },
    ],
  },

  // Real Time Big Data · 22-26 ago 2026 · TSE MG-07972/2026 · n=2.000
  // Fonte: https://noticias.uol.com.br/eleicoes/2026/08/27/realtime-bigdata-mg-governo-e-senado-agosto.ghtm
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador MG 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-22",
    fieldwork_end: "2026-08-26",
    sample_size: 2000,
    methodology: "telefonica",
    source_url: "https://noticias.uol.com.br/eleicoes/2026/08/27/realtime-bigdata-mg-governo-e-senado-agosto.ghtm",
    tse_protocolo: "MG079722026",
    results: [
      { candidate_name: "Cleitinho",        percentage: 33 },
      { candidate_name: "Patrus Ananias",    percentage: 15 },
      { candidate_name: "Alexandre Kalil",   percentage: 13 },
      { candidate_name: "Mateus Simões",     percentage: 11 },
      { candidate_name: "Gabriel Azevedo",   percentage:  7 },
      { candidate_name: "Flávio Roscoe",     percentage:  5 },
      { candidate_name: "Ben Mendes",        percentage:  3 },
      { candidate_name: "Indira Xavier",     percentage:  1 },
    ],
  },

  // Vetor/Arrow · 24-25 ago 2026 · TSE RJ-06400/2026 · n=14.277 · pesquisa ESPONTÂNEA (sem lista de nomes)
  // Fonte: Instagram @agendadopoder (rodada divulgada ~28/08/2026) — fonte menos formal que o
  // habitual (não é matéria de imprensa tradicional), mas cita o protocolo TSE explicitamente.
  {
    institute_name: "Vetor/Arrow",
    election_name: "Governador RJ 2026 - 1º Turno",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-25",
    sample_size: 14277,
    methodology: "telefonica",
    poll_type: "espontanea",
    source_url: "https://www.instagram.com/p/DcmNrGLJPBd/",
    tse_protocolo: "RJ064002026",
    results: [
      { candidate_name: "Eduardo Paes",       percentage: 25.2 },
      { candidate_name: "Douglas Ruas",       percentage:  8.4 },
      { candidate_name: "Anthony Garotinho",  percentage:  6.1 },
    ],
  },

  // Real Time Big Data · 6-10 ago 2026 · TSE BA-00277/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-bahia-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador BA 2026 - 1º Turno",
    publication_date: "2026-08-11",
    fieldwork_start: "2026-08-06",
    fieldwork_end: "2026-08-10",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-bahia-agosto-2026/",
    tse_protocolo: "BA002772026",
    results: [
      { candidate_name: "ACM Neto",          percentage: 44 },
      { candidate_name: "Jeronimo Rodrigues", percentage: 42 },
      { candidate_name: "Ronaldo Mansur",    percentage:  2 },
      { candidate_name: "José Estevão",      percentage:  1 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 6 (Tier 2, Governador) ──

  // Quaest · 21-24 ago 2026 · TSE DF-06256/2026 · n=1.104
  // Fonte: https://g1.globo.com/df/distrito-federal/eleicoes/2026/noticia/2026/08/25/quaest-df-governador-25-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Governador Distrito Federal 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1104,
    methodology: "presencial",
    source_url: "https://g1.globo.com/df/distrito-federal/eleicoes/2026/noticia/2026/08/25/quaest-df-governador-25-agosto.ghtml",
    tse_protocolo: "DF062562026",
    results: [
      { candidate_name: "Celina Leao",     percentage: 34 },
      { candidate_name: "Arruda",          percentage: 20 },
      { candidate_name: "Leandro Grass",   percentage: 13 },
      { candidate_name: "Ricardo Cappelli", percentage:  3 },
      { candidate_name: "Paula Belmonte",  percentage:  3 },
      { candidate_name: "Kiko Caputo",     percentage:  2 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE MG-04060/2026 · n=1.506
  // Fonte: https://www.cartacapital.com.br/politica/cleitinho-lidera-disputa-pelo-governo-de-minas-gerais-diz-pesquisa-quaest/
  {
    institute_name: "Quaest",
    election_name: "Governador MG 2026 - 1º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1506,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.cartacapital.com.br/politica/cleitinho-lidera-disputa-pelo-governo-de-minas-gerais-diz-pesquisa-quaest/",
    tse_protocolo: "MG040602026",
    results: [
      { candidate_name: "Cleitinho",        percentage: 29 },
      { candidate_name: "Patrus Ananias",    percentage: 11 },
      { candidate_name: "Alexandre Kalil",   percentage: 10 },
      { candidate_name: "Mateus Simões",     percentage:  7 },
      { candidate_name: "Gabriel Azevedo",   percentage:  5 },
      { candidate_name: "Flávio Roscoe",     percentage:  3 },
      { candidate_name: "Ben Mendes",        percentage:  2 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE RJ-08748/2026 · n=1.302
  // Fonte: https://g1.globo.com/rj/rio-de-janeiro/eleicoes/2026/noticia/2026/08/25/quaest-rj-governador-25-08.ghtml
  {
    institute_name: "Quaest",
    election_name: "Governador RJ 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1302,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://g1.globo.com/rj/rio-de-janeiro/eleicoes/2026/noticia/2026/08/25/quaest-rj-governador-25-08.ghtml",
    tse_protocolo: "RJ087482026",
    results: [
      { candidate_name: "Eduardo Paes",      percentage: 37 },
      { candidate_name: "Douglas Ruas",      percentage: 14 },
      { candidate_name: "Anthony Garotinho", percentage:  7 },
      { candidate_name: "William Siri",      percentage:  3 },
      { candidate_name: "Coronel Busnello",  percentage:  1 },
      { candidate_name: "Cyro Garcia",       percentage:  1 },
      { candidate_name: "Juliete Pantoja",   percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE SP-06946/2026 · n=1.800
  // Fonte: https://g1.globo.com/sp/sao-paulo/eleicoes/2026/noticia/2026/08/25/quaest-em-sp-tarcisio-40percent-haddad-27percent.ghtml
  {
    institute_name: "Quaest",
    election_name: "Governador SP 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1800,
    methodology: "presencial",
    source_url: "https://g1.globo.com/sp/sao-paulo/eleicoes/2026/noticia/2026/08/25/quaest-em-sp-tarcisio-40percent-haddad-27percent.ghtml",
    tse_protocolo: "SP069462026",
    results: [
      { candidate_name: "Tarcísio",        percentage: 40 },
      { candidate_name: "Haddad",          percentage: 27 },
      { candidate_name: "Policial Edjane", percentage:  2 },
      { candidate_name: "Vera Lúcia",      percentage:  1 },
      { candidate_name: "Carlos Machado",  percentage:  1 },
      { candidate_name: "Izadora Dias",    percentage:  1 },
      { candidate_name: "Vivian Mendes",   percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE PE-07828/2026 · n=1.302
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/quaest-raquel-lyra-tem-44-e-joao-campos-36-em-pe/
  {
    institute_name: "Quaest",
    election_name: "Governador PE 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1302,
    methodology: "presencial",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/quaest-raquel-lyra-tem-44-e-joao-campos-36-em-pe/",
    tse_protocolo: "PE078282026",
    results: [
      { candidate_name: "Raquel Lyra",  percentage: 44 },
      { candidate_name: "João Campos",  percentage: 36 },
      { candidate_name: "Ivan Moraes",  percentage:  1 },
    ],
  },

  // Real Time Big Data · 20-24 ago 2026 · TSE RS-09640/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-rio-grande-do-sul-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador RS 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-24",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-rio-grande-do-sul-agosto-2026/",
    tse_protocolo: "RS096402026",
    results: [
      { candidate_name: "Juliana Brizola",  percentage: 38 },
      { candidate_name: "Luciano Zucco",    percentage: 32 },
      { candidate_name: "Gabriel Souza",    percentage: 19 },
      { candidate_name: "Marcelo Maranata", percentage:  4 },
    ],
  },

  // Instituto Veritá · 19-23 ago 2026 · TSE GO-01320/2026 · n=1.525
  // Fonte: https://todotemponoticias.com.br/pesquisa-verita-mostra-eleicao-em-aberto-para-governador-em-goias-75-dos-eleitores-ainda-nao-definiram-candidato/
  {
    institute_name: "Instituto Veritá",
    election_name: "Governador GO 2026 - 1º Turno",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-23",
    sample_size: 1525,
    methodology: "telefonica",
    source_url: "https://todotemponoticias.com.br/pesquisa-verita-mostra-eleicao-em-aberto-para-governador-em-goias-75-dos-eleitores-ainda-nao-definiram-candidato/",
    tse_protocolo: "GO013202026",
    results: [
      { candidate_name: "Daniel Vilela",    percentage: 34.5 },
      { candidate_name: "Wilder Morais",    percentage: 23.3 },
      { candidate_name: "Marconi Perillo",  percentage: 18.6 },
      { candidate_name: "Luis Cesar Bueno", percentage:  8.4 },
    ],
  },

  // Instituto Veritá · 19-23 ago 2026 · TSE PA-04167/2026 · n=1.525
  // Fonte: https://diariodopoder.com.br/brasil-e-regioes/amazonia/ttc-amazonia/dr-daniel-lidera-disputa-pelo-governo-do-para-flavio-e-lula-empatam/amp
  {
    institute_name: "Instituto Veritá",
    election_name: "Governador Para 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-23",
    sample_size: 1525,
    margin_of_error: 2.5,
    methodology: "telefonica",
    source_url: "https://diariodopoder.com.br/brasil-e-regioes/amazonia/ttc-amazonia/dr-daniel-lidera-disputa-pelo-governo-do-para-flavio-e-lula-empatam/amp",
    tse_protocolo: "PA041672026",
    results: [
      { candidate_name: "Dr Daniel",     percentage: 49.7 },
      { candidate_name: "Hana Ghassan",  percentage: 41.4 },
      { candidate_name: "Araceli Lemos", percentage:  5.2 },
    ],
  },

  // Real Time Big Data · 19-22 ago 2026 · TSE SP-01347/2026 · n=2.000
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/tarcisio-vence-no-1o-turno-em-sp-diz-real-time-big-data/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador SP 2026 - 1º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-22",
    sample_size: 2000,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/tarcisio-vence-no-1o-turno-em-sp-diz-real-time-big-data/",
    tse_protocolo: "SP013472026",
    results: [
      { candidate_name: "Tarcísio",      percentage: 52 },
      { candidate_name: "Haddad",        percentage: 35 },
      { candidate_name: "Vivian Mendes", percentage:  1 },
    ],
  },

  // GERP Mercadologia · 19-24 ago 2026 (protocolo confere; campo pedido "21/08" era só uma data intermediária) · TSE SP-01477/2026 · n=1.800
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/tarcisio-de-freitas-lidera-disputa-pelo-governo-de-sp-diz-gerp/
  {
    institute_name: "GERP",
    election_name: "Governador SP 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-24",
    sample_size: 1800,
    margin_of_error: 2.3,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/tarcisio-de-freitas-lidera-disputa-pelo-governo-de-sp-diz-gerp/",
    tse_protocolo: "SP014772026",
    results: [
      { candidate_name: "Tarcísio", percentage: 50 },
      { candidate_name: "Haddad",   percentage: 32 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 7 (Tier 2, Governador) ──

  // Vetor/Arrow · 15-18 ago 2026 · TSE RJ-00630/2026 · n=14.000 · pesquisa ESPONTÂNEA
  // Fonte: https://agendadopoder.com.br/vetor-arrow-paes-lidera-em-todas-as-regioes-e-douglas-ruas-retoma-o-segundo-lugar/
  {
    institute_name: "Vetor/Arrow",
    election_name: "Governador RJ 2026 - 1º Turno",
    publication_date: "2026-08-22",
    fieldwork_start: "2026-08-15",
    fieldwork_end: "2026-08-18",
    sample_size: 14000,
    methodology: "telefonica",
    poll_type: "espontanea",
    source_url: "https://agendadopoder.com.br/vetor-arrow-paes-lidera-em-todas-as-regioes-e-douglas-ruas-retoma-o-segundo-lugar/",
    tse_protocolo: "RJ006302026",
    results: [
      { candidate_name: "Eduardo Paes",      percentage: 25.4 },
      { candidate_name: "Douglas Ruas",      percentage:  7.3 },
      { candidate_name: "Anthony Garotinho", percentage:  4 },
    ],
  },

  // Real Time Big Data · 13-17 ago 2026 · TSE PR-09262/2026 · n=1.600
  // Fonte: https://exame.com/brasil/real-time-big-data-moro-tem-37-e-sandro-alex-22-no-1o-turno-no-parana/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Parana 2026",
    publication_date: "2026-08-18",
    fieldwork_start: "2026-08-13",
    fieldwork_end: "2026-08-17",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://exame.com/brasil/real-time-big-data-moro-tem-37-e-sandro-alex-22-no-1o-turno-no-parana/",
    tse_protocolo: "PR092622026",
    results: [
      { candidate_name: "Sergio Moro",    percentage: 37 },
      { candidate_name: "Sandro Alex",    percentage: 22 },
      { candidate_name: "Requiao Filho",  percentage: 20 },
      { candidate_name: "Luiz Franca",    percentage:  2 },
    ],
  },

  // Real Time Big Data · 12-15 ago 2026 · TSE PE-06056/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-pernambuco-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador PE 2026 - 1º Turno",
    publication_date: "2026-08-17",
    fieldwork_start: "2026-08-12",
    fieldwork_end: "2026-08-15",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-pernambuco-agosto-2026/",
    tse_protocolo: "PE060562026",
    results: [
      { candidate_name: "Raquel Lyra",  percentage: 43 },
      { candidate_name: "João Campos",  percentage: 43 },
      { candidate_name: "Renan",        percentage:  3 },
      { candidate_name: "Ivan Moraes",  percentage:  2 },
    ],
  },

  // Vetor/Arrow · 12-13 ago 2026 · TSE RJ-04533/2026 · n=14.000 · pesquisa ESPONTÂNEA
  // Fonte: https://agendadopoder.com.br/vetor-arrow-paes-chega-a-289-e-garotinho-assume-segundo-lugar-na-disputa-pelo-governo-do-rio/
  {
    institute_name: "Vetor/Arrow",
    election_name: "Governador RJ 2026 - 1º Turno",
    publication_date: "2026-08-15",
    fieldwork_start: "2026-08-12",
    fieldwork_end: "2026-08-13",
    sample_size: 14000,
    methodology: "telefonica",
    poll_type: "espontanea",
    source_url: "https://agendadopoder.com.br/vetor-arrow-paes-chega-a-289-e-garotinho-assume-segundo-lugar-na-disputa-pelo-governo-do-rio/",
    tse_protocolo: "RJ045332026",
    results: [
      { candidate_name: "Eduardo Paes",      percentage: 28.9 },
      { candidate_name: "Anthony Garotinho", percentage:  7.4 },
      { candidate_name: "Douglas Ruas",      percentage:  6.2 },
    ],
  },

  // Meio/Ideia (contratante ACSP) · 5-8 ago 2026 · TSE SP-04956/2026 · n=1.800
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/ideia-tarcisio-tem-51-e-haddad-34-no-1o-turno/
  {
    institute_name: "Meio/Ideia",
    election_name: "Governador SP 2026 - 1º Turno",
    publication_date: "2026-08-10",
    fieldwork_start: "2026-08-05",
    fieldwork_end: "2026-08-08",
    sample_size: 1800,
    margin_of_error: 2.3,
    methodology: "telefonica",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/ideia-tarcisio-tem-51-e-haddad-34-no-1o-turno/",
    tse_protocolo: "SP049562026",
    results: [
      { candidate_name: "Tarcísio",       percentage: 51 },
      { candidate_name: "Haddad",         percentage: 34 },
      { candidate_name: "Vera Lúcia",     percentage:  3 },
      { candidate_name: "Carlos Machado", percentage:  1 },
      { candidate_name: "Vivian Mendes",  percentage:  1 },
    ],
  },

  // Instituto Índice Inteligência · 4-6 ago 2026 · TSE PR-07034/2026 · n=1.200
  // Fonte: https://gazetadoparana.com.br/artigo/pesquisa-indice-moro-lidera-primeira-pesquisa-apos-convencoes-no-parana
  {
    institute_name: "Instituto Índice Inteligência",
    election_name: "Governador Parana 2026",
    publication_date: "2026-08-09",
    fieldwork_start: "2026-08-04",
    fieldwork_end: "2026-08-06",
    sample_size: 1200,
    methodology: "presencial",
    source_url: "https://gazetadoparana.com.br/artigo/pesquisa-indice-moro-lidera-primeira-pesquisa-apos-convencoes-no-parana",
    tse_protocolo: "PR070342026",
    results: [
      { candidate_name: "Sergio Moro",   percentage: 35.3 },
      { candidate_name: "Sandro Alex",   percentage: 27.6 },
      { candidate_name: "Requiao Filho", percentage: 19.5 },
    ],
  },

  // Real Time Big Data · 30 jul-3 ago 2026 · TSE PA-08492/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-para-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Para 2026",
    publication_date: "2026-08-04",
    fieldwork_start: "2026-07-30",
    fieldwork_end: "2026-08-03",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-para-agosto-2026/",
    tse_protocolo: "PA084922026",
    results: [
      { candidate_name: "Hana Ghassan",   percentage: 31 },
      { candidate_name: "Dr Daniel",      percentage: 29 },
      { candidate_name: "Mario Couto",    percentage: 12 },
      { candidate_name: "Araceli Lemos",  percentage:  4 },
      { candidate_name: "Cléber Rabelo",  percentage:  1 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 8 (Tier 3, Governador) ──

  // Instituto Índice Inteligência (contratante Rádio Nova FM) · 27-29 ago 2026 · TSE AL-05894/2026 · n=1.200
  // Fonte: https://www.al102.com.br/noticias/31003/jhc-consolida-lideranca-isolada-com-47-6-das-intencoes-de-voto-para-o-governo-de-alagoas-aponta-pesquisa-nova-fm
  {
    institute_name: "Instituto Índice Inteligência",
    election_name: "Governador Alagoas 2026",
    publication_date: "2026-09-01",
    fieldwork_start: "2026-08-27",
    fieldwork_end: "2026-08-29",
    sample_size: 1200,
    margin_of_error: 2.83,
    methodology: "presencial",
    source_url: "https://www.al102.com.br/noticias/31003/jhc-consolida-lideranca-isolada-com-47-6-das-intencoes-de-voto-para-o-governo-de-alagoas-aponta-pesquisa-nova-fm",
    tse_protocolo: "AL058942026",
    results: [
      { candidate_name: "JHC",           percentage: 47.6 },
      { candidate_name: "Renan Filho",   percentage: 35.6 },
      { candidate_name: "Lenilda Luna",  percentage:  0.8 },
      { candidate_name: "Márcio Jambo",  percentage:  0.4 },
    ],
  },

  // Quaest · 25-28 ago 2026 · TSE PA-07718/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-para-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Governador Para 2026",
    publication_date: "2026-08-30",
    fieldwork_start: "2026-08-25",
    fieldwork_end: "2026-08-28",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-para-agosto-2026/",
    tse_protocolo: "PA077182026",
    results: [
      { candidate_name: "Dr Daniel",      percentage: 28 },
      { candidate_name: "Hana Ghassan",   percentage: 27 },
      { candidate_name: "Gal Leite",      percentage:  2 },
      { candidate_name: "Well Macedo",    percentage:  2 },
      { candidate_name: "Araceli Lemos",  percentage:  2 },
      { candidate_name: "José Moita",     percentage:  1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE RR-04765/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-roraima-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Governador Roraima 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-roraima-agosto-2026/",
    tse_protocolo: "RR047652026",
    results: [
      { candidate_name: "Arthur Henrique",  percentage: 60 },
      { candidate_name: "Soldado Sampaio",  percentage: 27 },
      { candidate_name: "Rosi Aires",       percentage:  1 },
    ],
  },

  // Real Time Big Data · 22-26 ago 2026 · TSE ES-05096/2026 · n=1.600
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/real-time-big-data-ferraco-lidera-1o-e-2o-turnos-para-governo-do-es/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Espirito Santo 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-22",
    fieldwork_end: "2026-08-26",
    sample_size: 1600,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/real-time-big-data-ferraco-lidera-1o-e-2o-turnos-para-governo-do-es/",
    tse_protocolo: "ES050962026",
    results: [
      { candidate_name: "Ricardo Ferraco",  percentage: 42 },
      { candidate_name: "Lorenzo Pazolini", percentage: 33 },
      { candidate_name: "Helder Salomao",   percentage: 11 },
      { candidate_name: "Breno Barcelos",   percentage:  2 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE GO-06186/2026 · n=804
  // Fonte: https://g1.globo.com/go/goias/eleicoes/2026/noticia/2026/08/27/quaest-go-27-de-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Governador GO 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://g1.globo.com/go/goias/eleicoes/2026/noticia/2026/08/27/quaest-go-27-de-agosto.ghtml",
    tse_protocolo: "GO061862026",
    results: [
      { candidate_name: "Daniel Vilela",    percentage: 37 },
      { candidate_name: "Marconi Perillo",  percentage: 20 },
      { candidate_name: "Wilder Morais",    percentage: 12 },
      { candidate_name: "Luis Cesar Bueno", percentage:  4 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE SE-03536/2026 · n=804
  // Fonte: https://g1.globo.com/se/sergipe/eleicoes/2026/noticia/2026/08/27/quaest-em-se-fabio-40percent-valmir-de-francisquinho-28percent.ghtml
  {
    institute_name: "Quaest",
    election_name: "Governador Sergipe 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://g1.globo.com/se/sergipe/eleicoes/2026/noticia/2026/08/27/quaest-em-se-fabio-40percent-valmir-de-francisquinho-28percent.ghtml",
    tse_protocolo: "SE035362026",
    results: [
      { candidate_name: "Fabio Mitidieri",         percentage: 40 },
      { candidate_name: "Valmir",                  percentage: 28 },
      { candidate_name: "Ricardo Marques",         percentage:  5 },
      { candidate_name: "Taty  Cristina de Jesus", percentage:  1 },
      { candidate_name: "Dr. Helton",              percentage:  1 },
      { candidate_name: "Emanuel Cacho",           percentage:  1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE ES-04444/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-espirito-santo-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Governador Espirito Santo 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-espirito-santo-agosto-2026/",
    tse_protocolo: "ES044442026",
    results: [
      { candidate_name: "Ricardo Ferraco",  percentage: 35 },
      { candidate_name: "Lorenzo Pazolini", percentage: 28 },
      { candidate_name: "Helder Salomao",   percentage: 10 },
      { candidate_name: "Breno Barcelos",   percentage:  2 },
      { candidate_name: "Rafael Demuner",   percentage:  1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE BA-06206/2026 · n=900 · cenário 1 (com Ariel Capistrano)
  // Fonte: https://g1.globo.com/ba/bahia/eleicoes/2026/noticia/2026/08/27/quaest-ba-governador-27-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Governador BA 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 900,
    methodology: "presencial",
    source_url: "https://g1.globo.com/ba/bahia/eleicoes/2026/noticia/2026/08/27/quaest-ba-governador-27-agosto.ghtml",
    tse_protocolo: "BA062062026",
    results: [
      { candidate_name: "ACM Neto",           percentage: 39 },
      { candidate_name: "Jeronimo Rodrigues", percentage: 37 },
      { candidate_name: "Aroldo Felix",       percentage:  1 },
      { candidate_name: "Maria Bona",         percentage:  1 },
      { candidate_name: "Ariel Capistrano",   percentage:  1 },
      { candidate_name: "Ronaldo Mansur",     percentage:  1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE AC-09106/2026 · n=804
  // Fonte: https://g1.globo.com/ac/acre/eleicoes/2026/noticia/2026/08/27/quaest-no-ac-alan-33percent-mailza-24percent-bocalom-15percent-thor-2percent.ghtml
  {
    institute_name: "Quaest",
    election_name: "Governador Acre 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://g1.globo.com/ac/acre/eleicoes/2026/noticia/2026/08/27/quaest-no-ac-alan-33percent-mailza-24percent-bocalom-15percent-thor-2percent.ghtml",
    tse_protocolo: "AC091062026",
    results: [
      { candidate_name: "Alan Rick",     percentage: 33 },
      { candidate_name: "Mailza Assis",  percentage: 24 },
      { candidate_name: "Tiao Bocalom",  percentage: 15 },
      { candidate_name: "Thor Dantas",   percentage:  2 },
      { candidate_name: "Dr.luisinho",   percentage:  1 },
    ],
  },

  // Real Time Big Data · 21-25 ago 2026 · TSE TO-09665/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-tocantins-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Tocantins 2026",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-25",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-tocantins-agosto-2026/",
    tse_protocolo: "TO096652026",
    results: [
      { candidate_name: "Professora Dorinha", percentage: 33 },
      { candidate_name: "Vicentinho Junior",  percentage: 30 },
      { candidate_name: "Laurez Moreira",     percentage: 11 },
      { candidate_name: "Ataides Oliveira",   percentage:  7 },
      { candidate_name: "Prof Witer Naves",   percentage:  4 },
    ],
  },

  // Real Time Big Data · 21-25 ago 2026 · TSE AM-09965/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-amazonas-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Amazonas 2026",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-25",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-amazonas-agosto-2026/",
    tse_protocolo: "AM099652026",
    results: [
      { candidate_name: "Omar Aziz",              percentage: 34 },
      { candidate_name: "Roberto Cidade",         percentage: 22 },
      { candidate_name: "Maria do Carmo Seffair", percentage: 21 },
      { candidate_name: "David Almeida",          percentage: 14 },
      { candidate_name: "Cabo Daciolo",           percentage:  4 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE AM-04595/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-amazonas-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Governador Amazonas 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-amazonas-agosto-2026/",
    tse_protocolo: "AM045952026",
    results: [
      { candidate_name: "Omar Aziz",              percentage: 26 },
      { candidate_name: "Roberto Cidade",         percentage: 18 },
      { candidate_name: "Maria do Carmo Seffair", percentage: 16 },
      { candidate_name: "David Almeida",          percentage: 15 },
      { candidate_name: "Cabo Daciolo",           percentage:  2 },
      { candidate_name: "Isael Munduruku",        percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE MS-00793/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-mato-grosso-sul-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Governador Mato Grosso do Sul 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-mato-grosso-sul-agosto-2026/",
    tse_protocolo: "MS007932026",
    results: [
      { candidate_name: "Eduardo Riedel",   percentage: 40 },
      { candidate_name: "Fabio Trad",       percentage: 13 },
      { candidate_name: "Delcidio Amaral",  percentage:  8 },
      { candidate_name: "Catan",            percentage:  3 },
      { candidate_name: "Lucien Rezende",   percentage:  2 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE PB-07850/2026 · n=804
  // Fonte: https://jornaldaparaiba.com.br/politica/pleno-poder/quaest-na-paraiba-lucas-lidera-com-38-seguido-por-cicero-19-e-efraim-18
  {
    institute_name: "Quaest",
    election_name: "Governador Paraiba 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://jornaldaparaiba.com.br/politica/pleno-poder/quaest-na-paraiba-lucas-lidera-com-38-seguido-por-cicero-19-e-efraim-18",
    tse_protocolo: "PB078502026",
    results: [
      { candidate_name: "Lucas Ribeiro",  percentage: 38 },
      { candidate_name: "Cicero Lucena",  percentage: 19 },
      { candidate_name: "Efraim Filho",   percentage: 18 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE MT-04846/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governo-senado-mato-grosso-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Governador Mato Grosso 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governo-senado-mato-grosso-agosto-2026/",
    tse_protocolo: "MT048462026",
    results: [
      { candidate_name: "Wellington Fagundes",     percentage: 27 },
      { candidate_name: "Otaviano Pivetta",        percentage: 23 },
      { candidate_name: "Natasha Slhessarenko",    percentage:  8 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE AP-09438/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governo-senado-amapa-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Governador Amapa 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governo-senado-amapa-agosto-2026/",
    tse_protocolo: "AP094382026",
    results: [
      { candidate_name: "Dr Furlan",     percentage: 55 },
      { candidate_name: "Clecio Luis",   percentage: 35 },
      { candidate_name: "Jairo Palheta", percentage:  1 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 9 (Tier 3, Governador) ──
  // Nota: uma 10ª pesquisa confirmada (Veritas Planejamento e Assessoria, MA-01632/2026,
  // Orleans Brandão 47,5% x Eduardo Braide 39,1%) ficou de fora — instituto ainda não
  // cadastrado em public.institutes, e criar instituto novo está fora do escopo deste script.

  // Instituto Veritá · 24-28 ago 2026 · TSE RO-03403/2026 · n=1.220
  // Fonte: https://www.rondoniadinamica.com/noticias/2026/08/marcos-rogerio-chega-a-407-e-tem-quase-o-dobro-do-2-colocado-em-pesquisa-verita-para-o-governo-de-rondonia,252975.shtml
  {
    institute_name: "Instituto Veritá",
    election_name: "Governador Rondonia 2026",
    publication_date: "2026-08-31",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-28",
    sample_size: 1220,
    margin_of_error: 3.0,
    methodology: "telefonica",
    source_url: "https://www.rondoniadinamica.com/noticias/2026/08/marcos-rogerio-chega-a-407-e-tem-quase-o-dobro-do-2-colocado-em-pesquisa-verita-para-o-governo-de-rondonia,252975.shtml",
    tse_protocolo: "RO034032026",
    results: [
      { candidate_name: "Marcos Rogerio",  percentage: 40.7 },
      { candidate_name: "Adailton Furia",  percentage: 22.4 },
      { candidate_name: "Expedito Netto",  percentage: 10.3 },
    ],
  },

  // Instituto Veritá · 24-28 ago 2026 · TSE AM-02151/2026 · n=1.220
  // Fonte: https://diariodopoder.com.br/brasil-e-regioes/csa-brasil/amazonas-aziz-e-maria-do-carmo-empatam-para-o-governo-do-estado
  {
    institute_name: "Instituto Veritá",
    election_name: "Governador Amazonas 2026",
    publication_date: "2026-08-29",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-28",
    sample_size: 1220,
    margin_of_error: 3.0,
    methodology: "telefonica",
    source_url: "https://diariodopoder.com.br/brasil-e-regioes/csa-brasil/amazonas-aziz-e-maria-do-carmo-empatam-para-o-governo-do-estado",
    tse_protocolo: "AM021512026",
    results: [
      { candidate_name: "Omar Aziz",              percentage: 31.0 },
      { candidate_name: "Maria do Carmo Seffair", percentage: 29.2 },
      { candidate_name: "Roberto Cidade",         percentage: 22.4 },
      { candidate_name: "David Almeida",          percentage: 10.8 },
      { candidate_name: "Cabo Daciolo",           percentage:  4.1 },
      { candidate_name: "Gilberto Vasconcelos",   percentage:  1.4 },
      { candidate_name: "Isael Munduruku",        percentage:  1.2 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE TO-02161/2026 · n=804
  // Fonte: https://g1.globo.com/to/tocantins/eleicoes/2026/noticia/2026/08/25/quaest-to-governador-25-de-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Governador Tocantins 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://g1.globo.com/to/tocantins/eleicoes/2026/noticia/2026/08/25/quaest-to-governador-25-de-agosto.ghtml",
    tse_protocolo: "TO021612026",
    results: [
      { candidate_name: "Professora Dorinha", percentage: 37 },
      { candidate_name: "Vicentinho Junior",  percentage: 28 },
      { candidate_name: "Laurez Moreira",     percentage:  7 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE RO-05711/2026 · n=804
  // Fonte: https://g1.globo.com/ro/rondonia/eleicoes/2026/noticia/2026/08/25/quaest-ro-governador-25-de-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Governador Rondonia 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://g1.globo.com/ro/rondonia/eleicoes/2026/noticia/2026/08/25/quaest-ro-governador-25-de-agosto.ghtml",
    tse_protocolo: "RO057112026",
    results: [
      { candidate_name: "Marcos Rogerio", percentage: 24 },
      { candidate_name: "Adailton Furia", percentage: 21 },
      { candidate_name: "Expedito Netto", percentage: 10 },
      { candidate_name: "Hildon Chaves",  percentage: 10 },
      { candidate_name: "Samuel Costa",   percentage:  2 },
      { candidate_name: "Pedro Abib",     percentage:  1 },
    ],
  },

  // Real Time Big Data · 19-22 ago 2026 · TSE PB-07790/2026 · n=1.600
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/ribeiro-tem-42-contra-35-de-lucena-no-2o-turno-na-pb-diz-pesquisa/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Paraiba 2026",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-22",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/ribeiro-tem-42-contra-35-de-lucena-no-2o-turno-na-pb-diz-pesquisa/",
    tse_protocolo: "PB077902026",
    results: [
      { candidate_name: "Lucas Ribeiro",   percentage: 35 },
      { candidate_name: "Cicero Lucena",   percentage: 25 },
      { candidate_name: "Efraim Filho",    percentage: 21 },
      { candidate_name: "Camilo Duarte",   percentage:  1 },
      { candidate_name: "Pedro Coutinho",  percentage:  1 },
      { candidate_name: "Yuri Ezequiel",   percentage:  1 },
    ],
  },

  // Instituto Índice Inteligência (parceria Blog do Márcio Rangel/MRTV) · 20-22 ago 2026 · TSE PB-04351/2026 · n=2.000
  // Fonte: https://blogdomarciorangel.com.br/2026/08/27/lucas-ribeiro-lidera-com-336-cicero-tem-322-e-efraim-aparece-com-185-aponta-pesquisa-indice-blog-do-marcio-rangel/
  {
    institute_name: "Instituto Índice Inteligência",
    election_name: "Governador Paraiba 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-22",
    sample_size: 2000,
    methodology: "presencial",
    source_url: "https://blogdomarciorangel.com.br/2026/08/27/lucas-ribeiro-lidera-com-336-cicero-tem-322-e-efraim-aparece-com-185-aponta-pesquisa-indice-blog-do-marcio-rangel/",
    tse_protocolo: "PB043512026",
    results: [
      { candidate_name: "Lucas Ribeiro", percentage: 33.6 },
      { candidate_name: "Cicero Lucena", percentage: 32.2 },
      { candidate_name: "Efraim Filho",  percentage: 18.5 },
    ],
  },

  // Instituto Veritá · 13-17 ago 2026 · TSE SE-08978/2026 · n=1.220 · % de votos válidos
  // Fonte: https://rsnoticia.com.br/pesquisa-verita-fabio-mitidieri-chega-a-51-dos-votos-validos-e-venceria-no-1o-turno/
  {
    institute_name: "Instituto Veritá",
    election_name: "Governador Sergipe 2026",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-13",
    fieldwork_end: "2026-08-17",
    sample_size: 1220,
    margin_of_error: 3.0,
    methodology: "telefonica",
    source_url: "https://rsnoticia.com.br/pesquisa-verita-fabio-mitidieri-chega-a-51-dos-votos-validos-e-venceria-no-1o-turno/",
    tse_protocolo: "SE089782026",
    results: [
      { candidate_name: "Fabio Mitidieri",         percentage: 51 },
      { candidate_name: "Valmir",                  percentage: 33.7 },
      { candidate_name: "Ricardo Marques",         percentage: 11.6 },
      { candidate_name: "Dr. Helton",              percentage:  3.1 },
      { candidate_name: "Emanuel Cacho",           percentage:  0.4 },
      { candidate_name: "Taty  Cristina de Jesus", percentage:  0.2 },
    ],
  },

  // Real Time Big Data · 7-11 ago 2026 · TSE MT-04560/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-mato-grosso-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Mato Grosso 2026",
    publication_date: "2026-08-12",
    fieldwork_start: "2026-08-07",
    fieldwork_end: "2026-08-11",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-mato-grosso-agosto-2026/",
    tse_protocolo: "MT045602026",
    results: [
      { candidate_name: "Wellington Fagundes",  percentage: 34 },
      { candidate_name: "Otaviano Pivetta",     percentage: 26 },
      { candidate_name: "Natasha Slhessarenko", percentage: 13 },
      { candidate_name: "Rafaell Milas",        percentage:  3 },
      { candidate_name: "Sargento Laudicério",  percentage:  1 },
    ],
  },

  // Real Time Big Data · 1-5 ago 2026 · TSE MS-07706/2026 · n=1.600
  // Fonte: https://veja.abril.com.br/brasil/governador-e-favorito-a-reeleicao-no-mato-grosso-do-sul-diz-pesquisa-real-time-big-data/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Mato Grosso do Sul 2026",
    publication_date: "2026-08-06",
    fieldwork_start: "2026-08-01",
    fieldwork_end: "2026-08-05",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://veja.abril.com.br/brasil/governador-e-favorito-a-reeleicao-no-mato-grosso-do-sul-diz-pesquisa-real-time-big-data/",
    tse_protocolo: "MS077062026",
    results: [
      { candidate_name: "Eduardo Riedel",             percentage: 44 },
      { candidate_name: "Fabio Trad",                 percentage: 25 },
      { candidate_name: "Catan",                      percentage: 12 },
      { candidate_name: "Lucien Rezende",              percentage:  3 },
      { candidate_name: "Economista Renato Gomes",    percentage:  3 },
      { candidate_name: "Jeferson Bezerra",           percentage:  1 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 10 (Tier 1, Veritá, recortes estaduais) ──

  // Instituto Veritá · 19-23 ago 2026 · TSE BR-04605/2026 · n=1.525 · recorte GO
  // Fonte: https://todotemponoticias.com.br/pesquisa-verita-mostra-eleicao-em-aberto-para-governador-em-goias-75-dos-eleitores-ainda-nao-definiram-candidato/
  {
    institute_name: "Instituto Veritá",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-23",
    sample_size: 1525,
    margin_of_error: 2.5,
    methodology: "telefonica",
    scope: "GO",
    source_url: "https://todotemponoticias.com.br/pesquisa-verita-mostra-eleicao-em-aberto-para-governador-em-goias-75-dos-eleitores-ainda-nao-definiram-candidato/",
    tse_protocolo: "BR046052026",
    results: [
      { candidate_name: "Flávio", percentage: 26.8 },
      { candidate_name: "Lula",   percentage: 18.1 },
    ],
  },

  // Instituto Veritá · 19-23 ago 2026 · TSE BR-07588/2026 · n=1.525 · recorte PA
  // Fonte: https://opiniaoempauta.com.br/no-para-pesquisa-mostra-dr-daniel-perto-de-vencer-eleicao-no-primeiro-turno-49-x-41/
  {
    institute_name: "Instituto Veritá",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-23",
    sample_size: 1525,
    margin_of_error: 2.5,
    methodology: "telefonica",
    scope: "PA",
    source_url: "https://opiniaoempauta.com.br/no-para-pesquisa-mostra-dr-daniel-perto-de-vencer-eleicao-no-primeiro-turno-49-x-41/",
    tse_protocolo: "BR075882026",
    results: [
      { candidate_name: "Flávio", percentage: 44.6 },
      { candidate_name: "Lula",   percentage: 44.2 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 11 (Tier 4, Senador — cargo antes invisível na fila) ──
  // Mesmas pesquisas "Governador e Senado" já curadas hoje pro Governador — reaproveitando
  // a mesma matéria/fonte pra extrair a parte de Senado que ainda não tinha sido inserida.

  // Quaest · 23-26 ago 2026 · TSE RR-04765/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-roraima-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Roraima 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-roraima-agosto-2026/",
    tse_protocolo: "RR047652026",
    results: [
      { candidate_name: "Teresa Surita",   percentage: 19 },
      { candidate_name: "Nicoletti",       percentage: 17 },
      { candidate_name: "Helena da Asatur", percentage: 16 },
      { candidate_name: "Chico Rodrigues", percentage: 11 },
      { candidate_name: "Helio Bolsonaro", percentage:  5 },
      { candidate_name: "Pastor Isamar",   percentage:  3 },
      { candidate_name: "Márcio Junqueira", percentage:  1 },
      { candidate_name: "Bartô Macuxi",    percentage:  1 },
      { candidate_name: "Hilton Xavier",   percentage:  1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE ES-04444/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-espirito-santo-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Espirito Santo 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-espirito-santo-agosto-2026/",
    tse_protocolo: "ES044442026",
    results: [
      { candidate_name: "Renato Casagrande",   percentage: 28 },
      { candidate_name: "Sergio Meneguelli",   percentage: 10 },
      { candidate_name: "Fabiano Contarato",   percentage:  9 },
      { candidate_name: "Rose de Freitas",     percentage:  9 },
      { candidate_name: "Maguinha Malta",      percentage:  6 },
      { candidate_name: "Evair de Melo",       percentage:  5 },
      { candidate_name: "Marcos do Val",       percentage:  4 },
      { candidate_name: "Rodney Miranda",      percentage:  2 },
      { candidate_name: "Professor Fabian",    percentage:  2 },
      { candidate_name: "Wellington Callegari", percentage:  1 },
      { candidate_name: "Leonardo Monjardim",  percentage:  1 },
    ],
  },

  // Real Time Big Data · 21-25 ago 2026 · TSE TO-09665/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-tocantins-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Tocantins 2026",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-25",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-tocantins-agosto-2026/",
    tse_protocolo: "TO096652026",
    results: [
      { candidate_name: "Eduardo Gomes",       percentage: 26 },
      { candidate_name: "Alexandre Guimarães", percentage: 18 },
      { candidate_name: "Carlos Gaguim",       percentage: 10 },
      { candidate_name: "Vanderlei Luxemburgo", percentage:  9 },
      { candidate_name: "Ronaldo Dimas",       percentage:  8 },
      { candidate_name: "Eli Borges",          percentage:  7 },
      { candidate_name: "Paulo Mourão",        percentage:  6 },
      { candidate_name: "Professor Osvaldo",   percentage:  3 },
      { candidate_name: "Fábio Ribeiro",       percentage:  1 },
      { candidate_name: "Helio Rodrigues Bolsonaro", percentage: 1 },
      { candidate_name: "Nilton Santos",       percentage:  1 },
    ],
  },

  // Real Time Big Data · 21-25 ago 2026 · TSE AM-09965/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-amazonas-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Amazonas 2026",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-25",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-amazonas-agosto-2026/",
    tse_protocolo: "AM099652026",
    results: [
      { candidate_name: "Capitao Alberto Neto", percentage: 24 },
      { candidate_name: "Wilson Lima",          percentage: 19 },
      { candidate_name: "Eduardo Braga",        percentage: 18 },
      { candidate_name: "Plinio Valerio",       percentage: 14 },
      { candidate_name: "Ismael Munduruku",     percentage:  5 },
      { candidate_name: "Professora Evany",     percentage:  3 },
      { candidate_name: "Xuxa do Amazonas",     percentage:  2 },
      { candidate_name: "Evandro de Oliveira",  percentage:  1 },
      { candidate_name: "Dailson Corrêa",       percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE AM-04595/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-amazonas-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Amazonas 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-amazonas-agosto-2026/",
    tse_protocolo: "AM045952026",
    results: [
      { candidate_name: "Eduardo Braga",        percentage: 25 },
      { candidate_name: "Capitao Alberto Neto", percentage: 16 },
      { candidate_name: "Plinio Valerio",       percentage: 13 },
      { candidate_name: "Wilson Lima",          percentage: 12 },
      { candidate_name: "Professora Evany",     percentage:  3 },
      { candidate_name: "Xuxa do Amazonas",     percentage:  1 },
      { candidate_name: "Ismael Munduruku",     percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE MS-00793/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-mato-grosso-sul-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Mato Grosso do Sul 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-mato-grosso-sul-agosto-2026/",
    tse_protocolo: "MS007932026",
    results: [
      { candidate_name: "Reinaldo Azambuja",   percentage: 22 },
      { candidate_name: "Capitão Contar",      percentage: 15 },
      { candidate_name: "Soraya Thronicke",    percentage: 11 },
      { candidate_name: "Vander Loubet",       percentage:  9 },
      { candidate_name: "Roberto Oshiro",      percentage:  3 },
      { candidate_name: "Beto do Movimento",   percentage:  3 },
      { candidate_name: "Daniel Junior",       percentage:  2 },
      { candidate_name: "Valter da Comagran",  percentage:  1 },
      { candidate_name: "Luiz Lemes",          percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE MT-04846/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governo-senado-mato-grosso-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Mato Grosso 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governo-senado-mato-grosso-agosto-2026/",
    tse_protocolo: "MT048462026",
    results: [
      { candidate_name: "Mauro Mendes",              percentage: 24 },
      { candidate_name: "Janaina Riva",               percentage: 18 },
      { candidate_name: "Pedro Taques",               percentage:  8 },
      { candidate_name: "Jose Medeiros",              percentage:  6 },
      { candidate_name: "Carlos Favaro",              percentage:  5 },
      { candidate_name: "Coronel Darwin",             percentage:  2 },
      { candidate_name: "Galvan",                     percentage:  2 },
      { candidate_name: "Professor Nelson Ferreira",  percentage:  2 },
      { candidate_name: "Margareth Buzetti",          percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE AP-09438/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governo-senado-amapa-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Amapa 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governo-senado-amapa-agosto-2026/",
    tse_protocolo: "AP094382026",
    results: [
      { candidate_name: "Rayssa Furlan",       percentage: 27 },
      { candidate_name: "Randolfe Rodrigues",  percentage: 19 },
      { candidate_name: "Lucas Barreto",       percentage: 18 },
      { candidate_name: "Alliny Serrão",       percentage:  9 },
      { candidate_name: "Acácio Favacho",      percentage:  7 },
      { candidate_name: "Capi",                percentage:  4 },
    ],
  },

  // Real Time Big Data · 20-24 ago 2026 · TSE RS-09640/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-rio-grande-do-sul-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Rio Grande do Sul 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-24",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-rio-grande-do-sul-agosto-2026/",
    tse_protocolo: "RS096402026",
    results: [
      { candidate_name: "Marcel Van Hattem",  percentage: 20 },
      { candidate_name: "Manuela d'Ávila",    percentage: 19 },
      { candidate_name: "Sanderson",          percentage: 17 },
      { candidate_name: "Germano Rigotto",    percentage: 15 },
      { candidate_name: "Paulo Pimenta",      percentage: 15 },
      { candidate_name: "Frederico Antunes",  percentage:  5 },
      { candidate_name: "Milton Cardoso",     percentage:  1 },
      { candidate_name: "Luciano do Mlb",     percentage:  1 },
    ],
  },

  // Quaest · 25-28 ago 2026 · TSE PA-07718/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-para-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Para 2026",
    publication_date: "2026-08-30",
    fieldwork_start: "2026-08-25",
    fieldwork_end: "2026-08-28",
    sample_size: 804,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-para-agosto-2026/",
    tse_protocolo: "PA077182026",
    results: [
      { candidate_name: "Helder Barbalho",  percentage: 23 },
      { candidate_name: "Eder Mauro",       percentage: 14 },
      { candidate_name: "Zequinha Marinho", percentage: 11 },
      { candidate_name: "Celso Sabino",     percentage:  7 },
      { candidate_name: "Chicão",           percentage:  5 },
      { candidate_name: "Gizelle Freitas",  percentage:  2 },
      { candidate_name: "Fernanda Lopes",   percentage:  1 },
      { candidate_name: "Livia Noronha",    percentage:  1 },
      { candidate_name: "Conti",            percentage:  1 },
    ],
  },

  // Real Time Big Data · 22-26 ago 2026 · TSE MG-07972/2026 · n=2.000
  // Fonte: https://noticias.uol.com.br/eleicoes/2026/08/27/realtime-bigdata-mg-governo-e-senado-agosto.ghtm
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Minas Gerais 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-22",
    fieldwork_end: "2026-08-26",
    sample_size: 2000,
    methodology: "telefonica",
    source_url: "https://noticias.uol.com.br/eleicoes/2026/08/27/realtime-bigdata-mg-governo-e-senado-agosto.ghtm",
    tse_protocolo: "MG079722026",
    results: [
      { candidate_name: "Marilia Campos",           percentage: 24 },
      { candidate_name: "Carlos Viana",             percentage: 13 },
      { candidate_name: "Domingos Savio",           percentage: 13 },
      { candidate_name: "Marcelo Aro",              percentage: 12 },
      { candidate_name: "Aurea Carolina",           percentage:  9 },
      { candidate_name: "Marco Antônio Superman",   percentage:  4 },
      { candidate_name: "Carlin Moura",             percentage:  1 },
      { candidate_name: "Gustavo Galassi",          percentage:  1 },
      { candidate_name: "Marcelo Heringer",         percentage:  1 },
      { candidate_name: "Ana Luiza do Mlb",         percentage:  1 },
      { candidate_name: "Manoel Carvalho",          percentage:  1 },
      { candidate_name: "Arcanjo Pimenta",          percentage:  1 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 12 (Tier 1, rodada Quaest "10 estados" de julho + outros recortes estaduais) ──

  // Quaest · 24-28 jul 2026 · TSE BR-08063/2026 · n=1.104 · recorte GO
  // Fonte: https://www.correiobraziliense.com.br/politica/2026/07/7470832-quaest-mostra-cenario-presidencial-em-10-estados-veja.html
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-30",
    fieldwork_start: "2026-07-24",
    fieldwork_end: "2026-07-28",
    sample_size: 1104,
    margin_of_error: 3.0,
    methodology: "presencial",
    scope: "GO",
    source_url: "https://www.correiobraziliense.com.br/politica/2026/07/7470832-quaest-mostra-cenario-presidencial-em-10-estados-veja.html",
    tse_protocolo: "BR080632026",
    results: [
      { candidate_name: "Caiado", percentage: 33 },
      { candidate_name: "Flávio", percentage: 27 },
      { candidate_name: "Lula",   percentage: 23 },
    ],
  },

  // Instituto Vox Brasil · 26-28 jul 2026 · TSE BR-01084/2026 · n=2.100
  // Fonte: https://exame.com/brasil/pesquisa-vox-brasil-lula-tem-405-e-flavio-bolsonaro-312-no-1o-turno/
  {
    institute_name: "Vox Brasil Pesquisas",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-31",
    fieldwork_start: "2026-07-26",
    fieldwork_end: "2026-07-28",
    sample_size: 2100,
    margin_of_error: 2.15,
    methodology: "presencial",
    source_url: "https://exame.com/brasil/pesquisa-vox-brasil-lula-tem-405-e-flavio-bolsonaro-312-no-1o-turno/",
    tse_protocolo: "BR010842026",
    results: [
      { candidate_name: "Lula",         percentage: 40.5 },
      { candidate_name: "Flávio",       percentage: 31.2 },
      { candidate_name: "Caiado",       percentage:  5.5 },
      { candidate_name: "Zema",         percentage:  3.2 },
      { candidate_name: "Renan",        percentage:  3.0 },
      { candidate_name: "Augusto Cury", percentage:  1.1 },
    ],
  },

  // Quaest · 24-28 jul 2026 · TSE BR-01871/2026 · n=1.104 · recorte RS
  // Fonte: https://www.correiobraziliense.com.br/politica/2026/07/7470832-quaest-mostra-cenario-presidencial-em-10-estados-veja.html
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-30",
    fieldwork_start: "2026-07-24",
    fieldwork_end: "2026-07-28",
    sample_size: 1104,
    margin_of_error: 3.0,
    methodology: "presencial",
    scope: "RS",
    source_url: "https://www.correiobraziliense.com.br/politica/2026/07/7470832-quaest-mostra-cenario-presidencial-em-10-estados-veja.html",
    tse_protocolo: "BR018712026",
    results: [
      { candidate_name: "Flávio", percentage: 32 },
      { candidate_name: "Lula",   percentage: 30 },
      { candidate_name: "Caiado", percentage:  3 },
      { candidate_name: "Renan",  percentage:  2 },
      { candidate_name: "Zema",   percentage:  1 },
    ],
  },

  // Quaest · 24-28 jul 2026 · TSE BR-03238/2026 · n=1.002 · recorte CE
  // Fonte: https://g1.globo.com/politica/eleicoes/2026/noticia/2026/07/30/eleicoes-2026-presidencial-10-estados-quaest.ghtml
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-30",
    fieldwork_start: "2026-07-24",
    fieldwork_end: "2026-07-28",
    sample_size: 1002,
    margin_of_error: 3.0,
    methodology: "presencial",
    scope: "CE",
    source_url: "https://g1.globo.com/politica/eleicoes/2026/noticia/2026/07/30/eleicoes-2026-presidencial-10-estados-quaest.ghtml",
    tse_protocolo: "BR032382026",
    results: [
      { candidate_name: "Lula",           percentage: 55 },
      { candidate_name: "Flávio",         percentage: 22 },
      { candidate_name: "Renan",          percentage:  2 },
      { candidate_name: "Caiado",         percentage:  1 },
      { candidate_name: "Zema",           percentage:  1 },
      { candidate_name: "Augusto Cury",   percentage:  1 },
      { candidate_name: "Cabo Daciolo",   percentage:  1 },
      { candidate_name: "Samara Martins", percentage:  1 },
    ],
  },

  // Quaest · 23-27 jul 2026 · TSE BR-05856/2026 · n=1.200 · recorte BA
  // Fonte: https://g1.globo.com/politica/eleicoes/2026/noticia/2026/07/30/eleicoes-2026-presidencial-10-estados-quaest.ghtml
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-27",
    fieldwork_start: "2026-07-23",
    fieldwork_end: "2026-07-27",
    sample_size: 1200,
    methodology: "presencial",
    scope: "BA",
    source_url: "https://g1.globo.com/politica/eleicoes/2026/noticia/2026/07/30/eleicoes-2026-presidencial-10-estados-quaest.ghtml",
    tse_protocolo: "BR058562026",
    results: [
      { candidate_name: "Lula",           percentage: 52 },
      { candidate_name: "Flávio",         percentage: 18 },
      { candidate_name: "Caiado",         percentage:  3 },
      { candidate_name: "Renan",          percentage:  1 },
      { candidate_name: "Zema",           percentage:  1 },
      { candidate_name: "Augusto Cury",   percentage:  1 },
      { candidate_name: "Cabo Daciolo",   percentage:  1 },
      { candidate_name: "Samara Martins", percentage:  1 },
    ],
  },

  // Quaest · 23-27 jul 2026 · TSE BR-09998/2026 · n=1.650 · recorte SP
  // Fonte: https://g1.globo.com/politica/eleicoes/2026/noticia/2026/07/30/eleicoes-2026-presidencial-10-estados-quaest.ghtml
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-27",
    fieldwork_start: "2026-07-23",
    fieldwork_end: "2026-07-27",
    sample_size: 1650,
    methodology: "presencial",
    scope: "SP",
    source_url: "https://g1.globo.com/politica/eleicoes/2026/noticia/2026/07/30/eleicoes-2026-presidencial-10-estados-quaest.ghtml",
    tse_protocolo: "BR099982026",
    results: [
      { candidate_name: "Flávio",         percentage: 34 },
      { candidate_name: "Lula",           percentage: 30 },
      { candidate_name: "Renan",          percentage:  3 },
      { candidate_name: "Zema",           percentage:  3 },
      { candidate_name: "Caiado",         percentage:  3 },
      { candidate_name: "Augusto Cury",   percentage:  2 },
      { candidate_name: "Cabo Daciolo",   percentage:  1 },
      { candidate_name: "Samara Martins", percentage:  1 },
    ],
  },

  // Quaest · 22-26 jul 2026 · TSE BR-03810/2026 · n=900 · recorte PE
  // Fonte: https://g1.globo.com/politica/eleicoes/2026/noticia/2026/07/30/eleicoes-2026-presidencial-10-estados-quaest.ghtml
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-26",
    fieldwork_start: "2026-07-22",
    fieldwork_end: "2026-07-26",
    sample_size: 900,
    methodology: "presencial",
    scope: "PE",
    source_url: "https://g1.globo.com/politica/eleicoes/2026/noticia/2026/07/30/eleicoes-2026-presidencial-10-estados-quaest.ghtml",
    tse_protocolo: "BR038102026",
    results: [
      { candidate_name: "Lula",         percentage: 55 },
      { candidate_name: "Flávio",       percentage: 21 },
      { candidate_name: "Augusto Cury", percentage:  2 },
      { candidate_name: "Renan",        percentage:  2 },
      { candidate_name: "Zema",         percentage:  1 },
      { candidate_name: "Caiado",       percentage:  1 },
    ],
  },

  // Real Time Big Data · 23-27 jul 2026 · TSE BR-06074/2026 · n=2.000 · recorte RJ
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/real-time-big-data-flavio-e-lula-tem-empate-tecnico-no-1o-turno-no-rj/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-28",
    fieldwork_start: "2026-07-23",
    fieldwork_end: "2026-07-27",
    sample_size: 2000,
    margin_of_error: 2.0,
    methodology: "telefonica",
    scope: "RJ",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/real-time-big-data-flavio-e-lula-tem-empate-tecnico-no-1o-turno-no-rj/",
    tse_protocolo: "BR060742026",
    results: [
      { candidate_name: "Flávio",       percentage: 39 },
      { candidate_name: "Lula",         percentage: 37 },
      { candidate_name: "Renan",        percentage:  7 },
      { candidate_name: "Caiado",       percentage:  4 },
      { candidate_name: "Zema",         percentage:  3 },
      { candidate_name: "Cabo Daciolo", percentage:  1 },
      { candidate_name: "Augusto Cury", percentage:  1 },
    ],
  },

  // Quaest · 22-26 jul 2026 · TSE BR-09333/2026 · n=1.482 · recorte MG
  // Fonte: https://g1.globo.com/mg/minas-gerais/eleicoes/2026/noticia/2026/07/28/quaest-mg-presidente-julho.ghtml
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-28",
    fieldwork_start: "2026-07-22",
    fieldwork_end: "2026-07-26",
    sample_size: 1482,
    margin_of_error: 3.0,
    methodology: "presencial",
    scope: "MG",
    source_url: "https://g1.globo.com/mg/minas-gerais/eleicoes/2026/noticia/2026/07/28/quaest-mg-presidente-julho.ghtml",
    tse_protocolo: "BR093332026",
    results: [
      { candidate_name: "Lula",   percentage: 30 },
      { candidate_name: "Flávio", percentage: 29 },
      { candidate_name: "Zema",   percentage: 12 },
      { candidate_name: "Caiado", percentage:  4 },
      { candidate_name: "Renan",  percentage:  2 },
    ],
  },

  // Quaest · 21-25 jul 2026 · TSE BR-03445/2026 · n=1.104 · recorte PR
  // Fonte: https://g1.globo.com/pr/parana/noticia/2026/07/27/quaest-parana-presidente-julho.ghtml
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-27",
    fieldwork_start: "2026-07-21",
    fieldwork_end: "2026-07-25",
    sample_size: 1104,
    margin_of_error: 3.0,
    methodology: "presencial",
    scope: "PR",
    source_url: "https://g1.globo.com/pr/parana/noticia/2026/07/27/quaest-parana-presidente-julho.ghtml",
    tse_protocolo: "BR034452026",
    results: [
      { candidate_name: "Flávio",         percentage: 42 },
      { candidate_name: "Lula",           percentage: 24 },
      { candidate_name: "Augusto Cury",   percentage:  2 },
      { candidate_name: "Renan",          percentage:  2 },
      { candidate_name: "Zema",           percentage:  2 },
      { candidate_name: "Caiado",         percentage:  2 },
      { candidate_name: "Samara Martins", percentage:  2 },
    ],
  },

  // Quaest · 21-25 jul 2026 · TSE BR-06752/2026 · n=900 · recorte PA
  // Fonte: https://g1.globo.com/pa/para/eleicoes/2026/noticia/2026/07/27/quaest-para-presidente-julho.ghtml
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-27",
    fieldwork_start: "2026-07-21",
    fieldwork_end: "2026-07-25",
    sample_size: 900,
    margin_of_error: 3.0,
    methodology: "presencial",
    scope: "PA",
    source_url: "https://g1.globo.com/pa/para/eleicoes/2026/noticia/2026/07/27/quaest-para-presidente-julho.ghtml",
    tse_protocolo: "BR067522026",
    results: [
      { candidate_name: "Lula",           percentage: 38 },
      { candidate_name: "Flávio",         percentage: 31 },
      { candidate_name: "Caiado",         percentage:  3 },
      { candidate_name: "Renan",          percentage:  3 },
      { candidate_name: "Augusto Cury",   percentage:  2 },
      { candidate_name: "Samara Martins", percentage:  2 },
    ],
  },

  // Real Time Big Data · 22-25 jul 2026 · TSE BR-08086/2026 · n=1.600 · recorte AC
  // Fonte: https://www.cartacapital.com.br/politica/a-disputa-de-lula-e-flavio-bolsonaro-entre-eleitores-do-acre-segundo-nova-pesquisa/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-27",
    fieldwork_start: "2026-07-22",
    fieldwork_end: "2026-07-25",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "AC",
    source_url: "https://www.cartacapital.com.br/politica/a-disputa-de-lula-e-flavio-bolsonaro-entre-eleitores-do-acre-segundo-nova-pesquisa/",
    tse_protocolo: "BR080862026",
    results: [
      { candidate_name: "Flávio", percentage: 50 },
      { candidate_name: "Lula",   percentage: 30 },
      { candidate_name: "Renan",  percentage:  5 },
      { candidate_name: "Caiado", percentage:  3 },
      { candidate_name: "Zema",   percentage:  2 },
    ],
  },

  // Ipespe · 22-25 jul 2026 · TSE BR-08707/2026 · n=1.000 · recorte PE (contratante Folha de Pernambuco)
  // Fonte: https://jamildo.com/politica/lula-tem-mais-que-o-dobro-de-votos-de-flavio-bolsonaro-em-pernambuco-aponta-ipespe.html
  {
    institute_name: "Ipespe",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-28",
    fieldwork_start: "2026-07-22",
    fieldwork_end: "2026-07-25",
    sample_size: 1000,
    methodology: "presencial",
    scope: "PE",
    source_url: "https://jamildo.com/politica/lula-tem-mais-que-o-dobro-de-votos-de-flavio-bolsonaro-em-pernambuco-aponta-ipespe.html",
    tse_protocolo: "BR087072026",
    results: [
      { candidate_name: "Lula",         percentage: 58 },
      { candidate_name: "Flávio",       percentage: 20 },
      { candidate_name: "Caiado",       percentage:  3 },
      { candidate_name: "Renan",        percentage:  2 },
      { candidate_name: "Augusto Cury", percentage:  1 },
      { candidate_name: "Cabo Daciolo", percentage:  1 },
    ],
  },

  // Quaest · 21-25 jul 2026 · TSE BR-07670/2026 · n=1.200 · recorte RJ (contratante Banco Genial)
  // Fonte: https://www.cartacapital.com.br/politica/a-disputa-pela-presidencia-entre-os-eleitores-do-rj-segundo-nova-pesquisa/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-27",
    fieldwork_start: "2026-07-21",
    fieldwork_end: "2026-07-25",
    sample_size: 1200,
    methodology: "presencial",
    scope: "RJ",
    source_url: "https://www.cartacapital.com.br/politica/a-disputa-pela-presidencia-entre-os-eleitores-do-rj-segundo-nova-pesquisa/",
    tse_protocolo: "BR076702026",
    results: [
      { candidate_name: "Flávio", percentage: 32 },
      { candidate_name: "Lula",   percentage: 30 },
      { candidate_name: "Caiado", percentage:  3 },
      { candidate_name: "Renan",  percentage:  2 },
      { candidate_name: "Zema",   percentage:  2 },
    ],
  },

  // Real Time Big Data · 19-23 jul 2026 · TSE BR-05542/2026 · n=1.600 · recorte AP
  // Fonte: https://www.cartacapital.com.br/politica/a-disputa-entre-lula-e-flavio-bolsonaro-no-amapa-segundo-o-real-time-big-data/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-24",
    fieldwork_start: "2026-07-19",
    fieldwork_end: "2026-07-23",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "AP",
    source_url: "https://www.cartacapital.com.br/politica/a-disputa-entre-lula-e-flavio-bolsonaro-no-amapa-segundo-o-real-time-big-data/",
    tse_protocolo: "BR055422026",
    results: [
      { candidate_name: "Lula",   percentage: 36 },
      { candidate_name: "Flávio", percentage: 31 },
      { candidate_name: "Caiado", percentage:  8 },
      { candidate_name: "Renan",  percentage:  7 },
    ],
  },

  // Atlas Intel · 16-21 jul 2026 · TSE BR-07335/2026 · n=1.245 · recorte RN (contratante 94 FM)
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/lula-venceria-eleicao-no-1o-turno-no-rn-diz-pesquisa/
  {
    institute_name: "Atlas Intel",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-07-22",
    fieldwork_start: "2026-07-16",
    fieldwork_end: "2026-07-21",
    sample_size: 1245,
    methodology: "online",
    scope: "RN",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/lula-venceria-eleicao-no-1o-turno-no-rn-diz-pesquisa/",
    tse_protocolo: "BR073352026",
    results: [
      { candidate_name: "Lula",   percentage: 56.9 },
      { candidate_name: "Flávio", percentage: 28.5 },
    ],
  },

  // ─── Curadoria 01/09/2026 — lote 13 (Tier 2/3, Governador, achados de julho) ──

  // Real Time Big Data · 28 jul-1 ago 2026 · TSE SE-07327/2026 · n=1.600
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/mitidieri-e-francisquinho-empatam-em-pesquisa-para-governo-de-sergipe/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Sergipe 2026",
    publication_date: "2026-08-03",
    fieldwork_start: "2026-07-28",
    fieldwork_end: "2026-08-01",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/mitidieri-e-francisquinho-empatam-em-pesquisa-para-governo-de-sergipe/",
    tse_protocolo: "SE073272026",
    results: [
      { candidate_name: "Fabio Mitidieri", percentage: 43 },
      { candidate_name: "Valmir",          percentage: 40 },
      { candidate_name: "Ricardo Marques", percentage:  6 },
      { candidate_name: "Emanuel Cacho",   percentage:  2 },
      { candidate_name: "Dr. Helton",      percentage:  1 },
    ],
  },

  // Real Time Big Data · 25-29 jul 2026 · TSE MG-06475/2026 · n=2.000
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-minas-gerais-julho-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador MG 2026 - 1º Turno",
    publication_date: "2026-07-30",
    fieldwork_start: "2026-07-25",
    fieldwork_end: "2026-07-29",
    sample_size: 2000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-minas-gerais-julho-2026/",
    tse_protocolo: "MG064752026",
    results: [
      { candidate_name: "Cleitinho",             percentage: 36 },
      { candidate_name: "Alexandre Kalil",       percentage: 15 },
      { candidate_name: "Patrus Ananias",        percentage: 14 },
      { candidate_name: "Mateus Simões",         percentage: 10 },
      { candidate_name: "Gabriel Azevedo",       percentage:  7 },
      { candidate_name: "Vittorio Medioli",      percentage:  3 },
      { candidate_name: "Maria da Consolação",   percentage:  3 },
    ],
  },

  // ─── Curadoria 02/09/2026 — lote 14 (Tier 2/3, Governador, mais achados de julho/agosto) ──

  // Real Time Big Data · 14-18 ago 2026 · TSE DF-07849/2026 · n=1.600
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/real-time-celina-lidera-todos-os-cenarios-1o-e-2o-turnos-ao-governo-do-df/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Distrito Federal 2026",
    publication_date: "2026-08-19",
    fieldwork_start: "2026-08-14",
    fieldwork_end: "2026-08-18",
    sample_size: 1600,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/real-time-celina-lidera-todos-os-cenarios-1o-e-2o-turnos-ao-governo-do-df/",
    tse_protocolo: "DF078492026",
    results: [
      { candidate_name: "Celina Leao",      percentage: 34 },
      { candidate_name: "Arruda",           percentage: 22 },
      { candidate_name: "Leandro Grass",    percentage: 18 },
      { candidate_name: "Paula Belmonte",   percentage:  6 },
      { candidate_name: "Ricardo Cappelli", percentage:  5 },
    ],
  },

  // Real Time Big Data · 22-25 jul 2026 · TSE AC-01069/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/eal-time-big-data-governador-senador-acre-julho-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Acre 2026",
    publication_date: "2026-07-27",
    fieldwork_start: "2026-07-22",
    fieldwork_end: "2026-07-25",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/eal-time-big-data-governador-senador-acre-julho-2026/",
    tse_protocolo: "AC010692026",
    results: [
      { candidate_name: "Alan Rick",     percentage: 38 },
      { candidate_name: "Mailza Assis",  percentage: 28 },
      { candidate_name: "Tiao Bocalom",  percentage: 17 },
      { candidate_name: "Thor Dantas",   percentage:  7 },
    ],
  },

  // Real Time Big Data · 19-23 jul 2026 · TSE AP-02970/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-amapa-julho-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Amapa 2026",
    publication_date: "2026-07-24",
    fieldwork_start: "2026-07-19",
    fieldwork_end: "2026-07-23",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-amapa-julho-2026/",
    tse_protocolo: "AP029702026",
    results: [
      { candidate_name: "Dr Furlan",   percentage: 66 },
      { candidate_name: "Clecio Luis", percentage: 30 },
    ],
  },

  // Real Time Big Data · 23-27 jul 2026 · TSE RJ-03487/2026 · n=2.000
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-rio-de-janeiro-julho-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador RJ 2026 - 1º Turno",
    publication_date: "2026-07-28",
    fieldwork_start: "2026-07-23",
    fieldwork_end: "2026-07-27",
    sample_size: 2000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-rio-de-janeiro-julho-2026/",
    tse_protocolo: "RJ034872026",
    results: [
      { candidate_name: "Eduardo Paes",      percentage: 37 },
      { candidate_name: "Douglas Ruas",      percentage: 16 },
      { candidate_name: "Anthony Garotinho", percentage: 12 },
      { candidate_name: "William Siri",      percentage:  3 },
      { candidate_name: "André Marinho",     percentage:  2 },
      { candidate_name: "Coronel Busnello",  percentage:  2 },
      { candidate_name: "Cyro Garcia",       percentage:  1 },
      { candidate_name: "Juliete Pantoja",   percentage:  1 },
    ],
  },

  // Real Time Big Data · 18-22 jul 2026 · TSE RJ-06039/2026 · n=1.600 (pesquisa distinta da rodada acima, testou "Rafael Luz" em vez de outros nomes)
  // Fonte: https://francesnews.com.br/post/2026/07/26/32936-pesquisa-real-time-big-data-aponta-eduardo-paes-como-favorito-na-disputa-pelo-governo-do-rio
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador RJ 2026 - 1º Turno",
    publication_date: "2026-07-28",
    fieldwork_start: "2026-07-18",
    fieldwork_end: "2026-07-22",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://francesnews.com.br/post/2026/07/26/32936-pesquisa-real-time-big-data-aponta-eduardo-paes-como-favorito-na-disputa-pelo-governo-do-rio",
    tse_protocolo: "RJ060392026",
    results: [
      { candidate_name: "Eduardo Paes",      percentage: 38 },
      { candidate_name: "Douglas Ruas",      percentage: 10 },
      { candidate_name: "Anthony Garotinho", percentage: 10 },
      { candidate_name: "William Siri",      percentage:  2 },
    ],
  },

  // Real Time Big Data · 20-21 jul 2026 · TSE ES-04482/2026 · n=1.600
  // Fonte: https://exame.com/brasil/real-time-big-data-ferraco-tem-41-e-pazolini-30-no-1o-turno-no-espirito-santo/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador Espirito Santo 2026",
    publication_date: "2026-07-22",
    fieldwork_start: "2026-07-20",
    fieldwork_end: "2026-07-21",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://exame.com/brasil/real-time-big-data-ferraco-tem-41-e-pazolini-30-no-1o-turno-no-espirito-santo/",
    tse_protocolo: "ES044822026",
    results: [
      { candidate_name: "Ricardo Ferraco",  percentage: 41 },
      { candidate_name: "Lorenzo Pazolini", percentage: 30 },
      { candidate_name: "Helder Salomao",   percentage: 10 },
    ],
  },

  // Real Time Big Data · 27-30 jul 2026 · TSE PE-08413/2026 · n=1.600
  // Fonte: https://exame.com/brasil/real-time-big-data-lyra-tem-44-e-campos-42-no-1o-turno-em-pernambuco/
  {
    institute_name: "Real Time Big Data",
    election_name: "Governador PE 2026 - 1º Turno",
    publication_date: "2026-07-31",
    fieldwork_start: "2026-07-27",
    fieldwork_end: "2026-07-30",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://exame.com/brasil/real-time-big-data-lyra-tem-44-e-campos-42-no-1o-turno-em-pernambuco/",
    tse_protocolo: "PE084132026",
    results: [
      { candidate_name: "Raquel Lyra",  percentage: 44 },
      { candidate_name: "João Campos", percentage: 42 },
      { candidate_name: "Ivan Moraes", percentage:  3 },
      { candidate_name: "Renan",       percentage:  1 },
    ],
  },

  // ─── Curadoria 02/09/2026 — Presidencial "recorte estadual" (mesma janela de campo
  // das pesquisas de Governador já curadas acima, protocolo TSE separado por cargo) ──

  // Real Time Big Data · 24-27 ago 2026 · TSE BR-08492/2026 · n=1.600 · recorte GO
  // Fonte: https://exame.com/brasil/real-time-big-data-caiado-tem-37-lula-27-e-flavio-25-no-1o-turno-em-goias/
  // Mesma rodada da pesquisa de Governador GO já curada (TSE GO-00954/2026, lote 5) —
  // aqui é o cross-tab presidencial da mesma coleta, registrado sob protocolo BR distinto.
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-27",
    sample_size: 1600,
    margin_of_error: 2.0,
    methodology: "telefonica",
    scope: "GO",
    source_url: "https://exame.com/brasil/real-time-big-data-caiado-tem-37-lula-27-e-flavio-25-no-1o-turno-em-goias/",
    tse_protocolo: "BR084922026",
    results: [
      { candidate_name: "Caiado", percentage: 37 },
      { candidate_name: "Lula",   percentage: 27 },
      { candidate_name: "Flávio", percentage: 25 },
    ],
  },

  // Real Time Big Data · 6-10 ago 2026 · TSE BR-05205/2026 · n=1.600 · recorte BA
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/real-time-lula-tem-56-contra-23-de-flavio-no-1o-turno-na-bahia/
  // Mesma rodada da pesquisa de Governador BA já curada (TSE BA-00277/2026) — cross-tab
  // presidencial da mesma coleta, registrado sob protocolo BR distinto.
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-11",
    fieldwork_start: "2026-08-06",
    fieldwork_end: "2026-08-10",
    sample_size: 1600,
    margin_of_error: 2.0,
    methodology: "telefonica",
    scope: "BA",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/real-time-lula-tem-56-contra-23-de-flavio-no-1o-turno-na-bahia/",
    tse_protocolo: "BR052052026",
    results: [
      { candidate_name: "Lula",   percentage: 56 },
      { candidate_name: "Flávio", percentage: 23 },
      { candidate_name: "Renan",  percentage:  5 },
      { candidate_name: "Caiado", percentage:  3 },
    ],
  },

  // ─── Curadoria 02/09/2026 — lote 15 (Tier 4, Senador, reaproveitando fontes já curadas) ──

  // Instituto Índice Inteligência · 27-29 ago 2026 · TSE AL-05894/2026 · n=1.200
  // Fonte: https://www.al102.com.br/noticias/31003/jhc-consolida-lideranca-isolada-com-47-6-das-intencoes-de-voto-para-o-governo-de-alagoas-aponta-pesquisa-nova-fm
  // Nota: soma >100% porque são 2 vagas em disputa (cada eleitor pode votar em até 2 nomes) — citação verbatim da matéria.
  {
    institute_name: "Instituto Índice Inteligência",
    election_name: "Senador Alagoas 2026",
    publication_date: "2026-09-01",
    fieldwork_start: "2026-08-27",
    fieldwork_end: "2026-08-29",
    sample_size: 1200,
    margin_of_error: 2.83,
    methodology: "presencial",
    source_url: "https://www.al102.com.br/noticias/31003/jhc-consolida-lideranca-isolada-com-47-6-das-intencoes-de-voto-para-o-governo-de-alagoas-aponta-pesquisa-nova-fm",
    tse_protocolo: "AL058942026",
    results: [
      { candidate_name: "Arthur Lira",        percentage: 36.28 },
      { candidate_name: "Marina Jhc",         percentage: 31.42 },
      { candidate_name: "Renan Calheiros",    percentage: 28.65 },
      { candidate_name: "Davi Davino Filho",  percentage: 20.45 },
      { candidate_name: "Dr. Wanderley",      percentage: 12.20 },
      { candidate_name: "Mariedson",          percentage:  2.25 },
      { candidate_name: "Alexandre Fleming",  percentage:  0.85 },
    ],
  },

  // Instituto Veritá · 19-23 ago 2026 · TSE PA-04167/2026 · n=1.525 · consolidado dos 2 votos (2 vagas em disputa)
  // Fonte: https://diariodopoder.com.br/brasil-e-regioes/amazonia/ttc-amazonia/dr-daniel-lidera-disputa-pelo-governo-do-para-flavio-e-lula-empatam/amp
  {
    institute_name: "Instituto Veritá",
    election_name: "Senador Para 2026",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-23",
    sample_size: 1525,
    margin_of_error: 2.5,
    methodology: "telefonica",
    source_url: "https://diariodopoder.com.br/brasil-e-regioes/amazonia/ttc-amazonia/dr-daniel-lidera-disputa-pelo-governo-do-para-flavio-e-lula-empatam/amp",
    tse_protocolo: "PA041672026",
    results: [
      { candidate_name: "Eder Mauro",        percentage: 36.3 },
      { candidate_name: "Helder Barbalho",   percentage: 25.0 },
      { candidate_name: "Celso Sabino",      percentage: 15.7 },
      { candidate_name: "Zequinha Marinho",  percentage: 14.7 },
      { candidate_name: "Chicão",            percentage: 12.5 },
    ],
  },

  // Real Time Big Data · 30 jul-3 ago 2026 · TSE PA-08492/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-para-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Para 2026",
    publication_date: "2026-08-04",
    fieldwork_start: "2026-07-30",
    fieldwork_end: "2026-08-03",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-para-agosto-2026/",
    tse_protocolo: "PA084922026",
    results: [
      { candidate_name: "Helder Barbalho",  percentage: 40 },
      { candidate_name: "Eder Mauro",       percentage: 16 },
      { candidate_name: "Celso Sabino",     percentage: 12 },
      { candidate_name: "Zequinha Marinho", percentage: 11 },
      { candidate_name: "Chicão",           percentage: 10 },
      { candidate_name: "Breno Guimarães",  percentage:  1 },
      { candidate_name: "Gizelle Freitas",  percentage:  1 },
      { candidate_name: "Livia Noronha",    percentage:  1 },
    ],
  },

  // Real Time Big Data · 12-15 ago 2026 · TSE PE-06056/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-pernambuco-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Pernambuco 2026",
    publication_date: "2026-08-17",
    fieldwork_start: "2026-08-12",
    fieldwork_end: "2026-08-15",
    sample_size: 1600,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-pernambuco-agosto-2026/",
    tse_protocolo: "PE060562026",
    results: [
      { candidate_name: "Marilia Arraes",       percentage: 29 },
      { candidate_name: "Humberto Costa",       percentage: 20 },
      { candidate_name: "Mendonça Filho",       percentage: 18 },
      { candidate_name: "Eduardo da Fonte",     percentage: 12 },
      { candidate_name: "Tulio Gadelha",        percentage: 11 },
      { candidate_name: "Carlos Sant Anna",     percentage:  2 },
      { candidate_name: "Paulo Rubem Santiago", percentage:  1 },
    ],
  },

  // Real Time Big Data · 7-11 ago 2026 · TSE MT-04560/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-mato-grosso-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Mato Grosso 2026",
    publication_date: "2026-08-12",
    fieldwork_start: "2026-08-07",
    fieldwork_end: "2026-08-11",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-mato-grosso-agosto-2026/",
    tse_protocolo: "MT045602026",
    results: [
      { candidate_name: "Mauro Mendes",         percentage: 27 },
      { candidate_name: "Janaina Riva",         percentage: 25 },
      { candidate_name: "Carlos Favaro",        percentage: 13 },
      { candidate_name: "Jose Medeiros",        percentage: 12 },
      { candidate_name: "Pedro Taques",         percentage: 11 },
      { candidate_name: "Galvan",               percentage:  4 },
      { candidate_name: "Margareth Buzetti",    percentage:  4 },
    ],
  },

  // Real Time Big Data · 6-10 ago 2026 · TSE BA-00277/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-bahia-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Bahia 2026",
    publication_date: "2026-08-11",
    fieldwork_start: "2026-08-06",
    fieldwork_end: "2026-08-10",
    sample_size: 1600,
    margin_of_error: 2.0,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-bahia-agosto-2026/",
    tse_protocolo: "BA002772026",
    results: [
      { candidate_name: "Rui Costa",             percentage: 25 },
      { candidate_name: "Jaques Wagner",         percentage: 20 },
      { candidate_name: "Joao Roma",             percentage: 15 },
      { candidate_name: "Professora Delliana",   percentage:  5 },
      { candidate_name: "Carlos Sodré",          percentage:  1 },
      { candidate_name: "Marcelo Carvalho",      percentage:  1 },
      { candidate_name: "Marcelo Santtana",      percentage:  1 },
    ],
  },

  // Quaest (Genial) · 21-25 jul 2026 · TSE RJ-02671/2026 · n=1.200 · cenário estimulado 2
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-rio-de-janeiro-julho-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Rio de Janeiro 2026",
    publication_date: "2026-07-27",
    fieldwork_start: "2026-07-21",
    fieldwork_end: "2026-07-25",
    sample_size: 1200,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-rio-de-janeiro-julho-2026/",
    tse_protocolo: "RJ026712026",
    results: [
      { candidate_name: "Benedita da Silva", percentage: 12 },
      { candidate_name: "Marcelo Crivella",  percentage:  9 },
      { candidate_name: "Carlos Portinho",   percentage:  4 },
      { candidate_name: "Mônica Benício",    percentage:  4 },
      { candidate_name: "Pedro Paulo",       percentage:  4 },
      { candidate_name: "Waguinho",          percentage:  4 },
      { candidate_name: "Marcos Dias",       percentage:  1 },
    ],
  },

  // Quaest (Genial) · 24-28 jul 2026 · TSE GO-01701/2026 · n=1.104
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-goias-julho-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Goias 2026",
    publication_date: "2026-07-30",
    fieldwork_start: "2026-07-24",
    fieldwork_end: "2026-07-28",
    sample_size: 1104,
    margin_of_error: 3.0,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-goias-julho-2026/",
    tse_protocolo: "GO017012026",
    results: [
      { candidate_name: "Gracinha Caiado",    percentage: 20 },
      { candidate_name: "Vanderlan Cardoso",  percentage: 10 },
      { candidate_name: "Zacarias Calil",     percentage:  9 },
      { candidate_name: "Gustavo Gayer",      percentage:  9 },
      { candidate_name: "Gustavo Mendanha",   percentage:  6 },
    ],
  },

  // ─── Curadoria 02/09/2026 — lote 16 (Tier 4, Senador, reaproveitando fontes de Governador) ──
  // Mesmas pesquisas "Governador e Senado" já curadas pro Governador; extraindo aqui a parte
  // de Senado que ainda não tinha sido inserida. Nomes conferidos contra candidates E contra
  // o arquivo oficial de candidaturas do TSE (consulta_cand_2026.zip) antes de inserir —
  // Marcio Canella (RJ), Euclydes Pettersen (MG) e Nelsinho Trad (MS) foram descartados por
  // não constarem no arquivo do TSE pra Senador nesse estado; Fernando Moraes (MS), Adailton
  // Sousa (SE), Paulo Gamine/Luciana Boiteux/Professor Túlio (RJ) e Teles Júnior (AP) foram
  // descartados por não terem candidato correspondente em `candidates`.

  // Instituto Veritá · 24-28 ago 2026 · TSE AM-02151/2026 · n=1.220 · consolidado dos 2 votos (2 vagas)
  // Fonte: https://diariodopoder.com.br/brasil-e-regioes/csa-brasil/alberto-neto-e-eduardo-braga-lideram-ao-senado-no-amazonas
  {
    institute_name: "Instituto Veritá",
    election_name: "Senador Amazonas 2026",
    publication_date: "2026-08-29",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-28",
    sample_size: 1220,
    methodology: "telefonica",
    source_url: "https://diariodopoder.com.br/brasil-e-regioes/csa-brasil/alberto-neto-e-eduardo-braga-lideram-ao-senado-no-amazonas",
    tse_protocolo: "AM021512026",
    results: [
      { candidate_name: "Capitao Alberto Neto", percentage: 52.7 },
      { candidate_name: "Eduardo Braga",        percentage: 37.2 },
      { candidate_name: "Plinio Valerio",       percentage: 24.1 },
      { candidate_name: "Wilson Lima",          percentage: 15.5 },
      { candidate_name: "Ismael Munduruku",     percentage:  3.6 },
      { candidate_name: "Professora Evany",     percentage:  3.4 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE SE-03536/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-sergipe-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Sergipe 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-sergipe-agosto-2026/",
    tse_protocolo: "SE035362026",
    results: [
      { candidate_name: "Delegado André David",  percentage: 11 },
      { candidate_name: "Rogerio Carvalho",       percentage: 11 },
      { candidate_name: "Andre Moura",            percentage:  9 },
      { candidate_name: "Delegado Alessandro",    percentage:  8 },
      { candidate_name: "Eduardo Amorim",         percentage:  7 },
      { candidate_name: "Rodrigo Valadares",      percentage:  7 },
      { candidate_name: "Edvaldo",                percentage:  6 },
      { candidate_name: "Coronel Rocha",          percentage:  2 },
      { candidate_name: "Iran Barbosa",           percentage:  2 },
      { candidate_name: "Renatinha",              percentage:  1 },
      { candidate_name: "Paulinho da União Tur",  percentage:  1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE AC-09106/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-acre-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Acre 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-acre-agosto-2026/",
    tse_protocolo: "AC091062026",
    results: [
      { candidate_name: "Gladson Cameli",           percentage: 19 },
      { candidate_name: "Marcio Bittar",             percentage: 14 },
      { candidate_name: "Mara Rocha",                percentage: 12 },
      { candidate_name: "Jorge Viana",                percentage: 12 },
      { candidate_name: "Sérgio Petecão",             percentage:  8 },
      { candidate_name: "Eduardo Velloso",            percentage:  5 },
      { candidate_name: "Dr. Junior Feitosa",         percentage:  1 },
      { candidate_name: "Professor Inacio Moreira",   percentage:  1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE GO-06186/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-goias-agosto-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Goias 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-goias-agosto-2026/",
    tse_protocolo: "GO061862026",
    results: [
      { candidate_name: "Gracinha Caiado",   percentage: 21 },
      { candidate_name: "Gustavo Gayer",     percentage: 12 },
      { candidate_name: "Vanderlan Cardoso", percentage:  9 },
      { candidate_name: "Zacarias Calil",    percentage:  9 },
      { candidate_name: "Gustavo Mendanha",  percentage:  6 },
      { candidate_name: "Isaura Lemos",      percentage:  3 },
      { candidate_name: "Oséias Varão",      percentage:  3 },
      { candidate_name: "Cintia Dias",       percentage:  2 },
      { candidate_name: "Ernesto Roller",    percentage:  1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE BA-06206/2026 · n=900
  // Fonte: https://g1.globo.com/ba/bahia/eleicoes/2026/noticia/2026/08/27/quaest-ba-senado-27-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Senador Bahia 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 900,
    methodology: "presencial",
    source_url: "https://g1.globo.com/ba/bahia/eleicoes/2026/noticia/2026/08/27/quaest-ba-senado-27-agosto.ghtml",
    tse_protocolo: "BA062062026",
    results: [
      { candidate_name: "Rui Costa",             percentage: 23 },
      { candidate_name: "Jaques Wagner",         percentage: 17 },
      { candidate_name: "Joao Roma",             percentage:  7 },
      { candidate_name: "Angelo Coronel",        percentage:  5 },
      { candidate_name: "Professora Delliana",   percentage:  2 },
    ],
  },

  // Vetor/Arrow · 24-25 ago 2026 · TSE RJ-06400/2026 · n=14.277 · pesquisa ESPONTÂNEA (sem lista de nomes)
  // Fonte: https://agendadopoder.com.br/vetor-arrow-benedita-lidera-pesquisa-espontanea-para-o-senado/
  {
    institute_name: "Vetor/Arrow",
    election_name: "Senador Rio de Janeiro 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-25",
    sample_size: 14277,
    methodology: "telefonica",
    poll_type: "espontanea",
    source_url: "https://agendadopoder.com.br/vetor-arrow-benedita-lidera-pesquisa-espontanea-para-o-senado/",
    tse_protocolo: "RJ064002026",
    results: [
      { candidate_name: "Benedita da Silva", percentage: 6.7 },
      { candidate_name: "Carlos Jordy",       percentage: 1.8 },
      { candidate_name: "Marcelo Crivella",   percentage: 1.2 },
      { candidate_name: "Pedro Paulo",        percentage: 0.9 },
      { candidate_name: "Carlos Portinho",    percentage: 0.9 },
      { candidate_name: "Mônica Benício",     percentage: 0.2 },
      { candidate_name: "Waguinho",           percentage: 0.1 },
      { candidate_name: "Hélio Secco",        percentage: 0.1 },
      { candidate_name: "Marcos Dias",        percentage: 0.1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE DF-06256/2026 · n=1.104
  // Fonte: https://g1.globo.com/df/distrito-federal/eleicoes/2026/noticia/2026/08/25/quaest-df-senado-25-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Senador Distrito Federal 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1104,
    methodology: "presencial",
    source_url: "https://g1.globo.com/df/distrito-federal/eleicoes/2026/noticia/2026/08/25/quaest-df-senado-25-agosto.ghtml",
    tse_protocolo: "DF062562026",
    results: [
      { candidate_name: "Michelle Bolsonaro", percentage: 25 },
      { candidate_name: "Leila Barros",        percentage: 17 },
      { candidate_name: "Érika Kokay",         percentage: 12 },
      { candidate_name: "Bia Kicis",           percentage:  9 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE SP-06946/2026 · n=1.800
  // Fonte: https://g1.globo.com/sp/sao-paulo/eleicoes/2026/noticia/2026/08/25/quaest-sp-senado-25-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Senador Sao Paulo 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1800,
    methodology: "presencial",
    source_url: "https://g1.globo.com/sp/sao-paulo/eleicoes/2026/noticia/2026/08/25/quaest-sp-senado-25-agosto.ghtml",
    tse_protocolo: "SP069462026",
    results: [
      { candidate_name: "Guilherme Derrite", percentage: 12 },
      { candidate_name: "Marina Silva",      percentage: 12 },
      { candidate_name: "Simone Tebet",      percentage: 11 },
      { candidate_name: "Andre do Prado",    percentage:  7 },
      { candidate_name: "Ricardo Salles",    percentage:  4 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE TO-02161/2026 · n=804
  // Fonte: https://g1.globo.com/to/tocantins/eleicoes/2026/noticia/2026/08/25/quaest-to-senado-25-de-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Senador Tocantins 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://g1.globo.com/to/tocantins/eleicoes/2026/noticia/2026/08/25/quaest-to-senado-25-de-agosto.ghtml",
    tse_protocolo: "TO021612026",
    results: [
      { candidate_name: "Eduardo Gomes",        percentage: 14 },
      { candidate_name: "Carlos Gaguim",        percentage: 13 },
      { candidate_name: "Paulo Mourão",         percentage:  9 },
      { candidate_name: "Alexandre Guimarães",  percentage:  8 },
      { candidate_name: "Ronaldo Dimas",        percentage:  6 },
      { candidate_name: "Vanderlei Luxemburgo", percentage:  5 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE MG-04060/2026 · n=1.506
  // Fonte: https://g1.globo.com/mg/minas-gerais/eleicoes/2026/noticia/2026/08/26 (redirecionado, mesmo protocolo TSE)
  {
    institute_name: "Quaest",
    election_name: "Senador Minas Gerais 2026",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1506,
    methodology: "presencial",
    source_url: "https://www.cartacapital.com.br/politica/cleitinho-lidera-disputa-pelo-governo-de-minas-gerais-diz-pesquisa-quaest/",
    tse_protocolo: "MG040602026",
    results: [
      { candidate_name: "Marilia Campos",          percentage: 15 },
      { candidate_name: "Carlos Viana",             percentage:  8 },
      { candidate_name: "Domingos Savio",           percentage:  8 },
      { candidate_name: "Marcelo Aro",              percentage:  6 },
      { candidate_name: "Aurea Carolina",           percentage:  2 },
      { candidate_name: "Marco Antônio Superman",   percentage:  2 },
      { candidate_name: "Carlin Moura",             percentage:  2 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE RJ-08748/2026 · n=1.302
  // Fonte: https://g1.globo.com/rj/rio-de-janeiro/eleicoes/2026/noticia/2026/08/25/quaest-rj-senado-25-08.ghtml
  {
    institute_name: "Quaest",
    election_name: "Senador Rio de Janeiro 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1302,
    methodology: "presencial",
    source_url: "https://g1.globo.com/rj/rio-de-janeiro/eleicoes/2026/noticia/2026/08/25/quaest-rj-senado-25-08.ghtml",
    tse_protocolo: "RJ087482026",
    results: [
      { candidate_name: "Benedita da Silva", percentage: 10 },
      { candidate_name: "Carlos Jordy",       percentage:  7 },
      { candidate_name: "Marcelo Crivella",   percentage:  6 },
      { candidate_name: "Mônica Benício",     percentage:  5 },
      { candidate_name: "Carlos Portinho",    percentage:  5 },
      { candidate_name: "Pedro Paulo",        percentage:  3 },
      { candidate_name: "Waguinho",           percentage:  2 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE PE-07828/2026 · n=1.302
  // Fonte: https://g1.globo.com/pe/pernambuco/eleicoes/2026/noticia/2026/08/25/quaest-pe-senado-25-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Senador Pernambuco 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1302,
    methodology: "presencial",
    source_url: "https://g1.globo.com/pe/pernambuco/eleicoes/2026/noticia/2026/08/25/quaest-pe-senado-25-agosto.ghtml",
    tse_protocolo: "PE078282026",
    results: [
      { candidate_name: "Marilia Arraes",   percentage: 16 },
      { candidate_name: "Humberto Costa",   percentage: 13 },
      { candidate_name: "Mendonça Filho",   percentage:  9 },
      { candidate_name: "Eduardo da Fonte", percentage:  6 },
      { candidate_name: "Tulio Gadelha",    percentage:  3 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE RO-05711/2026 · n=804
  // Fonte: https://g1.globo.com/ro/rondonia/eleicoes/2026/noticia/2026/08/25/quaest-ro-senado-25-de-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Senador Rondonia 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://g1.globo.com/ro/rondonia/eleicoes/2026/noticia/2026/08/25/quaest-ro-senado-25-de-agosto.ghtml",
    tse_protocolo: "RO057112026",
    results: [
      { candidate_name: "Fernando Máximo",   percentage: 17 },
      { candidate_name: "Sílvia Cristina",   percentage: 11 },
      { candidate_name: "Bruno Scheid",      percentage: 11 },
      { candidate_name: "Mariana Carvalho",  percentage: 10 },
      { candidate_name: "Acir Gurgacz",      percentage:  5 },
      { candidate_name: "Luciana Oliveira",  percentage:  4 },
      { candidate_name: "Engenheiro Thulio", percentage:  1 },
      { candidate_name: "Luis Fernando",     percentage:  1 },
      { candidate_name: "Neidinha",          percentage:  1 },
    ],
  },

  // Quaest · 20-23 ago 2026 · TSE RS-06875/2026 · n=900 · consolidado dos 2 votos (2 vagas)
  // Fonte: https://g1.globo.com/rs/rio-grande-do-sul/eleicoes/2026/noticia/2026/08/24/quaest-rs-senado-24-agosto.ghtml
  {
    institute_name: "Quaest",
    election_name: "Senador Rio Grande do Sul 2026",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-23",
    sample_size: 900,
    methodology: "presencial",
    source_url: "https://g1.globo.com/rs/rio-grande-do-sul/eleicoes/2026/noticia/2026/08/24/quaest-rs-senado-24-agosto.ghtml",
    tse_protocolo: "RS068752026",
    results: [
      { candidate_name: "Manuela d'Ávila",             percentage: 12 },
      { candidate_name: "Paulo Pimenta",                percentage:  9 },
      { candidate_name: "Marcel Van Hattem",            percentage:  9 },
      { candidate_name: "Sanderson",                    percentage:  8 },
      { candidate_name: "Germano Rigotto",              percentage:  8 },
      { candidate_name: "Daniela Mulheres Socialistas", percentage:  1 },
      { candidate_name: "Frederico Antunes",            percentage:  1 },
      { candidate_name: "Milton Cardoso",                percentage:  1 },
    ],
  },

  // Vetor/Arrow · 17-18 ago 2026 · TSE RJ-00630/2026 · n=14.000 · pesquisa ESPONTÂNEA (sem lista de nomes)
  // Fonte: https://agendadopoder.com.br/vetor-arrow-benedita-lidera-senado-em-todas-as-regioes-e-pedro-paulo-dobra-de-tamanho/
  {
    institute_name: "Vetor/Arrow",
    election_name: "Senador Rio de Janeiro 2026",
    publication_date: "2026-08-20",
    fieldwork_start: "2026-08-17",
    fieldwork_end: "2026-08-18",
    sample_size: 14000,
    methodology: "telefonica",
    poll_type: "espontanea",
    source_url: "https://agendadopoder.com.br/vetor-arrow-benedita-lidera-senado-em-todas-as-regioes-e-pedro-paulo-dobra-de-tamanho/",
    tse_protocolo: "RJ006302026",
    results: [
      { candidate_name: "Benedita da Silva", percentage: 6.0 },
      { candidate_name: "Carlos Jordy",       percentage: 1.3 },
      { candidate_name: "Pedro Paulo",        percentage: 1.1 },
      { candidate_name: "Carlos Portinho",    percentage: 0.9 },
      { candidate_name: "Marcelo Crivella",   percentage: 0.7 },
      { candidate_name: "Mônica Benício",     percentage: 0.2 },
      { candidate_name: "Marcos Dias",        percentage: 0.1 },
    ],
  },

  // Real Time Big Data · 13-17 ago 2026 · TSE PR-09262/2026 · n=1.600 · consolidado dos 2 votos (2 vagas)
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/real-time-senado-pr-dallagnol-tem-19-curi-e-filipe-barros-17/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Parana 2026",
    publication_date: "2026-08-19",
    fieldwork_start: "2026-08-13",
    fieldwork_end: "2026-08-17",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/real-time-senado-pr-dallagnol-tem-19-curi-e-filipe-barros-17/",
    tse_protocolo: "PR092622026",
    results: [
      { candidate_name: "Deltan Dallagnol", percentage: 19 },
      { candidate_name: "Alexandre Curi",   percentage: 17 },
      { candidate_name: "Filipe Barros",    percentage: 17 },
      { candidate_name: "Gleisi Hoffmann",  percentage: 15 },
      { candidate_name: "Cristina Graeml",  percentage: 13 },
      { candidate_name: "Dr Rosinha",       percentage:  5 },
      { candidate_name: "Joaquim do Mlb",   percentage:  1 },
      { candidate_name: "Karen Guerreiro",  percentage:  1 },
    ],
  },

  // Vox Brasil Pesquisas · 11-13 ago 2026 · TSE SP-04670/2026 · n=1.480 · relatório técnico oficial (PDF)
  // cada entrevistado podia citar até 2 nomes — percentuais não somam 100%.
  // Fonte: https://static.poder360.com.br/uploads/2026/08/SP_046702026_RELATORIO_ESTADO_SA_O_PAULO_5_VOX_BRASIL_SP_16_08.pdf
  {
    institute_name: "Vox Brasil Pesquisas",
    election_name: "Senador Sao Paulo 2026",
    publication_date: "2026-08-16",
    fieldwork_start: "2026-08-11",
    fieldwork_end: "2026-08-13",
    sample_size: 1480,
    methodology: "presencial",
    source_url: "https://static.poder360.com.br/uploads/2026/08/SP_046702026_RELATORIO_ESTADO_SA_O_PAULO_5_VOX_BRASIL_SP_16_08.pdf",
    tse_protocolo: "SP046702026",
    results: [
      { candidate_name: "Marina Silva",       percentage: 26.1 },
      { candidate_name: "Simone Tebet",       percentage: 25.5 },
      { candidate_name: "Andre do Prado",     percentage: 21.5 },
      { candidate_name: "Ricardo Salles",     percentage: 19.3 },
      { candidate_name: "Guilherme Derrite",  percentage: 17.0 },
      { candidate_name: "Soninha Francine",   percentage:  4.5 },
      { candidate_name: "Geraldo Rufino",     percentage:  2.9 },
      { candidate_name: "Maíra de Souza",     percentage:  2.7 },
      { candidate_name: "Dra Eliana Ferreira", percentage: 2.1 },
      { candidate_name: "Weller Gonçalves",   percentage:  1.9 },
      { candidate_name: "Marcio Alves",       percentage:  1.6 },
      { candidate_name: "Petter Maahs",       percentage:  0.4 },
      { candidate_name: "Ednelson Cesaretti", percentage:  0.1 },
    ],
  },

  // Datafolha · 10-13 ago 2026 · TSE CE-04292/2026 · n=1.022
  // Fonte: https://www.opovo.com.br/noticias/politica/eleicoes/2026/08/14/datafolha-mostra-empate-tecnico-entre-cid-e-wagner-para-o-senado.html
  {
    institute_name: "Datafolha",
    election_name: "Senador Ceara 2026",
    publication_date: "2026-08-14",
    fieldwork_start: "2026-08-10",
    fieldwork_end: "2026-08-13",
    sample_size: 1022,
    methodology: "presencial",
    source_url: "https://www.opovo.com.br/noticias/politica/eleicoes/2026/08/14/datafolha-mostra-empate-tecnico-entre-cid-e-wagner-para-o-senado.html",
    tse_protocolo: "CE042922026",
    results: [
      { candidate_name: "Cid Gomes",             percentage: 26 },
      { candidate_name: "Capitão Wagner",         percentage: 22 },
      { candidate_name: "Luizianne Lins",         percentage: 14 },
      { candidate_name: "Alcides Fernandes",      percentage:  7 },
      { candidate_name: "Guilherme Theophilo",    percentage:  3 },
      { candidate_name: "Reginaldo",              percentage:  2 },
      { candidate_name: "Catarina Matos",         percentage:  2 },
    ],
  },

  // Real Time Big Data · 1-5 ago 2026 · TSE MS-07706/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-mato-grosso-do-sul-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Mato Grosso do Sul 2026",
    publication_date: "2026-08-07",
    fieldwork_start: "2026-08-01",
    fieldwork_end: "2026-08-05",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-mato-grosso-do-sul-agosto-2026/",
    tse_protocolo: "MS077062026",
    results: [
      { candidate_name: "Reinaldo Azambuja", percentage: 38 },
      { candidate_name: "Capitão Contar",     percentage: 19 },
      { candidate_name: "Vander Loubet",      percentage:  9 },
      { candidate_name: "Soraya Thronicke",   percentage:  8 },
      { candidate_name: "Beto do Movimento",  percentage:  5 },
      { candidate_name: "Daniel Junior",      percentage:  2 },
    ],
  },

  // Real Time Big Data · 28 jul-1 ago 2026 · TSE SE-07327/2026 · n=1.600
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/mitidieri-e-francisquinho-empatam-em-pesquisa-para-governo-de-sergipe/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Sergipe 2026",
    publication_date: "2026-08-03",
    fieldwork_start: "2026-07-28",
    fieldwork_end: "2026-08-01",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/mitidieri-e-francisquinho-empatam-em-pesquisa-para-governo-de-sergipe/",
    tse_protocolo: "SE073272026",
    results: [
      { candidate_name: "Delegado André David", percentage: 17 },
      { candidate_name: "Andre Moura",           percentage: 14 },
      { candidate_name: "Eduardo Amorim",        percentage: 13 },
      { candidate_name: "Rodrigo Valadares",     percentage: 12 },
      { candidate_name: "Delegado Alessandro",   percentage:  9 },
      { candidate_name: "Rogerio Carvalho",      percentage:  9 },
      { candidate_name: "Edvaldo",               percentage:  8 },
      { candidate_name: "Coronel Rocha",         percentage:  6 },
      { candidate_name: "Iran Barbosa",          percentage:  1 },
    ],
  },

  // Real Time Big Data · 25-29 jul 2026 · TSE MG-06475/2026 · n=2.000
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-minas-gerais-julho-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Minas Gerais 2026",
    publication_date: "2026-07-31",
    fieldwork_start: "2026-07-25",
    fieldwork_end: "2026-07-29",
    sample_size: 2000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-minas-gerais-julho-2026/",
    tse_protocolo: "MG064752026",
    results: [
      { candidate_name: "Marilia Campos", percentage: 21 },
      { candidate_name: "Marcelo Aro",     percentage: 14 },
      { candidate_name: "Aecio Neves",     percentage: 13 },
      { candidate_name: "Carlos Viana",    percentage: 12 },
      { candidate_name: "Domingos Savio",  percentage:  9 },
      { candidate_name: "Aurea Carolina",  percentage:  8 },
      { candidate_name: "Marco Antônio Superman", percentage: 3 },
    ],
  },

  // Real Time Big Data · 23-27 jul 2026 · TSE RJ-03487/2026 · n=2.000
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-rio-de-janeiro-julho-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Rio de Janeiro 2026",
    publication_date: "2026-07-29",
    fieldwork_start: "2026-07-23",
    fieldwork_end: "2026-07-27",
    sample_size: 2000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-rio-de-janeiro-julho-2026/",
    tse_protocolo: "RJ034872026",
    results: [
      { candidate_name: "Marcelo Crivella",  percentage: 17 },
      { candidate_name: "Benedita da Silva", percentage: 14 },
      { candidate_name: "Carlos Portinho",   percentage: 13 },
      { candidate_name: "Pedro Paulo",       percentage: 13 },
      { candidate_name: "Waguinho",          percentage:  7 },
    ],
  },

  // Real Time Big Data · 21-25 jul 2026 · TSE AC-01069/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/eal-time-big-data-governador-senador-acre-julho-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Acre 2026",
    publication_date: "2026-07-27",
    fieldwork_start: "2026-07-21",
    fieldwork_end: "2026-07-25",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/eal-time-big-data-governador-senador-acre-julho-2026/",
    tse_protocolo: "AC010692026",
    results: [
      { candidate_name: "Gladson Cameli",           percentage: 25 },
      { candidate_name: "Marcio Bittar",              percentage: 20 },
      { candidate_name: "Jorge Viana",                percentage: 16 },
      { candidate_name: "Mara Rocha",                 percentage: 13 },
      { candidate_name: "Sérgio Petecão",             percentage:  5 },
      { candidate_name: "Eduardo Velloso",            percentage:  5 },
      { candidate_name: "Professor Inacio Moreira",   percentage:  3 },
      { candidate_name: "Dr. Junior Feitosa",         percentage:  1 },
    ],
  },

  // Real Time Big Data · 19-23 jul 2026 · TSE AP-02970/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-amapa-julho-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Amapa 2026",
    publication_date: "2026-07-25",
    fieldwork_start: "2026-07-19",
    fieldwork_end: "2026-07-23",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-amapa-julho-2026/",
    tse_protocolo: "AP029702026",
    results: [
      { candidate_name: "Rayssa Furlan",       percentage: 32 },
      { candidate_name: "Randolfe Rodrigues",  percentage: 18 },
      { candidate_name: "Lucas Barreto",       percentage: 12 },
      { candidate_name: "Alliny Serrão",       percentage:  9 },
      { candidate_name: "Capi",                percentage:  7 },
      { candidate_name: "Acácio Favacho",      percentage:  3 },
    ],
  },

  // ─── Curadoria 02/09/2026 — lote 17 (Quaest, Presidencial, checagem G1/CNN) ──

  // Quaest · 30 ago-1 set 2026 · TSE BR-07065/2026 · n=2.004 · presencial · ME: ±2pp
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/quaest-lula-tem-37-no-1o-turno-flavio-30-e-cury-10/
  // Cenário com Pablo Marçal na lista (cenário principal da matéria).
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-09-02",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-01",
    sample_size: 2004,
    margin_of_error: 2.0,
    methodology: "presencial",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/quaest-lula-tem-37-no-1o-turno-flavio-30-e-cury-10/",
    tse_protocolo: "BR070652026",
    results: [
      { candidate_name: "Lula",             percentage: 37 },
      { candidate_name: "Flavio Bolsonaro",  percentage: 30 },
      { candidate_name: "Augusto Cury",      percentage: 10 },
      { candidate_name: "Renan Santos",      percentage:  3 },
      { candidate_name: "Caiado",            percentage:  1 },
      { candidate_name: "Zema",              percentage:  1 },
      { candidate_name: "Pablo Marçal",      percentage:  1 },
      { candidate_name: "Samara Martins",    percentage:  1 },
    ],
  },

  // Quaest · 30 ago-1 set 2026 · TSE BR-07065/2026 · n=2.004 · presencial · ME: ±2pp
  // Mesma pesquisa, cenário de 2º turno Lula x Flávio.
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/quaest-lula-tem-42-das-intencoes-de-voto-no-2o-turno-flavio-41-2/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-02",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-01",
    sample_size: 2004,
    margin_of_error: 2.0,
    methodology: "presencial",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/quaest-lula-tem-42-das-intencoes-de-voto-no-2o-turno-flavio-41-2/",
    tse_protocolo: "BR070652026",
    results: [
      { candidate_name: "Lula",            percentage: 42 },
      { candidate_name: "Flavio Bolsonaro", percentage: 41 },
    ],
  },

  // Mesma pesquisa/protocolo — os outros 4 cenários de 2º turno testados na mesma rodada.
  // scenario_label distingue cada um pro dedup do script (mesmo instituto/data/eleição).
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-02",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-01",
    sample_size: 2004,
    margin_of_error: 2.0,
    methodology: "presencial",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/quaest-lula-tem-42-das-intencoes-de-voto-no-2o-turno-flavio-41-2/",
    tse_protocolo: "BR070652026",
    scenario_label: "Lula vs Renan Santos",
    results: [
      { candidate_name: "Lula",        percentage: 43 },
      { candidate_name: "Renan Santos", percentage: 36 },
    ],
  },
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-02",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-01",
    sample_size: 2004,
    margin_of_error: 2.0,
    methodology: "presencial",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/quaest-lula-tem-42-das-intencoes-de-voto-no-2o-turno-flavio-41-2/",
    tse_protocolo: "BR070652026",
    scenario_label: "Lula vs Zema",
    results: [
      { candidate_name: "Lula", percentage: 44 },
      { candidate_name: "Zema", percentage: 33 },
    ],
  },
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-02",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-01",
    sample_size: 2004,
    margin_of_error: 2.0,
    methodology: "presencial",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/quaest-lula-tem-42-das-intencoes-de-voto-no-2o-turno-flavio-41-2/",
    tse_protocolo: "BR070652026",
    scenario_label: "Lula vs Caiado",
    results: [
      { candidate_name: "Lula",   percentage: 42 },
      { candidate_name: "Caiado", percentage: 37 },
    ],
  },
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-02",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-01",
    sample_size: 2004,
    margin_of_error: 2.0,
    methodology: "presencial",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/quaest-lula-tem-42-das-intencoes-de-voto-no-2o-turno-flavio-41-2/",
    tse_protocolo: "BR070652026",
    scenario_label: "Lula vs Augusto Cury",
    results: [
      { candidate_name: "Lula",        percentage: 40 },
      { candidate_name: "Augusto Cury", percentage: 34 },
    ],
  },

  // ─── Curadoria 02/09/2026 — lote 18 (Presidencial, cortes estaduais Quaest/RTBD/Veritá) ──
  // TSE registra pesquisa presidencial sempre sob UE=BR mesmo quando a amostra é de um único
  // estado (cross-tab embutido na mesma pesquisa de Governador/Senador) — mesmo padrão já
  // usado nas entradas anteriores de Presidente com scope=UF. Protocolo omitido quando o
  // instituto/imprensa não deu o número BR- específico (ambiguidade entre vários protocolos
  // do mesmo tamanho de amostra/data) — não afeta a inserção, só a marcação de "resolvido"
  // daquele protocolo específico na fila do TSE.

  // Quaest · 21-24 ago 2026 · TSE BR-02403/2026 · n=1.104 · corte Distrito Federal
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/lula-e-flavio-empatam-em-1o-turno-no-df-diz-quaest/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1104,
    methodology: "presencial",
    scope: "DF",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/lula-e-flavio-empatam-em-1o-turno-no-df-diz-quaest/",
    tse_protocolo: "BR024032026",
    results: [
      { candidate_name: "Lula",            percentage: 28 },
      { candidate_name: "Flavio Bolsonaro", percentage: 26 },
    ],
  },

  // Quaest · ~21-24 ago 2026 · n=1.506 · corte Minas Gerais (protocolo BR- não identificado)
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/ (Quaest MG presidencial, empate técnico)
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1506,
    methodology: "presencial",
    scope: "MG",
    source_url: "https://www.cartacapital.com.br/politica/",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 31 },
      { candidate_name: "Lula",            percentage: 30 },
    ],
  },

  // Quaest · 21-24 ago 2026 · n=1.302 · corte Rio de Janeiro (protocolo BR- ambíguo entre 2 candidatos)
  // Fonte: https://agendadopoder.com.br/pesquisa-quaest-no-rio-aponta-flavio-a-frente-de-lula-por-31-a-29/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1302,
    methodology: "presencial",
    scope: "RJ",
    source_url: "https://agendadopoder.com.br/pesquisa-quaest-no-rio-aponta-flavio-a-frente-de-lula-por-31-a-29/",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 31 },
      { candidate_name: "Lula",            percentage: 29 },
    ],
  },

  // Quaest · ~21-25 ago 2026 · TSE BR-02096/2026 · n=1.800 · corte São Paulo
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/quaest-flavio-tem-30-e-lula-29-em-sp-no-1o-turno/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-25",
    sample_size: 1800,
    methodology: "presencial",
    scope: "SP",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/quaest-flavio-tem-30-e-lula-29-em-sp-no-1o-turno/",
    tse_protocolo: "BR020962026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 30 },
      { candidate_name: "Lula",            percentage: 29 },
    ],
  },

  // Quaest · 21-24 ago 2026 · n=1.302 · corte Pernambuco (protocolo BR- ambíguo, par do RJ acima)
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1302,
    methodology: "presencial",
    scope: "PE",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    results: [
      { candidate_name: "Lula",            percentage: 54 },
      { candidate_name: "Flavio Bolsonaro", percentage: 19 },
      { candidate_name: "Caiado",          percentage:  3 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE BR-08870/2026 · n=900 · corte Bahia
  // Fonte: https://www.band.uol.com.br/ (Quaest: Lula lidera com 50% dos votos na Bahia)
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 900,
    methodology: "presencial",
    scope: "BA",
    source_url: "https://www.band.uol.com.br/",
    tse_protocolo: "BR088702026",
    results: [
      { candidate_name: "Lula",            percentage: 50 },
      { candidate_name: "Flavio Bolsonaro", percentage: 17 },
      { candidate_name: "Caiado",          percentage:  4 },
      { candidate_name: "Augusto Cury",     percentage:  4 },
    ],
  },

  // Quaest · 23-26 ago 2026 · n=804 · corte Goiás (protocolo BR- ambíguo entre 5 candidatos)
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/ (Caiado lidera disputa presidencial em Goiás)
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    scope: "GO",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    results: [
      { candidate_name: "Caiado",          percentage: 32 },
      { candidate_name: "Flavio Bolsonaro", percentage: 27 },
      { candidate_name: "Lula",            percentage: 20 },
    ],
  },

  // Quaest · 23-26 ago 2026 · n=804 · corte Sergipe (protocolo BR- ambíguo)
  // Fonte: https://jornalsete.com.br/ (Quaest: Lula 53%, Flávio 19% em Sergipe)
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    scope: "SE",
    source_url: "https://jornalsete.com.br/",
    results: [
      { candidate_name: "Lula",            percentage: 53 },
      { candidate_name: "Flavio Bolsonaro", percentage: 19 },
      { candidate_name: "Caiado",          percentage:  3 },
      { candidate_name: "Augusto Cury",     percentage:  2 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE BR-07015/2026 · n=804 · corte Acre
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/no-acre-flavio-tem-42-e-lula-25-no-1o-turno-diz-quaest/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    scope: "AC",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/no-acre-flavio-tem-42-e-lula-25-no-1o-turno-diz-quaest/",
    tse_protocolo: "BR070152026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 42 },
      { candidate_name: "Lula",            percentage: 25 },
      { candidate_name: "Caiado",          percentage:  5 },
    ],
  },

  // Quaest · 23-26 ago 2026 · n=804 · corte Rondônia (protocolo BR- ambíguo)
  // Fonte: Agência Rondônia
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    scope: "RO",
    source_url: "https://agenciarondonia.com.br/",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 45 },
      { candidate_name: "Lula",            percentage: 25 },
      { candidate_name: "Caiado",          percentage:  3 },
    ],
  },

  // Quaest · 20-23 ago 2026 · TSE BR-08612/2026 · n=900 · corte Rio Grande do Sul
  // Fonte: https://www.cartacapital.com.br/politica/como-esta-a-disputa-pela-presidencia-em-6-estados-segundo-a-quaest/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-23",
    sample_size: 900,
    methodology: "presencial",
    scope: "RS",
    source_url: "https://www.cartacapital.com.br/politica/como-esta-a-disputa-pela-presidencia-em-6-estados-segundo-a-quaest/",
    tse_protocolo: "BR086122026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 34 },
      { candidate_name: "Lula",            percentage: 28 },
      { candidate_name: "Caiado",          percentage:  3 },
    ],
  },

  // Quaest · 20-23 ago 2026 · n=900 · corte Paraná (protocolo estadual PR-05388/2026, sem par BR- confirmado)
  // Fonte: https://www.cartacapital.com.br/politica/como-esta-a-disputa-pela-presidencia-em-6-estados-segundo-a-quaest/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-23",
    sample_size: 900,
    methodology: "presencial",
    scope: "PR",
    source_url: "https://www.cartacapital.com.br/politica/como-esta-a-disputa-pela-presidencia-em-6-estados-segundo-a-quaest/",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 41 },
      { candidate_name: "Lula",            percentage: 23 },
    ],
  },

  // Real Time Big Data · 30 jul-3 ago 2026 · TSE BR-09650/2026 · n=1.600 · corte Pará
  // Fonte: https://ocapixaba.com.br/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-04",
    fieldwork_start: "2026-07-30",
    fieldwork_end: "2026-08-03",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PA",
    source_url: "https://ocapixaba.com.br/",
    tse_protocolo: "BR096502026",
    results: [
      { candidate_name: "Lula",            percentage: 43 },
      { candidate_name: "Flavio Bolsonaro", percentage: 33 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-04",
    fieldwork_start: "2026-07-30",
    fieldwork_end: "2026-08-03",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PA",
    source_url: "https://ocapixaba.com.br/",
    tse_protocolo: "BR096502026",
    results: [
      { candidate_name: "Lula",            percentage: 45 },
      { candidate_name: "Flavio Bolsonaro", percentage: 36 },
    ],
  },

  // Real Time Big Data · 1-5 ago 2026 · TSE BR-01784/2026 · n=1.600 · corte Mato Grosso do Sul
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-06",
    fieldwork_start: "2026-08-01",
    fieldwork_end: "2026-08-05",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "MS",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    tse_protocolo: "BR017842026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 42 },
      { candidate_name: "Lula",            percentage: 34 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-06",
    fieldwork_start: "2026-08-01",
    fieldwork_end: "2026-08-05",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "MS",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    tse_protocolo: "BR017842026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 50 },
      { candidate_name: "Lula",            percentage: 38 },
    ],
  },

  // Real Time Big Data · 7-11 ago 2026 · TSE BR-06833/2026 · n=1.600 · corte Mato Grosso
  // Fonte: https://exame.com/brasil/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-12",
    fieldwork_start: "2026-08-07",
    fieldwork_end: "2026-08-11",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "MT",
    source_url: "https://exame.com/brasil/",
    tse_protocolo: "BR068332026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 43 },
      { candidate_name: "Lula",            percentage: 33 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-12",
    fieldwork_start: "2026-08-07",
    fieldwork_end: "2026-08-11",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "MT",
    source_url: "https://exame.com/brasil/",
    tse_protocolo: "BR068332026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 51 },
      { candidate_name: "Lula",            percentage: 37 },
    ],
  },

  // Real Time Big Data · 12-15 ago 2026 · TSE BR-08592/2026 · n=1.600 · corte Pernambuco
  // Fonte: https://exame.com/brasil/ (Lula abre 34 pontos sobre Flávio em Pernambuco)
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-17",
    fieldwork_start: "2026-08-12",
    fieldwork_end: "2026-08-15",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PE",
    source_url: "https://exame.com/brasil/",
    tse_protocolo: "BR085922026",
    results: [
      { candidate_name: "Lula",            percentage: 58 },
      { candidate_name: "Flavio Bolsonaro", percentage: 24 },
    ],
  },

  // Real Time Big Data · 13-17 ago 2026 · TSE BR-09275/2026 · n=1.600 · corte Paraná
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-18",
    fieldwork_start: "2026-08-13",
    fieldwork_end: "2026-08-17",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PR",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/",
    tse_protocolo: "BR092752026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 44 },
      { candidate_name: "Lula",            percentage: 31 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-18",
    fieldwork_start: "2026-08-13",
    fieldwork_end: "2026-08-17",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PR",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/",
    tse_protocolo: "BR092752026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 52 },
      { candidate_name: "Lula",            percentage: 35 },
    ],
  },

  // Real Time Big Data · 14-18 ago 2026 · TSE BR-05423/2026 · n=1.600 · corte Distrito Federal
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-19",
    fieldwork_start: "2026-08-14",
    fieldwork_end: "2026-08-18",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "DF",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    tse_protocolo: "BR054232026",
    results: [
      { candidate_name: "Lula",            percentage: 36 },
      { candidate_name: "Flavio Bolsonaro", percentage: 35 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-19",
    fieldwork_start: "2026-08-14",
    fieldwork_end: "2026-08-18",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "DF",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    tse_protocolo: "BR054232026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 44 },
      { candidate_name: "Lula",            percentage: 39 },
    ],
  },

  // Real Time Big Data · 15-19 ago 2026 · TSE BR-08791/2026 · n=1.600 · corte Ceará
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-20",
    fieldwork_start: "2026-08-15",
    fieldwork_end: "2026-08-19",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "CE",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    tse_protocolo: "BR087912026",
    results: [
      { candidate_name: "Lula",            percentage: 65 },
      { candidate_name: "Flavio Bolsonaro", percentage: 21 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-20",
    fieldwork_start: "2026-08-15",
    fieldwork_end: "2026-08-19",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "CE",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    tse_protocolo: "BR087912026",
    results: [
      { candidate_name: "Lula",            percentage: 66 },
      { candidate_name: "Flavio Bolsonaro", percentage: 27 },
    ],
  },

  // Real Time Big Data · 19-22 ago 2026 · TSE BR-06537/2026 · n=2.000 · corte São Paulo
  // Fonte: https://www.metropoles.com/ (Flávio lidera disputa em SP com 38%)
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-22",
    sample_size: 2000,
    methodology: "telefonica",
    scope: "SP",
    source_url: "https://www.metropoles.com/",
    tse_protocolo: "BR065372026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 38 },
      { candidate_name: "Lula",            percentage: 33 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-22",
    sample_size: 2000,
    methodology: "telefonica",
    scope: "SP",
    source_url: "https://www.metropoles.com/",
    tse_protocolo: "BR065372026",
    results: [
      { candidate_name: "Lula",            percentage: 49 },
      { candidate_name: "Flavio Bolsonaro", percentage: 44 },
    ],
  },

  // Real Time Big Data · 19-22 ago 2026 · TSE BR-08776/2026 · n=1.600 · corte Paraíba
  // Fonte: https://blogdobgpb.com.br/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-22",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PB",
    source_url: "https://blogdobgpb.com.br/",
    tse_protocolo: "BR087762026",
    results: [
      { candidate_name: "Lula",            percentage: 55 },
      { candidate_name: "Flavio Bolsonaro", percentage: 26 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-22",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PB",
    source_url: "https://blogdobgpb.com.br/",
    tse_protocolo: "BR087762026",
    results: [
      { candidate_name: "Lula",            percentage: 59 },
      { candidate_name: "Flavio Bolsonaro", percentage: 32 },
    ],
  },

  // Real Time Big Data · 21-25 ago 2026 · TSE BR-06708/2026 · n=1.600 · corte Tocantins
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-25",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "TO",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    tse_protocolo: "BR067082026",
    results: [
      { candidate_name: "Lula",            percentage: 36 },
      { candidate_name: "Flavio Bolsonaro", percentage: 36 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-26",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-25",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "TO",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/",
    tse_protocolo: "BR067082026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 45 },
      { candidate_name: "Lula",            percentage: 39 },
    ],
  },

  // Real Time Big Data · 28 ago-1 set 2026 · TSE BR-08333/2026 · n=1.600 (registro oficial; matérias de
  // imprensa citam 2.000 — divergência não resolvida, mantendo o valor do registro) · corte Rio de Janeiro
  // Fonte: https://www.brasildefato.com.br/2026/09/02/
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-09-02",
    fieldwork_start: "2026-08-28",
    fieldwork_end: "2026-09-01",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "RJ",
    source_url: "https://www.brasildefato.com.br/2026/09/02/",
    tse_protocolo: "BR083332026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 36 },
      { candidate_name: "Lula",            percentage: 34 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-02",
    fieldwork_start: "2026-08-28",
    fieldwork_end: "2026-09-01",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "RJ",
    source_url: "https://www.brasildefato.com.br/2026/09/02/",
    tse_protocolo: "BR083332026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 45 },
      { candidate_name: "Lula",            percentage: 41 },
    ],
  },

  // Instituto Veritá · 24-28 ago 2026 · TSE BR-08653/2026 · n=1.220 · corte Rondônia
  // Fonte: https://eleicoes26.institutoverita.com.br/pesquisa/4c688ea9-6806-4e1e-bc62-fb50adb26edc
  {
    institute_name: "Instituto Veritá",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-09-01",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-28",
    sample_size: 1220,
    methodology: "telefonica",
    scope: "RO",
    source_url: "https://eleicoes26.institutoverita.com.br/pesquisa/4c688ea9-6806-4e1e-bc62-fb50adb26edc",
    tse_protocolo: "BR086532026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 51.9 },
      { candidate_name: "Lula",            percentage: 28.3 },
      { candidate_name: "Augusto Cury",     percentage:  9.2 },
      { candidate_name: "Renan Santos",     percentage:  3.7 },
      { candidate_name: "Pablo Marçal",     percentage:  3.0 },
      { candidate_name: "Caiado",          percentage:  2.1 },
    ],
  },
  {
    institute_name: "Instituto Veritá",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-01",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-28",
    sample_size: 1220,
    methodology: "telefonica",
    scope: "RO",
    source_url: "https://eleicoes26.institutoverita.com.br/pesquisa/4c688ea9-6806-4e1e-bc62-fb50adb26edc",
    tse_protocolo: "BR086532026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 65.5 },
      { candidate_name: "Lula",            percentage: 34.5 },
    ],
  },

  // Instituto Veritá · 24-28 ago 2026 · TSE BR-09524/2026 · n=1.220 · corte Amazonas
  // Fonte: https://diariodopoder.com.br/brasil-e-regioes/csa-brasil/flavio-supera-lula-nos-dois-turnos-entre-eleitores-do-amazonas
  {
    institute_name: "Instituto Veritá",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-29",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-28",
    sample_size: 1220,
    methodology: "telefonica",
    scope: "AM",
    source_url: "https://diariodopoder.com.br/brasil-e-regioes/csa-brasil/flavio-supera-lula-nos-dois-turnos-entre-eleitores-do-amazonas",
    tse_protocolo: "BR095242026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 44.8 },
      { candidate_name: "Lula",            percentage: 38.5 },
    ],
  },
  {
    institute_name: "Instituto Veritá",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-29",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-28",
    sample_size: 1220,
    methodology: "telefonica",
    scope: "AM",
    source_url: "https://diariodopoder.com.br/brasil-e-regioes/csa-brasil/flavio-supera-lula-nos-dois-turnos-entre-eleitores-do-amazonas",
    tse_protocolo: "BR095242026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 55.9 },
      { candidate_name: "Lula",            percentage: 44.1 },
    ],
  },

  // ─── Curadoria 02/09/2026 — lote 19 (Tier 4, Senador, 2ª leva de reaproveitamento abr-mai) ──
  // Nomes conferidos contra `candidates` e contra o arquivo do TSE antes de inserir. Vários
  // nomes descartados por não constarem no arquivo do TSE pra Senador naquele estado: Miguel
  // Coelho/Anderson Ferreira/Fernando Dueire/Silvio Nascimento/Pastor Wellington Carneiro (PE),
  // Marcelo Ramos/Marcos Rotta/Cabo Daciolo (AM — Daciolo é candidato a governador, não senador),
  // Nelsinho Trad (MS), Roberto Claudio/Eunicio Oliveira/Priscila Costa/Chiquinho Feitosa/General
  // Theophilo (CE), Vanessa Portugal/Jarbas Soares (MG — sem candidato correspondente no banco),
  // Claudio Castro/Felipe Curi/Marcio Canella/Alessandro Molon/Luciana Boiteux (RJ), Paulo
  // Rocha/Joaquim Passarinho/Fernando Carneiro (PA — sem candidato correspondente no banco).

  // Datafolha · 24-27 mai 2026 · TSE PE-07888/2026 · n=1.022
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-governador-senador-pernambuco-maio-2026/
  {
    institute_name: "Datafolha",
    election_name: "Senador Pernambuco 2026",
    publication_date: "2026-05-29",
    fieldwork_start: "2026-05-24",
    fieldwork_end: "2026-05-27",
    sample_size: 1022,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-governador-senador-pernambuco-maio-2026/",
    tse_protocolo: "PE078882026",
    results: [
      { candidate_name: "Marilia Arraes",       percentage: 39 },
      { candidate_name: "Humberto Costa",       percentage: 32 },
      { candidate_name: "Eduardo da Fonte",     percentage: 22 },
      { candidate_name: "Carlos Sant Anna",     percentage:  6 },
      { candidate_name: "Paulo Rubem Santiago", percentage:  4 },
    ],
  },

  // AtlasIntel · 9-13 mai 2026 · TSE AM-09404/2026 · n=1.200 · consolidado dos 2 votos (2 vagas)
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-governador-senador-amazonas-maio-2026/
  {
    institute_name: "Atlas Intel",
    election_name: "Senador Amazonas 2026",
    publication_date: "2026-05-15",
    fieldwork_start: "2026-05-09",
    fieldwork_end: "2026-05-13",
    sample_size: 1200,
    methodology: "online",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-governador-senador-amazonas-maio-2026/",
    tse_protocolo: "AM094042026",
    results: [
      { candidate_name: "Capitao Alberto Neto", percentage: 20.5 },
      { candidate_name: "Eduardo Braga",        percentage: 18.5 },
      { candidate_name: "Plinio Valerio",       percentage: 17.1 },
      { candidate_name: "Wilson Lima",          percentage: 10.6 },
      { candidate_name: "Ismael Munduruku",     percentage:  1.0 },
      { candidate_name: "Xuxa do Amazonas",     percentage:  0.1 },
    ],
  },

  // Real Time Big Data · 7-11 mai 2026 · TSE MS-06412/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-mato-grosso-do-sul-maio-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Mato Grosso do Sul 2026",
    publication_date: "2026-05-13",
    fieldwork_start: "2026-05-07",
    fieldwork_end: "2026-05-11",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-mato-grosso-do-sul-maio-2026/",
    tse_protocolo: "MS064122026",
    results: [
      { candidate_name: "Reinaldo Azambuja", percentage: 29 },
      { candidate_name: "Capitão Contar",     percentage: 18 },
      { candidate_name: "Soraya Thronicke",   percentage: 10 },
      { candidate_name: "Vander Loubet",      percentage:  9 },
      { candidate_name: "Beto do Movimento",  percentage:  2 },
      { candidate_name: "Daniel Junior",      percentage:  2 },
    ],
  },

  // Quaest · 24-28 abr 2026 · TSE CE-01725/2026 · n=1.002
  // Fonte: https://diariodonordeste.verdesmares.com.br/pontopoder/pesquisa-quaest-para-o-senado-ce-cid-e-capitao-wagner-lideram-roberto-e-luizianne-vem-em-seguida-1.3760831
  {
    institute_name: "Quaest",
    election_name: "Senador Ceara 2026",
    publication_date: "2026-04-30",
    fieldwork_start: "2026-04-24",
    fieldwork_end: "2026-04-28",
    sample_size: 1002,
    methodology: "presencial",
    source_url: "https://diariodonordeste.verdesmares.com.br/pontopoder/pesquisa-quaest-para-o-senado-ce-cid-e-capitao-wagner-lideram-roberto-e-luizianne-vem-em-seguida-1.3760831",
    tse_protocolo: "CE017252026",
    results: [
      { candidate_name: "Cid Gomes",        percentage: 17 },
      { candidate_name: "Capitão Wagner",    percentage: 16 },
      { candidate_name: "Luizianne Lins",    percentage:  8 },
      { candidate_name: "Alcides Fernandes", percentage:  3 },
    ],
  },

  // Quaest · 23-27 abr 2026 · TSE BA-03657/2026 · n=1.200
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-bahia-abril-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Bahia 2026",
    publication_date: "2026-04-29",
    fieldwork_start: "2026-04-23",
    fieldwork_end: "2026-04-27",
    sample_size: 1200,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-bahia-abril-2026/",
    tse_protocolo: "BA036572026",
    results: [
      { candidate_name: "Rui Costa",           percentage: 24 },
      { candidate_name: "Jaques Wagner",       percentage: 22 },
      { candidate_name: "Joao Roma",           percentage:  9 },
      { candidate_name: "Angelo Coronel",      percentage:  6 },
      { candidate_name: "Professora Delliana", percentage:  1 },
    ],
  },

  // Quaest · 22-26 abr 2026 · TSE MG-08646/2026 · n=1.482
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-minas-gerais-abril-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Minas Gerais 2026",
    publication_date: "2026-04-28",
    fieldwork_start: "2026-04-22",
    fieldwork_end: "2026-04-26",
    sample_size: 1482,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-minas-gerais-abril-2026/",
    tse_protocolo: "MG086462026",
    results: [
      { candidate_name: "Marilia Campos",  percentage: 19 },
      { candidate_name: "Aecio Neves",     percentage: 11 },
      { candidate_name: "Carlos Viana",    percentage: 10 },
      { candidate_name: "Marcelo Aro",     percentage:  9 },
      { candidate_name: "Domingos Savio",  percentage:  8 },
      { candidate_name: "Aurea Carolina",  percentage:  6 },
    ],
  },

  // Quaest · 21-25 abr 2026 · TSE RJ-00613/2026 · n=1.200
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-rio-de-janeiro-abril-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Rio de Janeiro 2026",
    publication_date: "2026-04-27",
    fieldwork_start: "2026-04-21",
    fieldwork_end: "2026-04-25",
    sample_size: 1200,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-rio-de-janeiro-abril-2026/",
    tse_protocolo: "RJ006132026",
    results: [
      { candidate_name: "Benedita da Silva", percentage: 10 },
      { candidate_name: "Marcelo Crivella",  percentage:  6 },
      { candidate_name: "Waguinho",          percentage:  3 },
      { candidate_name: "Mônica Benício",    percentage:  2 },
      { candidate_name: "Pedro Paulo",       percentage:  1 },
    ],
  },

  // Quaest · 21-25 abr 2026 · TSE PA-09305/2026 · n=900
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-para-abril-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Para 2026",
    publication_date: "2026-04-27",
    fieldwork_start: "2026-04-21",
    fieldwork_end: "2026-04-25",
    sample_size: 900,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-para-abril-2026/",
    tse_protocolo: "PA093052026",
    results: [
      { candidate_name: "Helder Barbalho",  percentage: 24 },
      { candidate_name: "Eder Mauro",       percentage: 13 },
      { candidate_name: "Celso Sabino",     percentage:  6 },
      { candidate_name: "Zequinha Marinho", percentage:  6 },
      { candidate_name: "Chicão",           percentage:  4 },
    ],
  },

  // Futura Inteligência (100% Cidades) · 2-6 abr 2026 · TSE RS-05216/2026 · n=800 · consolidado
  // dos 2 votos (2 vagas em disputa)
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/futura-inteligencia-governador-senador-rio-grande-do-sul-abril-2026/
  {
    institute_name: "Futura Inteligência",
    election_name: "Senador Rio Grande do Sul 2026",
    publication_date: "2026-04-08",
    fieldwork_start: "2026-04-02",
    fieldwork_end: "2026-04-06",
    sample_size: 800,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/futura-inteligencia-governador-senador-rio-grande-do-sul-abril-2026/",
    tse_protocolo: "RS052162026",
    results: [
      { candidate_name: "Manuela d'Ávila",  percentage: 36.0 },
      { candidate_name: "Germano Rigotto",  percentage: 31.3 },
      { candidate_name: "Marcel Van Hattem", percentage: 27.6 },
      { candidate_name: "Paulo Pimenta",     percentage: 24.7 },
      { candidate_name: "Sanderson",         percentage: 10.3 },
      { candidate_name: "Frederico Antunes", percentage:  9.1 },
    ],
  },

  // ─── Correção — os 3 protocolos abaixo tinham dado incompleto/divergente numa rodada
  // anterior; re-checados direto na fonte primária (HTML bruto, protocolo TSE confirmado
  // verbatim no texto) e agora confirmados com números completos. GO013202026 continua sem
  // confirmação (só 1 candidato com percentual na única fonte encontrada) — não inserido.

  // Índice Inteligência · 4-6 ago 2026 · TSE PR-07034/2026 · n=1.200
  // Fonte: https://dcmais.com.br/eleicoes-2026/corrida-ao-senado-pesquisa-aponta-intencao-de-voto-de-eleitores-do-parana-1/
  {
    institute_name: "Instituto Índice Inteligência",
    election_name: "Senador Parana 2026",
    publication_date: "2026-08-08",
    fieldwork_start: "2026-08-04",
    fieldwork_end: "2026-08-06",
    sample_size: 1200,
    margin_of_error: 2.83,
    methodology: "presencial",
    source_url: "https://dcmais.com.br/eleicoes-2026/corrida-ao-senado-pesquisa-aponta-intencao-de-voto-de-eleitores-do-parana-1/",
    tse_protocolo: "PR070342026",
    results: [
      { candidate_name: "Deltan Dallagnol", percentage: 19.2 },
      { candidate_name: "Alexandre Curi",   percentage: 17.7 },
      { candidate_name: "Gleisi Hoffmann",  percentage: 17.3 },
      { candidate_name: "Filipe Barros",    percentage: 16.8 },
      { candidate_name: "Cristina Graeml",  percentage:  5.2 },
      { candidate_name: "Dr Rosinha",       percentage:  4.7 },
      { candidate_name: "Karen Guerreiro",  percentage:  0.7 },
      { candidate_name: "Joaquim do Mlb",   percentage:  0.2 },
    ],
  },

  // Datafolha · 28-30 jul 2026 · TSE PE-04519/2026 · n=1.022
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-governador-senador-pernambuco-julho-2026/
  {
    institute_name: "Datafolha",
    election_name: "Senador Pernambuco 2026",
    publication_date: "2026-08-01",
    fieldwork_start: "2026-07-28",
    fieldwork_end: "2026-07-30",
    sample_size: 1022,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-governador-senador-pernambuco-julho-2026/",
    tse_protocolo: "PE045192026",
    results: [
      { candidate_name: "Marilia Arraes",       percentage: 18 },
      { candidate_name: "Humberto Costa",       percentage: 15 },
      { candidate_name: "Mendonça Filho",       percentage: 10 },
      { candidate_name: "Eduardo da Fonte",     percentage:  7 },
      { candidate_name: "Carlos Sant Anna",     percentage:  2 },
      { candidate_name: "Paulo Rubem Santiago", percentage:  1 },
    ],
  },

  // Quaest · 24-28 jul 2026 · TSE RS-04790/2026 · n=1.104 · consolidado dos 2 votos (2 vagas)
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-rio-grande-do-sul-julho-2026/
  {
    institute_name: "Quaest",
    election_name: "Senador Rio Grande do Sul 2026",
    publication_date: "2026-07-30",
    fieldwork_start: "2026-07-24",
    fieldwork_end: "2026-07-28",
    sample_size: 1104,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/genial-quaest-governador-senador-rio-grande-do-sul-julho-2026/",
    tse_protocolo: "RS047902026",
    results: [
      { candidate_name: "Manuela d'Ávila",   percentage: 12 },
      { candidate_name: "Germano Rigotto",   percentage:  9 },
      { candidate_name: "Paulo Pimenta",     percentage:  9 },
      { candidate_name: "Marcel Van Hattem", percentage:  7 },
      { candidate_name: "Sanderson",         percentage:  6 },
      { candidate_name: "Frederico Antunes", percentage:  1 },
      { candidate_name: "Luciano do Mlb",    percentage:  1 },
      { candidate_name: "Tania Peres",       percentage:  1 },
    ],
  },

  // lote 20 — Senado, rodada 03/09
  // Real Time Big Data · 28 ago-01 set 2026 · TSE RJ-08350/2026 · n=2.000
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/benedita-e-crivella-lideram-disputa-pelo-senado-no-rio-diz-pesquisa/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Rio de Janeiro 2026",
    publication_date: "2026-09-02",
    fieldwork_start: "2026-08-28",
    fieldwork_end: "2026-09-01",
    sample_size: 2000,
    margin_of_error: 2,
    methodology: "telefonica",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/benedita-e-crivella-lideram-disputa-pelo-senado-no-rio-diz-pesquisa/",
    tse_protocolo: "RJ083502026",
    results: [
      { candidate_name: "Benedita da Silva", percentage: 14 },
      { candidate_name: "Marcelo Crivella",  percentage: 14 },
      { candidate_name: "Pedro Paulo",       percentage: 13 },
      { candidate_name: "Carlos Jordy",      percentage: 11 },
    ],
  },

  // lote 21 — Presidência, completa 2º turno de pesquisa já curada (só tinha 1º turno)
  // Datafolha · 18-20 ago 2026 · TSE BR-04496/2026 · n=2.058
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-presidente-agosto-2026/
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-21",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-20",
    sample_size: 2058,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-presidente-agosto-2026/",
    tse_protocolo: "BR044962026",
    scenario_label: "Lula vs Flavio Bolsonaro",
    results: [
      { candidate_name: "Lula",            percentage: 47 },
      { candidate_name: "Flavio Bolsonaro", percentage: 43 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-21",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-20",
    sample_size: 2058,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-presidente-agosto-2026/",
    tse_protocolo: "BR044962026",
    scenario_label: "Lula vs Caiado",
    results: [
      { candidate_name: "Lula",   percentage: 47 },
      { candidate_name: "Caiado", percentage: 40 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-21",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-20",
    sample_size: 2058,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-presidente-agosto-2026/",
    tse_protocolo: "BR044962026",
    scenario_label: "Lula vs Zema",
    results: [
      { candidate_name: "Lula", percentage: 48 },
      { candidate_name: "Zema", percentage: 38 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-21",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-20",
    sample_size: 2058,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/datafolha-presidente-agosto-2026/",
    tse_protocolo: "BR044962026",
    scenario_label: "Lula vs Renan Santos",
    results: [
      { candidate_name: "Lula",         percentage: 47 },
      { candidate_name: "Renan Santos", percentage: 37 },
    ],
  },

  // ─── Curadoria diária (pesqele_missing) · 03/09/2026 ──────────────────────

  // Índice Inteligência · 17-19 ago 2026 · TSE PR-01754/2026 · n=1.200 · presencial
  // Fonte: https://hojepr.com/pesquisa-indice-traz-moro-com-36-sandro-alex-com-28-e-requiao-filho-com-21/
  {
    institute_name: "Instituto Índice Inteligência",
    election_name: "Governador Parana 2026",
    publication_date: "2026-08-20",
    fieldwork_start: "2026-08-17",
    fieldwork_end: "2026-08-19",
    sample_size: 1200,
    margin_of_error: 2.83,
    methodology: "presencial",
    source_url: "https://hojepr.com/pesquisa-indice-traz-moro-com-36-sandro-alex-com-28-e-requiao-filho-com-21/",
    tse_protocolo: "PR017542026",
    results: [
      { candidate_name: "Sergio Moro",   percentage: 36.81 },
      { candidate_name: "Sandro Alex",   percentage: 28.55 },
      { candidate_name: "Requiao Filho", percentage: 21.02 },
    ],
  },

  // lote 22 — Presidência, cortes estaduais Datafolha (par BR+UF do mesmo protocolo
  // de Governador, 18-20/08) — dados confirmados via Poder360/Metrópoles/O Povo
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-21",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-20",
    sample_size: 1204,
    methodology: "presencial",
    scope: "MG",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-46-e-flavio-42-no-2o-turno-em-mg-diz-datafolha/",
    tse_protocolo: "BR043962026",
    results: [
      { candidate_name: "Lula",   percentage: 37 },
      { candidate_name: "Flávio", percentage: 31 },
      { candidate_name: "Zema",   percentage: 10 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-21",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-20",
    sample_size: 1204,
    methodology: "presencial",
    scope: "MG",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-46-e-flavio-42-no-2o-turno-em-mg-diz-datafolha/",
    tse_protocolo: "BR043962026",
    results: [
      { candidate_name: "Lula",            percentage: 46 },
      { candidate_name: "Flavio Bolsonaro", percentage: 42 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-22",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-21",
    sample_size: 826,
    methodology: "presencial",
    scope: "PI",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-60-dos-votos-no-1o-turno-no-piaui-diz-datafolha/",
    tse_protocolo: "BR056722026",
    results: [
      { candidate_name: "Lula",   percentage: 60 },
      { candidate_name: "Flávio", percentage: 18 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-22",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-21",
    sample_size: 826,
    methodology: "presencial",
    scope: "PI",
    source_url: "https://www.metropoles.com/brasil/datafolha-no-piaui-lula-marca-68-contra-24-de-flavio-em-2o-turno",
    tse_protocolo: "BR056722026",
    results: [
      { candidate_name: "Lula",            percentage: 68 },
      { candidate_name: "Flavio Bolsonaro", percentage: 24 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-08-22",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-20",
    sample_size: 1204,
    methodology: "presencial",
    scope: "RJ",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/flavio-tem-49-e-lula-40-no-2o-turno-no-rj-diz-datafolha/",
    tse_protocolo: "BR084482026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 49 },
      { candidate_name: "Lula",            percentage: 40 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-23",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-20",
    sample_size: 1204,
    methodology: "presencial",
    scope: "PE",
    source_url: "https://www.cbnrecife.com/2026/08/23/datafolha-lula-lidera-em-pernambuco-com-56-das-intencoes-de-voto-no-primeiro-turno/",
    tse_protocolo: "BR001092026",
    results: [
      { candidate_name: "Lula",   percentage: 56 },
      { candidate_name: "Flávio", percentage: 24 },
    ],
  },

  // lote 23 — Presidência, rodada 03/09
  // PoderData · 30 ago-02 set 2026 · TSE BR-07561/2026 · n=3.000 · nacional
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/poderdata-presidente-setembro-2026/
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-02",
    sample_size: 3000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/poderdata-presidente-setembro-2026/",
    tse_protocolo: "BR075612026",
    results: [
      { candidate_name: "Lula",              percentage: 37 },
      { candidate_name: "Flávio",            percentage: 34 },
      { candidate_name: "Augusto Cury",      percentage: 10 },
      { candidate_name: "Renan",             percentage:  3 },
      { candidate_name: "Caiado",            percentage:  2 },
      { candidate_name: "Pablo Marçal",      percentage:  2 },
      { candidate_name: "Hertz Dias",        percentage:  2 },
      { candidate_name: "Zema",              percentage:  1 },
      { candidate_name: "Edmilson Costa",    percentage:  1 },
      { candidate_name: "Samara Martins",    percentage:  1 },
      { candidate_name: "Clariana Barao",    percentage:  1 },
      { candidate_name: "Rui Costa Pimenta", percentage:  1 },
    ],
  },
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-02",
    sample_size: 3000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/poderdata-presidente-setembro-2026/",
    tse_protocolo: "BR075612026",
    scenario_label: "Lula vs Flavio Bolsonaro",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 45 },
      { candidate_name: "Lula",             percentage: 44 },
    ],
  },
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-02",
    sample_size: 3000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/poderdata-presidente-setembro-2026/",
    tse_protocolo: "BR075612026",
    scenario_label: "Lula vs Renan Santos",
    results: [
      { candidate_name: "Lula",         percentage: 44 },
      { candidate_name: "Renan Santos", percentage: 39 },
    ],
  },
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-02",
    sample_size: 3000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/poderdata-presidente-setembro-2026/",
    tse_protocolo: "BR075612026",
    scenario_label: "Lula vs Zema",
    results: [
      { candidate_name: "Lula", percentage: 44 },
      { candidate_name: "Zema", percentage: 42 },
    ],
  },
  {
    institute_name: "PoderData",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-30",
    fieldwork_end: "2026-09-02",
    sample_size: 3000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/poderdata-presidente-setembro-2026/",
    tse_protocolo: "BR075612026",
    scenario_label: "Lula vs Caiado",
    results: [
      { candidate_name: "Lula",   percentage: 44 },
      { candidate_name: "Caiado", percentage: 42 },
    ],
  },

  // Real Time Big Data · 29 ago-02 set 2026 · TSE BR-05862/2026 · n=1.600 · corte estadual (PE)
  // Fonte: https://www.bnews.com.br/noticias/politica/real-timebig-data-lula-lidera-disputa-presidencial-nos-dois-turnos-em-pernambuco.html
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-29",
    fieldwork_end: "2026-09-02",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PE",
    source_url: "https://www.bnews.com.br/noticias/politica/real-timebig-data-lula-lidera-disputa-presidencial-nos-dois-turnos-em-pernambuco.html",
    tse_protocolo: "BR058622026",
    results: [
      { candidate_name: "Lula",         percentage: 56 },
      { candidate_name: "Flávio",       percentage: 23 },
      { candidate_name: "Augusto Cury", percentage:  7 },
      { candidate_name: "Renan",        percentage:  3 },
      { candidate_name: "Pablo Marçal", percentage:  3 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-29",
    fieldwork_end: "2026-09-02",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "PE",
    source_url: "https://www.bnews.com.br/noticias/politica/real-timebig-data-lula-lidera-disputa-presidencial-nos-dois-turnos-em-pernambuco.html",
    tse_protocolo: "BR058622026",
    results: [
      { candidate_name: "Lula",            percentage: 59 },
      { candidate_name: "Flavio Bolsonaro", percentage: 35 },
    ],
  },

  // Real Time Big Data · 29 ago-02 set 2026 · TSE BR-04678/2026 · n=1.600 · corte estadual (MT)
  // Fonte: https://www.midianews.com.br/politica/real-time-big-data-flavio-tem-52-no-2-turno-em-mt-lula-37/528456
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-29",
    fieldwork_end: "2026-09-02",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "MT",
    source_url: "https://www.midianews.com.br/politica/real-time-big-data-flavio-tem-52-no-2-turno-em-mt-lula-37/528456",
    tse_protocolo: "BR046782026",
    results: [
      { candidate_name: "Flávio",       percentage: 41 },
      { candidate_name: "Lula",         percentage: 32 },
      { candidate_name: "Augusto Cury", percentage:  9 },
      { candidate_name: "Renan",        percentage:  5 },
      { candidate_name: "Caiado",       percentage:  3 },
      { candidate_name: "Pablo Marçal", percentage:  3 },
      { candidate_name: "Zema",         percentage:  1 },
    ],
  },
  {
    institute_name: "Real Time Big Data",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-29",
    fieldwork_end: "2026-09-02",
    sample_size: 1600,
    methodology: "telefonica",
    scope: "MT",
    source_url: "https://www.midianews.com.br/politica/real-time-big-data-flavio-tem-52-no-2-turno-em-mt-lula-37/528456",
    tse_protocolo: "BR046782026",
    results: [
      { candidate_name: "Flavio Bolsonaro", percentage: 52 },
      { candidate_name: "Lula",            percentage: 37 },
    ],
  },

  // lote 24 — Senado, repescagem 03/09
  // Instituto Paraná Pesquisas · 31 ago-02 set 2026 · TSE PR-03399/2026 · n=1.280
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/parana-pesquisas-senador-parana-setembro-2026/
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Senador Parana 2026",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-31",
    fieldwork_end: "2026-09-02",
    sample_size: 1280,
    margin_of_error: 2.8,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/parana-pesquisas-senador-parana-setembro-2026/",
    tse_protocolo: "PR033992026",
    results: [
      { candidate_name: "Deltan Dallagnol",  percentage: 30.8 },
      { candidate_name: "Alexandre Curi",    percentage: 28.4 },
      { candidate_name: "Gleisi Hoffmann",   percentage: 25.7 },
      { candidate_name: "Filipe Barros",     percentage: 22.9 },
      { candidate_name: "Cristina Graeml",   percentage: 14.4 },
      { candidate_name: "Dr Rosinha",        percentage: 13.0 },
      { candidate_name: "Marcelo Marcelino", percentage:  1.7 },
      { candidate_name: "Joaquim do Mlb",    percentage:  1.3 },
      { candidate_name: "Karen Guerreiro",   percentage:  0.9 },
    ],
  },

  // Real Time Big Data · 29 ago-02 set 2026 · TSE MT-07156/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-mato-grosso-setembro-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Mato Grosso 2026",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-29",
    fieldwork_end: "2026-09-02",
    sample_size: 1600,
    margin_of_error: 2,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-mato-grosso-setembro-2026/",
    tse_protocolo: "MT071562026",
    results: [
      { candidate_name: "Mauro Mendes",        percentage: 27 },
      { candidate_name: "Janaina Riva",        percentage: 26 },
      { candidate_name: "Carlos Favaro",       percentage: 14 },
      { candidate_name: "Jose Medeiros",       percentage: 13 },
      { candidate_name: "Pedro Taques",        percentage: 13 },
      { candidate_name: "Galvan",              percentage:  2 },
      { candidate_name: "Margareth Buzetti",   percentage:  2 },
    ],
  },

  // AtlasIntel · 28 ago-02 set 2026 · TSE BA-08891/2026 · n=1.804 (base: total de entrevistados)
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-governo-senado-bahia-setembro-2026/
  {
    institute_name: "Atlas Intel",
    election_name: "Senador Bahia 2026",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-28",
    fieldwork_end: "2026-09-02",
    sample_size: 1804,
    margin_of_error: 2,
    methodology: "online",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/atlasintel-governo-senado-bahia-setembro-2026/",
    tse_protocolo: "BA088912026",
    results: [
      { candidate_name: "Rui Costa",          percentage: 28.2 },
      { candidate_name: "Jaques Wagner",      percentage: 23.7 },
      { candidate_name: "Joao Roma",          percentage: 18.3 },
      { candidate_name: "Angelo Coronel",     percentage: 16.0 },
      { candidate_name: "Professora Delliana", percentage: 2.3 },
      { candidate_name: "Marcelo Carvalho",   percentage:  0.5 },
      { candidate_name: "Carlos Sodré",       percentage:  0.2 },
      { candidate_name: "Gregorio Gould",     percentage:  0.1 },
      { candidate_name: "Marcelo Santtana",   percentage:  0.1 },
    ],
  },

  // Real Time Big Data · 29 ago-02 set 2026 · TSE PE-09116/2026 · n=1.600
  // Fonte: https://blogdomagno.com.br/marilia-arraes-segue-na-lideranca-na-disputa-pelo-senado/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Pernambuco 2026",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-08-29",
    fieldwork_end: "2026-09-02",
    sample_size: 1600,
    margin_of_error: 2,
    methodology: "telefonica",
    source_url: "https://blogdomagno.com.br/marilia-arraes-segue-na-lideranca-na-disputa-pelo-senado/",
    tse_protocolo: "PE091162026",
    results: [
      { candidate_name: "Marilia Arraes",       percentage: 29 },
      { candidate_name: "Mendonça Filho",       percentage: 20 },
      { candidate_name: "Humberto Costa",       percentage: 19 },
      { candidate_name: "Eduardo da Fonte",     percentage: 13 },
      { candidate_name: "Tulio Gadelha",        percentage: 12 },
      { candidate_name: "Carlos Sant Anna",     percentage:  1 },
      { candidate_name: "Paulo Rubem Santiago", percentage:  1 },
    ],
  },

  // lote 25 — Senado, mineração de julho-agosto (Paraná Pesquisas / Real Time Big Data / Quaest)

  // Instituto Paraná Pesquisas · 26-29 ago 2026 · TSE AL-03316/2026 · n=1.400
  // Fonte: https://www.metropoles.com/brasil/senado-em-al-lira-tem-404-renan-calheiros-368-diz-parana-pesquisas
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Senador Alagoas 2026",
    publication_date: "2026-08-31",
    fieldwork_start: "2026-08-26",
    fieldwork_end: "2026-08-29",
    sample_size: 1400,
    methodology: "presencial",
    source_url: "https://www.metropoles.com/brasil/senado-em-al-lira-tem-404-renan-calheiros-368-diz-parana-pesquisas",
    tse_protocolo: "AL033162026",
    results: [
      { candidate_name: "Arthur Lira",         percentage: 40.4 },
      { candidate_name: "Renan Calheiros",     percentage: 36.8 },
      { candidate_name: "Marina Jhc",          percentage: 28.4 },
      { candidate_name: "Davi Davino Filho",   percentage: 24.4 },
      { candidate_name: "Dr. Wanderley",       percentage: 10.8 },
      { candidate_name: "Alexandre Fleming",   percentage:  2.5 },
      { candidate_name: "Mariedson",           percentage:  0.3 },
    ],
  },

  // Instituto Paraná Pesquisas · 26-28 ago 2026 · TSE AP-00062/2026 · n=1.080
  // Fonte: https://www.metropoles.com/brasil/parana-pesquisas-rayssa-lidera-senado-no-ap-barreto-e-randolfe-empatam
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Senador Amapa 2026",
    publication_date: "2026-08-29",
    fieldwork_start: "2026-08-26",
    fieldwork_end: "2026-08-28",
    sample_size: 1080,
    methodology: "presencial",
    source_url: "https://www.metropoles.com/brasil/parana-pesquisas-rayssa-lidera-senado-no-ap-barreto-e-randolfe-empatam",
    tse_protocolo: "AP000622026",
    results: [
      { candidate_name: "Rayssa Furlan",          percentage: 56.0 },
      { candidate_name: "Lucas Barreto",          percentage: 38.1 },
      { candidate_name: "Randolfe Rodrigues",     percentage: 36.6 },
      { candidate_name: "Alliny Serrão",          percentage: 18.4 },
      { candidate_name: "Acácio Favacho",         percentage: 16.2 },
      { candidate_name: "Capi",                   percentage:  6.3 },
      { candidate_name: "Juíza Jô",               percentage:  1.4 },
      { candidate_name: "Professor Uzian Pinto",  percentage:  0.8 },
      { candidate_name: "Helio Silva",            percentage:  0.6 },
    ],
  },

  // Real Time Big Data · 24-27 ago 2026 · TSE GO-00954/2026 · n=1.600
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/real-time-gracinha-e-gayer-lideram-corrida-ao-senado-em-goias/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Goias 2026",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-27",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/real-time-gracinha-e-gayer-lideram-corrida-ao-senado-em-goias/",
    tse_protocolo: "GO009542026",
    results: [
      { candidate_name: "Gracinha Caiado",   percentage: 27 },
      { candidate_name: "Gustavo Gayer",     percentage: 17 },
      { candidate_name: "Gustavo Mendanha",  percentage: 12 },
      { candidate_name: "Zacarias Calil",    percentage: 12 },
      { candidate_name: "Vanderlan Cardoso", percentage: 10 },
      { candidate_name: "Isaura Lemos",      percentage:  5 },
      { candidate_name: "Oséias Varão",      percentage:  4 },
      { candidate_name: "Cintia Dias",       percentage:  3 },
      { candidate_name: "Iure Castro",       percentage:  2 },
      { candidate_name: "Ernesto Roller",    percentage:  1 },
    ],
  },

  // Instituto Paraná Pesquisas · 25-27 ago 2026 · TSE TO-02900/2026 · n=1.504
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/parana-pesquisas-governador-senador-tocantins-agosto-2026/
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Senador Tocantins 2026",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-25",
    fieldwork_end: "2026-08-27",
    sample_size: 1504,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/parana-pesquisas-governador-senador-tocantins-agosto-2026/",
    tse_protocolo: "TO029002026",
    results: [
      { candidate_name: "Eduardo Gomes",              percentage: 35.1 },
      { candidate_name: "Alexandre Guimarães",        percentage: 21.6 },
      { candidate_name: "Carlos Gaguim",              percentage: 20.8 },
      { candidate_name: "Ronaldo Dimas",              percentage: 16.0 },
      { candidate_name: "Vanderlei Luxemburgo",       percentage: 15.0 },
      { candidate_name: "Eli Borges",                 percentage: 14.2 },
      { candidate_name: "Paulo Mourão",                percentage: 14.0 },
      { candidate_name: "Helio Rodrigues Bolsonaro",  percentage:  3.3 },
      { candidate_name: "Nilton Santos",              percentage:  3.3 },
      { candidate_name: "Fábio Ribeiro",              percentage:  2.8 },
      { candidate_name: "Professor Osvaldo",          percentage:  2.0 },
      { candidate_name: "Apóstolo Flavio Braga",      percentage:  1.3 },
      { candidate_name: "Osvany Luz",                 percentage:  0.4 },
    ],
  },

  // Real Time Big Data · 24-27 ago 2026 · TSE PR-07845/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-senado-parana-agosto-2026-2/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Parana 2026",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-24",
    fieldwork_end: "2026-08-27",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-senado-parana-agosto-2026-2/",
    tse_protocolo: "PR078452026",
    results: [
      { candidate_name: "Deltan Dallagnol",  percentage: 20 },
      { candidate_name: "Alexandre Curi",    percentage: 18 },
      { candidate_name: "Filipe Barros",     percentage: 17 },
      { candidate_name: "Gleisi Hoffmann",   percentage: 15 },
      { candidate_name: "Cristina Graeml",   percentage: 14 },
      { candidate_name: "Dr Rosinha",        percentage:  5 },
      { candidate_name: "Karen Guerreiro",   percentage:  1 },
    ],
  },

  // Instituto Paraná Pesquisas · 22-26 ago 2026 · TSE ES-02530/2026 · n=1.504
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/parana-pesquisas-governador-senador-espirito-santo-agosto-2026/
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Senador Espirito Santo 2026",
    publication_date: "2026-08-28",
    fieldwork_start: "2026-08-22",
    fieldwork_end: "2026-08-26",
    sample_size: 1504,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/parana-pesquisas-governador-senador-espirito-santo-agosto-2026/",
    tse_protocolo: "ES025302026",
    results: [
      { candidate_name: "Renato Casagrande",   percentage: 52.3 },
      { candidate_name: "Fabiano Contarato",   percentage: 25.4 },
      { candidate_name: "Sergio Meneguelli",   percentage: 17.9 },
      { candidate_name: "Maguinha Malta",      percentage: 14.1 },
      { candidate_name: "Rose de Freitas",     percentage: 12.9 },
      { candidate_name: "Evair de Melo",       percentage: 12.0 },
      { candidate_name: "Marcos do Val",       percentage: 10.2 },
      { candidate_name: "Rodney Miranda",      percentage:  2.8 },
      { candidate_name: "Wellington Callegari", percentage: 2.7 },
      { candidate_name: "Professor Fabian",    percentage:  2.5 },
      { candidate_name: "Leonardo Monjardim",  percentage:  1.5 },
    ],
  },

  // Real Time Big Data · 22-26 ago 2026 · TSE ES-05096/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-espirito-santo-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Espirito Santo 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-22",
    fieldwork_end: "2026-08-26",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-espirito-santo-agosto-2026/",
    tse_protocolo: "ES050962026",
    results: [
      { candidate_name: "Renato Casagrande",    percentage: 30 },
      { candidate_name: "Sergio Meneguelli",    percentage: 14 },
      { candidate_name: "Rose de Freitas",      percentage: 10 },
      { candidate_name: "Fabiano Contarato",    percentage:  9 },
      { candidate_name: "Maguinha Malta",       percentage:  9 },
      { candidate_name: "Evair de Melo",        percentage:  6 },
      { candidate_name: "Leonardo Monjardim",   percentage:  3 },
      { candidate_name: "Marcos do Val",        percentage:  3 },
      { candidate_name: "Professor Fabian",     percentage:  3 },
      { candidate_name: "Rodney Miranda",       percentage:  3 },
      { candidate_name: "Wellington Callegari", percentage:  1 },
    ],
  },

  // Instituto Paraná Pesquisas · 23-25 ago 2026 · TSE BA-07628/2026 · n=1.400
  // Fonte: https://www.metropoles.com/brasil/senado-na-bahia-rui-costa-tem-435-e-jaques-322-diz-parana-pesquisas
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Senador Bahia 2026",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-25",
    sample_size: 1400,
    methodology: "presencial",
    source_url: "https://www.metropoles.com/brasil/senado-na-bahia-rui-costa-tem-435-e-jaques-322-diz-parana-pesquisas",
    tse_protocolo: "BA076282026",
    results: [
      { candidate_name: "Rui Costa",      percentage: 43.5 },
      { candidate_name: "Jaques Wagner",  percentage: 32.2 },
      { candidate_name: "Joao Roma",      percentage: 26.6 },
      { candidate_name: "Angelo Coronel", percentage: 25.1 },
    ],
  },

  // Instituto Paraná Pesquisas · 22-24 ago 2026 · TSE RJ-02422/2026 · n=1.600
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/parana-pesquisas-benedita-e-crivella-lideram-disputa-ao-senado-pelo-rj-2/
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Senador Rio de Janeiro 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-22",
    fieldwork_end: "2026-08-24",
    sample_size: 1600,
    methodology: "presencial",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/parana-pesquisas-benedita-e-crivella-lideram-disputa-ao-senado-pelo-rj-2/",
    tse_protocolo: "RJ024222026",
    results: [
      { candidate_name: "Benedita da Silva", percentage: 29.6 },
      { candidate_name: "Marcelo Crivella",  percentage: 21.0 },
      { candidate_name: "Pedro Paulo",       percentage: 16.4 },
      { candidate_name: "Carlos Jordy",      percentage: 11.9 },
      { candidate_name: "Carlos Portinho",   percentage: 10.6 },
      { candidate_name: "Waguinho",          percentage:  9.2 },
      { candidate_name: "Mônica Benício",    percentage:  5.9 },
      { candidate_name: "André Monteiro",    percentage:  5.3 },
      { candidate_name: "Marcos Dias",       percentage:  3.9 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE PB-07850/2026 · n=804
  // Fonte: https://www.metropoles.com/brasil/quaest-joao-azevedo-tem-27-veneziano-vital-17-ao-senado-na-pb
  {
    institute_name: "Quaest",
    election_name: "Senador Paraiba 2026",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.metropoles.com/brasil/quaest-joao-azevedo-tem-27-veneziano-vital-17-ao-senado-na-pb",
    tse_protocolo: "PB078502026",
    results: [
      { candidate_name: "Joao Azevedo",         percentage: 27 },
      { candidate_name: "Veneziano Vital",      percentage: 17 },
      { candidate_name: "Nabor",                percentage:  9 },
      { candidate_name: "Dr. Marcelo Queiroga", percentage:  6 },
      { candidate_name: "Major Fábio",          percentage:  5 },
      { candidate_name: "André Gadelha",        percentage:  2 },
      { candidate_name: "João Batista",         percentage:  1 },
      { candidate_name: "Adriano Trajano",      percentage:  1 },
    ],
  },

  // Instituto Paraná Pesquisas · 21-23 ago 2026 · TSE MT-02157/2026 · n=1.504
  // Fonte: https://www.cnnbrasil.com.br/eleicoes/pesquisas-mauro-mendes-tem-523-para-o-senado-de-mt-riva-tem-337/
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Senador Mato Grosso 2026",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-23",
    sample_size: 1504,
    methodology: "presencial",
    source_url: "https://www.cnnbrasil.com.br/eleicoes/pesquisas-mauro-mendes-tem-523-para-o-senado-de-mt-riva-tem-337/",
    tse_protocolo: "MT021572026",
    results: [
      { candidate_name: "Mauro Mendes",              percentage: 52.3 },
      { candidate_name: "Janaina Riva",              percentage: 33.7 },
      { candidate_name: "Jose Medeiros",             percentage: 18.8 },
      { candidate_name: "Pedro Taques",              percentage: 16.5 },
      { candidate_name: "Carlos Favaro",             percentage: 14.6 },
      { candidate_name: "Coronel Darwin",            percentage:  4.7 },
      { candidate_name: "Professor Nelson Ferreira", percentage:  4.1 },
      { candidate_name: "Galvan",                    percentage:  4.0 },
      { candidate_name: "Margareth Buzetti",         percentage:  1.8 },
      { candidate_name: "Beny Godoy",                percentage:  1.1 },
    ],
  },

  // Quaest · 20-23 ago 2026 · TSE RN-00876/2026 · n=804
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-rio-grande-do-norte-agosto-2026/
  // Nota: fonte também cita "Samanda de Lula" 8% — nome não bate com nenhum candidato
  // já cadastrado (temos "Samanda Alves"); não inserido por falta de confirmação segura.
  {
    institute_name: "Quaest",
    election_name: "Senador Rio Grande do Norte 2026",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-23",
    sample_size: 804,
    methodology: "presencial",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/quaest-governador-senador-rio-grande-do-norte-agosto-2026/",
    tse_protocolo: "RN008762026",
    results: [
      { candidate_name: "Styvenson Valentim",       percentage: 16 },
      { candidate_name: "Zenaide Maia",             percentage: 10 },
      { candidate_name: "Rafael Motta",             percentage:  8 },
      { candidate_name: "Coronel Hélio Oliveira",   percentage:  5 },
      { candidate_name: "Professor Guilherme",      percentage:  1 },
      { candidate_name: "Sandro Pimentel",          percentage:  1 },
      { candidate_name: "Gari Wendell Batista",     percentage:  1 },
      { candidate_name: "Sonia Godeiro",            percentage:  1 },
      { candidate_name: "Rosália Fernandes",        percentage:  1 },
      { candidate_name: "Tércio Tinôco",            percentage:  1 },
    ],
  },

  // Real Time Big Data · 19-22 ago 2026 · TSE PB-07790/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-paraiba-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Paraiba 2026",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-22",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senado-paraiba-agosto-2026/",
    tse_protocolo: "PB077902026",
    results: [
      { candidate_name: "Joao Azevedo",         percentage: 29 },
      { candidate_name: "Veneziano Vital",      percentage: 23 },
      { candidate_name: "Dr. Marcelo Queiroga", percentage: 15 },
      { candidate_name: "Nabor",                percentage: 15 },
      { candidate_name: "Major Fábio",          percentage:  4 },
      { candidate_name: "André Gadelha",        percentage:  4 },
    ],
  },

  // Real Time Big Data · 19-22 ago 2026 · TSE SP-01347/2026 · n=2.000
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-senador-sao-paulo-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Sao Paulo 2026",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-19",
    fieldwork_end: "2026-08-22",
    sample_size: 2000,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-senador-sao-paulo-agosto-2026/",
    tse_protocolo: "SP013472026",
    results: [
      { candidate_name: "Guilherme Derrite",  percentage: 18 },
      { candidate_name: "Simone Tebet",       percentage: 17 },
      { candidate_name: "Andre do Prado",     percentage: 15 },
      { candidate_name: "Marina Silva",       percentage: 14 },
      { candidate_name: "Ricardo Salles",     percentage: 10 },
      { candidate_name: "Soninha Francine",   percentage:  3 },
      { candidate_name: "Guto Schiavetto",    percentage:  2 },
      { candidate_name: "Geraldo Rufino",     percentage:  2 },
    ],
  },

  // Real Time Big Data · 15-19 ago 2026 · TSE CE-08223/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-ceara-agosto-2026/
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Ceara 2026",
    publication_date: "2026-08-20",
    fieldwork_start: "2026-08-15",
    fieldwork_end: "2026-08-19",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-governador-senador-ceara-agosto-2026/",
    tse_protocolo: "CE082232026",
    results: [
      { candidate_name: "Cid Gomes",             percentage: 27 },
      { candidate_name: "Capitão Wagner",        percentage: 21 },
      { candidate_name: "Luizianne Lins",        percentage: 21 },
      { candidate_name: "Alcides Fernandes",     percentage: 14 },
      { candidate_name: "Guilherme Theophilo",   percentage:  5 },
    ],
  },

  // Real Time Big Data · 14-18 ago 2026 · TSE DF-07849/2026 · n=1.600
  // Fonte: https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-senador-distrito-federal-agosto-2026/
  // Nota: fonte também cita "Cristian Viana" 2% — nome não bate com nenhum candidato
  // já cadastrado; não inserido por falta de confirmação segura.
  {
    institute_name: "Real Time Big Data",
    election_name: "Senador Distrito Federal 2026",
    publication_date: "2026-08-19",
    fieldwork_start: "2026-08-14",
    fieldwork_end: "2026-08-18",
    sample_size: 1600,
    methodology: "telefonica",
    source_url: "https://www.gazetadopovo.com.br/eleicoes/2026/pesquisa-eleitoral-2026/real-time-big-data-senador-distrito-federal-agosto-2026/",
    tse_protocolo: "DF078492026",
    results: [
      { candidate_name: "Michelle Bolsonaro",  percentage: 25 },
      { candidate_name: "Leila Barros",        percentage: 17 },
      { candidate_name: "Bia Kicis",           percentage: 15 },
      { candidate_name: "Érika Kokay",         percentage: 15 },
      { candidate_name: "Sebastião Coelho",    percentage:  8 },
      { candidate_name: "Tiago",               percentage:  1 },
    ],
  },

  // lote 26 — Presidência, cortes estaduais Quaest (protocolo BR pareado com Governador/Senador,
  // mesmo padrão já mapeado pra Datafolha/RTBD). Cenário "sem Marçal" usado como base — cada
  // protocolo também testou "com Marçal" com números 1-3pp diferentes, não inserido por vez.

  // Quaest · 25-28 ago 2026 · TSE PA-07718/2026 (par: BR-05309/2026) · n=804
  // Fonte: https://www.metropoles.com/brasil/quaest-no-para-lula-lidera-com-39-no-1o-turno-flavio-bolsonaro-tem-28
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-29",
    fieldwork_start: "2026-08-25",
    fieldwork_end: "2026-08-28",
    sample_size: 804,
    methodology: "presencial",
    scope: "PA",
    source_url: "https://www.metropoles.com/brasil/quaest-no-para-lula-lidera-com-39-no-1o-turno-flavio-bolsonaro-tem-28",
    tse_protocolo: "BR053092026",
    results: [
      { candidate_name: "Lula",          percentage: 37 },
      { candidate_name: "Flávio",        percentage: 29 },
      { candidate_name: "Augusto Cury", percentage:  5 },
      { candidate_name: "Renan",         percentage:  3 },
      { candidate_name: "Caiado",        percentage:  2 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE BR-08926/2026 · n=804
  // Fonte: https://portalranielycarvalho.com.br/politica/2026/08/28/pesquisa-presidencial-em-roraima/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    scope: "RR",
    source_url: "https://portalranielycarvalho.com.br/politica/2026/08/28/pesquisa-presidencial-em-roraima/",
    tse_protocolo: "BR089262026",
    results: [
      { candidate_name: "Flávio",             percentage: 52 },
      { candidate_name: "Lula",               percentage: 17 },
      { candidate_name: "Renan",              percentage:  4 },
      { candidate_name: "Caiado",             percentage:  3 },
      { candidate_name: "Augusto Cury",       percentage:  3 },
      { candidate_name: "Samara Martins",     percentage:  1 },
      { candidate_name: "Zema",               percentage:  1 },
      { candidate_name: "Rui Costa Pimenta",  percentage:  1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE BR-07281/2026 · n=804
  // Fonte: https://fanf1.com.br/2026/08/27/lula-lidera-disputa-pela-presidencia-em-sergipe-com-53-aponta-pesquisa-quaest/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    scope: "SE",
    source_url: "https://fanf1.com.br/2026/08/27/lula-lidera-disputa-pela-presidencia-em-sergipe-com-53-aponta-pesquisa-quaest/",
    tse_protocolo: "BR072812026",
    results: [
      { candidate_name: "Lula",          percentage: 53 },
      { candidate_name: "Flávio",        percentage: 19 },
      { candidate_name: "Caiado",        percentage:  3 },
      { candidate_name: "Augusto Cury", percentage:  2 },
      { candidate_name: "Renan",         percentage:  2 },
      { candidate_name: "Samara Martins", percentage: 1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE BR-07810/2026 (par: GO-06186/2026) · n=804
  // Fonte: https://aredacao.com.br/com-32-caiado-lidera-disputa-pela-presidencia-entre-eleitores-de-goias-aponta-quaest/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    scope: "GO",
    source_url: "https://aredacao.com.br/com-32-caiado-lidera-disputa-pela-presidencia-entre-eleitores-de-goias-aponta-quaest/",
    tse_protocolo: "BR078102026",
    results: [
      { candidate_name: "Caiado",        percentage: 32 },
      { candidate_name: "Flávio",        percentage: 27 },
      { candidate_name: "Lula",          percentage: 20 },
      { candidate_name: "Renan",         percentage:  2 },
      { candidate_name: "Zema",          percentage:  2 },
      { candidate_name: "Augusto Cury", percentage:  1 },
      { candidate_name: "Samara Martins", percentage: 1 },
    ],
  },

  // Quaest · 23-26 ago 2026 · TSE ES-04444/2026 (par: BR-06255/2026) · n=804
  // Fonte: https://gazetabrasil.com.br/ultimas-noticias/2026/08/27/pesquisa-quaest-revela-cenario-inedito-para-a-disputa-presidencial-de-2026-no-espirito-santo/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-27",
    fieldwork_start: "2026-08-23",
    fieldwork_end: "2026-08-26",
    sample_size: 804,
    methodology: "presencial",
    scope: "ES",
    source_url: "https://gazetabrasil.com.br/ultimas-noticias/2026/08/27/pesquisa-quaest-revela-cenario-inedito-para-a-disputa-presidencial-de-2026-no-espirito-santo/",
    tse_protocolo: "BR062552026",
    results: [
      { candidate_name: "Flávio",        percentage: 37 },
      { candidate_name: "Lula",          percentage: 30 },
      { candidate_name: "Renan",         percentage:  4 },
      { candidate_name: "Caiado",        percentage:  3 },
      { candidate_name: "Zema",          percentage:  2 },
      { candidate_name: "Augusto Cury", percentage:  2 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE PE-07828/2026 (par: BR-04281/2026) · n=1.302
  // Fonte: https://tvsimbrasil.com.br/eleicoes-2026/quaest-lula-54-flavio-bolsonaro-19-primeiro-turno-pernambuco
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1302,
    methodology: "presencial",
    scope: "PE",
    source_url: "https://tvsimbrasil.com.br/eleicoes-2026/quaest-lula-54-flavio-bolsonaro-19-primeiro-turno-pernambuco",
    tse_protocolo: "BR042812026",
    results: [
      { candidate_name: "Lula",   percentage: 54 },
      { candidate_name: "Flávio", percentage: 19 },
      { candidate_name: "Caiado", percentage:  3 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE RJ-08748/2026 (par: BR-09895/2026) · n=1.302
  // Fonte: https://www.metropoles.com/brasil/flavio-bolsonaro-e-lula-estao-tecnicamente-empatados-no-rj-diz-quaest
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 1302,
    methodology: "presencial",
    scope: "RJ",
    source_url: "https://www.metropoles.com/brasil/flavio-bolsonaro-e-lula-estao-tecnicamente-empatados-no-rj-diz-quaest",
    tse_protocolo: "BR098952026",
    results: [
      { candidate_name: "Flávio",        percentage: 31 },
      { candidate_name: "Lula",          percentage: 29 },
      { candidate_name: "Renan",         percentage:  2 },
      { candidate_name: "Caiado",        percentage:  2 },
      { candidate_name: "Zema",          percentage:  2 },
      { candidate_name: "Augusto Cury", percentage:  1 },
      { candidate_name: "Samara Martins", percentage: 1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE BR-08827/2026 · n=804
  // Fonte: https://conectamapa.com/pesquisa-no-amapa-lula-lidera-com-36-dos-votos/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    scope: "AP",
    source_url: "https://conectamapa.com/pesquisa-no-amapa-lula-lidera-com-36-dos-votos/",
    tse_protocolo: "BR088272026",
    results: [
      { candidate_name: "Lula",             percentage: 36 },
      { candidate_name: "Flávio",           percentage: 33 },
      { candidate_name: "Renan",            percentage:  3 },
      { candidate_name: "Augusto Cury",    percentage:  2 },
      { candidate_name: "Caiado",           percentage:  2 },
      { candidate_name: "Zema",             percentage:  1 },
      { candidate_name: "Rui Costa Pimenta", percentage: 1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE MS-00793/2026 (par: BR-04312/2026) · n=804
  // Fonte: https://www.ocorreionews.com.br/2026/08/26/intencoes-de-votos-para-presidente-em-ms-flavio-bolsonaro-33-lula-27-caiado-5-renan-santos-4-cury-3-segundo-pesquisa-quaest/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    scope: "MS",
    source_url: "https://www.ocorreionews.com.br/2026/08/26/intencoes-de-votos-para-presidente-em-ms-flavio-bolsonaro-33-lula-27-caiado-5-renan-santos-4-cury-3-segundo-pesquisa-quaest/",
    tse_protocolo: "BR043122026",
    results: [
      { candidate_name: "Flávio",          percentage: 33 },
      { candidate_name: "Lula",            percentage: 27 },
      { candidate_name: "Caiado",          percentage:  5 },
      { candidate_name: "Renan",           percentage:  4 },
      { candidate_name: "Augusto Cury",   percentage:  3 },
      { candidate_name: "Zema",            percentage:  2 },
      { candidate_name: "Samara Martins",  percentage:  2 },
      { candidate_name: "Clariana Barao", percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE MT-04846/2026 (par: BR-00817/2026) · n=804
  // Fonte: https://www.powermix.com.br/politica/quaest-flavio-bolsonaro-tem-43-e-lula-26-na-disputa-presidencial-em-mato-grosso/56594
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    scope: "MT",
    source_url: "https://www.powermix.com.br/politica/quaest-flavio-bolsonaro-tem-43-e-lula-26-na-disputa-presidencial-em-mato-grosso/56594",
    tse_protocolo: "BR008172026",
    results: [
      { candidate_name: "Flávio",        percentage: 43 },
      { candidate_name: "Lula",          percentage: 26 },
      { candidate_name: "Caiado",        percentage:  4 },
      { candidate_name: "Renan",         percentage:  3 },
      { candidate_name: "Zema",          percentage:  2 },
      { candidate_name: "Augusto Cury", percentage:  1 },
      { candidate_name: "Samara Martins", percentage: 1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE RO-05711/2026 (par: BR-00490/2026) · n=804
  // Fonte: https://www.agenciarondonia.com/2026/08/quaest-aponta-flavio-bolsonaro-com-45-e.html
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    scope: "RO",
    source_url: "https://www.agenciarondonia.com/2026/08/quaest-aponta-flavio-bolsonaro-com-45-e.html",
    tse_protocolo: "BR004902026",
    results: [
      { candidate_name: "Flávio",                     percentage: 45 },
      { candidate_name: "Lula",                       percentage: 25 },
      { candidate_name: "Caiado",                      percentage:  3 },
      { candidate_name: "Renan",                       percentage:  3 },
      { candidate_name: "Zema",                        percentage:  2 },
      { candidate_name: "Augusto Cury",               percentage:  1 },
      { candidate_name: "Veterinário Wilson Grassi",  percentage:  1 },
      { candidate_name: "Clariana Barao",             percentage:  1 },
    ],
  },

  // Quaest · 21-24 ago 2026 · TSE BR-00699/2026 (par: PB-07850/2026) · n=804
  // Fonte: https://jornaldaparaiba.com.br/politica/quaest-na-paraiba-pesquisa-todos-os-numeros-agosto
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-25",
    fieldwork_start: "2026-08-21",
    fieldwork_end: "2026-08-24",
    sample_size: 804,
    methodology: "presencial",
    scope: "PB",
    source_url: "https://jornaldaparaiba.com.br/politica/quaest-na-paraiba-pesquisa-todos-os-numeros-agosto",
    tse_protocolo: "BR006992026",
    results: [
      { candidate_name: "Lula",   percentage: 50 },
      { candidate_name: "Flávio", percentage: 21 },
      { candidate_name: "Caiado", percentage:  3 },
      { candidate_name: "Renan",  percentage:  2 },
      { candidate_name: "Zema",   percentage:  1 },
    ],
  },

  // Quaest · 20-23 ago 2026 · TSE PR-05388/2026 (par: BR-03761/2026) · n=804
  // Fonte: https://www.poder360.com.br/poder-eleicoes-2026/flavio-bolsonaro-tem-41-no-1o-turno-no-parana-diz-quaest/
  {
    institute_name: "Quaest",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-08-24",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-23",
    sample_size: 804,
    methodology: "presencial",
    scope: "PR",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/flavio-bolsonaro-tem-41-no-1o-turno-no-parana-diz-quaest/",
    tse_protocolo: "BR037612026",
    results: [
      { candidate_name: "Flávio",          percentage: 41 },
      { candidate_name: "Lula",            percentage: 23 },
      { candidate_name: "Caiado",          percentage:  5 },
      { candidate_name: "Zema",            percentage:  3 },
      { candidate_name: "Renan",           percentage:  2 },
      { candidate_name: "Augusto Cury",   percentage:  1 },
      { candidate_name: "Edmilson Costa", percentage:  1 },
    ],
  },

  // lote 27 — Presidência, Datafolha nacional 03/09 (19h16)
  // Datafolha · 01-03 set 2026 · TSE BR-03669/2026 · n=2.002 · nacional
  // Fonte: https://www.opovo.com.br/noticias/politica/eleicoes/2026/09/03/datafolha-tem-lula-com-38-contra-33-de-flavio-bolsonaro-no-1-turno-ha-empate-tecnico-no-2.html
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 1º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-09-01",
    fieldwork_end: "2026-09-03",
    sample_size: 2002,
    methodology: "presencial",
    source_url: "https://www.opovo.com.br/noticias/politica/eleicoes/2026/09/03/datafolha-tem-lula-com-38-contra-33-de-flavio-bolsonaro-no-1-turno-ha-empate-tecnico-no-2.html",
    tse_protocolo: "BR036692026",
    results: [
      { candidate_name: "Lula",          percentage: 38 },
      { candidate_name: "Flávio",        percentage: 33 },
      { candidate_name: "Augusto Cury", percentage:  8 },
      { candidate_name: "Caiado",        percentage:  4 },
      { candidate_name: "Renan",         percentage:  3 },
      { candidate_name: "Zema",          percentage:  2 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-09-01",
    fieldwork_end: "2026-09-03",
    sample_size: 2002,
    methodology: "presencial",
    source_url: "https://www.opovo.com.br/noticias/politica/eleicoes/2026/09/03/datafolha-tem-lula-com-38-contra-33-de-flavio-bolsonaro-no-1-turno-ha-empate-tecnico-no-2.html",
    tse_protocolo: "BR036692026",
    scenario_label: "Lula vs Flavio Bolsonaro",
    results: [
      { candidate_name: "Lula",            percentage: 46 },
      { candidate_name: "Flavio Bolsonaro", percentage: 44 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-09-01",
    fieldwork_end: "2026-09-03",
    sample_size: 2002,
    methodology: "presencial",
    source_url: "https://www.opovo.com.br/noticias/politica/eleicoes/2026/09/03/datafolha-tem-lula-com-38-contra-33-de-flavio-bolsonaro-no-1-turno-ha-empate-tecnico-no-2.html",
    tse_protocolo: "BR036692026",
    scenario_label: "Lula vs Caiado",
    results: [
      { candidate_name: "Lula",   percentage: 46 },
      { candidate_name: "Caiado", percentage: 41 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-09-01",
    fieldwork_end: "2026-09-03",
    sample_size: 2002,
    methodology: "presencial",
    source_url: "https://www.opovo.com.br/noticias/politica/eleicoes/2026/09/03/datafolha-tem-lula-com-38-contra-33-de-flavio-bolsonaro-no-1-turno-ha-empate-tecnico-no-2.html",
    tse_protocolo: "BR036692026",
    scenario_label: "Lula vs Zema",
    results: [
      { candidate_name: "Lula", percentage: 48 },
      { candidate_name: "Zema", percentage: 39 },
    ],
  },
  {
    institute_name: "Datafolha",
    election_name: "Presidencial 2026 - 2º Turno",
    publication_date: "2026-09-03",
    fieldwork_start: "2026-09-01",
    fieldwork_end: "2026-09-03",
    sample_size: 2002,
    methodology: "presencial",
    source_url: "https://www.opovo.com.br/noticias/politica/eleicoes/2026/09/03/datafolha-tem-lula-com-38-contra-33-de-flavio-bolsonaro-no-1-turno-ha-empate-tecnico-no-2.html",
    tse_protocolo: "BR036692026",
    scenario_label: "Lula vs Renan Santos",
    results: [
      { candidate_name: "Lula",         percentage: 47 },
      { candidate_name: "Renan Santos", percentage: 38 },
    ],
  },

  // lote 28 — primeira pesquisa de Deputado Federal curada
  // Instituto Paraná Pesquisas · 31 mai-02 jun 2026 · TSE AC-01182/2026 · n=1.000
  // Fonte: https://www.poder360.com.br (5 nomes empatam na disputa para deputado federal no AC)
  {
    institute_name: "Paraná Pesquisas",
    election_name: "Deputado Federal Acre 2026",
    publication_date: "2026-06-03",
    fieldwork_start: "2026-05-31",
    fieldwork_end: "2026-06-02",
    sample_size: 1000,
    margin_of_error: 3.2,
    methodology: "presencial",
    source_url: "https://www.poder360.com.br/poder-eleicoes-2026/5-nomes-empatam-na-disputa-para-deputado-federal-no-ac/",
    tse_protocolo: "AC011822026",
    results: [
      { candidate_name: "Coronel Ulysses",  percentage: 12.5 },
      { candidate_name: "Socorro Neri",     percentage: 12.2 },
      { candidate_name: "Minoru Kinpara",   percentage:  8.5 },
      { candidate_name: "Perpétua Almeida", percentage:  8.1 },
      { candidate_name: "Antônia Lúcia",    percentage:  6.4 },
    ],
  },

  // lote 29 — Senado, Instituto Gazeta (novo instituto, contratado pela TV Atual/Record News,
  // confirmado com cobertura real de imprensa em GO/DF). Número usado: "1º voto".

  // Instituto Gazeta · 18-22 ago 2026 · TSE DF-09414/2026 · n=2.000
  // Fonte: https://www.metropoles.com/colunas/grande-angular/michelle-lidera-como-favorita-ao-senado-pelo-df-diz-pesquisa-igape
  {
    institute_name: "Instituto Gazeta",
    election_name: "Senador Distrito Federal 2026",
    publication_date: "2026-08-23",
    fieldwork_start: "2026-08-18",
    fieldwork_end: "2026-08-22",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "telefonica",
    source_url: "https://www.metropoles.com/colunas/grande-angular/michelle-lidera-como-favorita-ao-senado-pelo-df-diz-pesquisa-igape",
    tse_protocolo: "DF094142026",
    results: [
      { candidate_name: "Michelle Bolsonaro",         percentage: 23.6 },
      { candidate_name: "Leila Barros",                percentage: 11.4 },
      { candidate_name: "Érika Kokay",                 percentage:  9.9 },
      { candidate_name: "Bia Kicis",                   percentage:  9.1 },
      { candidate_name: "Ronaldo Fonseca",              percentage:  2.5 },
      { candidate_name: "Sebastião Coelho",            percentage:  2.1 },
      { candidate_name: "Tiago",                        percentage:  1.5 },
      { candidate_name: "Guto Felício Dos Santos",     percentage:  1.3 },
      { candidate_name: "Professor Guilherme Amorim",  percentage:  1.3 },
      { candidate_name: "Zanata",                       percentage:  1.0 },
      { candidate_name: "Marley",                       percentage:  0.8 },
      { candidate_name: "Avenir Rosa",                  percentage:  0.6 },
      { candidate_name: "David Horn",                   percentage:  0.4 },
    ],
  },

  // Instituto Gazeta · 25-29 ago 2026 · TSE DF-02089/2026 · n=2.000
  // Fonte: https://jornaldebrasilia.com.br/brasilia/michelle-dispara-na-corrida-pelo-senado-e-chega-a-271-no-df/
  {
    institute_name: "Instituto Gazeta",
    election_name: "Senador Distrito Federal 2026",
    publication_date: "2026-08-30",
    fieldwork_start: "2026-08-25",
    fieldwork_end: "2026-08-29",
    sample_size: 2000,
    margin_of_error: 2.2,
    methodology: "telefonica",
    source_url: "https://jornaldebrasilia.com.br/brasilia/michelle-dispara-na-corrida-pelo-senado-e-chega-a-271-no-df/",
    tse_protocolo: "DF020892026",
    results: [
      { candidate_name: "Michelle Bolsonaro",         percentage: 27.1 },
      { candidate_name: "Leila Barros",                percentage: 13.7 },
      { candidate_name: "Érika Kokay",                 percentage: 10.3 },
      { candidate_name: "Bia Kicis",                   percentage:  8.7 },
      { candidate_name: "Sebastião Coelho",            percentage:  2.8 },
      { candidate_name: "Ronaldo Fonseca",              percentage:  1.9 },
      { candidate_name: "Tiago",                        percentage:  1.7 },
      { candidate_name: "Guto Felício Dos Santos",     percentage:  1.5 },
      { candidate_name: "Professor Guilherme Amorim",  percentage:  1.4 },
      { candidate_name: "Zanata",                       percentage:  0.9 },
      { candidate_name: "Avenir Rosa",                  percentage:  0.7 },
      { candidate_name: "David Horn",                   percentage:  0.5 },
      { candidate_name: "Marley",                       percentage:  0.4 },
    ],
  },

  // Instituto Gazeta · 20-29 ago 2026 · TSE GO-09302/2026 · n=3.000
  // Fonte: https://www.diariodeaparecida.com.br/2026/08/31/gracinha-caiado-desponta-na-lideranca-pelo-senado-em-goias-mas-indecisao-ainda-marca-o-cenario-eleitoral/
  {
    institute_name: "Instituto Gazeta",
    election_name: "Senador Goias 2026",
    publication_date: "2026-08-31",
    fieldwork_start: "2026-08-20",
    fieldwork_end: "2026-08-29",
    sample_size: 3000,
    margin_of_error: 1.8,
    methodology: "telefonica",
    source_url: "https://www.diariodeaparecida.com.br/2026/08/31/gracinha-caiado-desponta-na-lideranca-pelo-senado-em-goias-mas-indecisao-ainda-marca-o-cenario-eleitoral/",
    tse_protocolo: "GO093022026",
    results: [
      { candidate_name: "Gracinha Caiado",   percentage: 14.0 },
      { candidate_name: "Gustavo Gayer",     percentage: 12.4 },
      { candidate_name: "Gustavo Mendanha",  percentage:  7.8 },
      { candidate_name: "Vanderlan Cardoso", percentage:  5.7 },
      { candidate_name: "Zacarias Calil",    percentage:  3.1 },
      { candidate_name: "Cintia Dias",       percentage:  1.4 },
      { candidate_name: "Isaura Lemos",      percentage:  1.2 },
      { candidate_name: "Ernesto Roller",    percentage:  1.0 },
    ],
  },

  // lote 30 — Senado, repescagem 04/09
  // Datafolha · 31 ago-02 set 2026 · TSE CE-04122/2026 (par: BR-05635/2026) · n=1.204
  // Fonte: https://www.opovo.com.br/noticias/politica/eleicoes/2026/09/04/pesquisa-datafolha-senado-tem-cid-wagner-e-luizianne-a-frente.html
  {
    institute_name: "Datafolha",
    election_name: "Senador Ceara 2026",
    publication_date: "2026-09-04",
    fieldwork_start: "2026-08-31",
    fieldwork_end: "2026-09-02",
    sample_size: 1204,
    methodology: "presencial",
    source_url: "https://www.opovo.com.br/noticias/politica/eleicoes/2026/09/04/pesquisa-datafolha-senado-tem-cid-wagner-e-luizianne-a-frente.html",
    tse_protocolo: "CE041222026",
    results: [
      { candidate_name: "Cid Gomes",           percentage: 24 },
      { candidate_name: "Capitão Wagner",      percentage: 20 },
      { candidate_name: "Luizianne Lins",      percentage: 17 },
      { candidate_name: "Alcides Fernandes",   percentage:  8 },
      { candidate_name: "Catarina Matos",      percentage:  2 },
      { candidate_name: "Guilherme Theophilo", percentage:  2 },
      { candidate_name: "Reginaldo",           percentage:  2 },
      { candidate_name: "Lino Alves",          percentage:  1 },
    ],
  },
];

async function main() {
  console.log("🗳️  ElectioLab — Ingestão Manual de Pesquisas\n");

  if (PENDING_POLLS.length === 0) {
    console.log("⚠️  Nenhuma pesquisa na fila. Edite PENDING_POLLS neste script.");
    await printStatus();
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const poll of PENDING_POLLS) {
    process.stdout.write(`📊 ${poll.institute_name} ${poll.publication_date}... `);

    // Resolver IDs
    const { data: election } = await supabase
      .from("elections")
      .select("id")
      .eq("name", poll.election_name)
      .single();
    if (!election) { console.log("❌ eleição não encontrada"); errors++; continue; }

    const { data: institute } = await supabase
      .from("institutes")
      .select("id")
      .eq("name", poll.institute_name)
      .single();
    if (!institute) { console.log("❌ instituto não encontrado"); errors++; continue; }

    // Deduplicar
    // Inclui scope: duas pesquisas do mesmo instituto/eleição/data podem ser
    // recortes de UFs diferentes (ex.: Real Time Big Data roda a mesma pergunta
    // presidencial em vários estados na mesma semana, campo terminando no mesmo dia).
    // Inclui scenario_label: numa eleição de 2º turno, o mesmo instituto/data pode
    // testar vários adversários hipotéticos na mesma rodada — sem isso, o 2º cenário
    // em diante seria descartado como duplicata do 1º.
    let dedupQuery = supabase
      .from("polls")
      .select("id")
      .eq("election_id", election.id)
      .eq("institute_id", institute.id)
      .eq("fieldwork_end", poll.fieldwork_end)
      .eq("scope", poll.scope ?? "nacional");
    dedupQuery = poll.scenario_label
      ? dedupQuery.eq("scenario_label", poll.scenario_label)
      : dedupQuery.is("scenario_label", null);
    const { data: existing } = await dedupQuery.maybeSingle();
    if (existing) { console.log("⏭️  já existe"); skipped++; continue; }

    // Inserir poll
    const { data: newPoll, error } = await supabase
      .from("polls")
      .insert({
        election_id: election.id,
        institute_id: institute.id,
        publication_date: poll.publication_date,
        fieldwork_start: poll.fieldwork_start ?? null,
        fieldwork_end: poll.fieldwork_end,
        sample_size: poll.sample_size,
        margin_of_error: poll.margin_of_error ?? null,
        confidence_level: 95,
        methodology: poll.methodology,
        scope: poll.scope ?? "nacional",
        poll_type: poll.poll_type ?? "estimulada",
        source_url: poll.source_url ?? null,
        tse_registration: toTseRegistrationFormat(poll.tse_protocolo),
        scenario_label: poll.scenario_label ?? null,
        is_verified: true,
      })
      .select("id")
      .single();

    if (error || !newPoll) { console.log(`❌ ${error?.message}`); errors++; continue; }

    // Inserir resultados
    for (const r of poll.results) {
      const { data: candidate } = await supabase
        .from("candidates")
        .select("id")
        .eq("election_id", election.id)
        .ilike("name", r.candidate_name)
        .maybeSingle();
      if (!candidate) { continue; }
      await supabase.from("poll_results").insert({
        poll_id: newPoll.id,
        candidate_id: candidate.id,
        percentage: r.percentage,
      });
    }

    console.log(`✅ inserida (id: ${newPoll.id})`);
    inserted++;
  }

  console.log(`\n📋 Resumo: ${inserted} inseridas · ${skipped} duplicadas · ${errors} erros`);
  await printStatus();
}

async function printStatus() {
  console.log("\n📡 Estado atual do banco:\n");
  const { data: elections } = await supabase
    .from("elections")
    .select("name, is_active")
    .order("year", { ascending: false });

  for (const e of elections ?? []) {
    const { count } = await supabase
      .from("polls")
      .select("*", { count: "exact", head: true })
      .eq("election_id",
        (await supabase.from("elections").select("id").eq("name", e.name).single()).data?.id
      );
    const { data: last } = await supabase
      .from("polls")
      .select("publication_date")
      .eq("election_id",
        (await supabase.from("elections").select("id").eq("name", e.name).single()).data?.id
      )
      .order("publication_date", { ascending: false })
      .limit(1)
      .single();

    const gap = last?.publication_date
      ? Math.floor((Date.now() - new Date(last.publication_date).getTime()) / 86400000)
      : null;

    const status = e.is_active
      ? gap !== null && gap > 14 ? "⚠️  ATUALIZAÇÃO NECESSÁRIA" : "✅ OK"
      : "🔒 encerrada";

    console.log(`  ${e.is_active ? "🟢" : "⚫"} ${e.name}`);
    console.log(`     ${count ?? 0} pesquisas · última: ${last?.publication_date ?? "—"} · ${gap !== null ? `${gap}d atrás` : "sem dados"} ${status}`);
  }
}

main().catch(console.error);
