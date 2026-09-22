/**
 * TEMPLATES PRONTOS — Datafolha MG, RJ, PE
 *
 * Instruções:
 * 1. Procure os dados de cada estado (sites Datafolha ou G1)
 * 2. Preencha os campos marcados com XXX ou //
 * 3. Copie TODOS os 3 blocos para scripts/ingest-manual.ts
 * 4. Rode: npx tsx scripts/ingest-manual.ts
 */

// ─── DATAFOLHA · Senador MG · 8-11 set 2026 ──
{
  institute_name: "DATAFOLHA INSTITUTO DE PESQUISA",
  election_name: "Senador MG",
  publication_date: "YYYY-MM-DD",  // ← data da matéria (procura em G1)
  fieldwork_start: "2026-09-08",
  fieldwork_end: "2026-09-11",
  sample_size: 1204,
  margin_of_error: 2.8,
  methodology: "telefonica",
  source_url: "https://...",  // ← link EXATO da matéria (G1 ou site Datafolha)
  tse_protocolo: "MG-XXXXX/2026",  // ← procura em agenciasertao.com
  results: [
    { candidate_name: "XXX", percentage: XX.X },  // ← preencher com candidato 1
    { candidate_name: "XXX", percentage: XX.X },  // ← preencher com candidato 2
    { candidate_name: "XXX", percentage: XX.X },  // ← preencher com candidato 3
    // ... adicione todos os candidatos com >= 1%
    { candidate_name: "BRANCO/NULO", percentage: XX.X },
    { candidate_name: "NÃO SABE", percentage: XX.X },
  ],
},

// ─── DATAFOLHA · Senador RJ · 8-11 set 2026 ──
{
  institute_name: "DATAFOLHA INSTITUTO DE PESQUISA",
  election_name: "Senador RJ",
  publication_date: "YYYY-MM-DD",  // ← data da matéria
  fieldwork_start: "2026-09-08",
  fieldwork_end: "2026-09-11",
  sample_size: 1204,
  margin_of_error: 2.8,
  methodology: "telefonica",
  source_url: "https://...",  // ← link EXATO
  tse_protocolo: "RJ-XXXXX/2026",
  results: [
    { candidate_name: "XXX", percentage: XX.X },
    { candidate_name: "XXX", percentage: XX.X },
    { candidate_name: "XXX", percentage: XX.X },
    // ... candidatos
    { candidate_name: "BRANCO/NULO", percentage: XX.X },
    { candidate_name: "NÃO SABE", percentage: XX.X },
  ],
},

// ─── DATAFOLHA · Senador PE · 8-11 set 2026 ──
{
  institute_name: "DATAFOLHA INSTITUTO DE PESQUISA",
  election_name: "Senador PE",
  publication_date: "YYYY-MM-DD",  // ← data da matéria
  fieldwork_start: "2026-09-08",
  fieldwork_end: "2026-09-11",
  sample_size: 1204,
  margin_of_error: 2.8,
  methodology: "telefonica",
  source_url: "https://...",  // ← link EXATO
  tse_protocolo: "PE-XXXXX/2026",
  results: [
    { candidate_name: "XXX", percentage: XX.X },
    { candidate_name: "XXX", percentage: XX.X },
    { candidate_name: "XXX", percentage: XX.X },
    // ... candidatos
    { candidate_name: "BRANCO/NULO", percentage: XX.X },
    { candidate_name: "NÃO SABE", percentage: XX.X },
  ],
},
