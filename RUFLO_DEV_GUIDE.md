# ElectioLab Ruflo — Developer Guide

## Overview

This project implements 3 autonomous agents for ElectioLab using the Ruflo framework:
- **Agent 1**: TSE Ingestão (daily, 1 min)
- **Agent 2**: Institutos Scraping (paralelo, 5 min)
- **Agent 3**: Validação + Alertas (hourly, <1 min)

**Status**: 🚧 SCAFFOLD (implementation in progress)

---

## Directory Structure

```
src/
├─ agents/
│  ├─ base.ts                    # Shared RufloAgent base class
│  ├─ agent-1-tse.ts             # Agent 1 scaffold
│  ├─ agent-2-institutos.ts      # Agent 2 scaffold
│  └─ agent-3-validacao.ts       # Agent 3 scaffold
│
├─ app/api/webhooks/ruflo/
│  ├─ tse-complete/route.ts      # Webhook: Agent 1 → Agent 2
│  ├─ institutos-complete/       # Webhook: Agent 2 → Agent 3
│  └─ alert-gap/route.ts         # Webhook: Agent 3 → Operador
│
└─ lib/
   ├─ institutes/                # Reuse Phase 2.5 parsing
   │  ├─ datafolha-client.ts
   │  ├─ ipec-client.ts
   │  └─ ... (10+ more)
   │
   └─ ingest/pesqele.ts          # Reuse TSE CSV parser
```

---

## Development Phases

### Phase 1: Agent 1 (TSE Ingestão)

**File**: `src/agents/agent-1-tse.ts`

**Checklist**:
- [ ] Implement TSE ZIP download
- [ ] Implement CSV parsing (reuse `src/lib/ingest/pesqele.ts`)
- [ ] Add retry logic (exponential backoff: 0s, 5min, 10min, 30min)
- [ ] Implement Supabase upsert:
  - `INSERT INTO pesqele_registry (...)`
  - `CALL update_pesqele_missing(2026)` (RPC)
- [ ] Add memória HNSW tracking:
  - Vector: [download_count, checksum_stability, row_count_trend, error_rate, days_since_success]
  - Metadata: {download_id, checksum, upserted_count, errors[], timestamp}
- [ ] Implement audit logging (`logAudit()`)
- [ ] Unit tests (mock ZIP, CSV parsing)
- [ ] Staging validation (live TSE CDN)

**Success Criteria**:
- ✅ Ciclo < 2 min (p95 latency)
- ✅ Checksum matches expected
- ✅ pesqele_registry updated correctly
- ✅ Webhook `/api/webhooks/ruflo/tse-complete` fires on success

**ETA**: 1 week

---

### Phase 2: Agent 2 (Institutos Paralelo)

**File**: `src/agents/agent-2-institutos.ts`

**Checklist**:
- [ ] Setup parallelization queue (max 5 simultaneous)
- [ ] Implement institute config (URL, strategies, timeout)
- [ ] Add 10+ institute clients (reuse `src/lib/institutes/*.ts`):
  - Datafolha, Ipec, Quaest, PoderData, AtlasIntel, FSB, Ipespe, MDA, RTBD, Genial
- [ ] Implement 3 fallback strategies per institute:
  - JSON API parsing
  - HTML table extraction
  - Regex pattern matching
- [ ] Implement data normalization (candidate, %, date, etc.)
- [ ] Add retry logic per institute (max 2 attempts)
- [ ] Implement Supabase upsert:
  - `INSERT INTO polls (...)`
  - `INSERT INTO election_results_candidatos (...)`
- [ ] Add memória HNSW tracking:
  - Vector: [success_rate, avg_latency, strategy_diversity, freshness, error_trend, reliability, temporal_stability, election_maturity]
  - Metadata: {institute_id, last_success_date, strategies_tried[], poll_count}
- [ ] Implement audit logging
- [ ] Unit tests (mock websites, parsing strategies)
- [ ] Staging validation (real institutos)

**Success Criteria**:
- ✅ Ciclo < 10 min (E2E timer)
- ✅ 8+ institutos scraped successfully
- ✅ Fallback strategies work (JSON → HTML → regex)
- ✅ Success rate ≥ 92%
- ✅ Webhook `/api/webhooks/ruflo/institutos-complete` fires on success

**ETA**: 1.5 weeks

---

### Phase 3: Agent 3 (Validação + Alertas)

**File**: `src/agents/agent-3-validacao.ts`

**Checklist**:
- [ ] Implement gap detection (last poll date)
- [ ] Implement 3 anomaly detection methods:
  - Sudden drop (>2σ deviation)
  - Outlier (>IQR * 1.5)
  - Missing institute pattern
- [ ] Add Supabase queries:
  - `SELECT * FROM polls WHERE election_id = ? AND publication_date > ...`
  - `SELECT * FROM elections WHERE is_active = true`
- [ ] Implement escalation logic (severity: low/medium/high)
- [ ] Add memória HNSW tracking:
  - Vector: [poll_frequency, consistency, volatility, gap_severity, anomaly_sensitivity, institute_agreement, temporal_stability, election_maturity]
  - Metadata: {election_id, check_date, gap_days, anomaly_history[], institute_pairs[], threshold_overrides}
- [ ] Implement alert insertion:
  - `INSERT INTO operador_alerts (...)`
  - `INSERT INTO data_source_audit (...)`
- [ ] Implement email notification (via Resend):
  - `const { data, error } = await resend.emails.send({...})`
