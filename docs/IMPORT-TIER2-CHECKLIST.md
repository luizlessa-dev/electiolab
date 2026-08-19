# P1.2 Fase 2 — Import Tier 2-3 Checklist

## Estado

- ✅ Institutos criados: GERP, MEIO/IDEIA, VOX BRASIL, REAL TIME BIG DATA, INDEXA, SMS Direct, LAPOP, VERITA
- 🔄 **Agent extraindo dados reais** (GERP, MEIO, VOX, REAL TIME) — ETA 30-60min
- ⏳ Script `import-tier2-institutos.ts` pronto (aguardando JSON)

---

## Quando Agent Completar

### 1️⃣ Agent Output
Arquivo gerado: `/tmp/tier2-pesquisas-2026.json` (ou similar)

Estrutura esperada:
```json
{
  "gerp": [
    {"institute": "GERP", "position": "PRES", "state": "BR", "fieldwork_date": "2026-08-10", ...},
    ...
  ],
  "meio-ideia": [...],
  "vox-brasil": [...],
  "real-time-big-data": [...]
}
```

### 2️⃣ Copiar pra Repo
```bash
cp /tmp/tier2-pesquisas-2026.json ~/electiolab/data/tier2-pesquisas-2026.json
```

### 3️⃣ Verificar JSON
```bash
# Contar pesquisas por instituto
jq '.[] | length' ~/electiolab/data/tier2-pesquisas-2026.json | paste -sd+ | bc
# Esperado: ~25-30 pesquisas total
```

### 4️⃣ Rodar Import Dry-Run
```bash
cd ~/electiolab && \
NEXT_PUBLIC_SUPABASE_URL="https://xoxztzologqeqbajlhya.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d= -f2) \
npx tsx scripts/import-tier2-institutos.ts
```

Esperado output:
```
✓ 8 institutos encontrados no banco (Tier 2-3)

📥 Instituto: GERP
   Pesquisas: 9
   ⚠️  Dry-run mode. Use --apply pra gravar.

📥 Instituto: MEIO-IDEIA
   Pesquisas: 8
   ...
```

### 5️⃣ Rodar Import Apply (Gravar)
```bash
cd ~/electiolab && \
NEXT_PUBLIC_SUPABASE_URL="https://xoxztzologqeqbajlhya.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d= -f2) \
npx tsx scripts/import-tier2-institutos.ts --apply
```

Esperado output:
```
✓ 8 institutos encontrados no banco (Tier 2-3)

📥 Instituto: GERP
   Pesquisas: 9
   ✓ 9/9 inseridos

📥 Instituto: MEIO-IDEIA
   Pesquisas: 8
   ✓ 8/8 inseridos

✅ Total importado: ~25-30 pesquisas
```

### 6️⃣ Verificar Cobertura
```bash
# Query: quantas pesquisas Tier 2-3 agora
psql \
  -h xoxztzologqeqbajlhya.supabase.co \
  -U postgres \
  -d postgres \
  -c "SELECT COUNT(*) as total FROM polls WHERE source_kind='tier2-3-manual';"
```

Esperado: ~25-30 registros

### 7️⃣ Commit
```bash
cd ~/electiolab && \
git add data/tier2-pesquisas-2026.json && \
git commit -m "data: Tier 2-3 pesquisas 2026 importadas (+25-30 pesquisas)

Institutos: GERP (9), MEIO (8), VOX (5), REAL TIME (4+)
Cobertura: Presidencial + Governadores (5 estados)
Source: TSE + institutos oficiais
Verificado: datas coerentes, amostra/margem OK
"
```

---

## Pós-Import Checklist

- [ ] Verificar contagem pesquisas (`SELECT COUNT(*)`)
- [ ] Testar rotas `/pesquisas/*` pra nenhuma regressão
- [ ] Revisar 5 registros aleatórios pra qualidade
- [ ] Atualizar documentação com nova cobertura %
- [ ] Commit + push
- [ ] Monitorar GitHub Actions (se houver)

---

## Se Algo Falhar

### Import falha com erro de constraint
```
Solução: Verificar election_id + scope + poll_type estão corretos
Comando: SELECT * FROM elections WHERE year=2026 ORDER BY name;
```

### JSON inválido do agent
```
Solução: Validar JSON: jq . data/tier2-pesquisas-2026.json
Se erro: Agent retornar com refinamento
```

### Pesquisas duplicadas
```
Solução: Script com ON CONFLICT (candidate_id) DO NOTHING
Safe delete possível via: DELETE FROM polls WHERE source_kind='tier2-3-manual' AND created_at > NOW() - INTERVAL '1 hour';
```

---

## Timeline Estimada

| Etapa | Tempo | Owner |
|-------|-------|-------|
| Agent extrai dados | 30-60min | Agent (background) |
| Você: copiar JSON | 2min | Manual |
| Dry-run + aprovação | 5min | Script |
| Apply + verify | 5min | Script |
| Commit + push | 2min | Git |
| **Total** | **~45-75min** | — |

---

## Próximas Fases (Após Import)

**Fase 2B:** Tier 3 institutos (SMS Direct, LAPOP, Verita) se cobertura <20%
**Fase 3:** Social media 2026 quando TSE publicar (set/2026)
**Fase 4:** Validação final de cobertura

---

**Criado:** 2026-08-22 (última update pós-agent)  
**Status:** Awaiting agent extraction
