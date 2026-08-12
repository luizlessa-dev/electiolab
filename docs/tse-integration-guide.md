# TSE Integration Guide

Quick reference for using TSE integration in your application, plus the technical detail (file structure, environment variables, monitoring) needed to operate it in production.

---

## 🚀 Quick Start

### 1. Manual Sync (On-Demand)

```bash
# Sync all states and positions
curl -X POST "http://localhost:3000/api/tse/sync"

# Sync specific state
curl -X POST "http://localhost:3000/api/tse/sync?state=SP&position=governador"

# Get detailed results
curl -X POST "http://localhost:3000/api/tse/sync?detailed=true"
```

### 2. Automatic Sync (Daily)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/tse-sync",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Set environment variable:
```
CRON_SECRET=your-secret-from-vercel
```

---

## 📝 Code Examples

### Example 1: Validate Single Candidate

```typescript
import { tseValidator } from '@/lib/tse/tse-validator';

// Validate a candidate
const result = await tseValidator.validateAgainstTSE(
  'João Silva',
  'SP',
  'governador'
);

console.log(`Valid: ${result.isValid}`);
console.log(`TSE Number: ${result.enrichedData.tseNumber}`);
console.log(`Party: ${result.enrichedData.tseParty}`);
console.log(`Discrepancies: ${result.discrepancies.join(', ')}`);
```

**Response:**
```json
{
  "candidateName": "João Silva",
  "isValid": true,
  "tseNumber": "123456",
  "tseParty": "PT",
  "matchType": "exact",
  "discrepancies": [],
  "enrichedData": {
    "tseNumber": "123456",
    "tseParty": "PT",
    "tseNomeUrna": "JOAO SILVA"
  }
}
```

---

### Example 2: Batch Validate State Candidates

```typescript
import { tseValidator } from '@/lib/tse/tse-validator';

const candidates = [
  { name: 'João Silva', party: 'PT' },
  { name: 'Maria Santos', party: 'PSB' },
  { name: 'Carlos Oliveira', party: 'PL' },
];

const result = await tseValidator.validateStateAgainstTSE(
  candidates,
  'SP',
  'governador'
);

console.log(`Valid: ${result.summary.valid}`);
console.log(`Partial: ${result.summary.partial}`);
console.log(`Invalid: ${result.summary.invalid}`);

// Log discrepancies
tseValidator.logValidationResults(result);
```

---

### Example 3: Enrich Poll Data with TSE Info

```typescript
import { tseValidator } from '@/lib/tse/tse-validator';

const pollData = {
  candidateName: 'João Silva',
  state: 'SP',
  position: 'governador',
  percentage: 30,
  marginOfError: 2.5,
};

// Validate and enrich
const tseInfo = await tseValidator.validateAgainstTSE(
  pollData.candidateName,
  pollData.state,
  pollData.position as any
);

const enrichedPoll = {
  ...pollData,
  candidateNumber: tseInfo.enrichedData.tseNumber,
  tseParty: tseInfo.enrichedData.tseParty,
  validated: tseInfo.isValid,
};

// Use in aggregation
const aggregated = aggregateStatePolls([enrichedPoll], 'SP', 'governador');
```

---

### Example 4: Trigger Full Sync Job

```typescript
import { tseSyncJob } from '@/lib/tse/tse-sync-job';

// Run full sync (governors + senators, all states)
const result = await tseSyncJob.runFullSync();

console.log(`Job ID: ${result.jobId}`);
console.log(`Status: ${result.status}`);
console.log(`Duration: ${result.elapsedMs}ms`);
console.log(`Discrepancies: ${result.discrepancySummary.totalDiscrepancies}`);
```

---

### Example 5: Integrate with Aggregation Pipeline