- [ ] Unit tests (mock elections, various anomalies)
- [ ] Staging validation (real elections if active)

**Success Criteria**:
- ✅ Gap detection < 1.5h
- ✅ Anomaly precision ≥ 85% (TP / (TP + FP))
- ✅ Email alerts sent to operador@electiolab.com
- ✅ Webhook `/api/webhooks/ruflo/alert-gap` fires on high-severity alerts
- ✅ Dashboard updates with red banner

**ETA**: 1 week

---

### Phase 4: Integration + Deployment

**Checklist**:
- [ ] Integration tests (all 3 agents together)
- [ ] E2E tests (Playwright if needed)
- [ ] Security audit:
  - Webhook signature validation
  - RLS policy checks
  - SQL injection prevention
  - Secrets management
- [ ] Performance testing:
  - Latency baseline (p50/p95/p99)
  - Concurrent request handling
  - Memory usage
- [ ] Monitoring setup:
  - Sentry error tracking
  - Cloudflare Workers KV logging (if used)
  - Custom metrics (agent latency, success rate)
- [ ] Documentation:
  - Runbooks (how to debug each agent)
  - Alert playbook (what to do when alerts fire)
  - Operational procedures
- [ ] Operador training:
  - New alerts system
  - Dashboard changes
  - Escalation procedures
- [ ] Canary rollout plan (10% → 25% → 50% → 100%)
- [ ] Rollback plan (revert to old crons, keep as backup 2 weeks)

**ETA**: 1 week

---

## Key Files to Reference

### Reuse These (Phase 2.5 already implemented)
```
src/lib/institutes/datafolha-client.ts     # Datafolha parsing
src/lib/institutes/ipec-client.ts          # Ipec parsing
src/lib/institutes/atlasIntel-client.ts    # AtlasIntel tracking
src/lib/institutes/*.ts                    # 10+ more
```

### Reuse These (TSE parsing)
```
src/lib/ingest/pesqele.ts (195 lines)      # CSV parser, adapt for Agent 1
```

### Supabase RPC Functions to Create
```
update_pesqele_missing(year: 2026)
normalize_poll_data(raw_data: json)
calculate_institute_consensus(election_id: uuid)
```

---

## Environment Variables (Set Before Dev)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
RUFLO_WEBHOOK_SECRET=...              # Sign webhooks
RUFLO_MEMORY_API_KEY=...               # HNSW backend (shared with BR Insider)
RESEND_API_KEY=...                     # Email alerts
```

---

## Testing Strategy

### Unit Tests (Per Agent)
```typescript
// Example: Agent 1
describe("TseIngestAgent", () => {
  it("should parse CSV correctly", async () => {
    const mockZip = createMockZip([...]);
    const agent = new TseIngestAgent();
    const result = await agent.parseCSV(mockZip);
    expect(result.rows).toHaveLength(347);
  });

  it("should retry on timeout", async () => {
    const agent = new TseIngestAgent();
    // Mock fetch to fail first 2 times
    const result = await agent.retry(...);
    expect(result.attempts).toBe(3);
  });
});
```

### Integration Tests
```typescript
// All 3 agents together
describe("Ruflo Pipeline", () => {
  it("should flow: Agent1 → Agent2 → Agent3", async () => {
    // Trigger Agent 1
    // Wait for webhook
    // Verify Agent 2 runs
    // Verify Agent 3 runs
    // Check alerts created
  });
});
```

### E2E Tests (Playwright)
```typescript
// Real browser flow
describe("Operador Dashboard", () => {
  it("should show new polls after Agent 2 completes", async () => {
    // Trigger Agent 2 scraping
    // Wait for DB update
    // Load dashboard
    // Verify new polls visible
  });
});
```

---

## Common Gotchas

1. **Supabase Service Role**: Make sure Ruflo uses `SUPABASE_SERVICE_ROLE_KEY`, not anon key
2. **RLS Policies**: Verify policies allow service role to read/write all tables
3. **Timeout**: Agent 1 needs 300s+; Agent 2 needs 30s × parallelism
4. **Rate Limiting**: Some institutos rate-limit; add exponential backoff
5. **Webhook Signature**: Always validate header before processing
6. **Memória Vector**: Must be consistent dimension (5 for Agent 1, 6 for Agent 2, 8 for Agent 3)
7. **Timezone**: All timestamps in UTC, convert to BRT for display

---

## Deployment Milestones

| Date | Agent | Status | Gate |
|------|-------|--------|------|
| set 14 | Agent 1 | Staging ready | Security audit |
| set 21 | Agent 2 | Staging ready | Performance test |
| set 30 | Agent 3 | Staging ready | E2E tests |
| out 7 | All | Prod canary 10% | Monitoring OK |
| out 14 | Agent 1 | Prod 100% | Canary success |
| out 21 | Agent 2 | Prod 100% | Canary success |
| out 28 | Agent 3 | Prod 100% | Canary success |
| out 31 | All | Live ✅ | Operador trained |

---

## Questions?

See memory docs:
- `project_electiolab_ruflo_agente_tse.md` — Agent 1 spec
- `project_electiolab_ruflo_agente_institutos.md` — Agent 2 spec
- `project_electiolab_ruflo_agente_validacao.md` — Agent 3 spec
- `project_electiolab_ruflo_endpoints_roadmap.md` — Endpoints + timeline
- `project_electiolab_ruflo_cheatsheet.md` — Quick reference
