# Wave 4 Phase 1 - Notifications & Discrepancy Management

**Status:** ✅ Complete
**Date:** 2026-08-08
**Files:** 8 created + 1 SQL migration
**Lines of Code:** ~1,400

---

## 📋 Summary

Wave 4 Phase 1 implements three core notification & management systems:

1. **Slack Integration** - Real-time alerts for critical anomalies
2. **Email Notifications** - Digests, alerts, summaries
3. **Admin Dashboard Backend** - Discrepancy management system

---

## 📁 Files Created

### Notification Services

#### `src/lib/notifications/slack-notifier.ts` (280 lines)
- Sends formatted Slack messages
- Anomaly alerts with severity icons
- Sync job completion notifications
- TSE discrepancy alerts
- Admin action tracking
- Test connection endpoint

**Key methods:**
```typescript
sendAnomalyAlert(anomaly, options)           // Critical alerts
sendSyncJobResult(result, status)            // Job completion
sendDiscrepancyAlert(state, count, critical) // TSE issues
sendAdminAction(action, state, candidate)    // Admin tracking
testConnection()                             // Verify webhook
getStatus()                                  // Config status
```

**Features:**
- Severity-based formatting (icons, colors)
- Interactive buttons (View Dashboard, Review)
- Configurable mentions (@user, @channel)
- Context footer with timestamps
- Graceful fallback (disabled if no webhook)

---

#### `src/lib/notifications/email-notifier.ts` (420 lines)
- Email alerts via SendGrid, Resend, or Mailgun
- Daily digest with statistics
- Anomaly alerts (immediate)
- Sync failure notifications
- Weekly summary reports

**Key methods:**
```typescript
sendAnomalyEmail(anomaly, recipients)           // Critical alerts
sendDailyDigest(data, recipients)               // 9 AM UTC
sendSyncFailureEmail(error, failedStates, to)   // Job failures
sendWeeklySummary(data, recipients)             // Mondays
```

**Email Types:**
1. Anomaly Alert - Single critical finding
2. Daily Digest - Stats + top 5 anomalies (9 AM UTC)
3. Sync Failure - Error details + failed states (immediate)
4. Weekly Summary - Trends + top changes (Mondays)

---

### Discrepancy Management

#### `src/lib/admin/discrepancy-manager.ts` (330 lines)
- CRUD operations for discrepancies
- Filtering & search
- Batch operations
- Statistics & auditing

**Key methods:**
```typescript
createDiscrepancy(state, position, discrepancy)     // Store issue
getDiscrepancies(filter)                            // Query with filters
getDiscrepancy(id)                                  // Single record
resolveDiscrepancy(id, resolution, user, notes)    // Mark as resolved
resolveBatch(ids, resolution, user)                // Batch action
getStats()                                         // Summary statistics
getUnresolvedCount()                               // Quick count
getCriticalUnresolved()                            // Alert candidates
deleteOlderThan(days)                              // Archive old
```

This is also the entry point called by `src/lib/tse/tse-sync-service.ts` on every TSE sync — see `docs/tse-integration-guide.md` for how discrepancies found during sync end up here.

**Discrepancy Record:**
```typescript
{
  id: string              // UUID
  state: string           // "SP"
  position: string        // "governador"
  candidateName: string   // Full name
  type: string            // missing_research, missing_tse, etc
  severity: string        // critical, warning, info
  details: string         // Description
  tseData?: any          // TSE metadata
  researchData?: any     // Research metadata
  resolution: string     // pending, verified, dismissed, escalated
  resolvedBy?: string    // Username
  resolvedAt?: Date      // Timestamp
  notes?: string         // Resolution notes
  createdAt: Date        // When found
  updatedAt: Date        // Last modified
}
```

---

### Database

#### `supabase/migrations/20260810002618_create_discrepancies_table.sql`
- Production-ready schema
- Optimized indexes (by state, position, severity, date)
- Row-level security policies
- Audit triggers (updated_at)
- Unique constraints

**Indexes:**
- state (fast filtering)
- position (fast filtering)
- severity (alert prioritization)
- type (classification)
- resolution (status queries)
- created_at DESC (recent first)
- candidate_name (search)
- state + position (common combo)

**Security:**
- RLS enabled
- Authenticated read access
- Admin-only updates/deletes
- Service role for backend inserts

---

### API Endpoints

#### `src/app/api/alerts/anomaly/route.ts` (80 lines)
**POST** - Send anomaly alert

```bash
curl -X POST http://localhost:3000/api/alerts/anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "anomaly": {
      "state": "SP",
      "position": "governador",
      "candidateName": "João Silva",
      "researchPercentage": 30,
      "aggregatedPercentage": 38,
      "deviation": 8,
      "confidence": 0.85,
      "severity": "critical",
      "timestamp": "2026-08-08T12:00:00Z"
    },
    "channels": ["slack", "email"],
    "emailRecipients": ["team@example.com"]
  }'
```

