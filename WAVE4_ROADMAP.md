# Wave 4 Roadmap - Integrações Avançadas + Otimizações + Validação

**Escopo:** B (Wave 4 Completo) + C (Otimizações) + D (Validação Rigorosa)
**Duração estimada:** 8-10 dias
**Status:** Planejamento

---

## 📋 Estrutura Global

```
Wave 4
├── Phase 1: Alertas & Notificações (2-3 dias)
│   ├── Slack integration
│   ├── Email notifications
│   ├── Admin dashboard
│   └── Validação E2E
│
├── Phase 2: Enriquecimento de Dados (2-3 dias)
│   ├── Posição presidencial
│   ├── Aprovação/Desaprovação
│   ├── Agregação regional
│   └── Validação de novos endpoints
│
├── Phase 3: Analytics & Histórico (2-3 dias)
│   ├── Tracking histórico
│   ├── Gráficos de tendência
│   ├── Comparação entre períodos
│   └── Validação de dados históricos
│
└── Otimizações Contínuas (Durante todas as fases)
    ├── Cache strategy refinement
    ├── Query optimization
    ├── Performance profiling
    └── Memory management
```

---

## 🔔 Wave 4 Phase 1: Alertas & Notificações

### 1.1 Slack Integration

**Files to create:**
- `src/lib/notifications/slack-notifier.ts`
- `src/lib/notifications/slack-templates.ts`
- `src/app/api/alerts/slack/route.ts`

**Features:**
```typescript
// Critical anomaly detected → Slack message
interface SlackAlert {
  channel: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  state: string
  candidate: string
  deviation: number
  confidence: number
  action: 'review' | 'dismiss' | 'escalate'
}

// Message template:
🚨 CRITICAL ANOMALY - SP Governor
Candidate: João Silva (PT)
Baseline: 30% → Current: 38% (+8%)
Confidence: 95%
Action Required: Review poll sources
[View Dashboard] [Dismiss] [Escalate]
```

**Configuration:**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#eleicoes-alerts
SLACK_MENTION_ON_CRITICAL=@team-analytics
```

**Integration points:**
- Anomaly detection endpoint
- Manual sync completion
- TSE discrepancy alerts
- Sync job failures

---

### 1.2 Email Notifications

**Files to create:**
- `src/lib/notifications/email-notifier.ts`
- `src/lib/notifications/email-templates.ts`
- `src/app/api/alerts/email/route.ts`

**Features:**
```typescript
interface EmailAlert {
  recipient: string
  type: 'daily-summary' | 'anomaly' | 'discrepancy' | 'error'
  subject: string
  html: string
  attachments?: File[]
}

// Daily summary email (9 AM UTC)
Subject: ElectioLab Daily Report - 27 States Analyzed

- 🟢 Status: 26/27 states healthy
- 🟡 Warnings: 2 candidates with >5% deviation
- 🔴 Critical: 1 missing TSE registration
- 📊 Attached: detailed_report.csv

View Dashboard: https://...
```

**Configuration:**
```bash
EMAIL_PROVIDER=sendgrid|resend|mailgun
EMAIL_API_KEY=...
EMAIL_FROM=noreply@gastronomizae.com
EMAIL_DAILY_DIGEST_TIME=09:00 UTC
```

**Triggers:**
- Daily digest (9 AM UTC)
- Critical anomalies (immediate)
- Sync failures (immediate)
- Weekly summary (Monday 9 AM)

---

### 1.3 Admin Dashboard for Discrepancies

**Files to create:**
- `src/app/(admin)/discrepancies/page.tsx`
- `src/app/(admin)/discrepancies/[id]/page.tsx`
- `src/lib/admin/discrepancy-manager.ts`
- `src/app/api/admin/discrepancies/route.ts`

**Features:**
```tsx
// Admin Dashboard - /admin/discrepancies
├── Filters
│   ├── State (dropdown)
│   ├── Position (gov/senator)
│   ├── Severity (critical/high/medium/low)
│   ├── Type (missing_research/missing_tse/etc)
│   └── Date range
│
├── Table View
│   ├── State | Candidate | Type | Severity | Timestamp | Action
│   ├── Row colors by severity
│   └── Sort/filter
│
├── Detail View (modal)
│   ├── Full discrepancy info
│   ├── TSE data vs Research data
│   ├── Resolution options
│   │   ├── Add to research
│   │   ├── Mark as verified
│   │   ├── Escalate to team
│   │   └── Dismiss
│   └── Audit trail
│
└── Bulk Actions
    ├── Batch verify
    ├── Batch dismiss
    └── Export CSV
