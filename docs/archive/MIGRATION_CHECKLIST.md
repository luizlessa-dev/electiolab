# ✅ MIGRATION CHECKLIST - Passo a Passo

## 🎯 OBJETIVO
Criar schema no Supabase para armazenar dados do TSE (candidatos e resultados)

**Tempo estimado:** 10-15 minutos  
**Complexidade:** Baixa  
**Risco:** Nenhum (novas tabelas, sem dependências)

---

## 📋 PRÉ-EXECUÇÃO

- [ ] Abra este arquivo: `apps/pipeline/migrations/001_create_tse_tables.sql`
- [ ] Leia o comentário no topo (explica o que será criado)
- [ ] Faça backup do Supabase:
  - Vá em **Settings → Database → Backups → Create Backup**

---

## 🚀 EXECUÇÃO

### Passo 1: Validar SQL Localmente
```bash
node scripts/validate-migration.mjs
```

**Resultado esperado:**
```
✅ MIGRATION VALIDADA COM SUCESSO!
```

- [ ] Validação passou

---

### Passo 2: Acessar Supabase Dashboard

1. Abra https://app.supabase.com
2. Selecione projeto **ElectioLab**
3. No menu lateral, clique em **SQL Editor**

- [ ] Supabase dashboard aberto
- [ ] Projeto correto selecionado
- [ ] SQL Editor acessível

---

### Passo 3: Criar Nova Query

1. No SQL Editor, clique no botão **"+ New Query"**
2. Uma janela branca aparecerá

- [ ] Nova query criada

---

### Passo 4: Copiar e Colar SQL

1. Abra o arquivo: `apps/pipeline/migrations/001_create_tse_tables.sql`
2. Selecione todo o conteúdo: `Ctrl+A` ou `Cmd+A`
3. Copie: `Ctrl+C` ou `Cmd+C`
4. Volta para Supabase SQL Editor
5. Clique no editor branco
6. Cole: `Ctrl+V` ou `Cmd+V`

**Você deve ver ~350 linhas de SQL**

- [ ] SQL colado no editor
- [ ] Está legível (sem caracteres especiais)

---

### Passo 5: Executar Migration

1. Clique no botão **"Run"** (canto superior direito)
   - OU use atalho `Ctrl+Enter` / `Cmd+Enter`

2. Aguarde ~5-10 segundos

**Você deve ver:**
```
✓ Query executed successfully
```

Se não aparecer, veja **Seção de Erros** mais abaixo.

- [ ] Query executada sem erros

---

## ✔️ PÓS-EXECUÇÃO

### Passo 6: Verificar Tabelas no Dashboard

1. No menu lateral, clique em **Table Editor**
2. Você deve ver as 4 novas tabelas:

```
public
├── candidates ........................ ✅
├── election_results ................. ✅
├── election_results_candidatos ....... ✅
└── data_source_audit ................ ✅
```

- [ ] Todas as 4 tabelas visíveis

---

### Passo 7: Validar Schema

Execute no SQL Editor esta query de teste:

```sql
-- Teste: Contar tabelas criadas
SELECT COUNT(*) as tabelas_criadas
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'candidates',
    'election_results',
    'election_results_candidatos',
    'data_source_audit'
  );
```

**Resultado esperado:** `4`

- [ ] Query retornou `4`

---

### Passo 8: Teste de Inserção

Execute no SQL Editor:

```sql
-- Teste: Inserir candidato de teste
INSERT INTO candidates (
  nome,
  cargo,
  estado,
  ano,
  partido,
  sigla_partido,
  numero
) VALUES (
  'CANDIDATO TESTE',
  'presidente',
  'SP',
  2026,
  'PARTIDO TESTE',
  'PT',
  '13'
);

-- Verificar inserção
SELECT COUNT(*) as candidatos FROM candidates;
```

**Resultado esperado:** Primeira execução inseriu 1 linha, segunda query retorna `1`

- [ ] Inserção funcionou
- [ ] Query de contagem retornou `1`

---

### Passo 9: Limpar Dados de Teste

Execute no SQL Editor:

