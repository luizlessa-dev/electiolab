/**
 * Script de teste para DivulgaCandContas
 * Testa conexão com API do TSE
 */

const BASE_URL = 'https://divulgacandcontas.tse.jus.br';

async function testCandidatos() {
  console.log('🧪 Testando API DivulgaCandContas...\n');

  const ano = 2022; // Usar 2022 primeiro (dados completos)
  const uf = 'SP';
  const cargo = 'PRES'; // Presidente

  const url = `${BASE_URL}/candidatura/listar/${ano}/${uf}/1/${cargo}/candidatos`;

  console.log(`📌 URL: ${url}\n`);
  console.log('⏳ Aguardando resposta (pode levar 5-10s)...\n');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ElectioLab/1.0 (+https://electiolab.com)',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}\n`);

    if (!response.ok) {
      console.error(`❌ Erro HTTP ${response.status}`);
      return;
    }

    const data = await response.json();
    const candidatos = Array.isArray(data) ? data : data.candidatos || [];

    console.log(`✅ ${candidatos.length} candidatos encontrados\n`);

    if (candidatos.length > 0) {
      console.log('Primeiros 3 candidatos:');
      candidatos.slice(0, 3).forEach((cand, i) => {
        console.log(`  ${i + 1}. ${cand.nomeUrna || cand.nome} (${cand.nomePartido})`);
      });
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testCandidatos();