```

**Data model:**
```typescript
interface DiscrepancyRecord {
  id: string
  state: string
  position: string
  candidateName: string
  type: DiscrepancyType
  severity: Severity
  tseData?: TSECandidato
  researchData?: any
  details: string
  resolvedAt?: Date
  resolvedBy?: string
  resolution: 'verified' | 'dismissed' | 'escalated' | 'pending'
  createdAt: Date
}
```

**Persistence:**
- Store in `discrepancies` table (Supabase)
- Maintain audit trail
- Track resolutions

---

### 1.4 Validação Phase 1

**Test scenarios:**
- [ ] Slack message sent on critical anomaly
- [ ] Email digest arrives daily
- [ ] Admin dashboard loads all discrepancies
- [ ] Filtering works correctly
- [ ] Bulk actions execute
- [ ] Audit trail tracks changes
- [ ] Rate limiting works (Slack API)
- [ ] Failed notifications retry

**QA Checklist:**
- [ ] All endpoints return 200
- [ ] Messages are formatted correctly
- [ ] Admin can resolve discrepancies
- [ ] Resolved items don't reappear
- [ ] Email templates render properly
- [ ] Slack messages have correct formatting

---

## 📈 Wave 4 Phase 2: Enriquecimento de Dados

### 2.1 Suporte a Posição Presidencial

**Changes:**
- Update `real-candidates-2026.ts` to include presidential candidates
- Modify aggregation to handle 3 positions instead of 2
- Update dashboard to show presidential position
- Extend TSE sync to handle presidential races

**Files to update:**
- `src/lib/candidates/real-candidates-2026.ts` (add presidential)
- `src/lib/aggregation/state-aggregation.ts` (support 3 positions)
- `src/app/(marketing)/pesquisas/[uf]/page.tsx` (add button)
- `src/lib/tse/tse-sync-service.ts` (add position)

**Presidential candidates (2026):**
- Likely candidates from major parties
- Scenario-based (different coalitions)
- National-level aggregation

**Implementation:**
```typescript
type Position = 'presidencial' | 'governador' | 'senador'

// National aggregation (no state filtering)
GET /api/polls/aggregated?position=presidencial&days=30

// Response: All candidates nationally aggregated
{
  position: 'presidencial',
  national: true,
  candidates: [
    { name: 'Candidate A', percentage: 35, confidence: 0.87 },
    ...
  ]
}
```

---

### 2.2 Aprovação & Desaprovação

**Concept:**
- Track presidential approval ratings
- Separate metrics for governors
- Approval vs disapproval breakdown

**Files to create:**
- `src/lib/approval/approval-aggregation.ts`
- `src/app/api/approval/aggregated/route.ts`
- `src/app/(marketing)/pesquisas/[uf]/approval-tab.tsx`

**Data model:**
```typescript
interface ApprovalMetrics {
  state: string
  position: 'presidencial' | 'governador'
  period: number
  approval: number         // 0-100%
  disapproval: number      // 0-100%
  neutral: number          // Don't know
  confidence: number
  samplesUsed: number
  trend: 'up' | 'down' | 'stable'
  trend_magnitude: number  // % change from previous period
}
```

**Implementation:**
```bash
# Get approval ratings
GET /api/approval/aggregated?uf=SP&position=governador

# Response:
{
  approval: 48,
  disapproval: 42,
  neutral: 10,
  confidence: 0.82,
  trend: 'up',
  trend_magnitude: 3
}
```

---

### 2.3 Agregação Regional

**Regions:**
- Sul (RS, SC, PR)
- Sudeste (SP, RJ, MG, ES)
- Centro-Oeste (GO, MT, MS, DF)
- Nordeste (BA, PE, CE, RN, PB, PI, AL, SE, MA)
- Norte (AM, RO, AC, AP, RR, TO, PA)

**Files to create:**
- `src/lib/aggregation/regional-aggregation.ts`
- `src/app/api/regions/aggregated/route.ts`
- `src/app/(marketing)/regioes/page.tsx`
- `src/app/(marketing)/regioes/[region]/page.tsx`

**Regional aggregation:**
```typescript
interface RegionalResult {
  region: string
  states: string[]
  position: string
  aggregation: {
    candidates: Array<{
      name: string
      regionalPercentage: number  // Weighted by state polls
      confidence: number
      statesTouch: string[]       // Which states have data
    }>
  }
}

// Endpoint
GET /api/regions/aggregated?region=sul&position=governador

