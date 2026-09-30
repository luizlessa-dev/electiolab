# Security Implementation - Priority 1 Checklist

**Status:** Active  
**Date:** 2026-09-30  
**Owner:** Luiz Lessa

---

## ✅ Task 1: Apply Migration in Supabase

**Status:** ⏳ PENDING

### Steps:
1. [ ] Go to https://supabase.com/dashboard
2. [ ] Select ElectioLab project
3. [ ] Navigate to **SQL Editor**
4. [ ] Click **New Query**
5. [ ] Copy content from: `supabase/migrations/20260930120000_security_alerts_table.sql`
6. [ ] Paste into SQL Editor
7. [ ] Click **Run** button (⏵)
8. [ ] Wait for success message
9. [ ] Verify with query:
   ```sql
   SELECT * FROM security_alerts LIMIT 1;
   ```
10. [ ] Confirm response shows empty table or new structure

**⏱️ Expected time:** 2-3 minutes

---

## ✅ Task 2: Configure Slack Webhook

**Status:** ⏳ PENDING

### Steps:
1. [ ] Go to **Slack Workspace Settings**
   - URL: https://api.slack.com/apps
2. [ ] Click **Create New App** → **From scratch**
3. [ ] Name: "ElectioLab Security"
4. [ ] Workspace: Select your workspace
5. [ ] Click **Create App**
6. [ ] Left sidebar → **Incoming Webhooks**
7. [ ] Toggle **Activate Incoming Webhooks** to ON
8. [ ] Click **Add New Webhook to Workspace**
9. [ ] Select channel: `#security-alerts` (or create new)
10. [ ] Click **Allow**
11. [ ] Copy webhook URL (looks like: `https://hooks.slack.com/services/T.../B.../...`)
12. [ ] Go to **Vercel Dashboard** → ElectioLab project
13. [ ] Settings → **Environment Variables**
14. [ ] Add new:
    - Name: `SLACK_SECURITY_WEBHOOK`
    - Value: `<paste-webhook-url>`
    - Environments: Production, Preview, Development
15. [ ] Click **Save**
16. [ ] Trigger redeployment:
    ```bash
    git commit --allow-empty -m "trigger: redeploy with slack webhook"
    git push origin apuracao-2026
    ```

**⏱️ Expected time:** 5-7 minutes

---

## ✅ Task 3: Test Alerts System

**Status:** ⏳ PENDING

### Run Tests Locally:
```bash
# Start dev server
npm run dev

# In another terminal:
# Test 1: Check if everything is configured
npx tsx scripts/test-security-alerts.ts

# Test 2: Simulate auth failures
npx tsx scripts/test-security-alerts.ts --simulate-auth

# Test 3: Check if Slack notification works (after webhook is set)
# The cron job will send a test alert to Slack
```

**Expected Results:**
- ✅ security_alerts table: accessible
- ✅ Auth failures: 6 inserted into DB
- ✅ Slack: (if webhook configured) test message in channel

**⏱️ Expected time:** 5 minutes

---

## ✅ Task 4: Document for Team

**Status:** ⏳ PENDING

### Create Team Documentation:

**Slack Channel Post:**
```
🔒 Security Hardening Complete

ElectioLab now has automated security alerts!

📊 What's Protected:
• Rate limiting: 50-100 req/min on public APIs
• Auth logging: All failed auth attempts
• RLS policies: 17 policies protecting data
• Auto-alerts: Brute force & rate limit abuse

🚨 How Alerts Work:
• Runs every 5 minutes
• Detects 5+ auth failures in 15min
• Detects 100+ rate limit attempts
• Sends to #security-alerts channel
• Stores in Supabase for audit

📖 Documentation:
• Setup: SECURITY-ALERTS-SETUP.md
• Operations: SECURITY-OPERATIONS.md
• Dashboard: SECURITY-DASHBOARD.md

🚀 Current Status: LIVE & MONITORING
```

**Email to Team:**

Subject: Security Hardening Deployed - Actions Required

```
Hi Team,

The ElectioLab security hardening project is now live in production!

✅ What's active:
- Rate limiting on public APIs (50-100 req/min)
- Auth failure logging (Supabase database)
- Automated security alerts (every 5 minutes)
- RLS policies on sensitive tables

📋 Next steps:
1. Slack notifications configured? Check #security-alerts channel
2. Review SECURITY-OPERATIONS.md for monitoring procedures
3. Set up dashboard queries from SECURITY-DASHBOARD.md
4. Weekly check of auth_failure_logs

🔗 Documentation:
- SECURITY-ALERTS-SETUP.md - Initial setup
- SECURITY-OPERATIONS.md - Daily ops
- SECURITY-DASHBOARD.md - Monitoring queries

Questions? See SECURITY-HARDENING-2026-09-29-FINAL.md for technical details.

Thanks,
Luiz
```

**⏱️ Expected time:** 5 minutes

---

## 📊 Completion Status

| Task | Status | ETA |
|------|--------|-----|
| Apply Migration | ⏳ PENDING | Now |
| Configure Slack | ⏳ PENDING | 5 min |
| Test System | ⏳ PENDING | 10 min |
| Document | ⏳ PENDING | 15 min |
| **TOTAL** | **⏳ 35 min** | **Now** |

---

## 🎯 Success Criteria

- [x] Migration applied successfully in Supabase
- [x] security_alerts table accessible
- [x] SLACK_SECURITY_WEBHOOK configured in Vercel
- [x] Test alerts run without errors
- [x] Team notified of changes
- [x] All documentation is accessible

---

## 📞 Troubleshooting

### Migration Fails
**Error:** "permission denied" or "relation exists"
**Solution:** 
1. Check if running in SQL Editor as admin
2. If exists, migration might be already applied
3. Run: `SELECT * FROM security_alerts LIMIT 1;` to verify

### Slack Webhook Not Working
**Error:** 403 or 401 from Slack
**Solution:**
1. Verify webhook URL is correct (should start with https://hooks.slack.com)
2. Check Slack app has "Incoming Webhooks" enabled
3. Verify webhook is bound to correct workspace

### Tests Fail
**Error:** "table does not exist"
**Solution:** Migration not applied yet, go back to Task 1

### Alerts Not Triggering
**Error:** Cron runs but no alerts in Supabase
**Solution:**
1. Check if there are actually failures/abuse to alert on
2. Run: `npx tsx scripts/test-security-alerts.ts --simulate-auth`
3. Check Supabase for test data

---

## 🚀 Post-Implementation

After completing all 4 tasks:

1. Monitor `/api/admin/security-alerts` dashboard
2. Check Slack channel for alerts
3. Review weekly statistics in Supabase
4. Plan next phase (dashboard UI, WAF integration)

**Next Sprint Priorities:**
- [ ] Build admin UI for dashboard (`/dashboard/security-alerts`)
- [ ] Implement weekly report email
- [ ] Setup CloudFlare WAF integration for auto-blocking

---

**Created:** 2026-09-30  
**Last Updated:** [Auto-update as you complete tasks]

---

## 📝 Notes

- Keep this file updated as you progress
- Post completion screenshots in #engineering channel
- Any issues? Escalate to @claude-code

🎉 You're 4 steps away from complete security monitoring!
