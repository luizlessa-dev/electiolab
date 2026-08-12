# ElectioLab Health Monitoring — Nível 4 Option 2

**Status**: ✅ Implemented  
**Date**: 2026-08-09  
**Components**: 3 agents (TSE, Institutos, Validação) + monitoring  

---

## 📊 Health Check Endpoints

### 1. System Health (All Agents)
```bash
GET /api/health
```

**Response**:
```json
{
  "ok": true,
  "timestamp": "2026-08-09T21:00:00Z",
  "agents": {
    "agent-1-tse": {
      "status": "healthy",
      "last_run": "2026-08-09T20:00:00Z",
      "last_success": "2026-08-09T20:00:00Z",
      "uptime_pct": 98.5
    }
  },
  "dependencies": {
    "supabase": "ok",
    "tse_cdn": "unknown"
  },
  "checks": {
    "database": true,
    "agents_active": 3,
    "webhooks_queue": 0
  }
}
```

**Cache**: 60 seconds  
**Use case**: High-level system status check

---

### 2. Individual Agent Health
```bash
GET /api/health/agent-1-tse
GET /api/health/agent-2-institutos
GET /api/health/agent-3-validacao
```

**Response**:
```json
{
  "ok": true,
  "agent": "agent-1-tse",
  "status": "healthy",
  "timestamp": "2026-08-09T21:00:00Z",
  "metrics": {
    "last_run_at": "2026-08-09T20:55:00Z",
    "last_success_at": "2026-08-09T20:55:00Z",
    "last_error_at": null,
    "last_error_message": null,
    "run_count_24h": 12,
    "success_rate_pct": 95,
    "avg_duration_ms": 750
  },
  "recommendations": []
}
```

**Status Interpretation**:
- ✅ **Healthy**: >90% success rate, recent runs
- ⚠️ **Degraded**: 50-90% success rate OR no run in 2 hours
- 🔴 **Down**: <50% success rate OR no run in 3+ hours

**Cache**: 30 seconds

---

## 🔗 Webhook Robustness

All agent-to-agent communication uses retry logic + fallback:

### Retry Strategy
```
Attempt 1: Immediate
  → Success: Done ✅
  → Fail: Wait 1s

Attempt 2: After 1s
  → Success: Done ✅
  → Fail: Wait 2s

Attempt 3: After 2s (total 3s)
  → Success: Done ✅
  → Fail: Queue webhook + send alert
```

### Fallback Handling
If all 3 attempts fail:
1. **Queue webhook** — store in `webhook_queue` table for async retry
2. **Send alert email** — notify team via Resend (TODO: wire integration)
3. **Log error** — track in `webhook_logs` for debugging

### Webhook Flow (Agent 1 → 2 → 3)
```
Agent 1 (TSE Ingest) completes
  ↓
Fire: POST /api/webhooks/ruflo/tse-complete
  ├─ Attempt 1: Retry if timeout/5xx (1s wait)
  ├─ Attempt 2: Retry if still failing (2s wait)
  ├─ Attempt 3: Final attempt
  └─ Fail: Queue + alert
    ↓
    If success → Agent 2 (Institutos) starts automatically
    
Agent 2 completes
  ↓
Fire: POST /api/webhooks/ruflo/institutos-complete
  ├─ (same retry logic)
  └─ If success → Agent 3 (Validação) starts automatically

Agent 3 completes
  ↓
Fire: POST /api/webhooks/ruflo/alert-gap
  └─ (same retry logic)
```

---

## 📈 Monitoring Dashboard

**URL**: `/admin/agents`

Shows:
- Real-time status (✅ Healthy / ⚠️ Degraded / 🔴 Down)
- Last run timestamp
- Success rate (%)
- Average duration (ms)
- Last error message
- Recommendations (auto-generated based on metrics)

**Auto-refresh**: Every 60 seconds

**Example Recommendations**:
- "Success rate is 65%. Investigate last failures."
- "No successful run in 125 minutes."
- "Critical: Success rate is 30%. Agent is failing most runs."

---

## 🗄️ Database Schema

### `agent_runs` (Execution history)
```sql
CREATE TABLE agent_runs (
  id uuid PRIMARY KEY,
  agent_name text,                -- agent-1-tse, agent-2-institutos, etc.
  success boolean,                -- did agent complete successfully?
  error text,                     -- error message if failed
  duration_ms integer,            -- execution time
  row_count integer,              -- TSE rows downloaded
  upserted_count integer,         -- rows inserted/updated
  poll_count integer,             -- institutos polls scraped
  output jsonb,                   -- full result JSON
  run_at timestamptz,             -- when run started
  created_at timestamptz
);
```