```sql
-- Deletar candidato de teste
DELETE FROM candidates WHERE nome = 'CANDIDATO TESTE';

-- Verificar
SELECT COUNT(*) as candidatos FROM candidates;
```

**Resultado esperado:** `0`

- [ ] Dados de teste removidos

---

### Passo 10: Script de Validação (Opcional)

Se quiser validação mais completa, execute:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=sua-chave-aqui \
node scripts/validate-schema.mjs
```

(Pegue URL e chave em Supabase → Settings → API)

- [ ] Script de validação passou (opcional)

---

## ⚠️ TROUBLESHOOTING

### Erro: "Relation already exists"
```
ERROR: relation "candidates" already exists
```
**Causa:** Tabelas já existem de um run anterior  
**Solução:** Isso é seguro! A migration usa `IF NOT EXISTS`, então é idempotente. Pode rodar novamente sem problema.

- [ ] Marcado: Erro resolvido

---

### Erro: "Permission denied"
```
ERROR: permission denied for schema public
```
**Causa:** Credenciais não têm permissão  
**Solução:** Certifique-se de que está usando a `SERVICE_ROLE_KEY`, não a `ANON_KEY`

- [ ] Marcado: Erro resolvido

---

### Erro: "Syntax error"
```
ERROR: syntax error at or near "CREATE TABLE"
```
**Causa:** SQL foi colado incorretamente (caracteres especiais)  
**Solução:** 
1. Delete o que está no editor
2. Copie de novo o arquivo completo
3. Cole cuidadosamente

- [ ] Marcado: Erro resolvido

---

### Erro: "Invalid index name"
```
ERROR: duplicate key value violates unique constraint
```
**Causa:** Índice já existe  
**Solução:** Rodar novamente (IF NOT EXISTS protege)

- [ ] Marcado: Erro resolvido

---

## 📊 RESUMO DO QUE FOI CRIADO

| Categoria | Item | Status |
|-----------|------|--------|
| **Tabelas** | candidates | ✅ |
| | election_results | ✅ |
| | election_results_candidatos | ✅ |
| | data_source_audit | ✅ |
| **Índices** | 8+ índices | ✅ |
| **Views** | candidates_by_election | ✅ |
| | election_results_coverage | ✅ |
| **RLS** | 8 policies | ✅ |
| **Triggers** | updated_at triggers | ✅ |
| **Functions** | update_updated_at_column | ✅ |

---

## 🎉 PRÓXIMOS PASSOS

Quando terminar a migration:

### Imediato (Hoje)
- [ ] Integrar endpoints API para fazer INSERT
  - `api/tse/sync/candidatos.ts` → INSERT into candidates
  - `api/tse/sync/resultados.ts` → INSERT into election_results

### Curto Prazo (Amanhã)
- [ ] Testar endpoints com dados reais do TSE
- [ ] Configurar rate limiting
- [ ] Implementar proxy CORS para DivulgaCandContas

### Médio Prazo (Próxima semana)
- [ ] Sincronizar dados históricos 2022
- [ ] Iniciar Fase 3 (institutos de pesquisa)

---

## 📞 PRECISA DE AJUDA?

Se algo não funcionar:

1. **Verifique o arquivo SQL:**
   ```bash
   ls -la apps/pipeline/migrations/001_create_tse_tables.sql
   ```

2. **Copie novamente cuidadosamente** (às vezes caracteres se corrompem)

3. **Se persistir:** Copie o erro exato e compartilhe

---

## ✅ VALIDAÇÃO FINAL

Quando terminar TODOS os passos acima, marque:

- [ ] Pré-execução OK
- [ ] SQL validado localmente
- [ ] SQL executado no Supabase
- [ ] 4 tabelas visíveis
- [ ] Teste de inserção passou
- [ ] Teste de contagem passou
- [ ] Dados de teste removidos
- [ ] Nenhum erro permanente
- [ ] Pronto para próxima fase

**Se tudo marcado: ✅ MIGRATION COMPLETA!**

---

**Data de Execução:** _______________  
**Executado por:** _______________  
**Status Final:** ✅ SUCESSO / ❌ FALHOU (descrever)

