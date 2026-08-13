# Agent 1 — Day 1 Tasks (set 8, TODAY!)

**Branch**: `feat/ruflo-agents-mvp` ✅
**Commit baseline**: `8f52afa` (sprint plan)

---

## ☀️ MORNING (6h) — TSE ZIP Download + Unzip

### Task 1.1: Download Real TSE ZIP
**File**: `src/agents/agent-1-tse.ts`

```typescript
// In TseIngestAgent.run():
// 1. Download from TSE CDN (real URL!)
const cdnUrl = "https://cdn.tse.jus.br/pesquisa_eleitoral_2026.zip";
const response = await fetch(cdnUrl, { timeout: 30000 });
const zipBuffer = await response.arrayBuffer();

// 2. Unzip using AdmZip (already in package.json)
import AdmZip from "adm-zip";
const zip = new AdmZip(Buffer.from(zipBuffer));
const csvFile = zip.readAsText("pesquisa_eleitoral_2026.csv");

// 3. Store checksum for memória
const checksum = sha256(zipBuffer);
```

**Test**: 
```bash
# After implementing, test locally:
NODE_ENV=development npm run dev
# Verify CSV is readable
```

**✅ Success**: CSV file extracted, no errors

---

### Task 1.2: Examine Real CSV Structure
**Do manually first**:
```bash
# Download TSE ZIP manually, check structure
# Open pesquisa_eleitoral_2026.csv in editor
# Verify columns: protocol, institute, fieldwork_start, fieldwork_end, publication_date, ...
# Check first 5 lines
```

**Document findings** in comment above CSV parser

---

## 🌤️ AFTERNOON (6h) — CSV Parser + Supabase Upsert

### Task 1.3: CSV Parser (REUSE pesqele.ts)
**File**: `src/agents/agent-1-tse.ts`

**Don't reinvent — COPY from `src/lib/ingest/pesqele.ts`**:
```typescript
// In agent-1-tse.ts:
import { parseCSV } from "@/lib/ingest/pesqele";

const lines = parseCSV(csvFile);
// → [{protocol, institute, fieldwork_start, ...}, ...]
```

**Adapt if needed**:
- If `pesqele.ts` returns wrong shape, add `.map()` to normalize
- Keep it simple, NO fancy validation

**✅ Success**: CSV lines parsed correctly, first 3 lines logged to console

---

### Task 1.4: Supabase Upsert
**File**: `src/agents/agent-1-tse.ts`

```typescript
// In Agent 1.run():
const { data, error } = await this.supabase
  .from("pesqele_registry")
  .upsert(lines.map(line => ({
    protocol: line.protocol,
    institute: line.institute,
    fieldwork_start: line.fieldwork_start,
    fieldwork_end: line.fieldwork_end,
    publication_date: line.publication_date,
    // ... more fields as needed
    _tse_ingested_at: new Date().toISOString(),
    _source: "TSE CDN"
  })), { onConflict: "protocol" })
  .select("count");

if (error) throw new Error(`Upsert failed: ${error.message}`);
console.log(`✅ Upserted ${data.length} rows`);
```

**⚠️ Note**: Use `SUPABASE_SERVICE_ROLE_KEY`, not anon key!

**✅ Success**: Rows appear in Supabase pesqele_registry table

---

## 🌙 EVENING (4h) — Webhook + Audit Logging

### Task 1.5: Webhook Handler (Basic)
**File**: `src/app/api/webhooks/ruflo/tse-complete/route.ts`

```typescript
// Replace TODO with:
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[tse-complete] webhook received:", body);
    
    // TODO: For now, just log
    // (Agent 2 webhook not ready yet)
    
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[tse-complete] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

**✅ Success**: Webhook callable via `POST /api/webhooks/ruflo/tse-complete`

---

### Task 1.6: Audit Logging
**File**: `src/agents/agent-1-tse.ts`

```typescript
// In TseIngestAgent.run():
await this.logAudit({
  download_id: "tse_2026_08_08_10h00z",
  checksum_sha256: checksum,
  row_count: lines.length,
  upserted_count: resultCount,
  duration_ms: Date.now() - startTime
});
```

**For now**: Just `console.log()` (no DB insert yet)

**✅ Success**: Audit info logged to console

---

## 🎯 END OF DAY VERIFICATION

By EOD set 8, verify:
- [ ] TSE ZIP downloads successfully
- [ ] CSV parses correctly (≥300 lines)
- [ ] Supabase upsert works (rows in DB)
- [ ] No crashes
- [ ] Logs are clean

**If all green**: Commit and move to Day 2 (retry logic)
**If stuck**: Debug, don't overthink, just fix

---

## 📋 Command Checklist (Set 8)

```bash
# 1. Ensure you're on the right branch
git checkout feat/ruflo-agents-mvp

# 2. Ensure env vars set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 3. Run dev server (if needed for testing)
npm run dev

# 4. After finishing, commit
git add src/agents/agent-1-tse.ts src/app/api/webhooks/...
git commit -m "feat: Agent 1 MVP — TSE download + parse + upsert"

# 5. Next: Push and move to Day 2
```

---

## ⚠️ GOTCHAS TO AVOID

1. **Wrong Supabase key**: USE `SUPABASE_SERVICE_ROLE_KEY`, NOT anon
2. **CSV column names**: Verify exact names from TSE file (case-sensitive)
3. **Timeout**: TSE ZIP is 3-5MB, might take 10-30s
4. **No fancy error handling**: If it fails, just throw — logs should tell why
5. **Don't overthink**: MVP is rough, don't polish

---

## 🚀 READY? START NOW!

Go to `src/agents/agent-1-tse.ts` and implement tasks 1.1-1.6.

**Questions?** See `RUFLO_DEV_GUIDE.md` § Agent 1 spec