```typescript
import { aggregateStatePolls } from '@/lib/aggregation/state-aggregation';
import { tseValidator } from '@/lib/tse/tse-validator';

async function aggregateWithTSEValidation(polls, state, position) {
  // 1. Validate and enrich each poll
  const enrichedPolls = await Promise.all(
    polls.map(async (poll) => {
      const tseInfo = await tseValidator.validateAgainstTSE(
        poll.candidate_name,
        state,
        position
      );

      return {
        ...poll,
        candidateNumber: tseInfo.enrichedData.tseNumber,
        tseParty: tseInfo.enrichedData.tseParty,
        validated: tseInfo.isValid,
      };
    })
  );

  // 2. Aggregate with validation status
  const result = aggregateStatePolls(enrichedPolls, state, position);

  // 3. Include validation quality in response
  return {
    ...result,
    tseValidationComplete: true,
    enrichedWith: 'TSE metadata',
  };
}
```

---

### Example 6: Check Sync Status

```typescript
import { tseSyncService } from '@/lib/tse/tse-sync-service';

// Get last sync status for a state
const status = tseSyncService.getSyncStatus('SP', 'governador');

if (status) {
  console.log(`Synced at: ${status.syncedAt}`);
  console.log(`Candidates: ${status.totalCandidates}`);
  console.log(`Discrepancies: ${status.discrepancies.length}`);
}
```

---

## 🔍 Understanding Discrepancies

### Discrepancy Logging (persisted, not just console/JSON)

Every discrepancy found by `syncStatePosition` in `src/lib/tse/tse-sync-service.ts` is persisted to the `discrepancies` table via `discrepancyManager.createDiscrepancy(state, position, d)` (`src/lib/admin/discrepancy-manager.ts`), on every sync run — this is not just a console log or a one-off JSON export anymore. Discrepancies are:

- Queryable and filterable through `GET /api/admin/discrepancies` (by state, position, severity, type, resolution, or free-text search)
- Resolvable/auditable through `POST /api/admin/discrepancies` (`resolvedBy`, `resolvedAt`, `notes`)
- Picked up by the Wave4 Orchestrator (`src/lib/services/wave4-orchestrator.ts`) to trigger Slack/email alerts for critical items

Console output and JSON export (via `tseSyncService.exportDiscrepancies()`) still happen alongside persistence — useful for a quick look at a single sync run — but the database is the durable, queryable source of truth.

### Types of Discrepancies

1. **Missing in Research** 🟡
   - Candidate registered in TSE but not in research database
   - Usually candidates with low polling or recent registrations
   - Action: Consider adding to research database if polling-relevant

2. **Missing in TSE** 🔴
   - Candidate in research database but not in official TSE registry
   - **Critical**: Indicates data quality issue
   - Action: Verify candidate actually running; may indicate data error

3. **Name Mismatch** 🔵
   - Slight variations in candidate names
   - Example: "João" vs "JOAO SILVA"
   - Solution: Fuzzy matching (85%+ similarity)

4. **Party Mismatch** 🟠
   - Different party affiliation between sources
   - Could indicate party switching or data error
   - Action: Investigate candidate's recent history

---

## 📊 Reading Sync Results

```json
{
  "syncedAt": "2026-08-08T02:00:00.000Z",
  "elapsedMs": 45000,
  "position": "governador",
  "state": "SP",
  "syncResult": {
    "state": "SP",
    "position": "governador",
    "status": "partial",
    "totalCandidates": 8,
    "newCandidates": 2,
    "discrepancies": [
      {
        "type": "missing_in_research",
        "candidateName": "João da Silva",
        "severity": "warning",
        "details": "Candidate registered in TSE but not found in research database"
      }
    ]
  },
  "validationResult": {
    "state": "SP",
    "position": "governador",
    "summary": {
      "valid": 6,
      "partial": 1,
      "invalid": 1,
      "discrepanciesFound": 2
    }
  }
}
```

---

## 🐛 Troubleshooting

### Sync fails with "No election found"
- Ensure 2026 elections exist in TSE API
- Check election type matches position
- Verify API connection with `fetchTSEEleicoes()`

### High number of "missing_in_research"
- Normal for states with many candidates
- Candidates not in major polls may not be in research data
- Review TSE registry to decide if adding is necessary

### Fuzzy matches instead of exact
- Name variations between sources (accents, formatting)
- Normalized comparison removes diacritics
- 85%+ similarity threshold ensures accuracy

