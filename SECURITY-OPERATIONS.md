# Security Operations - ElectioLab

**Status:** ✅ Live in Production (2026-09-30)

---

## 🔒 What's Protected

| Component | Protection | Status |
|-----------|-----------|--------|
| **polls** table | RLS (8 policies) | ✅ Active |
| **weighted_averages** table | RLS (8 policies) | ✅ Active |
| **auth_failure_logs** table | RLS (service_role only) | ✅ Active |
| **/api/v1/polls** | 50 req/min rate limit | ✅ Active |
| **/api/v1/averages** | 50 req/min rate limit | ✅ Active |
| **/api/v1/candidates-search** | 100 req/min rate limit | ✅ Active |
| **All responses** | Security headers (CSP, X-Frame, etc) | ✅ Active |
| **/admin** | Auth + admin role required | ✅ Active |

---

## 📊 Monitoring

### Real-time Dashboard
```bash
# Local development
npx tsx scripts/monitor-security.ts --hours=1

# Production (requires admin token)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://electiolab.vercel.app/api/admin/security-alerts?hours=1 | jq .
```

### Check Rate Limiting
```bash
# Test rate limiting (should block after ~50 requests)
npx tsx scripts/test-rate-limit.ts --endpoint=polls --requests=60
```

### View Auth Failure Logs
```sql
-- In Supabase SQL Editor
SELECT * FROM auth_failure_logs 
WHERE timestamp > now() - interval '1 hour'
ORDER BY timestamp DESC;

-- Suspicious activity (5+ failures in 15min)
SELECT 
  ip_address, 
  COUNT(*) as failure_count,
  MAX(timestamp) as last_failure
FROM auth_failure_logs
WHERE timestamp > now() - interval '15 minutes'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY failure_count DESC;
```

---

## 🚨 Incidents & Response

### Rate Limit Exceeded
- **Symptom:** Clients get 429 responses
- **Check:** `Retry-After` header (seconds until next request allowed)
- **Response:** 
  - Legitimate clients: Advise retry strategy
  - Abuse: Block IP via firewall/WAF

### High Auth Failures
- **Symptom:** 5+ failures from same IP in 15 minutes
- **Check:** `/api/admin/security-alerts` dashboard
- **Response:**
  - Brute force attempt: Consider temporary IP block
  - Configuration issue: Review logs for error pattern

### RLS Policy Violation
- **Symptom:** 403 Forbidden from `/api/v1/polls` or `/api/v1/averages`
- **Check:** Verify user's `role` in JWT token
- **Response:**
  - Regenerate user session
  - Check Supabase policy configuration

---

## 📋 Weekly Checklist

- [ ] Review `auth_failure_logs` for suspicious patterns
- [ ] Check rate limit statistics in Vercel logs
- [ ] Verify RLS policies still exist (migration didn't rollback)
- [ ] Monitor rate limit performance (should not exceed 1ms per check)
- [ ] Audit `/admin` access logs

---

## 🔧 Configuration

### Rate Limit Thresholds
Edit these in the route handlers:

```typescript
// src/app/api/v1/polls/route.ts
const result = await checkDistributedRateLimit({
  endpoint: 'polls',
  maxRequests: 50,      // ← Change this
  windowSeconds: 60,    // ← Or this
});
```

### Security Headers
Edit in [next.config.ts](./next.config.ts):

```typescript
headers: [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Add more as needed
]
```

### Admin Access
Edit in [src/app/admin/layout.tsx](./src/app/admin/layout.tsx):

```typescript
const session = await supabase.auth.getSession();
// Admin check happens here
```

---

## 📞 Emergency Contacts

**If security incident occurs:**
1. Check this file for response procedures
2. Review logs in Supabase (SQL Editor)
3. Check Vercel deployment logs
4. Contact: Luiz Lessa (lc.lessa@gmail.com)

---

## 🔗 Related Documents

- [SECURITY-HARDENING-2026-09-29-FINAL.md](./SECURITY-HARDENING-2026-09-29-FINAL.md) — Implementation details
- [MIGRATION-APPLICATION-GUIDE.md](./MIGRATION-APPLICATION-GUIDE.md) — RLS setup instructions
- [supabase/migrations/20260929140000_rls_polls_weighted_averages.sql](./supabase/migrations/20260929140000_rls_polls_weighted_averages.sql) — Migration SQL

---

**Last Updated:** 2026-09-30  
**Next Review:** 2026-10-07