// Response
{
  region: 'Sul',
  states: ['RS', 'SC', 'PR'],
  candidates: [
    { name: 'Candidate A', percentage: 32.5, confidence: 0.84 }
  ]
}
```

**Weighting strategy:**
- Weight by state population or poll count
- Handle missing states gracefully
- Calculate regional confidence

---

### 2.4 Validação Phase 2

**Test scenarios:**
- [ ] Presidential candidates sync from TSE
- [ ] Presidential aggregation endpoint works
- [ ] Approval ratings calculate correctly
- [ ] Regional aggregation combines states properly
- [ ] Dashboard displays all new positions
- [ ] Anomaly detection works for all positions

**QA Checklist:**
- [ ] All 3 positions sync successfully
- [ ] Approval percentages sum to ~100%
- [ ] Regional weighting is correct
- [ ] New endpoints return valid JSON
- [ ] Dashboard filters work for new positions
- [ ] TSE validation includes presidencial

---

## 📊 Wave 4 Phase 3: Analytics & Histórico

### 3.1 Tracking Histórico

**Files to create:**
- `src/lib/history/poll-history.ts`
- `src/app/api/history/aggregated/route.ts`
- `src/app/(marketing)/historico/page.tsx`

**Data model:**
```typescript
interface AggregationSnapshot {
  id: string
  state: string
  position: string
  date: Date
  candidates: Array<{
    name: string
    percentage: number
    confidence: number
  }>
  qualityMetrics: QualityMetrics
  sampleSize: number
  source: 'live' | 'cron' | 'manual'
}

// Store daily snapshots (automatic via cron)
// Allow query for historical comparisons
```

**Database:**
```sql
CREATE TABLE aggregation_history (
  id UUID PRIMARY KEY,
  state VARCHAR(2),
  position VARCHAR(20),
  candidate_name VARCHAR(255),
  percentage DECIMAL(5,2),
  confidence DECIMAL(3,2),
  snapshot_date DATE,
  quality_metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX (state, position, snapshot_date)
);
```

**API:**
```bash
# Get historical data for a candidate
GET /api/history/aggregated?state=SP&candidate=João%20Silva&days=90

# Response
{
  candidate: 'João Silva',
  state: 'SP',
  history: [
    { date: '2026-08-01', percentage: 30, confidence: 0.82 },
    { date: '2026-08-02', percentage: 31, confidence: 0.84 },
    ...
  ]
}
```

---

### 3.2 Gráficos de Tendência

**Files to create:**
- `src/app/(marketing)/pesquisas/[uf]/trend-chart.tsx`
- `src/lib/visualization/chart-utils.ts`

**Visualizations:**
```tsx
// Component: TrendChart
<TrendChart
  state="SP"
  candidate="João Silva"
  days={90}
  position="governador"
/>

// Displays:
// - Line chart with confidence bands
// - Moving average (7-day)
// - Volatility indicator
// - Trend arrow (up/down/stable)
// - Comparison with other candidates
```

**Chart library:**
- Use recharts or similar (already in deps)
- Support zoom/pan
- Export as PNG
- Responsive design

---

### 3.3 Comparação entre Períodos

**Files to create:**
- `src/app/api/comparison/aggregated/route.ts`
- `src/app/(marketing)/pesquisas/[uf]/comparison-tab.tsx`

**Comparison scenarios:**
```bash
# Compare 2 periods
GET /api/comparison/aggregated?state=SP&position=governador&period1=30&period2=7

# Response
{
  period1: {
    label: 'Last 30 days',
    candidates: [...]
  },
  period2: {
    label: 'Last 7 days',
    candidates: [...]
  },
  changes: [
    {
      candidate: 'João Silva',
      previous: 30,
      current: 32,
      delta: +2,
      deltaPercent: +6.7
    }
  ]
}
```

**Display:**
```tsx
// Side-by-side comparison
// Color highlights: green (up), red (down), gray (stable)
// Sorting by biggest changes
```

---

### 3.4 Validação Phase 3

**Test scenarios:**
- [ ] Historical snapshots are captured daily
- [ ] History API returns correct data
- [ ] Trend charts render correctly
- [ ] Comparison calculations are accurate
- [ ] Data integrity is maintained
- [ ] Old snapshots can be archived

**QA Checklist:**
- [ ] All historical queries return 200
- [ ] Charts load without errors
- [ ] Data points are accurate
- [ ] Comparisons calculate correctly
- [ ] Performance is acceptable (even for 90-day queries)
- [ ] Memory usage doesn't spike

---

## ⚡ Otimizações Contínuas

### Cache Strategy Refinement

**Current:**
- 24h cache for TSE data
- No aggregation cache

**Optimizations:**
```typescript
// Add aggregation caching
const AGGREGATION_CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

