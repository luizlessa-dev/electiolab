# Guia: Aplicar Migration de RLS e Audit Logs

**Migration file:** `supabase/migrations/20260929140000_rls_polls_weighted_averages.sql`

**Objetivo:** Ativar Row Level Security (RLS) em `polls` e `weighted_averages`, criar tabela de audit logs para segurança.

**Tempo estimado:** 2-3 minutos

---

## 📋 Pré-requisitos

- ✅ Acesso ao Supabase dashboard (credenciais admin)
- ✅ Arquivo migration presente no repo
- ✅ Branch `apuracao-2026` disponível localmente

---

## 🔑 Passo 1: Copiar SQL da Migration

### Opção A: Via CLI (recomendado)

```bash
# Mostrar conteúdo da migration
cat supabase/migrations/20260929140000_rls_polls_weighted_averages.sql
```

Copie toda a saída (CTRL+C).

### Opção B: Abrir arquivo no editor

```bash
# Abrir no VS Code
code supabase/migrations/20260929140000_rls_polls_weighted_averages.sql
```

Selecione todo o conteúdo (CTRL+A) e copie (CTRL+C).

---

## 🌐 Passo 2: Acessar Supabase SQL Editor

1. **Abra** https://supabase.com/dashboard
2. **Selecione o projeto** (ElectioLab)
3. **Vá para** SQL Editor (sidebar esquerdo)
4. **Clique em** `New query` (botão azul, canto superior direito)

---

## ✏️ Passo 3: Colar e Revisar SQL

1. **Cole** o SQL no editor (CTRL+V)
2. **Revise** que está tudo aí:
   - `ALTER TABLE polls ENABLE ROW LEVEL SECURITY;`
   - `ALTER TABLE weighted_averages ENABLE ROW LEVEL SECURITY;`
   - `CREATE POLICY "polls_read_public"...`
   - `CREATE TABLE IF NOT EXISTS auth_failure_logs...`
   - `CREATE INDEX...`

3. **Não** modifique nada (apenas revise)

---

## ⚡ Passo 4: Executar

1. **Clique** no botão ▶️ `Run` (canto superior direito)
   - Ou press `CTRL+Enter`

2. **Aguarde** a execução (geralmente < 1 segundo)

3. **Verifique** se não há erros:
   - ✅ **Sucesso:** Tabela de resultados fica vazia ou mostra `rows affected: 0`
   - ❌ **Erro:** Mensagem de erro em vermelho

---

## ✅ Passo 5: Verificar Aplicação

### Verificar RLS foi ativado

```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('polls', 'weighted_averages', 'auth_failure_logs');
```

**Resultado esperado:**
```
tablename          | rowsecurity
polls              | t
weighted_averages  | t
auth_failure_logs  | t
```

### Verificar policies foram criadas

```sql
SELECT policyname, tablename FROM pg_policies 
WHERE tablename IN ('polls', 'weighted_averages', 'auth_failure_logs')
ORDER BY tablename, policyname;
```

**Resultado esperado:** 13+ policies (3+ por tabela)

### Verificar índices

```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'auth_failure_logs';
```

**Resultado esperado:**
```
idx_auth_failure_logs_timestamp
idx_auth_failure_logs_ip_endpoint
```

---

## 🔄 Passo 6: Regenerar TypeScript Schema

Após a migration ser aplicada, execute no seu terminal local:

```bash
cd /Users/luizlessa/electiolab

# Gerar schema TypeScript atualizado
npx supabase gen types typescript > src/types/supabase.ts

# Verificar se foi gerado
cat src/types/supabase.ts | head -50
```

Isso vai atualizar o schema com a nova tabela `auth_failure_logs`.

---

## 🚀 Passo 7: Deploy

```bash
# 1. Commit das mudanças de segurança (se ainda não fez)
git add -A
git commit -m "feat: security hardening - RLS and audit logs"

# 2. Push para GitHub
git push origin apuracao-2026

# 3. Criar PR (se automatizado) ou fazer merge
# O Vercel vai fazer deploy automaticamente
```

---

## 🧪 Passo 8: Testar Funcionalidades

### Testar Rate Limiting
```bash
npx tsx scripts/test-rate-limit.ts --endpoint=polls --requests=60
```

Resultado esperado: Depois de ~50 requisições, deve receber 429.

### Testar Logging de Falhas
```bash
# Tentar acessar /admin sem autenticação
curl http://localhost:3000/admin

# Depois, verificar os logs
# No Supabase SQL Editor:
SELECT * FROM auth_failure_logs 
WHERE endpoint = '/admin' 
ORDER BY timestamp DESC LIMIT 5;
```

### Testar Endpoint de Alertas
```bash
# Precisa estar autenticado como admin
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/security-alerts?hours=1
```

---

## ❌ Troubleshooting

### "Relation auth_failure_logs does not exist"
- **Causa:** Migration não foi aplicada
- **Solução:** Volte ao Passo 3 e execute novamente

### "Permission denied for table auth_failure_logs"
- **Causa:** RLS foi ativado mas app usa anon key
- **Solução:** Código usa `service_role` para escrever, deve funcionar

### TypeScript errors sobre `auth_failure_logs`
- **Causa:** Schema ainda não foi regenerado
- **Solução:** Execute Passo 6 novamente

### Rate limit não funciona
- **Causa:** Tabela `rate_limit_counters` não existe
- **Solução:** Verifique se primeira migration (20260929120000) foi aplicada

---

## 📞 Suporte

Se algo der errado:

1. **Verifique** o arquivo SQL está correto:
   ```bash
   cat supabase/migrations/20260929140000_rls_polls_weighted_averages.sql | wc -l
   # Deve ter 150+ linhas
   ```

2. **Confira** permissões no Supabase:
   - Você é admin do projeto?
   - Token tem acesso ao SQL Editor?

3. **Rollback** (se necessário):
   ```sql
   -- Desativar RLS (vai remover tudo)
   ALTER TABLE polls DISABLE ROW LEVEL SECURITY;
   ALTER TABLE weighted_averages DISABLE ROW LEVEL SECURITY;
   DROP TABLE auth_failure_logs CASCADE;
   ```

---

## 🎯 Checklist Final

- [ ] SQL foi executado sem erros no Supabase
- [ ] `SELECT` retornou 3 tabelas com `rowsecurity = t`
- [ ] Policies foram criadas (13+ no total)
- [ ] Índices foram criados
- [ ] TypeScript schema foi regenerado
- [ ] Build passou: `npm run build`
- [ ] Rate limit test passou (60 requests → 429 após ~50)
- [ ] Admin login ainda funciona
- [ ] PR foi criada/mergeada

---

**Status:** ✅ Pronto para aplicação
**Data:** 2026-09-29
**Risco:** Baixo (DDL não afeta dados existentes)
