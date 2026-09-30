# Security Hardening Implementation — 2026-09-29

## Executive Summary

Completed comprehensive security hardening of ElectioLab dashboard/terminal access and public APIs across 4 major steps. All critical vulnerabilities from initial audit have been addressed.

---

## ✅ Step 1: Access Control & Authentication Protection

### Scope
- Dashboard (`/admin/*`) and terminal-like interfaces
- Admin endpoints (`/api/admin/*`)
- Health check routes (`/api/health*`)

### Implementations

#### 1.1 Admin Layout Protection
**File:** `src/app/admin/layout.tsx`
- ✅ Mandatory Supabase session verification
- ✅ Admin role check from user metadata
- ✅ Automatic redirect to login if unauthenticated
- ✅ Redirect to homepage if non-admin
- ✅ Failure logging for unauthorized access

#### 1.2 Debug Endpoints Hardening
**File:** `src/lib/debug-guard.ts`
- ✅ Completely blocked in production (returns 404, not 401)
- ✅ Requires `DEBUG_TOKEN` header in development
- ✅ Prevents information disclosure via error responses

#### 1.3 Health Check Protection
**File:** `src/app/api/health/route.ts`
- ✅ Optional `HEALTH_CHECK_KEY` header validation
- ✅ Public if not configured, locked if key is set
- ✅ Same pattern applied to `[agent]` variant

#### 1.4 Security Headers
**File:** `next.config.ts` + `middleware.ts`
- ✅ X-Frame-Options: DENY — Prevents clickjacking
- ✅ X-Content-Type-Options: nosniff — Prevents MIME sniffing
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy: Disables geolocation, microphone, camera
- ✅ Applied globally via middleware (excludes static assets)

---

## ✅ Step 2: Distributed Rate Limiting

### Architecture
- **Backend:** PostgreSQL RPC function `increment_rate_limit()` with atomic counter increments
- **Storage:** `rate_limit_counters` table with automatic garbage collection
- **Integration:** Added to all three public v1 API routes

### Implementation Details

#### 2.1 Distributed Rate Limit Middleware
**File:** `src/lib/middleware/distributed-rate-limit.ts`
```typescript
export async function checkDistributedRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfter: number }>
```

**Database:** `supabase/migrations/20260929120000_distributed_rate_limit.sql`
- Creates `rate_limit_counters` table
- Implements `increment_rate_limit(identifier, limit, window)` RPC
- Automatic cleanup of expired counters (runs on each call)

#### 2.2 Protected Routes

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `/api/v1/polls` | 50 req/min | 60s | Poll data queries (heaviest) |
| `/api/v1/averages` | 50 req/min | 60s | Weighted average queries |
| `/api/v1/candidates-search` | 100 req/min | 60s | Candidate search (lighter) |

#### 2.3 Rate Limit Response
- **Status:** 429 Too Many Requests
- **Headers:** `Retry-After: <seconds>` (tells client when to retry)
- **Body:** `{ "error": "Rate limit exceeded", "retryAfter": <seconds> }`

#### 2.4 Rate Limit Identification
```typescript
function getRateLimitIdentifier(request: Request): string {
  // Prefers X-Forwarded-For (proxy), falls back to connection IP
  // Can be customized per header name
}
```

---

## ✅ Step 3: Row Level Security (RLS) on Critical Tables

### Strategy
- **Public read** — All election data must be publicly readable (business requirement)
- **Restricted write** — Only authenticated admins and service_role can modify

### Implementation

**Migration:** `supabase/migrations/20260929140000_rls_polls_weighted_averages.sql`

#### 3.1 Polls Table
```sql
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "polls_read_public" ON polls
  FOR SELECT USING (true);

-- Admin/service_role write
CREATE POLICY "polls_write_authenticated" ON polls
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "polls_write_service_role" ON polls
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Similar policies for UPDATE and DELETE
```

#### 3.2 Weighted Averages Table
- Identical RLS strategy to `polls`
- Public read, admin-only write/update/delete

#### 3.3 Audit Table
**New table:** `auth_failure_logs`
- Tracks all authentication failures
- Columns: id, endpoint, method, ip_address, user_id, status_code, error_message, timestamp, user_agent
- RLS: service_role only (no user access)
- Indexes on timestamp and (ip_address, endpoint, timestamp)

---

## ✅ Step 4: Security Alerts & Failure Logging

### Auth Failure Logger
**File:** `src/lib/auth-failure-logger.ts`

#### 4.1 Core Function
```typescript
export async function logAuthFailure(event: AuthFailureEvent)
```
- Extracts client IP from headers (X-Forwarded-For → X-Real-IP → unknown)
- Extracts User-Agent
- Records event to `auth_failure_logs` table
- Silently fails to avoid cascading errors

