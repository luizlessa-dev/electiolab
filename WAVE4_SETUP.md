# Wave 4 Phase 1 - Setup & Deployment Guide

Quick guide to activate Wave 4 Phase 1 (Alerts & Notifications).

---

## 🚀 3-Step Setup

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
```

### Step 2: Run Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL:
# Copy contents of supabase/migrations/001_create_discrepancies_table.sql
# and run in Supabase SQL Editor
```

### Step 3: Test Configuration

```bash
# Test all channels
curl http://localhost:3000/api/admin/notifications/test

# Expected response:
{
  "channels": {
    "slack": {
      "status": "configured",
      "tested": true,
      "result": "success"
    },
    "email": {
      "status": "configured",
      "provider": "resend"
    }
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
7. Copy Webhook URL → SLACK_WEBHOOK_URL

### Resend Email

1. Go to https://resend.com
2. Sign up/login
3. Get API Key from settings
4. Use `re_xxxxx` as EMAIL_API_KEY

### SendGrid Email

1. Go to https://sendgrid.com
2. Sign up/login
3. Create API Key (Settings > API Keys)
4. Use `SG.xxxxx` as EMAIL_API_KEY

### Mailgun Email

1. Go to https://mailgun.com
2. Sign up/login
3. Add domain (mail.gastronomizae.com)
4. Get API key from settings
5. Use key as EMAIL_API_KEY

---

## 📊 API Examples

### Test Notifications

```bash
curl http://localhost:3000/api/admin/notifications/test
curl http://localhost:3000/api/admin/notifications/test?channel=slack
```

### Send Anomaly Alert

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
    "emailRecipients": ["team@gastronomizae.com"]
  }'
```

### List Discrepancies

```bash
# All unresolved
curl "http://localhost:3000/api/admin/discrepancies?resolution=pending"

# By state
curl "http://localhost:3000/api/admin/discrepancies?state=SP"

# Critical only
curl "http://localhost:3000/api/admin/discrepancies?severity=critical"

# With pagination
curl "http://localhost:3000/api/admin/discrepancies?limit=50&offset=50"
```

### Resolve Discrepancies

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

## 🧪 Test Workflow

1. **Verify configuration:**
   ```bash
   curl http://localhost:3000/api/admin/notifications/test
   ```

2. **Trigger test alert:**
   ```bash
   # Check Slack channel #eleicoes-alerts
   # Check email inbox
   curl -X POST http://localhost:3000/api/alerts/anomaly \
     -H "Content-Type: application/json" \
     -d '{ "anomaly": { ... }, "channels": ["slack", "email"] }'
   ```

3. **Verify storage:**
   ```bash
   # Should see discrepancy in database
   curl "http://localhost:3000/api/admin/discrepancies"
   ```

4. **Test resolution:**
   ```bash
   # Get ID from above, then resolve
   curl -X POST http://localhost:3000/api/admin/discrepancies \
     -H "Content-Type: application/json" \
     -d '{ "ids": ["<ID>"], "resolution": "verified", "resolvedBy": "test" }'
   ```

---

## ✅ Validation Checklist

- [ ] SLACK_WEBHOOK_URL is set and valid
- [ ] EMAIL_PROVIDER is configured
- [ ] EMAIL_API_KEY is set
- [ ] DATABASE migration ran successfully
- [ ] `/api/admin/notifications/test` returns "success"
- [ ] Slack test message appears in #eleicoes-alerts
- [ ] Email test message arrived in inbox
- [ ] `/api/admin/discrepancies` returns discrepancies
- [ ] Can resolve discrepancies via POST
- [ ] Tests pass: `npm test -- wave4-phase1`

---

## 📝 Environment Template

Copy to `.env.local`:

```bash
# Wave 4 Phase 1 - Notifications & Alerts
# =============================================================================

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#eleicoes-alerts
SLACK_MENTION_ON_CRITICAL=
SLACK_MENTION_ON_HIGH=

# Email Integration
EMAIL_PROVIDER=resend
EMAIL_API_KEY=
EMAIL_FROM=noreply@gastronomizae.com
EMAIL_DAILY_DIGEST_TIME=09:00 UTC

# Optional: Mailgun
MAILGUN_DOMAIN=

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔧 Troubleshooting

### Slack messages not appearing

```bash
# 1. Verify webhook URL
curl -X POST $SLACK_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"text": "Test"}'

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

## 📚 Documentation Files

- `WAVE4_PHASE1_COMPLETE.md` - Full implementation details
- `WAVE4_ROADMAP.md` - Complete Wave 4 roadmap (B+C+D)
- `src/lib/notifications/slack-notifier.ts` - Slack implementation
- `src/lib/notifications/email-notifier.ts` - Email implementation
- `src/lib/admin/discrepancy-manager.ts` - Database operations
- `src/__tests__/wave4-phase1.test.ts` - Test suite

---

## 🚀 Next Phase (Phase 2)

After Phase 1 is validated:

1. **Admin Dashboard UI** - Frontend for discrepancy management
2. **Approval Metrics** - Track approval/disapproval ratings
3. **Regional Aggregation** - 5-region grouping and analytics

---

## 💬 Support

For questions or issues:
1. Check `WAVE4_PHASE1_COMPLETE.md`
2. Review API endpoint documentation
3. Check test cases for examples
4. Verify environment configuration

---

**Setup Time:** ~10 minutes
**Validation Time:** ~5 minutes
**Total:** ~15 minutes to fully operational

Ready to proceed? Run:
```bash
npm test -- wave4-phase1
```
