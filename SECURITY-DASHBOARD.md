# Security Alerts Dashboard

**Status:** Ready to setup in Supabase  
**Created:** 2026-09-30

---

## 📊 Dashboard Setup Guide

### **Create Dashboard Views in Supabase**

Copy and paste each query into **Supabase SQL Editor** to create saved queries:

---

### **Query 1: Latest Alerts (Real-time)**

```sql
SELECT 
  id,
  type,
  severity,
  message,
  created_at,
  resolved,
  metadata
FROM security_alerts
ORDER BY created_at DESC
LIMIT 20;
```

**Use for:** 
- Real-time monitoring
- Latest security events
- Quick incident review

---

### **Query 2: Alert Statistics (Hourly)**

```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  type,
  severity,
  COUNT(*) as count
FROM security_alerts
WHERE created_at > now() - interval '24 hours'
GROUP BY hour, type, severity
ORDER BY hour DESC;
```

**Use for:**
- Trend analysis
- Peak attack times
- Pattern detection

---

### **Query 3: Suspicious IPs**

```sql
SELECT 
  metadata->>'ip' as ip_address,
  COUNT(*) as alert_count,
  MAX(created_at) as last_alert,
  MIN(created_at) as first_alert,
  ROUND(
    (MAX(created_at) - MIN(created_at)) / 
    NULLIF(COUNT(*) - 1, 0) 
    / interval '1 minute'
  )::numeric as avg_minutes_between_alerts
FROM security_alerts
WHERE metadata ? 'ip'
  AND created_at > now() - interval '7 days'
GROUP BY metadata->>'ip'
HAVING COUNT(*) >= 3
ORDER BY alert_count DESC;
```

**Use for:**
- Identify repeat offenders
- Pattern of attacks
- IP blocking decisions

---

### **Query 4: Alert Summary by Type**

```sql
SELECT 
  type,
  severity,
  COUNT(*) as total,
  COUNT(CASE WHEN resolved = false THEN 1 END) as unresolved,
  COUNT(CASE WHEN resolved = true THEN 1 END) as resolved,
  ROUND(
    100.0 * COUNT(CASE WHEN resolved = true THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as resolution_rate
FROM security_alerts
WHERE created_at > now() - interval '30 days'
GROUP BY type, severity
ORDER BY total DESC;
```

**Use for:**
- Weekly/monthly reports
- Resolution rates
- Type priorities

---

### **Query 5: Recent Auth Brute Force**

```sql
SELECT 
  id,
  message,
  metadata->>'ip' as attacker_ip,
  metadata->>'count' as failure_count,
  created_at,
  severity,
  resolved
FROM security_alerts
WHERE type = 'auth_failures'
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

**Use for:**
- Auth attack tracking
- IP blocklist generation
- Incident response

---

### **Query 6: Rate Limit Abuse Tracking**

```sql
SELECT 
  id,
  message,
  created_at,
  severity,
  metadata,
  resolved,
  CASE 
    WHEN resolved = false THEN 'ACTIVE'
    ELSE 'RESOLVED'
  END as status
FROM security_alerts
WHERE type = 'rate_limit_abuse'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

**Use for:**
- API abuse monitoring
- Rate limit tuning
- Blocking decisions

---

## 🎯 Creating Saved Queries

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Paste one of the queries above
4. Click **Save**
5. Name it (e.g., "Latest Security Alerts")
6. Use the saved query for quick access

---

## 📱 Dashboard Widgets

### **Real-time Metric Cards**

Add to your monitoring:

```sql
-- Critical Alerts Count (last 24h)
SELECT COUNT(*) as critical_alerts
FROM security_alerts
WHERE severity = 'critical'
  AND created_at > now() - interval '24 hours';

-- Unresolved Alerts
SELECT COUNT(*) as unresolved
FROM security_alerts
WHERE resolved = false;

-- Most Active IP (24h)
SELECT 
  metadata->>'ip' as ip,
  COUNT(*) as attempts
FROM security_alerts
WHERE created_at > now() - interval '24 hours'
  AND metadata ? 'ip'
GROUP BY metadata->>'ip'
ORDER BY attempts DESC
LIMIT 1;

-- Alert Types Distribution
SELECT 
  type,
  COUNT(*) as count
FROM security_alerts
WHERE created_at > now() - interval '24 hours'
GROUP BY type;
```

---

## 🔧 Update Alert Status

Mark alerts as resolved:

```sql
-- Mark specific alert as resolved
UPDATE security_alerts
SET resolved = true, resolved_at = now()
WHERE id = 123;

-- Mark all alerts from IP as resolved
UPDATE security_alerts
SET resolved = true, resolved_at = now()
WHERE metadata->>'ip' = '192.168.1.100'
  AND resolved = false;
```

---

## 📈 Weekly Report Query

```sql
SELECT 
  DATE(created_at) as date,
  type,
  severity,
  COUNT(*) as alert_count,
  COUNT(DISTINCT (metadata->>'ip')) as unique_ips,
  ROUND(
    100.0 * COUNT(CASE WHEN resolved = true THEN 1 END) / 
    NULLIF(COUNT(*), 0),
    2
  ) as resolution_rate
FROM security_alerts
WHERE created_at > now() - interval '7 days'
GROUP BY DATE(created_at), type, severity
ORDER BY date DESC, alert_count DESC;
```

---

## 🚨 Alert on Critical Events

### **Setup Email Notifications (in Supabase Dashboard)**

1. Go to **Database** → **security_alerts** table
2. Click **Triggers** → **New Trigger**
3. Configure:
   - **Event:** INSERT
   - **When:** severity = 'critical' AND resolved = false
   - **Action:** Send email to admin

Or use webhooks to trigger custom logic.

---

## 📊 Integration with Admin Panel

Create a new admin page to display these queries:

**Location:** `/dashboard/security-alerts`

```typescript
// src/app/dashboard/security-alerts/page.tsx

export default async function SecurityAlertsPage() {
  // Fetch latest alerts
  const alerts = await supabase
    .from('security_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch stats
  const stats = await supabase.rpc('get_alert_stats');

  return (
    <main>
      <h1>Security Alerts Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4">
        <StatCard title="Critical" count={stats.critical} />
        <StatCard title="Warnings" count={stats.warnings} />
        <StatCard title="Unresolved" count={stats.unresolved} />
        <StatCard title="Today" count={stats.today} />
      </div>

      {/* Latest Alerts Table */}
      <AlertsTable data={alerts.data} />
      
      {/* Charts */}
      <AlertTrends data={stats.hourly} />
    </main>
  );
}
```

---

## ✅ Monitoring Checklist

- [ ] Run Query 1: Latest Alerts (daily)
- [ ] Run Query 2: Statistics (weekly)
- [ ] Run Query 3: Suspicious IPs (when investigating)
- [ ] Run Query 5: Auth brute force tracking (daily)
- [ ] Update resolved alerts (on incident close)
- [ ] Generate weekly report (Monday morning)
- [ ] Archive old alerts (monthly, > 90 days)

---

## 🔐 Access Control

Dashboard is **admin-only**:
- View: authenticated + admin role
- Update/Resolve: authenticated + admin role
- All data: encrypted metadata (IPs, counts)

---

**Next:** Set up Slack notifications for **Critical** severity alerts 🚀