#### 4.2 Suspicious Activity Detection
```typescript
export async function checkSuspiciousActivity(ip: string): Promise<boolean>
```
- Checks for 5+ failures from same IP in 15-minute window
- Can be used to trigger rate limiting, blocking, or alerts
- Currently integrated in logging pipeline (non-blocking)

#### 4.3 Integration Points

**File:** `src/app/admin/layout.tsx`
- Logs unauthenticated access attempts (401)
- Logs unauthorized non-admin attempts (403)
- Records user_id for authenticated but unauthorized users

**File:** `src/lib/api-auth.ts` (ready for integration)
- Can be extended to log invalid API key attempts
- Can be extended to log rate limit violations

#### 4.4 Audit Log Schema
```
auth_failure_logs:
  - id (UUID)
  - endpoint (text) — e.g., "/admin"
  - method (text) — "GET", "POST"
  - ip_address (inet) — parsed from headers
  - user_id (uuid, nullable)
  - status_code (int) — 401, 403, etc.
  - error_message (text) — human-readable reason
  - timestamp (timestamptz) — auto-populated
  - user_agent (text, nullable)
```

---

## 📋 Required Actions Before Deployment

### 1. Apply RLS Migration
**Status:** Migration file created, NOT YET APPLIED
```bash
# In Supabase SQL Editor, run:
supabase/migrations/20260929140000_rls_polls_weighted_averages.sql
```

**Why separate?**
- CLAUDE.md policy: Migrations are manually applied via SQL Editor before PR merge
- Prevents automated application in CI/CD
- Allows Luiz to review and approve DDL changes

### 2. Verify Rate Limiting
After deployment:
```bash
# Test rate limit response
curl -i http://localhost:3000/api/v1/polls?election_id=<id>
# After 50 requests in 60 seconds:
# HTTP 429, Retry-After: <seconds>
```

### 3. Monitor Auth Failures
After migration is applied, queries are available:
```sql
-- Recent unauthorized access attempts
SELECT endpoint, ip_address, status_code, error_message, timestamp
FROM auth_failure_logs
WHERE timestamp > now() - interval '1 hour'
ORDER BY timestamp DESC;

-- Suspicious IPs (5+ failures in 15 min)
SELECT ip_address, COUNT(*) as failure_count, MAX(timestamp)
FROM auth_failure_logs
WHERE timestamp > now() - interval '15 minutes'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY failure_count DESC;
```

---

## 🔍 What Was NOT Changed

### Kept Intentionally
- **Unauthenticated API access** — `GET /api/v1/polls` remains public (by design)
- **CORS** — Not implemented (single-origin SPA)
- **Database connection pooling** — Supabase handles via Realtime
- **WAF rules** — Handled by Vercel/Cloudflare

### Not Added Yet (Future)
- `/api/admin/security-alerts` endpoint (ready, but needs migration first)
- SMS alerts for suspicious activity (infrastructure dependency)
- IP allowlist for `/admin` (can be added to middleware)
- Custom rate limit tiers per plan (foundational work complete)

---

## 📊 Commits & Files Changed

| Step | Commits | Key Files |
|------|---------|-----------|
| 1 | `e24660e`, `fa4d05b` | `src/app/admin/layout.tsx`, `next.config.ts`, `middleware.ts` |
| 2 | `ad1225d` | `src/app/api/v1/{polls,averages,candidates-search}/route.ts` |
| 3 | `bc6c777` | `supabase/migrations/20260929140000_rls_*.sql` |
| 4 | `bc6c777` | `src/lib/auth-failure-logger.ts`, `src/app/admin/layout.tsx` |

**Branch:** `apuracao-2026`
**Ready for PR:** Yes, after migration is manually applied

---

## 🚀 Deployment Checklist

- [ ] Review and approve RLS migration DDL
- [ ] Apply migration via Supabase SQL Editor
- [ ] Verify TypeScript schema updates (may need `npx supabase gen types`)
- [ ] Deploy to Vercel (will auto-deploy when PR merges)
- [ ] Test rate limiting with curl/Postman
- [ ] Verify admin login still works
- [ ] Monitor auth_failure_logs for baseline activity
- [ ] Set up alerts in observability platform (Sentry/DataDog)

---

## 📝 Notes

- Rate limiting uses Supabase as backend (no Redis dependency)
- All logging gracefully fails (non-blocking)
- RLS policies don't affect admin dashboard queries (they use service_role)
- Migration can be rolled back if needed (no data loss, just removes policies)
- @ts-ignore used for new `auth_failure_logs` table (TypeScript schema generation lags)

---

**Implemented by:** Claude Haiku 4.5
**Date:** 2026-09-29
**Status:** ✅ Complete, ready for review and migration application
