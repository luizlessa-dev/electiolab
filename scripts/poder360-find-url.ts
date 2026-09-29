import * as fs from 'fs';

const urls = [
  'https://www.poder360.com.br/pesquisas/',
  'https://poder360.com.br/pesquisas/eleicoes/',
  'https://poder360.com.br/',
  'https://www.poder360.com.br/eleicoes',
];

async function findDeputyData() {
  console.log('🔍 Testando URLs de Poder360...\n');
  
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        }
      });
      
      const html = await response.text();
      const hasDeputy = html.toLowerCase().includes('deputado');
      const size = Math.round(html.length / 1024);
      
      console.log(`${hasDeputy ? '✅' : '❌'} ${url}`);
      console.log(`   Status: ${response.status}, Tamanho: ${size}KB, Deputado: ${hasDeputy ? 'SIM' : 'NÃO'}\n`);
      
      if (hasDeputy) {
        console.log('   → Salvar HTML dessa página pra análise manual');
        fs.writeFileSync(`/tmp/poder360-${Date.now()}.html`, html.substring(0, 50000));
      }
    } catch (e) {
      console.log(`❌ ${url} - Erro: ${(e as any).message}\n`);
    }
  }
}

findDeputyData();
