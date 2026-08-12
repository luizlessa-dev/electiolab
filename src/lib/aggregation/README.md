# Wave 3 Poll Aggregation & Validation

Implementação completa de validação de candidatos e agregação ponderada por estado com dados reais de pesquisa.

## Componentes

### 1. Candidate Validator (`candidate-validator.ts`)

Valida candidatos contra a base de dados oficial de pesquisas (real-candidates-2026.ts).

**Funcionalidades:**
- ✅ Validação exata de nomes
- ✅ Fuzzy matching com similaridade >= 85%
- ✅ Remoção de diacríticos e normalizacao
- ✅ Detecção de candidatos fictícios
- ✅ Sugestões de candidatos similares

**Exemplo de uso:**

```typescript
import { validateCandidate, getValidCandidatesForState } from '@/lib/aggregation/candidate-validator';

// Validar um candidato
const result = validateCandidate('Tarcísio de Freitas', 'SP', 'governador');
console.log(result);
// { isValid: true, matchedCandidate: 'Tarcísio de Freitas', reason: 'Exact match found' }

// Obter todos os candidatos válidos de um estado
const candidates = getValidCandidatesForState('SP', 'governador');
console.log(candidates);
// [
//   { id: 'tarcisio-sp', name: 'Tarcísio de Freitas', party: 'REPUBLICANOS', searchingPercentage: 41 },
//   { id: 'fernando-haddad', name: 'Fernando Haddad', party: 'PT', searchingPercentage: 26 },
//   ...
// ]

// Validar multiplos candidatos de uma poll
const pollResults = [
  { candidateName: 'Tarcísio de Freitas', percentage: 41 },
  { candidateName: 'Fernando Haddad', percentage: 26 },
  { candidateName: 'Candidate A', percentage: 10 }, // Fictício
];

const { valid, invalid } = validateAndNormalizePollCandidates(
  pollResults,
  'SP',
  'governador'
);

console.log('Valid:', valid);
// [
//   { candidateName: 'Tarcísio de Freitas', percentage: 41 },
//   { candidateName: 'Fernando Haddad', percentage: 26 },
// ]

console.log('Invalid:', invalid);
// [
//   {
//     candidateName: 'Candidate A',
//     percentage: 10,
//     reason: '"Candidate A" not found in SP governador research...'
//   }
// ]
```

---

### 2. State Aggregation (`state-aggregation.ts`)

Agrega polls de múltiplos institutos com ponderação por:
- Margem de Erro (MoE)
- Recência (14 dias half-life)
- Detecção de outliers (2-sigma)
- Confiança estatística (95% CI)

**Funcionalidades:**
- ✅ Validação de candidatos integrada
- ✅ Ponderação de polls por MoE + Recência
- ✅ Filtragem de outliers
- ✅ Scores de confiança estatística
- ✅ Métricas de qualidade dos dados
- ✅ Comparação com baseline de pesquisa

**Exemplo de uso:**

```typescript
import { aggregateStatePolls, compareWithResearchBaseline } from '@/lib/aggregation/state-aggregation';

const baseDate = new Date('2026-08-08');

const pollData = [
  {
    candidateName: 'Tarcísio de Freitas',
    percentage: 41,
    marginOfError: 2,
    publishDate: new Date('2026-07-10'),
    instituteName: 'Quaest',
    sampleSize: 1000,
  },
  {
    candidateName: 'Tarcísio de Freitas',
    percentage: 42,
    marginOfError: 2.2,
    publishDate: new Date('2026-07-20'),
    instituteName: 'Real Time Big Data',
    sampleSize: 1200,
  },
  {
    candidateName: 'Tarcísio de Freitas',
    percentage: 43,
    marginOfError: 2.1,
    publishDate: new Date('2026-07-30'),
    instituteName: 'AtlasIntel',
    sampleSize: 1100,
  },
  // Fictício - será rejeitado
  {
    candidateName: 'Candidate A',
    percentage: 15,
    marginOfError: 3,
    publishDate: new Date('2026-07-25'),
    instituteName: 'Unknown Institute',
  },
];

// Agregar polls
const result = aggregateStatePolls(pollData, 'SP', 'governador', baseDate);

console.log(result);
// {
//   state: 'SP',
//   position: 'governador',
//   aggregatedAt: Date,
//   candidates: [
//     {
//       name: 'Tarcísio de Freitas',
//       party: 'REPUBLICANOS',
//       weightedPercentage: 41.9,  // Agregado ponderado
//       confidence: 0.92,           // Confiança 92%
//       samplesUsed: 3,             // 3 polls válidos
//       researchPercentage: 41,     // Dado da pesquisa
//     },
//     {
//       name: 'Fernando Haddad',
//       party: 'PT',
//       weightedPercentage: 26.0,
//       confidence: 0.88,
//       samplesUsed: 0,
//       researchPercentage: 26,
//     },
//   ],
//   validatedPolls: 3,
//   invalidPolls: 1,
//   invalidCandidates: [
//     {
//       name: 'Candidate A',
//       reason: '"Candidate A" not found in SP governador research...',
//       percentage: 15,
//     }
//   ],
//   qualityMetrics: {
//     dataQualityScore: 0.75,      // 75% dos dados eram válidos
//     coverageScore: 0.40,         // Temos dados para 40% dos candidatos reais
//     conflictScore: 0.01,         // Baixo conflito (1% variância)
//   },
// }

// Comparar com baseline de pesquisa
const comparison = compareWithResearchBaseline(result);

console.log(comparison);
// [
//   {
//     candidateName: 'Tarcísio de Freitas',
//     researchPercentage: 41,
//     aggregatedPercentage: 41.9,
//     deviation: 0.9,              // Dentro de margem esperada
//     isSignificant: false,
//     confidence: 0.92,
//   },
//   {
//     candidateName: 'Fernando Haddad',
//     researchPercentage: 26,
//     aggregatedPercentage: 26.0,
//     deviation: 0,
//     isSignificant: false,
//     confidence: 0.88,
//   },
// ]
```

