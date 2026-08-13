---
name: ruflo-sprint-plan
description: Sprint plan 7 dias (HARDCORE) — Agent 1+2+3 antes de 15/08
---

# Ruflo Sprint Plan — 7 DIAS HARDCORE (set 8-15)

**Mode**: ULTRARRÁPIDO (Agent 1/2/3 sequencial, nenhum paralelismo)
**Timeline**: set 8 - set 15 (7 dias)
**Owner**: Luiz (solo, 24/7 mode)
**Status**: 🚨 CRITICAL

⚠️ **WARNING**: Testes mínimos, documentação cortada, deploy rough
✅ **GOAL**: 3 agentes funcionando (não perfeitos) até 15/08

---

## 🔥 HARDCORE Timeline (7 Dias)

### **Dia 1-2: Agent 1 (TSE Ingestão)** [set 8-9]
**Focus**: Core MVP — download + parse + upsert

```
set 8 (Thu) — FULL DAY
├─ Morning (6h):
│  ├─ Setup: download real TSE ZIP
│  └─ Implement: fetch + unzip logic
├─ Afternoon (6h):
│  ├─ Implement: CSV parsing (REUSE src/lib/ingest/pesqele.ts)
│  └─ Test: manually with real TSE data
└─ Evening (4h):
   └─ Implement: Supabase upsert (pesqele_registry)

set 9 (Fri) — FULL DAY
├─ Morning (6h):
│  ├─ Implement: retry logic (4 attempts, backoff: 0/5/10/30 min)
│  └─ Test: manual retry scenarios
├─ Afternoon (6h):
│  ├─ Implement: webhook tse-complete handler (basic)
│  ├─ Implement: audit logging (data_source_audit)
│  └─ Quick memória HNSW (just track checksum for now)
└─ Evening (4h):
   └─ Staging test: live TSE CDN (1 run, verify data integrity)
```

**Deliverable by set 9 EOD**: Agent 1 working end-to-end
- ✅ TSE ZIP downloaded
- ✅ CSV parsed, data in DB
- ✅ Webhook fires
- ✅ NO fancy tests, NO memória HNSW vectors (skip)

**Cut**: Unit tests, fancy memória, documentation

---

### **Dia 3-4: Agent 2 (Institutos)** [set 10-11]
**Focus**: Quick parallelization + core institutos

```
set 10 (Sat) — FULL DAY
├─ Morning (6h):
│  ├─ Setup: parallelization queue (simple, max 5)
│  └─ Reuse: Phase 2.5 instituto clients (Datafolha, Ipec, Quaest)
├─ Afternoon (6h):
│  ├─ Quick adapt: 3 fallback strategies (JSON → HTML → regex)
│  ├─ Implement: data normalization
│  └─ Test: manually with live institutos
└─ Evening (4h):
   └─ Implement: Supabase upsert (polls, election_results_candidatos)

set 11 (Sun) — FULL DAY
├─ Morning (6h):
│  ├─ Add: PoderData + AtlasIntel institutos
│  └─ Test: 5 institutos in parallel
├─ Afternoon (6h):
│  ├─ Implement: webhook institutos-complete handler (basic)
│  ├─ Quick retry logic (max 2 attempts)
│  └─ Test: manual failure scenarios
└─ Evening (4h):
   └─ Staging test: all 5 institutos working
```

**Deliverable by set 11 EOD**: Agent 2 working (5+ institutos)
- ✅ Parallel scraping works
- ✅ 5 institutos data in DB
- ✅ Webhook fires
- ✅ Fallback strategies tested
- ✅ NO fancy memória, NO tests, NO documentation

**Cut**: All 10 institutos (do only 5), unit tests, memória HNSW

---

### **Dia 5-6: Agent 3 (Validação)** [set 12-13]
**Focus**: Minimal gaps + alerts

```
set 12 (Mon) — FULL DAY
├─ Morning (6h):
│  ├─ Implement: gap detection (simple: last_poll_date)
│  ├─ Query: elections + latest polls
│  └─ Severity logic: if gap > 3 days → high alert
├─ Afternoon (6h):
│  ├─ Implement: email notification (Resend simple)
│  ├─ Implement: operador_alerts table insert
│  └─ Test: manual email sending
└─ Evening (4h):
   └─ Implement: webhook alert-gap handler (basic)

set 13 (Tue) — FULL DAY
├─ Morning (6h):
│  ├─ Quick anomaly: sudden drop detection (just 1 method)
│  └─ Test: mock anomalies
├─ Afternoon (6h):
│  ├─ Dashboard: alert banner (if gap alert)
│  ├─ Implement: webhook alert-gap → email + dashboard
│  └─ Test: full flow manually
└─ Evening (4h):
   └─ Staging test: alerts firing correctly
```

