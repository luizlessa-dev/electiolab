import fetch from 'node-fetch';

async function parseElections() {
  console.log('📊 Analisando poder360.com.br/eleicoes...\n');
  
  try {
    const response = await fetch('https://www.poder360.com.br/eleicoes', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)'
      }
    });
    
    const html = await response.text();
    
    // Procura por padrões de pesquisas
    const patterns = [
      /<h[1-3][^>]*>([^<]*deputado[^<]*)<\/h[1-3]>/gi,
      /pesquisa[^<]*deputad[^<]*/gi,
      /"(.*deputado.*?)"/gi,
    ];
    
    let found = false;
    patterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches?.length) {
        found = true;
        console.log(`\n📍 Padrão encontrado:`);
        matches.slice(0, 5).forEach(m => {
          const clean = m.replace(/<[^>]*>/g, '').substring(0, 100);
          console.log(`   "${clean}"`);
        });
      }
    });
    
    if (!found) {
      console.log('⚠️  Nenhum padrão claro de pesquisas encontrado');
      console.log('\n💡 Solução: Analisar manualmente a estrutura HTML');
      console.log('   Comando: cat /tmp/poder360*.html | grep -i deputado | head -20');
    }
  } catch (e) {
    console.error('Erro:', e);
  }
}

parseElections();
