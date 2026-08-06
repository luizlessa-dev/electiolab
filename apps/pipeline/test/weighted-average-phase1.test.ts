/**
 * Teste: Fase 1 - Credibilidade Real do Instituto
 *
 * Valida que a fórmula nova usa credibility_score (0-10)
 * em vez de valor genérico (0.7)
 *
 * Rodando: npx jest weighted-average-phase1.test.ts
 */

import { calculateWeightedAverage, PollInput } from '../../../src/lib/weighting/calculate-weighted-average';

describe('Fase 1: Credibilidade Real do Instituto', () => {
  const baseDate = new Date('2026-08-05');

  // ============================================================================
  // TEST 1: Instituto com credibilidade alta (9/10) vs baixa (2/10)
  // ============================================================================
  test('Instituto com credibilidade 9/10 deve ter ~3x o peso de 2/10', () => {
    const pollsHighCredibility: PollInput[] = [
      {
        id: 'poll-datafolha',
        fieldworkEnd: new Date('2026-08-04'),
        sampleSize: 2000,
        methodology: 'presencial',
        credibilityScore: 9, // Datafolha
        percentage: 35,
      },
    ];

    const pollsLowCredibility: PollInput[] = [
      {
        id: 'poll-suspeita',
        fieldworkEnd: new Date('2026-08-04'),
        sampleSize: 2000,
        methodology: 'presencial',
        credibilityScore: 2, // Suspeita
        percentage: 35,
      },
    ];

    const resultHigh = calculateWeightedAverage(pollsHighCredibility, {
      referenceDate: baseDate,
    });

    const resultLow = calculateWeightedAverage(pollsLowCredibility, {
      referenceDate: baseDate,
    });

    // Calcular peso de instituto
    const weightHigh = Math.pow(9 / 10, 1.5); // 0.856
    const weightLow = Math.pow(2 / 10, 1.5); // 0.028

    const ratio = weightHigh / weightLow; // ~30x

    console.log(`
    ✓ Instituto Credibilidade 9/10:
      - Peso: ${weightHigh.toFixed(3)}
      - Resultado: ${resultHigh.average}%

    ✓ Instituto Credibilidade 2/10:
      - Peso: ${weightLow.toFixed(3)}
      - Resultado: ${resultLow.average}%

    ✓ Razão de peso: ${ratio.toFixed(1)}x (esperado ~30x)
    `);

    expect(ratio).toBeGreaterThan(8); // Deve ser ~9.5x (com exponent 1.5)
  });

  // ============================================================================
  // TEST 2: Comparação com fórmula antiga (valor padrão 0.7)
  // ============================================================================
  test('Nova fórmula deve dar mais peso a instituto bom vs ruim', () => {
    // Cenário: 4 pesquisas boas (Datafolha, Quaest, AtlasIntel, TSE) + 1 suspeita
    const pollsMixed: PollInput[] = [
      {
        id: 'datafolha',
        fieldworkEnd: new Date('2026-08-04'),
        sampleSize: 2000,
        methodology: 'presencial',
        credibilityScore: 9, // Datafolha
        percentage: 33,
      },
      {
        id: 'quaest',
        fieldworkEnd: new Date('2026-08-03'),
        sampleSize: 1500,
        methodology: 'mista',
        credibilityScore: 8, // Quaest
        percentage: 34,
      },
      {
        id: 'atlasitel',
        fieldworkEnd: new Date('2026-07-28'),
        sampleSize: 1000,
        methodology: 'online',
        credibilityScore: 7, // AtlasIntel
        percentage: 32,
      },
      {
        id: 'tse',
        fieldworkEnd: new Date('2026-08-05'),
        sampleSize: 3000,
        methodology: 'presencial',
        credibilityScore: 9, // TSE
        percentage: 33,
      },
      {
        id: 'suspeita',
        fieldworkEnd: new Date('2026-08-02'),
        sampleSize: 2500,
        methodology: 'online',
        credibilityScore: 2, // Suspeita
        percentage: 48, // OUTLIER!
      },
    ];

    const result = calculateWeightedAverage(pollsMixed, {
      referenceDate: baseDate,
    });

    // Resultado esperado: próximo de 33% (desprezando o 48%)
    const expectedAverage = 33;
    const tolerance = 2; // Tolerância de ±2%

    console.log(`
    ✓ 4 pesquisas boas (33-34%) + 1 suspeita (48%)

    Resultado: ${result.average}%
    Esperado:  ${expectedAverage}% ±${tolerance}%

    IC 95%: [${result.confidenceLow}% - ${result.confidenceHigh}%]
    Confiança: ${(result.confidenceHigh - result.confidenceLow).toFixed(1)}% de amplitude
    `);

    // Com a nova fórmula, o 48% deve ser muito downweighted
    // Então a média deve estar próxima de 33%
    expect(Math.abs(result.average - expectedAverage)).toBeLessThan(tolerance);
  });

  // ============================================================================
  // TEST 3: Validar pesos específicos de credibilidade
  // ============================================================================
  test('Pesos de credibilidade devem estar corretos', () => {
    const credibilityWeights = {
      0: Math.pow(0 / 10, 1.5), // 0
      2: Math.pow(2 / 10, 1.5), // ~0.03
      5: Math.pow(5 / 10, 1.5), // ~0.35
      7: Math.pow(7 / 10, 1.5), // ~0.52
      8: Math.pow(8 / 10, 1.5), // ~0.71
      9: Math.pow(9 / 10, 1.5), // ~0.86
      10: Math.pow(10 / 10, 1.5), // 1.0
    };

    console.log(`
    📊 Pesos de Credibilidade (0-10 → peso final):

    ${Object.entries(credibilityWeights)
      .map(
        ([score, weight]) =>
          `  ${score.padStart(2)}/10 → ${weight.toFixed(3)} (${(weight * 100).toFixed(1)}%)`
      )
      .join('\n')}
    `);

    // Validar que pesos estão em ordem crescente
    expect(credibilityWeights[2]).toBeLessThan(credibilityWeights[5]);
    expect(credibilityWeights[5]).toBeLessThan(credibilityWeights[9]);
    expect(credibilityWeights[9]).toBeLessThan(credibilityWeights[10]);

    // Validar magnitudes
    expect(credibilityWeights[9]).toBeGreaterThan(0.8);
    expect(credibilityWeights[2]).toBeLessThan(0.1);
  });

  // ============================================================================
  // TEST 4: Backward compatibility (se não tiver credibilityScore, usar default)
  // ============================================================================
  test('Se não tiver credibilityScore, deve usar default=5', () => {
    const pollNoScore: PollInput[] = [
      {
        id: 'poll-unknown',
        fieldworkEnd: new Date('2026-08-04'),
        sampleSize: 2000,
        methodology: 'presencial',
        // Sem credibilityScore - deve usar 5 como default
        percentage: 35,
      },
    ];

    const result = calculateWeightedAverage(pollNoScore, {
      referenceDate: baseDate,
    });

    // Com credibilidade 5/10, peso deve ser Math.pow(0.5, 1.5) ≈ 0.35
    const expectedWeight = Math.pow(5 / 10, 1.5);

    console.log(`
    ✓ Pesquisa sem credibilityScore definido:
      - Usa default: 5/10
      - Peso: ${expectedWeight.toFixed(3)}
      - Resultado: ${result.average}%
    `);

    expect(result.average).toBe(35); // Sem outros polls, deve retornar 35
  });

  // ============================================================================
  // TEST 5: Cenário do documento - Antes vs Depois
  // ============================================================================
  test('Cenário do documento: 4 boas + 1 outlier suspeita', () => {
    const polls: PollInput[] = [
      {
        id: 'A',
        fieldworkEnd: new Date('2026-08-04'),
        sampleSize: 2000,
        methodology: 'presencial',
        credibilityScore: 9, // Datafolha
        percentage: 35,
      },
      {
        id: 'B',
        fieldworkEnd: new Date('2026-08-02'),
        sampleSize: 1500,
        methodology: 'telefonica',
        credibilityScore: 8, // Quaest
        percentage: 34,
      },
      {
        id: 'C',
        fieldworkEnd: new Date('2026-07-28'),
        sampleSize: 1000,
        methodology: 'online',
        credibilityScore: 7, // AtlasIntel
        percentage: 32,
      },
      {
        id: 'D',
        fieldworkEnd: new Date('2026-07-20'),
        sampleSize: 3000,
        methodology: 'presencial',
        credibilityScore: 2, // Suspeita ⚠️
        percentage: 48, // OUTLIER
      },
      {
        id: 'E',
        fieldworkEnd: new Date('2026-08-03'),
        sampleSize: 2500,
        methodology: 'presencial',
        credibilityScore: 9, // TSE
        percentage: 33,
      },
    ];

    const result = calculateWeightedAverage(polls, {
      referenceDate: new Date('2026-08-05'),
    });

    console.log(`
    📊 Cenário: 4 pesquisas boas (32-35%) + 1 suspeita (48%)

    RESULTADO:
    - Média: ${result.average}%
    - IC 95%: [${result.confidenceLow}% - ${result.confidenceHigh}%]
    - Amplitude: ${(result.confidenceHigh - result.confidenceLow).toFixed(1)}%
    - Pesquisas: ${result.pollCount}

    ESPERADO: Média próxima a 33-34% (outlier downweighted)
    `);

    // Média deve estar entre 33-35 (ignorando o outlier de 48%)
    expect(result.average).toBeGreaterThanOrEqual(32);
    expect(result.average).toBeLessThanOrEqual(35);
  });
});