### Sync timeout (>120 seconds)
- TSE API may be slow; check API status
- Reduce batch size or increase timeout
- Check network connectivity

---

## 🎯 Best Practices

1. **Run daily**: Schedule sync during off-peak hours (2 AM UTC)
2. **Cache aggressively**: 24-hour TTL reduces API calls
3. **Review persisted discrepancies**: Query `/api/admin/discrepancies` regularly, don't rely only on console output
4. **Validate before aggregation**: Enrich polls with TSE data
5. **Monitor success rate**: Alert if >1 state fails
6. **Review critical items**: Candidates missing in TSE
7. **Document changes**: Keep audit trail of discrepancies

---

## 📈 Monitoring

### Metrics to Track

```typescript
// After sync
console.log(`Sync success rate: ${successCount}/${totalStates}`);
console.log(`Discrepancies per state: ${totalDiscrepancies}/${totalStates}`);
console.log(`Average validation time: ${totalTime}/${candidates}`);
console.log(`Cache hit rate: ${cacheHits}/${totalRequests}`);
```

### Alerts to Set

```bash
# Alert if sync fails
if (syncResult.status === 'failed') {
  sendAlert('TSE sync failed', syncResult.errors);
}

# Alert if too many critical issues
if (criticalCount > 10) {
  sendAlert('High critical discrepancies', criticalCount);
}

# Alert if sync takes too long
if (elapsedMs > 120000) {
  sendAlert('TSE sync timeout', elapsedMs);
}
```

---

## 🔐 Security

- ✅ No credentials stored in code
- ✅ TSE API is public (no auth needed)
- ✅ Vercel Cron validated with secret
- ✅ No sensitive candidate data in logs (only names)
- ✅ Cache stored server-side only

---

## 📁 File Structure

```
src/lib/tse/
├── tse-client.ts              - Basic API client (elections + candidates, 24h cache)
├── tse-sync-service.ts        - Sync orchestration, caching, discrepancy detection + persistence
├── tse-validator.ts           - Real-time validation (exact + fuzzy matching, enrichment)
├── tse-sync-job.ts            - Background job runner (daily full sync)
└── README.md                  - Module-level technical documentation

src/lib/admin/
└── discrepancy-manager.ts     - CRUD + filtering over the `discrepancies` table

src/app/api/
├── tse/sync/route.ts          - Manual sync endpoint (POST trigger, GET status)
├── cron/tse-sync/route.ts     - Vercel Cron handler (daily 2 AM UTC)
└── admin/discrepancies/route.ts - List/filter/resolve persisted discrepancies
```

---

## 🔧 Environment Variables

```bash
# Required for Vercel Cron
CRON_SECRET=your-vercel-cron-secret

# TSE API Base URL (already configured)
TSE_API_BASE=https://dadosabertos.tse.jus.br/api/v1

# Optional: Cache TTL (default: 24 hours)
TSE_CACHE_TTL=86400000
```

---

## 📚 Related Documentation

- [Architecture](./ARCHITECTURE.md) - System diagrams (Wave 3 + Wave 4 layers)
- [Changelog](./CHANGELOG.md) - TSE integration history and bug fixes
- [Aggregation Pipeline](../src/lib/aggregation/README.md)
- [Candidate Validator](../src/lib/aggregation/candidate-validator.ts)
- [Real Candidates Data](../src/lib/candidates/real-candidates-2026.ts)

---

## 🎓 TSE API Reference

**Base URL**: `https://dadosabertos.tse.jus.br/api/v1`

**Available endpoints:**
- `GET /eleicoes` - List all elections
- `GET /eleicoes/{id}` - Election details
- `GET /eleicoes/{id}/candidatos` - Candidates for election
- `GET /eleicoes/{id}/candidatos?uf=SP` - Filter by state

**Response format:**
```json
{
  "id": "2026",
  "ano": 2026,
  "tipo": "governador",
  "dataEleicao": "2026-10-04T00:00:00Z"
}
```

---

Generated: 2026-08-08
Last updated: 2026-08-11 (discrepancy persistence fix)
