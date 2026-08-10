# Set 11 — Staging Validation Plan

**Date**: 2026-08-11 (Amanhã, domingo)
**Status**: MVP complete, ready for staging tests
**Goal**: Validate all 3 agents with mock data before production deploy

---

## 📋 Checklist Set 9

### Morning (6h) — Agent 1 Staging Test

**Test**: Mock TSE ZIP + CSV parsing

```bash
# 1. Create mock TSE ZIP file
cat > /tmp/mock_pesquisa.csv << 'EOF'
protocol,institute,fieldwork_start,fieldwork_end,publication_date
TEST001,Datafolha,2026-08-08,2026-08-09,2026-08-10
TEST002,Ipec,2026-08-08,2026-08-09,2026-08-10
TEST003,Quaest,2026-08-08,2026-08-09,2026-08-10
EOF

# 2. Verify Agent 1 can parse CSV
# (run manual test or add unit test)

# 3. Check Supabase inserts
# SELECT COUNT(*) FROM pesqele_registry WHERE _source = 'TSE CDN'
```

**Verify**:
- [ ] CSV parses correctly
- [ ] Rows in pesqele_registry
- [ ] Missing queue updated
- [ ] No crashes

---

### Midday (3h) — Agent 2 Staging Test

**Test**: Mock institutos scraping (JSON/HTML/regex)

```bash
# 1. Test JSON parsing
# (verify datafolha mock JSON parses)

# 2. Test HTML table extraction
# (verify ipec mock HTML parses)

# 3. Test regex extraction
# (verify quaest mock regex matches)

# 4. Check Supabase inserts
# SELECT COUNT(*) FROM polls WHERE _source LIKE 'Scraping%'
```

**Verify**:
- [ ] All 3 strategies work
- [ ] Rows in polls
- [ ] election_results_candidatos inserted
- [ ] No crashes

---

### Afternoon (3h) — Agent 3 Staging Test

**Test**: Gap detection + alerts

```bash
# 1. Create test election with old polls
# INSERT INTO elections (name, is_active) VALUES ('Test Election', true)
# INSERT INTO polls (election_id, ..., publication_date = 5 days ago)

# 2. Run Agent 3
# Should detect gap > 3 days, create alert

# 3. Check operador_alerts table
# SELECT * FROM operador_alerts WHERE reviewed = false
```

**Verify**:
- [ ] Gap detection working
- [ ] Alert severity correct
- [ ] Alert in operador_alerts
- [ ] Webhook fires

---

## 🔧 Refinements If Needed

**If Agent 1 fails:**
- [ ] Check CSV format (headers)
- [ ] Check Supabase RPC (update_pesqele_missing)
- [ ] Fix and re-test

**If Agent 2 fails:**
- [ ] Check institute URLs (may be down)
- [ ] Add more HTML/regex patterns
- [ ] Fix and re-test

**If Agent 3 fails:**
- [ ] Check election/polls queries
- [ ] Verify alert logic
- [ ] Fix and re-test

---

## 📊 Success Criteria

By EOD set 9:
- [ ] Agent 1: mock CSV → pesqele_registry ✅
- [ ] Agent 2: mock institutos → polls ✅
- [ ] Agent 3: gap detection → alerts ✅
- [ ] No crashes, no errors
- [ ] Ready for prod deploy set 14

---

## 🚀 Deploy Plan (set 14)

If staging passes set 9:
1. Verify real TSE CDN URL (may be different)
2. Test with real institutos (1-2)
3. Monitor Supabase for 24h
4. Deploy to production set 15

---

## 📝 Notes for Tomorrow

- Dev server still running? Kill and restart if needed: `npm run dev`
- Check env vars: `source .env.local`
- All commits on `feat/ruflo-agents-mvp` branch
- Main branch has Agent 1+2 implementation (merged from MVP)

---

## Questions?

See:
- `AGENT1_DAY1_TASKS.md` — Agent 1 reference
- `AGENT2_DAY1_TASKS.md` — Agent 2 reference
- `RUFLO_DEV_GUIDE.md` — Overall reference
- `RUFLO_SPRINT_PLAN.md` — Timeline
- Memory docs in `/Users/luizlessa/.claude/projects/.../memory/`

Good luck tomorrow! 🚀
