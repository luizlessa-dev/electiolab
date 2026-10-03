# 🚀 Executar: Pesquisas de Deputado Federal 2026

**Status:** ✅ Pronto para execução (3 fases)

---

## 📋 Pré-requisitos

Verificar:

```bash
# 1. Variáveis de ambiente
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Se vazio, carregar:
source .env.local

# 2. Dados de entrada existem?
ls -lh data/pesqele_deputado_import.json
```

**Esperado:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` definida
- ✅ `SUPABASE_SERVICE_ROLE_KEY` definida  
- ✅ Arquivo `data/pesqele_deputado_import.json` existe (3 pesquisas Tier 1)

---

## 🔵 Fase 1: Import dos 3 Dados Tier 1 (15 min)

**Objetivo:** Importar pesquisas reais de Datafolha (SP), Atlas Intel (MG), Paraná Pesquisas (RJ)

### Step 1.1: Validar script

```bash
cd ~/electiolab
npx tsx scripts/import-deputado-tier1.ts --dry-run
```

**Esperado output:**
```
📥 Tier 1 Deputado Federal Import

Mode: 🔍 DRY-RUN

Found 3 polls to import

Found 3 institutes in database

✓ Would import: Datafolha — Deputado Federal São Paulo
   Institute: Datafolha | State: SP
   Fieldwork: 2026-09-05 to 2026-09-08
   Sample: 1610 | Margin: ±2.44%

✓ Would import: Atlas Intel — Deputado Federal Minas Gerais
   ...

✓ Would import: Paraná Pesquisas — Deputado Federal Rio de Janeiro
   ...

📊 Import Summary
Total:    3
Imported: 0
Skipped:  0

🔍 This was a dry-run. Use --apply to actually import.
```

### Step 1.2: Aplicar (gravar no banco)

```bash
npx tsx scripts/import-deputado-tier1.ts --apply
```

**Esperado:**
```
✓ Imported: Datafolha — Deputado Federal São Paulo (uuid...)
✓ Imported: Atlas Intel — Deputado Federal Minas Gerais (uuid...)
✓ Imported: Paraná Pesquisas — Deputado Federal Rio de Janeiro (uuid...)

📊 Import Summary
Total:    3
Imported: 3
Skipped:  0

✅ 3 polls successfully imported!
```

### Step 1.3: Verificar no banco

```bash
# Query rápida
psql postgresql://$USER:password@localhost/electiolab -c \
  "SELECT COUNT(*) FROM polls WHERE office='deputado' AND source_kind='tier1-manual';"

# Esperado: 3
```

✅ **Fase 1 Completa!**

---

## 🟢 Fase 2: Simulador Dinâmico (45 min)

**Objetivo:** Gerar estimativas de intenção de voto para Deputado Federal em todos os 27 estados usando simulação Bayesiana a partir de pesquisas presidenciais.

### Step 2.1: Validar script (1 estado)

```bash
npx tsx scripts/estimate-deputado-by-state.ts --dry-run --state=SP
```

**Esperado output:**
```
📊 Simulador Dinâmico — Deputado Federal

Mode: 🔍 DRY-RUN

Processing SP...
   ✓ Would create 4 coalitions:
     • PT-Aliados: 28.45% (24.32-32.18%)
     • PL-Aliados: 22.10% (18.90-25.43%)
     • Centro: 18.34% (14.67-22.15%)
     • Outros: 31.11% (27.45-35.00%)

📊 Summary
States processed:  1
Total coalitions:  4
Inserted:          0
Skipped:           0

🔍 This was a dry-run. Use --apply to actually insert.
```

### Step 2.2: Aplicar para TODOS os estados

```bash
npx tsx scripts/estimate-deputado-by-state.ts --apply
```

**Duração esperada:** 30-45 min (27 estados × queries)

**Esperado final:**
```
📊 Summary
States processed:  27
Total coalitions:  ~100-120 (4-5 coligações por estado)
Inserted:          ~100-120
Skipped:           0

✅ Successfully created simulated polls for 27 states!
```

### Step 2.3: Verificar cobertura

```bash
# Total de simulações inseridas
psql postgresql://$USER:password@localhost/electiolab -c \
  "SELECT COUNT(*) FROM polls WHERE office='deputado' AND source_kind='simulated';"

# Esperado: ~100-120

# Por estado
psql postgresql://$USER:password@localhost/electiolab -c \
  "SELECT scope, COUNT(*) FROM polls WHERE office='deputado' AND source_kind='simulated' GROUP BY scope ORDER BY scope;"

# Esperado: SP 4, RJ 4, MG 4, ... (todos os 27)
```

✅ **Fase 2 Completa!**

---

## 🟡 Fase 3: Poder360 Manual (ongoing)

**Objetivo:** Monitorar Poder360 e adicionar pesquisas reais de Deputado Federal conforme encontrar.

### Step 3.1: Setup de Monitoramento

```bash
# Criar pasta de logs
mkdir -p logs/poder360-deputado

# Script de check semanal (cron)
cat > scripts/check-poder360-weekly.sh << 'EOF'
#!/bin/bash
# Semanal: verificar Poder360 por pesquisas de deputado federal

DATE=$(date +%Y-%m-%d)
curl -s "https://www.poder360.com.br/poder-pesquisas-hoje/" \
  | grep -i "deputado federal" \
  > "logs/poder360-deputado/check-${DATE}.html"