**Deliverable by set 13 EOD**: Agent 3 working (gap detection only)
- ✅ Gap detection working
- ✅ Alerts email sent
- ✅ Operador alerts table populated
- ✅ Webhook fires
- ✅ NO anomaly detection (skip), NO memória HNSW

**Cut**: Anomaly detection (complex), advanced patterns, unit tests

---

### **Dia 7: Integration + Fixes** [set 14]
**Focus**: Wire everything, fix critical bugs

```
set 14 (Wed) — FULL DAY (no sleep, caffeine mode)
├─ Morning (6h):
│  ├─ Test: Full E2E flow (Agent 1 → 2 → 3)
│  ├─ Fix: any webhook integration issues
│  └─ Verify: data flows correctly through all 3
├─ Afternoon (6h):
│  ├─ Quick security check:
│  │  ├─ Webhook auth basics
│  │  ├─ SQL injection check (grep)
│  │  └─ Secrets not in code
│  ├─ Test: live staging (with real TSE + institutos)
│  └─ Fix: any critical bugs
└─ Evening (4h):
   ├─ Final checks:
   │  ├─ Agent 1 working?
   │  ├─ Agent 2 working?
   │  ├─ Agent 3 working?
   │  └─ Webhooks connected?
   └─ Deploy to prod (set 15 morning ready)
```

**Deliverable by set 14 EOD**: Production-ready (rough but functional)
- ✅ All 3 agents working
- ✅ All webhooks connected
- ✅ Data flowing end-to-end
- ✅ Critical bugs fixed
- ✅ Ready to go live set 15

---

### **Dia 8 (set 15): LAUNCH DAY**

```
set 15 (Thu) — LAUNCH
├─ Morning:
│  ├─ Last-minute verification
│  └─ Deploy prod (if all green)
├─ Afternoon:
│  └─ MONITOR LIKE CRAZY (check logs, alerts, DB)
└─ Evening:
   └─ Be on standby (fixes if needed)
```

---

## ✅ Definition of Done (HARDCORE MODE)

### Agent 1 (TSE) — MUST HAVE
- [ ] ZIP download working (live TSE CDN)
- [ ] CSV parser correct (reuse pesqele.ts)
- [ ] Retry logic: 4 attempts, exponential backoff
- [ ] Supabase upsert: pesqele_registry OK
- [ ] Webhook tse-complete fires on success
- [ ] Staging validated (1 live run)
- ~~[ ] Memória HNSW (SKIP)~~
- ~~[ ] Unit tests (SKIP)~~

### Agent 2 (Institutos) — MUST HAVE
- [ ] Parallelization queue (max 5) working
- [ ] Fallback strategies tested (JSON → HTML → regex)
- [ ] 5+ institutos working (Datafolha, Ipec, Quaest, PoderData, AtlasIntel)
- [ ] Supabase upsert: polls OK
- [ ] Webhook institutos-complete fires on success
- [ ] Staging validated (live test)
- ~~[ ] 10 institutos (SKIP, do only 5)~~
- ~~[ ] Unit tests (SKIP)~~
- ~~[ ] Memória HNSW (SKIP)~~

### Agent 3 (Validação) — MUST HAVE
- [ ] Gap detection working (last_poll_date)
- [ ] Severity scoring (gap > 3d = high)
- [ ] Email notification via Resend (tested)
- [ ] Operador alerts table insert
- [ ] Webhook alert-gap fires on high-severity
- [ ] Dashboard alert banner
- [ ] Staging validated (1 test run)
- ~~[ ] Anomaly detection (SKIP, do only gaps)~~
- ~~[ ] Unit tests (SKIP)~~
- ~~[ ] Memória HNSW (SKIP)~~

---

## 🔥 MUST ACCOMPLISH (by set 14 EOD)

| Agent | Requirement | Status |
|-------|-------------|--------|
| **1** | Working TSE ingestão | ⏳ |
| **2** | 5+ institutos scraping | ⏳ |
| **3** | Gap alerts working | ⏳ |
| **All** | Webhooks connected | ⏳ |
| **All** | E2E flow verified | ⏳ |

---

## ⚡ STARTING NOW: Agent 1 Day 1 (set 8)
