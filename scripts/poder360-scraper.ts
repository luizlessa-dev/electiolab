#!/usr/bin/env npx tsx
/**
 * Scraper: Poder360 - Pesquisas de Deputado Federal
 *
 * Coleta dados de pesquisas de deputados do agregador Poder360
 * e prepara pra ingestão em poll_drafts
 */

import * as fs from 'fs';
import * as path from 'path';

const PODER360_URL = 'https://www.poder360.com.br/pesquisas';
const DEPUTY_SEARCH = 'deputado';

async function scrapeDeputyPolls() {
  console.log('🔍 Buscando pesquisas de deputado em Poder360...\n');

  try {
    const response = await fetch(PODER360_URL);
    const html = await response.text();

    // Busca por "deputado" no HTML
    if (html.includes('deputado')) {
      console.log('✅ Encontrou menções a deputado');

      // Busca padrões de pesquisas
      const pollPattern = /pesquisa[^<]*deputado[^<]*/gi;
      const matches = html.match(pollPattern);

      if (matches) {
        console.log(`\n📊 Encontrado ${matches.length} referências`);
        console.log('\nExemplos:');
        matches.slice(0, 3).forEach(m => console.log(`  "${m.substring(0, 80)}..."`));
      }
    } else {
      console.log('⚠️  Nenhuma menção a deputado encontrada');
    }

    // Salva HTML pra análise manual se necessário
    fs.writeFileSync('/tmp/poder360-sample.html', html.substring(0, 10000));
    console.log('\n💾 HTML salvo em /tmp/poder360-sample.html (primeiros 10KB)');

  } catch (error) {
    console.error('❌ Erro ao acessar Poder360:', error);
    console.log('\n📌 Dica: Poder360 pode bloquear scraping. Alternativas:');
    console.log('  1. Usar --user-agent fake');
    console.log('  2. Integrar com Poder360 API (se disponível)');
    console.log('  3. Fazer parse manual e salvar em JSON');
  }
}

scrapeDeputyPolls();
