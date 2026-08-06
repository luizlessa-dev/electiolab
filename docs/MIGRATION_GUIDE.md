# 🗄️ Guia de Execução: Migrations TSE

**Arquivo:** `apps/pipeline/migrations/001_create_tse_tables.sql`  
**Tempo Estimado:** 5-10 minutos  
**Risco:** Baixo (tabelas novas, sem dependências)

---

## Passo 1: Acessar Supabase SQL Editor

1. Abra https://app.supabase.com
2. Selecione seu projeto ElectioLab
3. No menu lateral, clique em **SQL Editor**
4. Clique no botão **"+ New Query"**

---

## Passo 2: Copiar e Colar SQL

1. Abra o arquivo: `apps/pipeline/migrations/001_create_tse_tables.sql`
2. Copie **TODO O CONTEÚDO** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** (ou `Ctrl+Enter`)

---

## Passo 3: Validar Execução

Se tudo correu bem, você verá:

```
✓ Query executed successfully
```

E as tabelas estarão criadas:
- ✅ `candidates`
- ✅ `election_results`
- ✅ `election_results_candidatos`
- ✅ `data_source_audit`

---

## Passo 4: Verificar Tabelas no Supabase

1. No menu lateral, clique em **Table Editor**
2. Você deve ver as 4 novas tabelas:

```
public
├── candidates
├── election_results
├── election_results_candidatos
└── data_source_audit
```

3. Clique em cada uma para validar as colunas

---

## Passo 5: Testar com Query de Verificação

No SQL Editor, execute esta query para validar:

```sql
-- Verificar que tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'candidates%'
  OR table_name LIKE 'election%'
  OR table_name LIKE 'data_source%'
ORDER BY table_name;

-- Resultado esperado:
-- candidates
-- election_results
-- election_results_candidatos
-- data_source_audit
```

---

## Passo 6: Validar Índices

Execute para confirmar que os índices foram criados:

```sql
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (tablename = 'candidates' 
       OR tablename = 'election_results' 
       OR tablename = 'election_results_candidatos')
ORDER BY indexname;
```

**Resultado esperado:** 8+ índices criados

---

## Passo 7: Validar RLS Policies

Execute para verificar Row Level Security:

```sql
SELECT policyname, tablename 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Resultado esperado:** 8 policies criadas (2 por tabela)

---

## Passo 8: Verificar Views

Execute para validar views criadas:

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'candidates%'
  OR table_name LIKE 'election%'
ORDER BY table_name;
```

**Resultado esperado:**
- `candidates_by_election`
- `election_results_coverage`

---

## Passo 9: Inserir Dados de Teste (Opcional)

Para testar os endpoints, insira um candidato de teste:

```sql
INSERT INTO candidates (
  nome, cargo, estado, ano, partido, sigla_partido, numero
) VALUES (
  'TESTE CANDIDATO',
  'presidente',
  'SP',
  2026,
  'PARTIDO TESTE',
  'PT',
  '13'
);

-- Verificar inserção
SELECT COUNT(*) as total FROM candidates;
-- Resultado esperado: 1
```

---

## Passo 10: Testar Trigger de updated_at

Execute:

```sql
-- Inserir registro
INSERT INTO candidates (
  nome, cargo, estado, ano, partido, sigla_partido
) VALUES (
  'CANDIDATO 2',
  'governador',
  'RJ',
  2026,
  'PL',
  'PL'
);

-- Verificar que updated_at foi preenchido
SELECT nome, created_at, updated_at 
FROM candidates 
ORDER BY created_at DESC 
LIMIT 1;

-- Resultado esperado:
-- created_at e updated_at devem estar com mesmo timestamp
```

---

## ✅ Checklist de Validação

- [ ] SQL executado sem erros
- [ ] 4 tabelas criadas
- [ ] 8+ índices criados
- [ ] 8 RLS policies criadas
- [ ] 2 views criadas
- [ ] Data de teste inserida (opcional)
- [ ] Triggers funcionando (created/updated_at)

---

## ⚠️ Se Algo Der Erro

### Erro: "Relation already exists"
**Causa:** Tabelas já existem de um run anterior  
**Solução:** A migration usa `CREATE TABLE IF NOT EXISTS`, então é seguro rodar novamente

### Erro: "Permission denied"
**Causa:** Usuário sem permissão de criar tabelas  
**Solução:** Use a `SERVICE_ROLE_KEY` (conta Supabase tem permissão total)

### Erro: "Invalid syntax"
**Causa:** SQL copiado incorretamente  
**Solução:** Copie o arquivo completo novamente, linha por linha

---

## Próximo Passo

Depois de validar as tabelas, você precisa:

1. **Atualizar os endpoints** para fazer INSERT:
   - `api/tse/sync/candidatos.ts` → INSERT into candidates
   - `api/tse/sync/resultados.ts` → INSERT into election_results

2. **Testar os endpoints** com dados reais do TSE

3. **Configurar sync job** (semanal para candidatos, real-time para resultados)

---

## Comando Rápido (Se Preferir CLI)

Se tiver `supabase` CLI instalado:

```bash
supabase db push --password <sua-senha-db>
```

Mas é mais fácil usar o SQL Editor do Supabase dashboard.

---

## Backup (Importante!)

Antes de rodar em produção, faça backup:

```bash
# Supabase → Settings → Database → Backups → Create Backup
```

---

**Migration Status:** ✅ Pronta para executar
