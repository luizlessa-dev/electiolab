# TSE Integration Roadmap

**Status:** Phase 2 (Parallel Implementation) - IN PROGRESS  
**Credibility Principle:** `credibilidade sempre` — Replace all Wikipedia sources with official TSE data

## Phase Overview

```
Phase 1: Clean Wikipedia Data ✅ DONE
  └─ Removed 561 Wikipedia-sourced pesquisas
  └─ Retained 237 pesquisas com institute_id válido
  
Phase 2: Integrate TSE APIs 🚀 IN PROGRESS
  ├─ Parallel Implementation:
  │  ├─ Client A: DivulgaCandContas (Candidate Registry)
  │  └─ Client B: TSE Resultados (Live Results/Apuração)
  │
  └─ API Endpoints:
     ├─ POST /api/tse/sync/candidatos
     └─ GET|POST /api/tse/sync/resultados
  
Phase 3: Connect Real Polling Institutes
  ├─ Datafolha, Quaest, AtlasIntel, etc.
  └─ Requires: HTTP proxies, rate limiting, caching
  
Phase 4: Document All Data Sources
  └─ Credibility scores, attribution links, refresh schedules
```

## Implemented Components

### 1. DivulgaCandContas Client (`apps/pipeline/lib/tse/divulgacandcontas-client.ts`)

**Purpose:** Fetch candidate registration data from TSE

**API:** Unofficial but stable  
**Base URL:** https://divulgacandcontas.tse.jus.br  
**Rate Limit:** IP-based blocking after ~50 consecutive requests

**Supported Cargo Types:**
- `presidente` (code: 1)
- `governador` (code: 3)
- `senador` (code: 5)
- `deputado` (code: 6)

**Features:**
- ✅ Retry logic with exponential backoff (3x, 1s→2s→4s)
- ✅ 24-hour in-memory cache to reduce API pressure
- ✅ User-Agent headers to avoid blocking
- ✅ Type-safe `DivulgaCandidato` interface

**Limitations:**
- ❌ **No CORS support** — requires backend proxy strategy
- ⚠️ High rate-limiting risk — cache TTL is critical

**Usage:**
```typescript
import { divulgaCandContasClient } from '@/lib/tse/divulgacandcontas-client';

const candidatos = await divulgaCandContasClient.buscarCandidatos(
  2026,      // ano
  'SP',      // estado
  'governador' // cargo
);

console.log(candidatos); // Array<DivulgaCandidato>
```

### 2. TSE Resultados Client (`apps/pipeline/lib/tse/tse-resultados-client.ts`)

**Purpose:** Fetch live election results during apuração phase

**API:** Official TSE API  
**Base URL:** https://resultados.tse.jus.br  
**Update Frequency:** Real-time during elections

**Supported Operations:**
- `buscarResultadosPresidencial(turno, ano)` — Presidential results
- `buscarResultadosGovernador(estado, turno, ano)` — State governor results
- `buscarStatusApuracao(ano)` — Overall counting status

**Features:**
- ✅ Turno support (1st and 2nd round)
- ✅ Progressive counting updates (% apuração)
- ✅ Structured candidate vote tallies
- ✅ Type-safe `ResultadoTSE` interface

**Limitations:**
- ⚠️ Only available during election days
- ⚠️ API endpoint format may change between elections

**Usage:**
```typescript
import { tseResultadosClient } from '@/lib/tse/tse-resultados-client';

const resultados = await tseResultadosClient.buscarResultadosPresidencial(1, 2026);

console.log(resultados);
// {
//   cargo: 'presidente',
//   turno: 1,
//   ano: 2026,
//   dataApuracao: '2026-10-02T...',
//   percentualApuração: 87.5,
//   seçõesApuradas: 250000,
//   seçõesTotais: 300000,
//   candidatos: [
//     { numeroCandidata: '13', nomeCandidata: 'Candidate A', votosNominais: 15000000, ... }
//   ]
// }
```

## API Endpoints

### `POST /api/tse/sync/candidatos`

**Synchronize candidate registry data**

**Request:**
```bash
curl -X POST http://localhost:3000/api/tse/sync/candidatos \
  -H "Content-Type: application/json" \
  -d '{
    "ano": 2026,
    "estado": "SP",    // optional — syncs all 27 if omitted
    "cargo": "governador"  // optional — default: governador
  }'
```

**Response:**
```json
{
  "success": true,
  "resumo": {
    "ano": 2026,
    "cargo": "governador",
    "estadosSolicitados": ["AC", "AL", "AM", ...],
    "totalInseridos": 2847,
    "totalErros": 0,
    "erros": null
  },
  "timestamp": "2026-08-05T14:30:00Z"
}
```

### `GET /api/tse/sync/resultados`

**Fetch live election results**

**Request:**
```bash
curl "http://localhost:3000/api/tse/sync/resultados?cargo=presidente&turno=1&ano=2026"
```

