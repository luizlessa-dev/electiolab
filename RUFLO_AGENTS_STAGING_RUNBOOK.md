# 🚀 Ruflo Agents MVP — Staging Runbook

**Date:** 2026-08-10  
**Status:** ✅ MVP Ready  
**Deployment:** Staging (set 11) → Production (set 15)  
**Branch:** `feat/ruflo-agents-mvp` | **Commit:** `84b6696` | **PR:** #57

---

## Quick Start (Staging Team)

### 1. Deploy Agent Infrastructure
```bash
# Checkout branch
git checkout feat/ruflo-agents-mvp

# Install + Build
npm install && npm run build

# Start dev server
npm run dev

# Server runs on http://localhost:3001
```

### 2. Trigger Agents Manually
```bash
# Agent 1: TSE Ingestão
curl -X POST http://localhost:3001/api/agents/run-agent-1 \
  -H "Content-Type: application/json" -d '{}'

# Agent 2: Institutos Scraping
curl -X POST http://localhost:3001/api/agents/run-agent-2 \
  -H "Content-Type: application/json" -d '{}'

# Agent 3: Validação + Alertas
curl -X POST http://localhost:3001/api/agents/run-agent-3 \
  -H "Content-Type: application/json" -d '{}'
```

### 3. Test E2E Cascade (Agent 1 → 2 → 3)
```bash
# Trigger Agent 1 only
curl -X POST http://localhost:3001/api/agents/run-agent-1 \
  -H "Content-Type: application/json" -d '{}' | jq .result

# Watch server logs for:
# [run-agent-1] Agent 1 completed
# [run-agent-2] Starting Agent 2 (auto-triggered via webhook)
# [run-agent-3] Starting Agent 3 (auto-triggered via webhook)
```

---

## Architecture

### **Agent 1: TSE Ingestão**
**File:** `src/agents/agent-1-tse.ts`  
**Endpoint:** `POST /api/agents/run-agent-1`  
**Webhook:** `POST /api/webhooks/ruflo/tse-complete` → triggers Agent 2

**What it does:**
1. Downloads `pesquisa_eleitoral_2026.zip` from TSE CDN
2. Extracts CSV, parses rows
3. Upserts to `pesqele_registry` table (fields: protocolo, ano, uf, etc.)
4. Fires `tse-complete` webhook → Agent 2

**Output:**
```json
{
  "ok": true,
  "download_id": "tse_2026-08-10",
  "checksum_sha256": "...",
  "row_count": 3,
  "upserted_count": 3,
  "missing_count": 0,
  "duration_ms": 766,
  "timestamp": "2026-08-10T21:01:04.402Z"
}
```

**Known issues:**
- ⚠️ TSE CDN returns 404 → falls back to mock ZIP data
- ⚠️ **Action:** Confirm real TSE CDN URL for production

---

### **Agent 2: Institutos Scraping**
**File:** `src/agents/agent-2-institutos.ts`  
**Endpoint:** `POST /api/agents/run-agent-2`  
**Webhook:** `POST /api/webhooks/ruflo/institutos-complete` → triggers Agent 3

**What it does:**
1. Scrapes 5 institutos in parallel (Datafolha, IPEC, Quaest, PoderData, AtlasInteligência)
2. Tries 3 parsing strategies per institute: JSON → HTML → Regex
3. Returns extracted polls (currently logs only, upsert mocked)
4. Fires `institutos-complete` webhook → Agent 3

**Parallelism:** max 5 concurrent requests  
**Timeout:** 30s per institute

**Output:**
```json
{
  "ok": false,
  "completed_count": 1,
  "failed_count": 4,
  "total_polls_inserted": 25,
  "completed": [
    {
      "institute": "quaest",
      "strategy": "regex",
      "poll_count": 25,
      "duration_ms": 796
    }
  ],
  "failed": [
    {
      "institute": "datafolha",
      "error": "HTTP 404",
      "attempted_strategies": []
    }
  ],
  "duration_ms": 7894,
  "timestamp": "2026-08-10T21:01:25.529Z"
}
```

**Known issues:**
- ⚠️ Most institute URLs return 404 (Quaest works)
- ⚠️ Polls are NOT upserted (mocked, no target table)
- ⚠️ **Action:** Validate real institute URLs + determine target table schema

---

