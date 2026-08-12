# Agent 2 — Day 1 Tasks (set 10-11, HOJE!)

**Branch**: `feat/ruflo-agents-mvp` ✅
**Status**: Em desenvolvimento

---

## ☀️ MORNING (6h) — Parallelization Framework + Institutos Base

### Task 2.1: Parallelization Queue
**File**: `src/agents/agent-2-institutos.ts`

Implementar fila simples:
```typescript
class ParallelQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async add(fn: () => Promise<any>) {
    this.queue.push(fn);
    this.process();
  }

  private async process() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      this.running++;
      const fn = this.queue.shift();
      try {
        await fn();
      } catch (e) {
        console.warn("Queue task failed:", e);
      }
      this.running--;
      this.process();
    }
  }
}
```

**✅ Success**: Queue pronto, testa com 5 institutos

---

### Task 2.2: Instituto Config + Reuse Phase 2.5
**File**: `src/agents/agent-2-institutos.ts`

COPY das strategies existentes:
```typescript
// Copy from src/lib/institutes/datafolha-client.ts
// Copy from src/lib/institutes/ipec-client.ts
// etc...

const INSTITUTES = [
  {
    id: "datafolha",
    url: "https://www.datafolha.com.br/pesquisas-eleitorais/",
    strategies: ["json", "html", "regex"]
  },
  {
    id: "ipec",
    url: "https://www.ipec.org.br/pesquisas-eleitorais/",
    strategies: ["json", "html", "regex"]
  },
  // ... add 3 more (Quaest, PoderData, AtlasIntel)
];
```

**✅ Success**: 5 institutos configurados

---

## 🌤️ AFTERNOON (6h) — Fallback Strategies + Data Normalization

### Task 2.3: Implement 3 Fallback Strategies
**File**: `src/agents/agent-2-institutos.ts`

```typescript
async scrapeInstitute(institute: InstituteConfig): Promise<PollData[]> {
  const html = await fetch(institute.url).then(r => r.text());

  // Strategy 1: JSON
  try {
    const json = JSON.parse(...); // extract from window.__DATA__ or similar
    return normalizeJSON(json);
  } catch (e) { }

  // Strategy 2: HTML Tables
  try {
    const rows = extractHTMLTable(html);
    return normalizeHTML(rows);
  } catch (e) { }

  // Strategy 3: Regex
  try {
    const matches = html.match(/(\w+):\s+(\d+)%/g);
    return normalizeRegex(matches);
  } catch (e) { }

  throw new Error("All strategies failed");
}
```

**✅ Success**: All 3 strategies implemented

---

### Task 2.4: Data Normalization
**File**: `src/agents/agent-2-institutos.ts`

```typescript
interface PollData {
  candidate: string;
  percentage: number;
  fieldwork_end: string;
  institute: string;
}

function normalizePoll(raw: any, instituteId: string): PollData {
  return {
    candidate: raw.name || raw.candidato || "",
    percentage: parseFloat(raw.percentage || raw.pct || "0"),
    fieldwork_end: raw.date || raw.fieldwork_end || new Date().toISOString(),
    institute: instituteId
  };
}
```

**✅ Success**: Normalization working

---

## 🌙 EVENING (4h) — Supabase Upsert + Basic Webhook

### Task 2.5: Supabase Upsert
**File**: `src/agents/agent-2-institutos.ts`

```typescript
async upsertPolls(polls: PollData[]): Promise<number> {
  const { data, error } = await this.supabase
    .from("polls")
    .upsert(polls.map(p => ({
      institute: p.institute,
      publication_date: new Date().toISOString(),
      fieldwork_end: p.fieldwork_end,
      sample_size: 1000,
      methodology: "online",
      _source: `Scraping ${p.institute}`
    })), { onConflict: "institute,publication_date" })
    .select("count");

  return data?.length || 0;
}
```

**✅ Success**: Polls in DB

---

### Task 2.6: Basic Webhook Handler
**File**: `src/app/api/webhooks/ruflo/institutos-complete/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  
  console.log("[institutos-complete] webhook:", {
    completed_count: body.completed_count,
    failed_count: body.failed_count,
    total_polls_inserted: body.total_polls_inserted
  });

  // For now: just log
  // (Agent 3 trigger comes later)

  return NextResponse.json({ ok: true });
}
```

**✅ Success**: Webhook callable

---

## 🎯 END OF DAY VERIFICATION

By EOD (set 10-11), verify:
- [ ] Queue framework working (5 parallel)
- [ ] 5 institutos configured
- [ ] Fallback strategies implemented (all 3)
- [ ] Data normalization working
- [ ] Supabase upsert working (polls in DB)
- [ ] Webhook handler ready
- [ ] No crashes

---

## 📋 Testing Checklist

After implementing:

```bash
# Test webhook
curl -X POST http://localhost:3001/api/webhooks/ruflo/institutos-complete \
  -H "Content-Type: application/json" \
  -d '{"ok": true, "completed_count": 5, "failed_count": 0, "total_polls_inserted": 23}'
```

Expected response:
```json
{"ok": true}
```

---

## ⚠️ GOTCHAS

1. **Parallelization**: Don't use Promise.all() (blocks), use queue
2. **Timeout**: Each institute needs 30s max
3. **Retry**: Max 2 attempts per institute
4. **CSV**: Reuse Phase 2.5 parsing code (don't reinvent)
5. **No fancy**: MVP rough, don't polish

---

## 🚀 NEXT

After Agent 2 done:
- Agent 3 (Validação) on set 12-13
- Integration on set 14
- LAUNCH set 15 🎉