echo "✓ Poder360 check saved to logs/poder360-deputado/check-${DATE}.html"
echo "  Review and add to ingest-manual.ts if needed"
EOF

chmod +x scripts/check-poder360-weekly.sh
```

### Step 3.2: Adicionar pesquisa quando encontrar

**Quando:** encontrar pesquisa de Deputado Federal em Poder360

**Como:**
1. Ler guia: [`docs/PODER360-DEPUTADO-GUIDE.md`](./docs/PODER360-DEPUTADO-GUIDE.md)
2. Preencher template
3. Adicionar a `scripts/ingest-manual.ts`
4. Rodar: `npx tsx scripts/ingest-manual.ts --apply`

**Exemplo:**
```bash
# 1. Encontrou pesquisa em Poder360
# Poder360: "PT 16% | PL 12% | Otros 72%" (RJ, Datafolha, set 2026)

# 2. Adicionar a ingest-manual.ts (seção DEPUTADO_FEDERAL)

# 3. Rodar
npx tsx scripts/ingest-manual.ts --dry-run
npx tsx scripts/ingest-manual.ts --apply
```

✅ **Fase 3: Continuous** (monitorar semanalmente)

---

## 📊 Resumo Final: O Que Teremos

### Após Executar as 3 Fases:

```
TOTAL DE POLLS: ~125 pesquisas de Deputado Federal

✅ Tier 1 (Real):
   - 3 pesquisas reais
   - Datafolha (SP), Atlas Intel (MG), Paraná Pesquisas (RJ)
   - Dados completos: sample, margin, date, TSE registry

✅ Simulated (Estimado):
   - ~120-125 pesquisas estimadas (4-5 coligações × 27 UFs)
   - Baseado em pesquisas presidenciais
   - Com intervalo de confiança 95%
   - Flag: "estimado"

✅ Poder360 (Manual):
   - Adiciona-se quando encontrar
   - Sem quebra de ToS (sem scraper automático)
   - Revisar semanalmente
```

### Query Final: Ver Tudo

```sql
-- Total por tipo
SELECT source_kind, COUNT(*) 
FROM polls 
WHERE office='deputado' 
GROUP BY source_kind;

-- Ver últimas pesquisas por estado
SELECT state, institute_name, percentage, publication_date, source_kind
FROM polls
WHERE office='deputado'
ORDER BY state, publication_date DESC
LIMIT 20;
```

---

## 🎯 Checklist de Execução

- [ ] **Pré-requisitos:** variáveis de env, arquivo de dados
- [ ] **Fase 1:** Import Tier 1 (15 min)
  - [ ] Dry-run bem-sucedido
  - [ ] Apply bem-sucedido
  - [ ] Verificar no banco (COUNT = 3)
- [ ] **Fase 2:** Simulador (45 min)
  - [ ] Dry-run 1 estado bem-sucedido
  - [ ] Apply todos os estados
  - [ ] Verificar cobertura (27 UFs × 4-5 coligações)
- [ ] **Fase 3:** Monitoramento (setup + ongoing)
  - [ ] Guia de Poder360 criado
  - [ ] Script de check semanal setup
  - [ ] Primeira entrada manual documentada

---

## ⏱️ Timeline Estimada

| Fase | Duração | Quando |
|------|---------|--------|
| 1: Import Tier 1 | 15 min | Agora |
| 2: Simulador | 45 min | Depois (depende de Fase 1) |
| 3: Monitoramento | 5 min setup | Depois (setup) |
| 3: Poder360 updates | 5 min/pesquisa | Semanalmente (ongoing) |

**Total inicial:** ~1 hora | **Resultado:** Cobertura completa de 27 estados

---

## 🔗 Scripts Criados

```
scripts/
├── import-deputado-tier1.ts          ← Fase 1
├── estimate-deputado-by-state.ts     ← Fase 2
└── check-poder360-weekly.sh           ← Fase 3 setup

src/lib/
└── simulador-deputado.ts             ← Modelo Bayesiano

docs/
└── PODER360-DEPUTADO-GUIDE.md        ← Guia manual Fase 3

data/
└── pesqele_deputado_import.json      ← Dados de entrada
```

---

## ❓ Dúvidas Comuns

**P: Posso pular Fase 2?**  
R: Não. Fase 2 garante cobertura em todos os 27 estados mesmo sem pesquisas reais.

**P: E se Poder360 mudar o site?**  
R: Fase 3 é manual, então não quebra. Basta atualizar o guia.

**P: Quanto tempo demora rodar Fase 2?**  
R: ~45 min (muitas queries ao Supabase). Deixe rodando em background.

**P: Dados simulados aparecem onde no frontend?**  
R: Mesma query de polls normais, mas com `source_kind='simulated'` (pode filtrar/destacar).

---

## 🚀 Comece Agora!

```bash
cd ~/electiolab

# Fase 1
npx tsx scripts/import-deputado-tier1.ts --dry-run
# ... revisar output
npx tsx scripts/import-deputado-tier1.ts --apply

# Fase 2 (deixe rodar)
npx tsx scripts/estimate-deputado-by-state.ts --apply &

# Enquanto roda, leia o guia de Fase 3
cat docs/PODER360-DEPUTADO-GUIDE.md
```

---

**Status:** ✅ Tudo pronto para execução  
**Data:** 2026-09-29  
**Responsável:** ElectioLab Team