### **Agent 3: Validação + Alertas**
**File:** `src/agents/agent-3-validacao.ts`  
**Endpoint:** `POST /api/agents/run-agent-3`  
**Webhook:** `POST /api/webhooks/ruflo/alert-gap` (placeholder)

**What it does:**
1. Checks if `pesqele_registry` has data
2. Generates alerts if empty (gap detected)
3. Logs to console (email NOT wired yet)

**Output:**
```json
{
  "ok": true,
  "elections_checked": 1,
  "alerts_count": 0,
  "alerts": [],
  "status": "healthy",
  "duration_ms": 452,
  "timestamp": "2026-08-10T21:02:17.497Z"
}
```

**Known issues:**
- ⚠️ Email alerting not yet wired (placeholder in webhook)
- ⚠️ Validation logic is basic (just checks row count)
- ⚠️ **Action:** Wire Resend integration + enhance validation logic

---

## Database Schema

### `pesqele_registry` (TSE metadata, no candidate %)
```sql
CREATE TABLE pesqele_registry (
  protocolo           text PRIMARY KEY,     -- TSE registration ID
  ano                 integer,              -- election year
  uf                  text,                 -- state
  municipio           text,                 -- municipality
  cnpj_empresa        text,                 -- institute CNPJ
  nome_empresa        text NOT NULL,        -- institute name
  nome_fantasia       text,                 -- trade name
  cargos              text NOT NULL,        -- "Governador, Senador, ..."
  dt_inicio           date,                 -- fieldwork start
  dt_fim              date,                 -- fieldwork end
  dt_divulgacao       date,                 -- publication date
  dt_registro         timestamptz,          -- TSE registration timestamp
  qt_entrevistados    integer,              -- sample size
  pesquisa_propria    boolean DEFAULT false,
  cd_conre            text,                 -- statistics register
  nm_estatistico      text,                 -- responsible statistician
  vr_pesquisa         numeric(12,2),        -- survey cost
  ds_metodologia      text,                 -- methodology
  ds_plano_amostral   text,                 -- sampling plan
  ingested_at         timestamptz DEFAULT now(),
  raw                 jsonb                 -- raw audit trail
);
```

**Views:**
- `pesqele_missing` — TSE registrations NOT yet in polls (editorial queue)
- `pesqele_coverage` — coverage % by state + office

### `approval_polls` (Approval/Rejection only, NOT intention polls)
```sql
CREATE TABLE approval_polls (
  id                  uuid PRIMARY KEY,
  institute_id        uuid,
  institute_name      text,
  subject_label       text,        -- "Lula", "Governo Federal"
  subject_slug        text,        -- "lula"
  office              text,        -- 'presidente' | 'governador'
  scope               text,        -- 'nacional' | UF
  metric              text,        -- 'rating' | 'binary' | 'rejection'
  publication_date    date,
  fieldwork_start     date,
  fieldwork_end       date,
  sample_size         integer,
  margin_of_error     numeric(4,2),
  methodology         text,
  tse_registration    text,        -- link to pesqele_registry.protocolo
  source_url          text,
  pct_otimo           numeric(5,2), -- rating scale
  pct_bom             numeric(5,2),
  pct_regular         numeric(5,2),
  pct_ruim            numeric(5,2),
  pct_pessimo         numeric(5,2),
  pct_aprova          numeric(5,2), -- binary scale
  pct_desaprova       numeric(5,2),
  pct_rejeita         numeric(5,2), -- rejection scale
  pct_nsnr            numeric(5,2), -- don't know
  created_at          timestamptz DEFAULT now()
);
```

**⚠️ IMPORTANT:** There is NO generic `polls` table for intention polls. Agent 2 currently logs polls but doesn't upsert anywhere. **Staging team must decide:** create `polls` table or use existing schema.

---

## Configuration & Environment

### Required `.env.local`
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Required for agents to write