**Query examples**:
```sql
-- Success rate for Agent 1 in last 24h
SELECT 
  COUNT(*) FILTER (WHERE success) * 100.0 / COUNT(*) as success_rate_pct
FROM agent_runs
WHERE agent_name = 'agent-1-tse'
  AND run_at > now() - interval '24 hours';

-- Last 10 runs with errors
SELECT agent_name, error, run_at
FROM agent_runs
WHERE success = false
ORDER BY run_at DESC
LIMIT 10;
```

### `webhook_queue` (Async retry)
```sql
CREATE TABLE webhook_queue (
  id uuid PRIMARY KEY,
  url text,
  payload jsonb,
  status text,                   -- pending, success, failed
  attempts integer,              -- current attempt count
  max_attempts integer DEFAULT 3,
  next_retry_at timestamptz,     -- when to retry next
  error text,
  created_at timestamptz,
  completed_at timestamptz
);
```

### `webhook_logs` (Audit trail)
```sql
CREATE TABLE webhook_logs (
  id uuid PRIMARY KEY,
  agent text,
  url text,
  ok boolean,
  status_code integer,
  error text,
  attempts integer,
  duration_ms integer,
  created_at timestamptz
);
```

### `agent_alert_rules` (Configurable thresholds)
```sql
CREATE TABLE agent_alert_rules (
  id uuid PRIMARY KEY,
  agent_name text,
  rule_type text,                -- success_rate, no_run_for, error_contains
  threshold jsonb,               -- {min_pct: 80}, {max_mins: 180}, etc.
  enabled boolean,
  created_at timestamptz
);
```

---

## 🚀 Integration Points

### For Agent Runners
When an agent finishes, call:
```typescript
import { sendWebhookWithRetry, logWebhookAttempt } from "@/lib/webhooks";

const result = await sendWebhookWithRetry(
  "https://electiolab.com/api/webhooks/ruflo/tse-complete",
  {
    agent: "agent-1-tse",
    timestamp: new Date().toISOString(),
    data: agentOutput,
  }
);

// Log the attempt for monitoring
await logWebhookAttempt(webhook_url, result, "agent-1-tse", supabase);
```

### For Webhook Handlers
When receiving a webhook:
```typescript
// Log execution
const { error } = await supabase.from("agent_runs").insert({
  agent_name: payload.agent,
  success: true,
  duration_ms: payload.data.duration_ms,
  row_count: payload.data.row_count,
  run_at: new Date(payload.timestamp),
  output: payload.data,
});

// Trigger next agent (if needed)
if (payload.agent === "agent-1-tse") {
  fetch("/api/agents/run-agent-2", { method: "POST" });
}
```

---

## ⚙️ Configuration

### Alert Thresholds (Seed Data)
```sql
Agent 1 (TSE): 80% success rate, max 3h no run
Agent 2 (Institutos): 60% success rate, max 4h no run  
Agent 3 (Validação): 90% success rate, max 3h no run
```

Customize in `/admin/agents/settings` (TODO: implement)

### Webhook Retry Config
- **Max attempts**: 3
- **Backoff**: Exponential (1s, 2s, 4s)
- **Timeout per attempt**: 15s

---

## 📋 Implementation Checklist

- ✅ Health check endpoints (`/api/health`, `/api/health/[agent]`)
- ✅ Webhook retry logic + fallback (`src/lib/webhooks.ts`)
- ✅ Monitoring dashboard (`/admin/agents`)
- ✅ Database migrations (agent_runs, webhook_queue, webhook_logs)
- ✅ Alert rules (seeded with defaults)
- ⏳ Resend email integration (TODO: wire in `sendFallbackAlert`)
- ⏳ Admin settings page (TODO: allow threshold customization)
- ⏳ Slack integration (TODO: optional)

---

## 🔍 Debugging

### Check if agents are running
```bash
curl http://localhost:3001/api/health
```

### View recent runs
```sql
SELECT agent_name, success, duration_ms, created_at
FROM agent_runs
ORDER BY created_at DESC
LIMIT 20;
```

### Retry failed webhooks
```sql
SELECT * FROM webhook_queue WHERE status = 'pending'
ORDER BY next_retry_at ASC;
```

### View webhook errors
```sql
SELECT agent, error, url, created_at
FROM webhook_logs
WHERE ok = false
ORDER BY created_at DESC
LIMIT 20;
```

---

## 📞 Support

- **Monitoring dashboard**: `/admin/agents` (refresh every 60s)
- **Manual health check**: `/api/health`
- **Individual agent**: `/api/health/agent-1-tse` (etc.)
- **Webhook logs**: View in Supabase dashboard (`webhook_logs` table)