**Features:**
- Multi-channel support
- Configurable recipients
- Error handling per channel
- Response includes status for each channel

---

#### `src/app/api/admin/discrepancies/route.ts` (120 lines)
**GET** - List discrepancies with filters

```bash
# All unresolved
curl "http://localhost:3000/api/admin/discrepancies?resolution=pending"

# By state
curl "http://localhost:3000/api/admin/discrepancies?state=SP"

# Critical only
curl "http://localhost:3000/api/admin/discrepancies?severity=critical"

# Search for specific candidate
curl "http://localhost:3000/api/admin/discrepancies?search=João%20Silva"

# With pagination
curl "http://localhost:3000/api/admin/discrepancies?limit=50&offset=50"
```

**Query parameters:**
- state: UF code (e.g., SP)
- position: governador|senador
- severity: critical|high|warning|info
- type: missing_research|missing_tse|name_mismatch|status_change
- resolution: pending|verified|dismissed|escalated
- search: text search
- limit: items per page (default: 50)
- offset: pagination offset

**GET Response:**
```json
{
  "discrepancies": [
    {
      "id": "uuid",
      "state": "SP",
      "candidateName": "João Silva",
      "severity": "critical",
      "resolution": "pending"
    }
  ],
  "pagination": { "limit": 50, "offset": 0, "total": 42 },
  "stats": {
    "total": 150,
    "byState": { "SP": 25, "RJ": 20 },
    "bySeverity": { "critical": 5, "high": 12 },
    "unresolvedCount": 68
  }
}
```

**POST** - Resolve discrepancies

```bash
curl -X POST http://localhost:3000/api/admin/discrepancies \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["uuid1", "uuid2", "uuid3"],
    "resolution": "verified",
    "resolvedBy": "luiz@gastronomizae.com",
    "notes": "Verified against TSE registry"
  }'
```

---

#### `src/app/api/admin/notifications/test/route.ts` (65 lines)
**GET** - Test notification integrations

```bash
# Test all channels
curl "http://localhost:3000/api/admin/notifications/test"

# Test specific channel
curl "http://localhost:3000/api/admin/notifications/test?channel=slack"
```

**Response:**
```json
{
  "testedAt": "2026-08-08T...",
  "channels": {
    "slack": {
      "status": "configured",
      "configured": true,
      "channel": "#eleicoes-alerts",
      "tested": true,
      "result": "success"
    },
    "email": {
      "status": "configured",
      "configured": true,
      "provider": "resend",
      "fromEmail": "noreply@gastronomizae.com"
    }
  },
  "nextSteps": "All channels ready"
}
```

---

### Tests

#### `src/__tests__/wave4-phase1.test.ts` (410 lines, 20 tests)

- Discrepancy Manager (8): create, list with filters, resolve single, batch resolve, stats, unresolved count, critical unresolved, error handling
- Slack Notifier (3): status, test connection, format anomaly message
- Email Notifier (3): status, validate email format, disabled fallback
- Integration (1): create → list → resolve
- Error Handling (3): invalid filters, missing records, empty batches
- Performance (2): query within timeout, stats within timeout

```bash
npm test -- src/__tests__/wave4-phase1.test.ts
npm test -- --watch src/__tests__/wave4-phase1.test.ts
npm test -- --coverage src/__tests__/wave4-phase1.test.ts
```

---

## 🚀 Setup & Activation (3 Steps)

### Step 1: Configure Environment Variables

Add to `.env.local` or Vercel Settings:

```bash
# ============================================================================
# SLACK CONFIGURATION
# ============================================================================
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
SLACK_CHANNEL=#eleicoes-alerts
SLACK_MENTION_ON_CRITICAL=@team-analytics
SLACK_MENTION_ON_HIGH=@team-analytics

# ============================================================================
# EMAIL CONFIGURATION (choose one provider)
# ============================================================================

# Option A: Resend (recommended for startups)
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@gastronomizae.com

# Option B: SendGrid
# EMAIL_PROVIDER=sendgrid
# EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option C: Mailgun
# EMAIL_PROVIDER=mailgun
# EMAIL_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# MAILGUN_DOMAIN=mail.gastronomizae.com

# Email scheduling
EMAIL_DAILY_DIGEST_TIME=09:00 UTC  # Default: 9 AM UTC

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Run Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL:
# Copy contents of supabase/migrations/20260810002618_create_discrepancies_table.sql
# and run in Supabase SQL Editor
```

### Step 3: Test Configuration

```bash
curl http://localhost:3000/api/admin/notifications/test

# Expected response:
{
  "channels": {
    "slack": { "status": "configured", "tested": true, "result": "success" },
    "email": { "status": "configured", "provider": "resend" }
  },
  "nextSteps": "All channels ready"
}
```

---

## 🔗 Getting Credentials

### Slack Webhook