# Logging (optional)
LOG_LEVEL=debug
```

### Agent Retry Logic
- **Max retries:** Agent 1 (4x), Agent 2 (2x), Agent 3 (1x)
- **Backoff:** 0ms → 5000ms → 10000ms → 30000ms
- **Timeout:** Agent 1 (300s), Agent 2 (600s), Agent 3 (60s)

---

## Testing Checklist

### Unit Tests
```bash
# (No tests yet — Agent 1/2/3 are MVP)
# To add in post-launch
npm run test
```

### Manual E2E
- [ ] Deploy to staging
- [ ] Trigger Agent 1 via `curl` → verify TSE rows in `pesqele_registry`
- [ ] Trigger Agent 2 via `curl` → verify institutes are scraped (check logs)
- [ ] Trigger Agent 3 via `curl` → verify validation runs
- [ ] **CASCADE:** Trigger Agent 1 → watch logs for auto-trigger of 2 → watch logs for auto-trigger of 3
- [ ] Check server logs for audit trail

### Integration Tests (Staging)
- [ ] Real TSE CDN URL (currently 404)
- [ ] Real institute URLs (Datafolha, IPEC, etc.)
- [ ] Supabase schema validation (ensure `pesqele_registry` upsert works)
- [ ] Email alerting (wire Resend if critical for set 15)
- [ ] RPC `update_pesqele_missing` exists (Agent 1 calls it, currently missing)

---

## Known Limitations (MVP)

| Issue | Status | Action |
|-------|--------|--------|
| TSE CDN returns 404 | ⚠️ Using mock ZIP | Confirm real URL |
| Institute URLs return 404 | ⚠️ Only Quaest works | Update URLs |
| Agent 2 upsert mocked (no `polls` table) | ⚠️ Logs only | Create `polls` schema or use `approval_polls` |
| Agent 1 upsert only logs (schema unknowns) | ⚠️ Not writing DB | Validate `pesqele_registry` insert |
| Email alerting stub | ⚠️ No integration | Wire Resend (if needed for set 15) |
| RPC `update_pesqele_missing` missing | ⚠️ Agent 1 warns | Create RPC or remove call |
| No test coverage | ⚠️ Manual testing | Add unit + integration tests post-MVP |

---

## Rollout Timeline

### **Set 11 (Tomorrow)**
- [ ] Staging team deploys `feat/ruflo-agents-mvp`
- [ ] Validates agents run with real data sources
- [ ] Files tickets for schema issues
- [ ] Confirms cascade works end-to-end

### **Set 12–14**
- [ ] Address schema issues (pesqele_registry, polls table)
- [ ] Update institute URLs if needed
- [ ] Test with real TSE CDN data

### **Set 15 (Launch)**
- [ ] Deploy to production
- [ ] Monitor agent health (audit logs)
- [ ] On-call ready

---

## Debugging

### Check Agent Logs
```bash
# Terminal running `npm run dev`
grep "\[tse-ingestion\]\|\[institutos-scraping\]\|\[validation\]" <server-output>
```

### Check Supabase Audit Trail
```sql
-- Agents log to audit_logs (if table exists)
SELECT * FROM audit_logs 
WHERE agent_id LIKE 'tse-%' OR agent_id LIKE 'institutos-%' OR agent_id LIKE 'validation-%'
ORDER BY run_date DESC
LIMIT 10;
```

### Verify Database Connection
```bash
# Test Supabase service_role access
curl -X GET "https://your-project.supabase.co/rest/v1/pesqele_registry?limit=1" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Monitor Agent Health
```bash
# Run Agent 1 and watch for duration/success
curl -s -X POST http://localhost:3001/api/agents/run-agent-1 \
  -H "Content-Type: application/json" -d '{}' | jq '.result | {ok, duration_ms, row_count}'
```

---

## Post-MVP Roadmap (After Set 15)

1. **Email Integration** — Wire Resend for Agent 3 alerts
2. **Real TSE Data** — Replace mock ZIP with live TSE CDN
3. **Institute Coverage** — Add 10+ institutes (currently 5)
4. **Test Suite** — Add unit + integration tests
5. **Dashboard** — Show agent health / cascade status
6. **Metrics** — Track polls ingest rate, coverage %, gap trends

---

## Support

**Questions?** Refer to:
- Agent code: `src/agents/agent-{1,2,3}-*.ts`
- Endpoints: `src/app/api/agents/run-agent-*/route.ts`
- Webhooks: `src/app/api/webhooks/ruflo/*/route.ts`
- PR #57: Full context + decisions

**For production issues during set 15 launch:**
- Check agent logs in `npm run dev` terminal
- Query `audit_logs` table for failure details
- Verify Supabase schema + credentials
- Contact dev team (code is in this PR)

---

**Generated:** 2026-08-10  
**Status:** MVP Ready for Staging  
**Next:** Deploy + Validate (set 11)