**Query Params:**
| Param | Type | Required | Default | Example |
|-------|------|----------|---------|---------|
| `cargo` | string | No | presidente | `presidente`, `governador` |
| `estado` | string | ✅ if cargo=governador | — | `SP`, `RJ` |
| `turno` | number | No | 1 | `1`, `2` |
| `ano` | number | No | 2026 | `2026`, `2022` |

**Response (GET):**
```json
{
  "success": true,
  "data": {
    "cargo": "presidente",
    "turno": 1,
    "ano": 2026,
    "dataApuracao": "2026-10-02T22:45:30Z",
    "percentualApuração": 95.2,
    "seçõesApuradas": 285600,
    "seçõesTotais": 300000,
    "candidatos": [
      {
        "numeroCandidata": "13",
        "nomeCandidata": "Candidate Name",
        "siglaPartido": "PT",
        "votosNominais": 25000000,
        "percentual": 32.5
      }
    ]
  },
  "timestamp": "2026-10-02T22:45:30Z"
}
```

### `POST /api/tse/sync/resultados`

**Sync all 27 states' governor results (batch)**

**Request:**
```bash
curl -X POST http://localhost:3000/api/tse/sync/resultados \
  -H "Content-Type: application/json" \
  -d '{ "ano": 2026, "turno": 1 }'
```

**Response:**
```json
{
  "success": true,
  "resumo": {
    "ano": 2026,
    "turno": 1,
    "totalEstados": 27,
    "estadosProcessados": 27,
    "totalErros": 0,
    "erros": null
  },
  "resultados": [
    { "estado": "AC", "candidatos": 8, "apuração": 98.5 },
    { "estado": "AL", "candidatos": 12, "apuração": 99.1 },
    // ... 25 more states
  ],
  "timestamp": "2026-10-02T22:50:00Z"
}
```

## Integration Points

### With Existing Poll Pipeline

**Current Flow:**
```
Manual pesquisas (Wikipedia) → polls table → Weighted Average UI
```

**New Flow:**
```
TSE APIs (Official Sources)
  ├─ DivulgaCandContas → Sync to candidates table
  ├─ TSE Resultados → Sync to results/apuracao table
  └─ Both → Enrich pesquisas with credible candidates

Polling Institutes (Phase 3)
  └─ Datafolha, etc. → polls table (replaces Wikipedia)

Weighted Average UI (Updated)
  └─ Combines TSE + Institute sources with proper attribution
```

### Database Schema (Next Step)

Need to extend schema for:
- `candidates` table (from DivulgaCandContas)
- `election_results` / `apuracao` table (from TSE Resultados)
- `data_source_audit` table (track credibility & refresh times)

## Error Handling Strategy

### DivulgaCandContas (Cache-Heavy)

**Rate Limit Hit:**
```
1. Return cached data if available (even if stale)
2. Log warning: "Using stale cache for [UF/cargo]"
3. Schedule retry with exponential backoff
```

**Fallback:** Historical data from TSE archives (CEPESPData as interim)

### TSE Resultados (Live-Only)

**Election Not Active:**
```
HTTP 404 or empty response
→ Return { percentualApuração: 0, seçõesApuradas: 0 }
→ Cache explicitly for 1 hour
```

**Connection Timeout:**
```
Retry 3x with exponential backoff
After 3 retries: Return last known state or error
```

## Next Steps (Priority Order)

### Step 2a: Database Migrations
- [ ] Create `candidates` table from DivulgaCandContas schema
- [ ] Create `election_results` table for TSE apuração data
- [ ] Add `source_credibility` enum (TSE=5, Institute=4, Wiki=0)
- [ ] Add `source_refresh_at` timestamp for cache expiry

### Step 2b: Endpoint Integration Tests
- [ ] Test DivulgaCandContas retry logic
- [ ] Test TSE Resultados with mock election data
- [ ] Verify cache invalidation after 24h
- [ ] Test error scenarios (rate limit, timeout, 404)

### Step 2c: CI/CD Pipeline
- [ ] Add scheduled sync jobs (DivulgaCandContas: weekly)
- [ ] Add event-based sync (TSE Resultados: during elections)
- [ ] Add backfill script for historical data

### Step 3: Polling Institute Integration
- [ ] Implement Datafolha connector
- [ ] Implement Quaest connector
- [ ] Implement AtlasIntel connector
- [ ] Add rate-limiting middleware

### Step 4: Audit & Attribution
- [ ] Generate data source audit report
- [ ] Add attribution links on frontend
- [ ] Document refresh schedules
- [ ] Publish credibility scores

## Credibility Scoring (Planned)

| Source | Score | Freshness | Fallback |
|--------|-------|-----------|----------|
| TSE Resultados | 10 | Real-time | Last known |
| TSE DivulgaCandContas | 9 | Weekly | 24h cache |
| Datafolha | 8 | Daily | 3-day cache |
| Quaest | 8 | Daily | 3-day cache |
| AtlasIntel | 7 | 3x/week | 1-week cache |
| Wikipedia | ~~0~~ | ❌ Removed | N/A |

---

**Key Principle:** Never show data without clear attribution. Always prefer official (TSE) sources.