---

## Fluxo Completo de Integração

```typescript
import { aggregateStatePolls } from '@/lib/aggregation/state-aggregation';

async function aggregateRegionalPolls(
  polls: Poll[],
  region: string,
  states: string[]
) {
  const results = new Map();

  for (const state of states) {
    // Filtrar polls do estado
    const statePolls = polls.filter(p => p.state === state);

    // Agregar governador
    const govResult = aggregateStatePolls(
      statePolls.map(p => ({
        candidateName: p.candidate,
        percentage: p.percentage,
        marginOfError: p.moe,
        publishDate: p.publishDate,
        instituteName: p.institute,
        sampleSize: p.sampleSize,
      })),
      state,
      'governador'
    );

    // Agregar senador
    const senResult = aggregateStatePolls(
      statePolls.map(p => ({
        candidateName: p.candidate,
        percentage: p.percentage,
        marginOfError: p.moe,
        publishDate: p.publishDate,
        instituteName: p.institute,
        sampleSize: p.sampleSize,
      })),
      state,
      'senador'
    );

    results.set(state, {
      governor: govResult,
      senator: senResult,
    });
  }

  return results;
}
```

---

## Métricas de Qualidade Explicadas

### Data Quality Score (0-1)
- Ratio de polls válidos vs. total
- 1.0 = 100% dos polls eram de candidatos reais
- 0.5 = 50% dos polls foram rejeitados como fictícios

### Coverage Score (0-1)
- % de candidatos reais da pesquisa com pelo menos 1 poll
- 1.0 = Todos os candidatos pesquisados têm polls
- 0.3 = Apenas 30% dos candidatos têm dados

### Conflict Score (0-1)
- Medida de divergência entre os polls agregados
- 0.0 = Todos os polls concordam
- 1.0 = Muito conflito entre institutos

---

## Validação de Dados

A validação usa múltiplas estratégias:

1. **Exact Match**: Comparação direta após normalizacao
2. **Fuzzy Match**: Similaridade Levenshtein >= 85%
3. **Rejection**: Se nenhuma estratégia funciona

**Nomes normalizados:**
- `"Tarcísio de Freitas"` → `"tarcisio de freitas"`
- `"JOÃO RODRIGUES"` → `"joao rodrigues"`
- `"José"` → `"jose"`

---

## Casos de Uso

### 1. Dashboard Regional
Agregar tous os estados de uma região para exibir tendências gerais:

```typescript
const sul = ['RS', 'SC', 'PR'];
for (const state of sul) {
  const result = aggregateStatePolls(pollsForState, state, 'governador');
  updateDashboard(state, result);
}
```

### 2. Alerta de Anomalias
Detectar desvios significativos da pesquisa base:

```typescript
const comparison = compareWithResearchBaseline(result);
const anomalies = comparison.filter(c => c.isSignificant);

if (anomalies.length > 0) {
  alertTeam(`Anomalia detectada: ${anomalies[0].candidateName} ${anomalies[0].deviation}%`);
}
```

### 3. Validação de Ingestão
Rejeitar polls com candidatos fictícios durante ingestão:

```typescript
const { valid, invalid } = validateAndNormalizePollCandidates(
  pollResults,
  state,
  position
);

if (invalid.length > 0) {
  throw new Error(`Poll contamination detected: ${invalid[0].name}`);
}
```

---

## Estrutura de Dados

### Poll Data
```typescript
interface StatePollData {
  candidateName: string;           // Nome do candidato
  percentage: number;              // Intenção de voto (%)
  marginOfError?: number;          // Margem de erro (%)
  publishDate: Date;               // Data da publicação
  instituteName: string;           // Instituto de pesquisa
  sampleSize?: number;             // Tamanho da amostra
}
```

### Aggregation Result
```typescript
interface StateAggregationResult {
  state: string;                   // UF (SP, RJ, etc)
  position: 'governador' | 'senador';
  aggregatedAt: Date;
  candidates: Array<{
    name: string;
    party?: string;
    weightedPercentage: number;    // % agregado ponderado
    confidence: number;            // Confiança (0-1)
    samplesUsed: number;           // Quantidade de polls
    researchPercentage?: number;   // % da pesquisa base
  }>;
  validatedPolls: number;          // Polls aceitos
  invalidPolls: number;            // Polls rejeitados
  invalidCandidates: Array<{...}>; // Detalhes dos rejeitados
  qualityMetrics: {
    dataQualityScore: number;      // Qualidade geral
    coverageScore: number;         // Cobertura de candidatos
    conflictScore: number;         // Concordância entre polls
  };
}
```

---

## Testes

Execute os testes de integração:

```bash
npm test -- src/lib/aggregation/__tests__/integration.test.ts
```

Todos os testes passam validando:
- ✅ Matching exato e fuzzy
- ✅ Rejeição de candidatos fictícios
- ✅ Agregação com ponderação correta
- ✅ Cálculo de confiança estatística
- ✅ Métricas de qualidade
- ✅ Comparação com baseline

---

## Próximos Passos

1. **Mock Clients**: Atualizar para gerar dados com candidatos reais por estado
2. **API Endpoints**: Implementar `/api/polls/aggregated?uf=SP` retornando agregação ponderada
3. **Dashboard**: Exibir resultados agregados com métricas de qualidade
4. **Monitoramento**: Alertas para deviações significativas da pesquisa base