// Invalidate on:
// 1. New polls added
// 2. TSE sync completes
// 3. TTL expires

// Implement cache layers:
// 1. In-memory (fast)
// 2. Redis (shared, if scaling)
// 3. HTTP caching headers

// Cache keys:
// aggregation:SP:governador:30days
// regional:sul:governador:30days
// approval:BR:presidencial:30days
```

### Query Optimization

**Before:**
```typescript
// Inefficient: N queries
for (const state of states) {
  const polls = await db.polls.findMany({ state });
  // Process each
}
```

**After:**
```typescript
// Efficient: 1 query
const polls = await db.polls.findMany({
  state: { in: states }
});
// Batch process
```

### Performance Profiling

**Tools:**
- Next.js built-in analytics
- Vercel Analytics
- Database query metrics

**Targets:**
- Aggregation endpoint: <500ms (p95)
- Dashboard load: <1.5s (p95)
- Admin dashboard: <1s (p95)
- History queries: <1s (p95)

### Memory Management

**Monitor:**
- Heap size during batch operations
- Cache size (limit to 100MB)
- Database connection pooling
- Temporary arrays/objects cleanup

---

## 🧪 Validação Rigorosa (Continuous)

### Unit Tests (70% coverage target)
```bash
# For each new file
npm test -- src/lib/notifications/*.test.ts
npm test -- src/lib/history/*.test.ts
npm test -- src/lib/approval/*.test.ts
```

### Integration Tests (90% coverage target)
```bash
# Full flows
npm test -- src/__tests__/wave4-integration.test.ts

# Scenarios:
// 1. Slack alert triggers correctly
// 2. Email template renders
// 3. Admin resolves discrepancy
// 4. Historical data persists
// 5. Regional aggregation works
// 6. Approval metrics calculate
```

### E2E Tests (Critical paths only)
```bash
# Using Playwright/Cypress
npm run test:e2e

# Scenarios:
// 1. User views dashboard with alerts
// 2. Admin accesses discrepancies
// 3. Historical trend loads
// 4. Regional comparison works
// 5. Approval ratings display
```

### Manual QA Checklist

**For each phase:**
- [ ] All new endpoints tested
- [ ] Error cases handled
- [ ] Permissions checked (admin only)
- [ ] Data integrity verified
- [ ] Performance acceptable
- [ ] UI/UX smooth
- [ ] Documentation complete
- [ ] No regressions in existing features

### Data Validation

**TSE Integration:**
- [ ] All 27 states sync
- [ ] Presidencial position included
- [ ] Discrepancies logged correctly

**Aggregation:**
- [ ] Weights calculated correctly
- [ ] Confidence intervals valid
- [ ] Quality metrics in range [0,1]
- [ ] Anomalies detected at threshold

**Historical Data:**
- [ ] Snapshots consistent
- [ ] No duplicates
- [ ] Timestamps accurate
- [ ] Trends calculated correctly

---

## 📅 Timeline Proposto

```
Day 1-2:   Phase 1 Implementation (Slack, Email, Admin Dashboard)
Day 3:     Phase 1 Validation & Bug Fixes
Day 4-5:   Phase 2 Implementation (Presidencial, Approval, Regional)
Day 6:     Phase 2 Validation & Bug Fixes
Day 7-8:   Phase 3 Implementation (History, Trends, Comparison)
Day 9:     Phase 3 Validation & Bug Fixes
Day 10:    Final QA & Documentation
           ↓
Day 11:    Deploy to Production
```

---

## 📊 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | 85%+ | Jest coverage |
| API Uptime | 99.9% | Uptime monitoring |
| Response Time (p95) | <500ms | Vercel Analytics |
| Alert Accuracy | 95%+ | Manual validation |
| Admin Dashboard UX | A+ | User testing |
| Documentation | 100% | Docstring coverage |

---

## 🚀 Próximos Passos Imediatos

1. **Confirmar com usuário:**
   - [ ] Aprovar roadmap Wave 4 B+C+D
   - [ ] Confirmar prioridades
   - [ ] Definir timeline final

2. **Setup inicial:**
   - [ ] Criar branch `wave-4-dev`
   - [ ] Setup Slack webhook (se usar)
   - [ ] Setup email provider
   - [ ] Update database schema

3. **Começar Phase 1:**
   - Implementar Slack notifier
   - Criar admin dashboard estrutura
   - Escrever testes

---

**Status:** Pronto para começar
**Complexidade:** Alta
**Impacto:** Alto (sistema muito mais poderoso)
**ROI:** Excelente (features pedidas por usuários)

Qual fase você quer começar primeiro?