1. Go to https://api.slack.com/apps
2. Create New App → From scratch
3. Name: "ElectioLab", Workspace: select yours
4. Enable "Incoming Webhooks"
5. Add New Webhook to Workspace
6. Choose channel (#eleicoes-alerts)
7. Copy Webhook URL → `SLACK_WEBHOOK_URL`

### Resend Email

1. Go to https://resend.com, sign up/login
2. Get API Key from settings
3. Use `re_xxxxx` as `EMAIL_API_KEY`

### SendGrid Email

1. Go to https://sendgrid.com, sign up/login
2. Create API Key (Settings > API Keys)
3. Use `SG.xxxxx` as `EMAIL_API_KEY`

### Mailgun Email

1. Go to https://mailgun.com, sign up/login
2. Add domain (mail.gastronomizae.com)
3. Get API key from settings, use as `EMAIL_API_KEY`

---

## 🧪 Test Workflow (end to end)

1. **Verify configuration:**
   ```bash
   curl http://localhost:3000/api/admin/notifications/test
   ```
2. **Trigger test alert** (check Slack channel + email inbox):
   ```bash
   curl -X POST http://localhost:3000/api/alerts/anomaly \
     -H "Content-Type: application/json" \
     -d '{ "anomaly": { "..." : "..." }, "channels": ["slack", "email"] }'
   ```
3. **Verify storage:**
   ```bash
   curl "http://localhost:3000/api/admin/discrepancies"
   ```
4. **Test resolution** (use an ID from step 3):
   ```bash
   curl -X POST http://localhost:3000/api/admin/discrepancies \
     -H "Content-Type: application/json" \
     -d '{ "ids": ["<ID>"], "resolution": "verified", "resolvedBy": "test" }'
   ```

---

## ✅ Validation Checklist

- [ ] `SLACK_WEBHOOK_URL` is set and valid
- [ ] `EMAIL_PROVIDER` is configured
- [ ] `EMAIL_API_KEY` is set
- [ ] Database migration ran successfully (`20260810002618_create_discrepancies_table.sql`)
- [ ] `/api/admin/notifications/test` returns "success"
- [ ] Slack test message appears in #eleicoes-alerts
- [ ] Email test message arrived in inbox
- [ ] `/api/admin/discrepancies` returns discrepancies
- [ ] Can resolve discrepancies via POST
- [ ] Tests pass: `npm test -- wave4-phase1`

---

## 🔧 Troubleshooting

### Slack messages not appearing
```bash
# 1. Verify webhook URL
curl -X POST $SLACK_WEBHOOK_URL -H "Content-Type: application/json" -d '{"text": "Test"}'
# 2. Check channel name (should be #channel-name)
# 3. Verify bot has permission to post in channel
# 4. Check logs for error messages
```

### Email not sending
```bash
# 1. Verify provider configuration
curl http://localhost:3000/api/admin/notifications/test
# 2. Check API key is correct
# 3. Verify EMAIL_FROM matches allowed sender
# 4. Check email recipient is valid
```

### Database errors
```bash
# 1. Verify migration ran
supabase migration list
# 2. Check table exists
supabase db query "SELECT * FROM discrepancies LIMIT 1;"
# 3. Verify RLS policies
# 4. Check connection string
```

---

## 📊 API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/alerts/anomaly` | POST | Send anomaly alert |
| `/api/admin/discrepancies` | GET | List discrepancies |
| `/api/admin/discrepancies` | POST | Resolve batch |
| `/api/admin/notifications/test` | GET | Test integrations |

---

## 🚀 Integration Points

### From TSE Sync Service
When sync completes and finds discrepancies:
```typescript
// 1. Store in database
for (const disc of result.discrepancies) {
  await discrepancyManager.createDiscrepancy(state, position, disc);
}

// 2. Alert if critical
if (critical.length > 0) {
  await slackNotifier.sendDiscrepancyAlert(state, discrepancies.length, critical.length);
}
```

### From Aggregation Pipeline
When anomaly detected:
```typescript
await fetch('/api/alerts/anomaly', {
  method: 'POST',
  body: JSON.stringify({
    anomaly,
    channels: ['slack', 'email'],
    emailRecipients: ['team@gastronomizae.com']
  })
});
```

### From Admin Panel (Phase 2)
When user resolves discrepancy:
```typescript
await fetch('/api/admin/discrepancies', {
  method: 'POST',
  body: JSON.stringify({
    ids: selectedIds,
    resolution: 'verified',
    resolvedBy: currentUser.email,
    notes: 'Verified manually'
  })
});

await slackNotifier.sendAdminAction('resolve', state, candidate, user);
```

---

## 📈 Next Steps (Phase 2)

Wave 4 Phase 2 adds:

1. **Admin Dashboard UI** (`/admin/discrepancies`) - list view, detail modal, bulk action controls, resolution tracking
2. **Approval Metrics** - approval/disapproval ratings, presidential support, trend calculations
3. **Regional Aggregation** - 5-region grouping, regional endpoints, regional dashboard

See `docs/wave4-phase2-enrichment.md`.

---

**Status:** Complete, ready for Phase 2
**Delivery Date:** 2026-08-08
**Quality:** 20/20 tests passing
