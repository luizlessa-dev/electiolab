# 🚀 COMEÇAR AQUI - Migration TSE

## ⏱️ TEMPO TOTAL
**10-15 minutos**

---

## 📁 ARQUIVOS CRIADOS

| Arquivo | Propósito |
|---------|-----------|
| `apps/pipeline/migrations/001_create_tse_tables.sql` | 🔥 **SQL a executar** |
| `MIGRATION_CHECKLIST.md` | ✅ Passo-a-passo detalhado |
| `docs/MIGRATION_GUIDE.md` | 📖 Guia com prints |
| `scripts/validate-migration.mjs` | 🔍 Validar antes |
| `scripts/validate-schema.mjs` | ✔️ Validar depois |

---

## 🎯 O QUE SERÁ CRIADO

### 4 Tabelas Novas
```
candidates
├─ Armazena candidatos do TSE (DivulgaCandContas)
├─ 27 estados × 4 cargos
└─ ~2.800+ candidatos por eleição

election_results
├─ Armazena resultados em tempo real (TSE Resultados)
├─ Apuração com % de contagem
└─ Atualizado durante eleições

election_results_candidatos
├─ Votos por candidato
└─ Relacionado com election_results

data_source_audit
├─ Log de sincronizações
├─ Rastreamento de credibilidade
└─ Histórico de erros/sync
```

### Extras
- ✅ 8+ índices para performance
- ✅ 2 views para queries comuns
- ✅ 8 RLS policies para segurança
- ✅ 3 triggers para audit trail

---

## 🔥 PASSO 1: VALIDAR LOCALMENTE (30 segundos)

```bash
node scripts/validate-migration.mjs
```

**Você deve ver:**
```
✅ MIGRATION VALIDADA COM SUCESSO!
```

Se passou → Continue para Passo 2

---

## 🌐 PASSO 2: EXECUTAR NO SUPABASE (5 minutos)

### A) Abra Supabase
```
https://app.supabase.com
→ Selecione projeto "electiolab"
→ SQL Editor → New Query
```

### B) Copie o SQL
```
Abra: apps/pipeline/migrations/001_create_tse_tables.sql
Selecione tudo: Ctrl+A
Copie: Ctrl+C
```

### C) Cole no Supabase
```
Clique no editor branco
Cole: Ctrl+V
```

Você deve ver ~350 linhas de SQL

### D) Execute
```
Clique "Run" ou Ctrl+Enter
```

**Você deve ver:**
```
✓ Query executed successfully
```

---

## ✅ PASSO 3: VALIDAR NO SUPABASE (2 minutos)

### A) Ver as tabelas
```
Menu lateral → Table Editor
Procure por:
  ✅ candidates
  ✅ election_results
  ✅ election_results_candidatos
  ✅ data_source_audit
```

### B) Teste inserção (no SQL Editor)
```sql
INSERT INTO candidates (
  nome, cargo, estado, ano, partido, sigla_partido, numero
) VALUES (
  'TESTE', 'presidente', 'SP', 2026, 'PT', 'PT', '13'
);

SELECT COUNT(*) FROM candidates;
```

Deve retornar: `1`

### C) Limpe o teste
```sql
DELETE FROM candidates WHERE nome = 'TESTE';
SELECT COUNT(*) FROM candidates;
```

Deve retornar: `0`

---

## 🎉 PRONTO!

Se todos os passos passaram:

✅ Schema criado  
✅ Tabelas funcionando  
✅ RLS ativo  
✅ Índices criados  

---

## 📋 PRÓXIMO PASSO

Depois de validar, você precisa **integrar os endpoints** para fazer INSERT:

```
Arquivo: apps/pipeline/api/tse/sync/candidatos.ts
Fazer: INSERT into candidates table

Arquivo: apps/pipeline/api/tse/sync/resultados.ts
Fazer: INSERT into election_results table
```

Tempo estimado: 1-2 horas

---

## ⚠️ SE ALGO DER ERRO

**Erro: "Relation already exists"**
→ Normal! Pode rodar novamente. A migration usa IF NOT EXISTS

**Erro: "Permission denied"**
→ Use SUPABASE_SERVICE_ROLE_KEY, não ANON_KEY

**Erro: "Syntax error"**
→ Copie de novo o SQL cuidadosamente

---

## 📊 ESTRUTURA DO SCHEMA

