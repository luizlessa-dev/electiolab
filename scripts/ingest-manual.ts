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
    const { data: existing } = await supabase
      .from("polls")
      .select("id")
      .eq("election_id", election.id)
      .eq("institute_id", institute.id)
      .eq("fieldwork_end", poll.fieldwork_end)
      .eq("scope", poll.scope ?? "nacional")
      .maybeSingle();
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
        poll_type: "estimulada",
        source_url: poll.source_url ?? null,
        tse_registration: toTseRegistrationFormat(poll.tse_protocolo),
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
