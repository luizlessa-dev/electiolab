#!/usr/bin/env node
/**
 * Script: Convert TSE poll CSV to Supabase polls format
 *
 * Input: pesquisas_eleitorais_2026.csv (from TSE open data portal)
 * Output: pesquisas_tse_convertidas.json (ready for Supabase import)
 *
 * TSE CSV Structure (expected):
 *   - uf: Estado/UF (sigla)
 *   - cargo: Cargo disputado (presidente, governador, senador, deputado federal, etc)
 *   - instituto: Nome do instituto de pesquisa
 *   - candidato: Nome ou partido do candidato
 *   - data_pesquisa: Data de realização (ou publicação)
 *   - percentual: Percentual de intenção de voto
 *   - margem_erro: Margem de erro (%)
 *   - tamanho_amostra: Tamanho da amostra
 *   - metodologia: Tipo de coleta (presencial, telefônica, online, mista)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

interface TSEPoll {
  uf?: string;
  estado?: string;
  cargo?: string;
  instituto?: string;
  candidato?: string;
  data_pesquisa?: string;
  data_publicacao?: string;
  percentual?: string | number;
  margem_erro?: string | number;
  tamanho_amostra?: string | number;
  metodologia?: string;
  protocolo_tse?: string;
}

interface SupabasePoll {
  institute_name: string;
  candidate: string;
  candidate_slug: string;
  office: string;  // 'presidente', 'governador', 'senador', 'deputado'
  scope: string;   // 'nacional' or 'UF' (e.g., 'SP', 'RJ')
  percentage: number;
  margin_of_error?: number;
  publication_date: string; // ISO format
  fieldwork_start?: string;
  fieldwork_end?: string;
  sample_size?: number;
  methodology?: string;
  tse_registration?: string;
  source_url?: string;
}

const CARGO_MAPPING: Record<string, string> = {
  'presidente': 'presidente',
  'president': 'presidente',
  'governador': 'governador',
  'governor': 'governador',
  'senador': 'senador',
  'senator': 'senador',
  'deputado federal': 'deputado',
  'deputado estadual': 'deputado_estadual',
  'federal deputy': 'deputado',
  'state deputy': 'deputado_estadual',
};

const METHODOLOGY_MAPPING: Record<string, string> = {
  'cati': 'telefonica',
  'telefonica': 'telefonica',
  'telephone': 'telefonica',
  'presencial': 'presencial',
  'pessoal': 'presencial',
  'personal': 'presencial',
  'online': 'online',
  'web': 'online',
  'mista': 'mista',
  'mixed': 'mista',
};

function normalizeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáäâ]/g, 'a')
    .replace(/[èéëê]/g, 'e')
    .replace(/[ìíïî]/g, 'i')
    .replace(/[òóöô]/g, 'o')
    .replace(/[ùúüû]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapCargo(cargoStr: string): string {
  const normalized = cargoStr?.toLowerCase().trim() || '';
  for (const [key, value] of Object.entries(CARGO_MAPPING)) {
    if (normalized.includes(key)) return value;
  }
  return normalized || 'presidente'; // default
}

function mapMetodologia(metStr: string): string {
  const normalized = metStr?.toLowerCase().trim() || '';
  for (const [key, value] of Object.entries(METHODOLOGY_MAPPING)) {
    if (normalized.includes(key)) return value;
  }
  return normalized || 'mista';
}

function convertTsePoll(tseRow: TSEPoll, rowIndex: number): SupabasePoll | null {
  try {
    const uf = (tseRow.uf || tseRow.estado || '').toUpperCase().trim();
    const cargo = mapCargo(tseRow.cargo || '');
    const institute = (tseRow.instituto || 'TSE').trim();
    const candidate = (tseRow.candidato || '').trim();

    if (!candidate || !cargo) {
      console.warn(`⚠️  Row ${rowIndex}: Missing candidate or cargo, skipping`);
      return null;
    }

    // Determine scope: nacional for presidente, UF-based otherwise
    let scope = 'nacional';
    if (cargo !== 'presidente' && uf && uf !== 'BR') {
      scope = uf;
    }

    // Parse dates
    const dateStr = tseRow.data_pesquisa || tseRow.data_publicacao || '';
    const [fieldworkEnd, publicationDate] = parseDate(dateStr);

    if (!publicationDate) {
      console.warn(`⚠️  Row ${rowIndex}: Invalid date "${dateStr}", skipping`);
      return null;
    }

    const percentage = parseFloat(String(tseRow.percentual || 0));
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      console.warn(`⚠️  Row ${rowIndex}: Invalid percentage "${tseRow.percentual}", skipping`);
      return null;
    }

    return {
      institute_name: institute,
      candidate: candidate,
      candidate_slug: normalizeSlug(candidate),
      office: cargo,
      scope: scope,
      percentage: percentage,
      margin_of_error: parseFloat(String(tseRow.margem_erro)) || undefined,
      publication_date: publicationDate,
      fieldwork_end: fieldworkEnd,
      sample_size: parseInt(String(tseRow.tamanho_amostra)) || undefined,
      methodology: mapMetodologia(tseRow.metodologia || ''),
      tse_registration: tseRow.protocolo_tse || undefined,
      source_url: undefined,
    };
  } catch (err) {
    console.warn(`⚠️  Row ${rowIndex}: Error converting row:`, err);
    return null;
  }
}

function parseDate(dateStr: string): [string | undefined, string | undefined] {
  if (!dateStr) return [undefined, undefined];

  // Try multiple formats: DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
    /(\d{4})-(\d{2})-(\d{2})/,    // YYYY-MM-DD
    /(\d{2})\.(\d{2})\.(\d{4})/,  // DD.MM.YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year: string, month: string, day: string;

      if (format === formats[0] || format === formats[2]) {
        // DD/MM/YYYY or DD.MM.YYYY
        [, day, month, year] = match;
      } else {
        // YYYY-MM-DD
        [, year, month, day] = match;
      }

      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      return [isoDate, isoDate];
    }
  }

  return [undefined, undefined];
}

async function convertTsePolls(csvPath: string, outputPath: string) {
  console.log(`📊 TSE Poll Converter\n`);
  console.log(`Input:  ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  let records: TSEPoll[];
  try {
    records = csv.parse(csvContent, {
      delimiter: ';',
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });
  } catch (err) {
    console.error(`❌ Failed to parse CSV:`, err);
    return;
  }

  console.log(`✓ Parsed ${records.length} rows from CSV\n`);

  // Convert records
  const converted: SupabasePoll[] = [];
  const skipped: number[] = [];

  records.forEach((row, idx) => {
    const converted_row = convertTsePoll(row, idx + 2); // +2 for header + 0-based
    if (converted_row) {
      converted.push(converted_row);
    } else {
      skipped.push(idx + 2);
    }
  });

  // Deduplication by unique constraint: (institute_name, candidate, office, scope, fieldwork_end)
  const uniqueKey = (p: SupabasePoll) =>
    `${p.institute_name}|${p.candidate}|${p.office}|${p.scope}|${p.fieldwork_end || ''}`;

  const seen = new Set<string>();
  const deduplicated: SupabasePoll[] = [];
  let duplicates = 0;

  converted.forEach((poll) => {
    const key = uniqueKey(poll);
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(poll);
    } else {
      duplicates++;
    }
  });

  // Statistics
  console.log(`📈 Conversion Results:`);
  console.log(`   ✓ Converted:     ${converted.length} rows`);
  console.log(`   ⊘ Skipped:       ${skipped.length} rows`);
  console.log(`   ⚡ Deduplicated: ${duplicates} duplicates (kept unique by institute/candidate/office/scope/date)`);
  console.log(`   ✅ Final output: ${deduplicated.length} polls\n`);

  // Group by office and scope for summary
  const byOffice: Record<string, Set<string>> = {};
  deduplicated.forEach((p) => {
    if (!byOffice[p.office]) byOffice[p.office] = new Set();
    byOffice[p.office].add(p.scope);
  });

  console.log(`📍 Coverage by Office:`);
  for (const [office, scopes] of Object.entries(byOffice)) {
    console.log(`   ${office}: ${scopes.size} scopes (${Array.from(scopes).sort().join(', ')})`);
  }

  // Check for deputado federal coverage
  const deputadoFederal = byOffice['deputado'];
  if (deputadoFederal && deputadoFederal.size > 1) {
    console.log(`\n✅ DEPUTADO FEDERAL BY STATE: YES`);
    console.log(`   Found ${deduplicated.filter(p => p.office === 'deputado').length} polls`);
    console.log(`   States: ${Array.from(deputadoFederal).sort().join(', ')}`);
  } else {
    console.log(`\n❌ DEPUTADO FEDERAL BY STATE: NO`);
  }

  // Sample output (first 5 unique polls)
  console.log(`\n📋 Sample (first 5 polls):`);
  deduplicated.slice(0, 5).forEach((p, idx) => {
    console.log(`\n   ${idx + 1}. ${p.candidate} (${p.office}/${p.scope})`);
    console.log(`      Institute: ${p.institute_name}`);
    console.log(`      Percentage: ${p.percentage}% ± ${p.margin_of_error || 'N/A'}%`);
    console.log(`      Date: ${p.fieldwork_end || p.publication_date}`);
    console.log(`      Sample: ${p.sample_size || 'N/A'} | Method: ${p.methodology || 'N/A'}`);
  });

  // Write output
  const output = {
    metadata: {
      converted_at: new Date().toISOString(),
      source_file: csvPath,
      total_records: records.length,
      converted: converted.length,
      skipped: skipped.length,
      deduplicated,
      final_count: deduplicated.length,
      coverage_by_office: byOffice,
      has_deputado_federal_by_state: deputadoFederal && deputadoFederal.size > 1,
    },
    polls: deduplicated,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Saved to: ${outputPath}`);
}

// Main
const csvPath = process.argv[2] || 'pesquisas_eleitorais_2026.csv';
const outputPath = process.argv[3] || 'pesquisas_tse_convertidas.json';
convertTsePolls(csvPath, outputPath).catch(console.error);