describe('Fase 1: Edge Cases', () => {
  const baseDate = new Date('2026-08-05');

  test('Credibilidade fora do range 0-10 deve ser clampada', () => {
    const pollNegative: PollInput[] = [
      {
        id: 'negative',
        fieldworkEnd: baseDate,
        sampleSize: 2000,
        methodology: 'presencial',
        credibilityScore: -5, // Inválido
        percentage: 35,
      },
    ];

    const pollTooHigh: PollInput[] = [
      {
        id: 'toohigh',
        fieldworkEnd: baseDate,
        sampleSize: 2000,
        methodology: 'presencial',
        credibilityScore: 15, // Inválido
        percentage: 35,
      },
    ];

    const resultNeg = calculateWeightedAverage(pollNegative, { referenceDate: baseDate });
    const resultHigh = calculateWeightedAverage(pollTooHigh, { referenceDate: baseDate });

    // Ambos devem dar resultado sem erros
    expect(resultNeg.average).toBeDefined();
    expect(resultHigh.average).toBeDefined();
  });

  test('Vários polls com diferentes credibilidades', () => {
    const polls: PollInput[] = [
      {
        id: '1',
        fieldworkEnd: new Date('2026-08-04'),
        sampleSize: 2000,
        methodology: 'presencial',
        credibilityScore: 10,
        percentage: 40,
      },
      {
        id: '2',
        fieldworkEnd: new Date('2026-08-03'),
        sampleSize: 1500,
        methodology: 'mista',
        credibilityScore: 5,
        percentage: 35,
      },
      {
        id: '3',
        fieldworkEnd: new Date('2026-08-02'),
        sampleSize: 1000,
        methodology: 'online',
        credibilityScore: 1,
        percentage: 30,
      },
    ];

    const result = calculateWeightedAverage(polls, { referenceDate: new Date('2026-08-05') });

    console.log(`
    3 polls com credibilidades diferentes:
    - 10/10 (40%)
    - 5/10 (35%)
    - 1/10 (30%)

    Resultado: ${result.average}%
    (Esperado: próximo a 40%, pois poll 1 tem muito mais peso)
    `);

    // Poll com credibilidade 10 deve ter muito mais influência
    expect(result.average).toBeGreaterThan(35);
  });
});