```
public.candidates
├─ id (UUID, PK)
├─ tse_sequencial (VARCHAR)
├─ nome (VARCHAR)
├─ cargo (VARCHAR: presidente|governador|senador|deputado)
├─ estado (VARCHAR, 2 chars)
├─ ano (INT)
├─ partido (VARCHAR)
├─ sigla_partido (VARCHAR)
├─ numero (VARCHAR)
├─ situacao (VARCHAR: APTO|INAPTO|CASSADO|RENUNCIACAO)
├─ bens (NUMERIC)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)
└─ synced_at (TIMESTAMP)

public.election_results
├─ id (UUID, PK)
├─ cargo (VARCHAR)
├─ estado (VARCHAR, NULL para presidente)
├─ turno (INT: 1|2)
├─ ano (INT)
├─ data_apuracao (TIMESTAMP)
├─ percentual_apuracao (NUMERIC 0-100)
├─ secoes_apuradas (INT)
├─ secoes_totais (INT)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)
└─ synced_at (TIMESTAMP)

public.election_results_candidatos
├─ id (UUID, PK)
├─ result_id (UUID, FK → election_results)
├─ numero_candidato (VARCHAR)
├─ nome_candidato (VARCHAR)
├─ sigla_partido (VARCHAR)
├─ votos_nominais (INT)
├─ votos_legenda (INT, nullable)
├─ percentual (NUMERIC)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)

public.data_source_audit
├─ id (UUID, PK)
├─ source_type (VARCHAR: tse_candidatos|tse_resultados|etc)
├─ cargo (VARCHAR)
├─ estado (VARCHAR)
├─ ano (INT)
├─ total_records (INT)
├─ inserted_count (INT)
├─ updated_count (INT)
├─ error_count (INT)
├─ errors (TEXT, JSON)
├─ credibility_score (INT 0-10)
├─ refresh_interval_hours (INT)
├─ synced_at (TIMESTAMP)
├─ next_sync_at (TIMESTAMP)
└─ created_at (TIMESTAMP)
```

---

## 🔒 RLS POLICIES

- ✅ Public READ access (todos podem ler)
- ✅ Service Role WRITE access (apenas backend)
- ✅ Audit trail automático (created_at/updated_at)

---

## 📈 ÍNDICES CRIADOS

```
candidates:
  idx_candidates_cargo_estado_ano
  idx_candidates_numero_ano
  idx_candidates_tse_sequencial
  idx_candidates_estado

election_results:
  idx_election_results_cargo_estado_ano
  idx_election_results_data_apuracao
  idx_election_results_cargo_turno_ano

election_results_candidatos:
  idx_election_results_candidatos_result_id
  idx_election_results_candidatos_numero
```

---

## 📝 VIEWS CRIADAS

```sql
-- Ver candidatos por eleição (agregado)
SELECT * FROM candidates_by_election
WHERE ano = 2026 AND cargo = 'presidente'

-- Ver cobertura de resultados
SELECT * FROM election_results_coverage
WHERE ano = 2026
```

---

## ✨ AUTOMATION

Triggers que rodam automaticamente:
- ✅ `updated_at` é atualizado quando row muda
- ✅ Sem preciso fazer UPDATE manual

---

## 📞 DÚVIDAS?

Se algo não funcionar, verifique:

1. **Supabase acessível?**
   ```bash
   curl https://seu-project.supabase.co
   ```

2. **SQL válido?**
   ```bash
   node scripts/validate-migration.mjs
   ```

3. **Chave correta?**
   - Settings → API → Service Role Key

4. **Copiar/colar sem erros?**
   - Tente novamente com cuidado

---

## ✅ CHECKLIST RÁPIDO

- [ ] Rodou `validate-migration.mjs` com sucesso
- [ ] Abriu Supabase
- [ ] Copiou SQL do arquivo
- [ ] Executou no SQL Editor
- [ ] Vê "Query executed successfully"
- [ ] 4 tabelas visíveis em Table Editor
- [ ] Teste de inserção passou
- [ ] Teste de limpeza passou

**Pronto para próxima fase!** 🚀

---

## 🎯 RESUMO

| O Quê | Resultado |
|------|-----------|
| Tabelas | 4 criadas ✅ |
| Índices | 8+ criados ✅ |
| RLS | 8 policies ✅ |
| Views | 2 criadas ✅ |
| Triggers | 3 automáticos ✅ |
| Teste | Inserção/Deleção ✅ |

**Status:** ✅ **READY FOR INTEGRATION**

---

**Tempo Total Gasto:** 10-15 min  
**Próximo:** Integrar endpoints (1-2h)  
**Fase:** Phase 2b (DB Integration)
