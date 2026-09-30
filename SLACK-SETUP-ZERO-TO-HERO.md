# 🎯 Slack Setup - Zero to Hero

**Objetivo:** Receber alertas de segurança no Slack  
**Tempo:** 15 minutos  
**Dificuldade:** Fácil

---

## ✅ PASSO 1: Criar Workspace Slack (Se não tiver)

### 1.1 Acesse Slack
- Vá para: https://slack.com/
- Clique em **"Create a new workspace"**
- Ou clique em **"Sign in"** se já tiver conta

### 1.2 Crie sua workspace
1. Email: seu email (ex: luiz@gastronomizae.com)
2. Clique **"Next"**
3. Crie senha
4. Nome da workspace: **"ElectioLab"**
5. URL da workspace: **"electiolab"** (será electiolab.slack.com)
6. Clique **"Create Workspace"**

### 1.3 Convide você mesmo
- Slack vai pedir para adicionar pessoas
- Clique **"Skip for now"** (você é o único)
- Finalize o setup

**Resultado:** Você está agora em `electiolab.slack.com` ✅

---

## ✅ PASSO 2: Criar Canal #security-alerts

### 2.1 Criar canal
1. Na sidebar esquerda, procure **"Channels"**
2. Clique no **+** (ou procure "Create channel")
3. Nome: **security-alerts**
4. Descrição: "Alertas automáticos de segurança do ElectioLab"
5. Visibilidade: **"Public"**
6. Clique **"Create"**

**Resultado:** Canal #security-alerts criado ✅

---

## ✅ PASSO 3: Criar App para Webhook

### 3.1 Vá para Slack Apps
1. Acesse: https://api.slack.com/apps
2. Se pedirá login → use sua conta
3. Selecione workspace: **"ElectioLab"**

### 3.2 Criar novo app
1. Clique **"Create New App"**
2. Escolha **"From scratch"**
3. Preencha:
   - **App name:** `ElectioLab Security`
   - **Workspace:** Selecione "ElectioLab"
4. Clique **"Create App"**

**Resultado:** App criado ✅

---

## ✅ PASSO 4: Configurar Webhook

### 4.1 Ativar Incoming Webhooks
1. Na página do app, clique em **"Incoming Webhooks"** (sidebar esquerdo)
2. Toggle **"Activate Incoming Webhooks"** para **"ON"**
3. Clique **"Save Changes"**

### 4.2 Criar Webhook para #security-alerts
1. Clique **"Add New Webhook to Workspace"**
2. Vai abrir uma popup pedindo permissão
3. Selecione canal: **#security-alerts**
4. Clique **"Allow"**

### 4.3 Copiar Webhook URL
1. Você verá uma URL que começa com:
   ```
   https://hooks.slack.com/services/T.../B.../...
   ```
2. **Copie essa URL completa** (você vai usar em breve)
3. Clique **"Copy"** ou selecione e Cmd+C

**Resultado:** Webhook URL copiada ✅

**Sua URL ficará assim:**
```
https://hooks.slack.com/services/T.../B.../... (URL completa com 100+ caracteres)
```

---

## ✅ PASSO 5: Testar Webhook Localmente

### 5.1 Teste antes de usar
```bash
# Substitua YOUR_WEBHOOK_URL com a URL que você copiou de Slack
# (URL começa com https://hooks.slack.com/services/)

curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🧪 Test message from ElectioLab"}' \
  YOUR_WEBHOOK_URL
```

### 5.2 Resultado esperado
- Você recebe mensagem em #security-alerts
- Mensagem diz: "🧪 Test message from ElectioLab"

Se funcionou → Você está pronto! ✅

Se não funcionou → Verifique se:
1. URL está correta (sem espaços no início/fim)
2. Canal está correto (#security-alerts)
3. App tem permissão no workspace

---

## ✅ PASSO 6: Configurar no Vercel

### 6.1 Ir para Vercel Dashboard
1. Acesse: https://vercel.com/dashboard
2. Clique no projeto: **"electiolab"**
3. Vá para **"Settings"** (canto superior direito)

### 6.2 Adicionar Environment Variable
1. Clique em **"Environment Variables"** (sidebar esquerdo)
2. Clique em **"Add"** ou **"New"**
3. Preencha:
   - **Name:** `SLACK_SECURITY_WEBHOOK`
   - **Value:** Cole a URL do webhook aqui
   - **Environments:** Marque:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
4. Clique **"Save"** ou **"Add"**

**Resultado:** Variável configurada ✅

---

## ✅ PASSO 7: Triggar Redeploy

### 7.1 Fazer commit vazio para redeploy
```bash
cd /Users/luizlessa/electiolab

git commit --allow-empty -m "trigger: activate slack security webhook"

git push origin main
```

### 7.2 Verificar deployment
1. Vá para Vercel → Deployments
2. Aguarde o novo deployment ficar **"Ready"**
3. Pode levar 2-3 minutos

**Resultado:** Vercel redeployado com webhook ✅

---

## ✅ PASSO 8: Testar Alertas de Verdade

### 8.1 Simular brute force no Supabase
1. Abra Supabase: https://supabase.com/dashboard
2. Selecione projeto ElectioLab
3. Vá para **SQL Editor** → **New Query**
4. Cole e execute:

```sql
-- Inserir 6 falhas de auth (vai disparar alerta)
INSERT INTO auth_failure_logs 
  (endpoint, method, ip_address, status_code, error_message, user_agent)
VALUES 
  ('/admin', 'GET', '10.0.0.99', 401, 'Unauthorized', 'Mozilla/5.0'),
  ('/admin', 'GET', '10.0.0.99', 401, 'Unauthorized', 'Mozilla/5.0'),
  ('/admin', 'GET', '10.0.0.99', 401, 'Unauthorized', 'Mozilla/5.0'),
  ('/admin', 'GET', '10.0.0.99', 401, 'Unauthorized', 'Mozilla/5.0'),
  ('/admin', 'GET', '10.0.0.99', 401, 'Unauthorized', 'Mozilla/5.0'),
  ('/admin', 'GET', '10.0.0.99', 401, 'Unauthorized', 'Mozilla/5.0');
```

5. Clique **Run**

### 8.2 Aguarde o alerta
- Espere **5 minutos** (próxima execução do cron)
- Você receberá mensagem em #security-alerts:

```
🔒 Security Alert - auth_failures
Severity: WARNING
Type: auth_failures
Count: 6
IP/ID: 10.0.0.99
Message: 🚨 Auth brute force detected: 10.0.0.99 (6 failures in 15min)
```

**Resultado:** Alerta recebido em Slack! ✅

---

## 🎯 Sumário do que você configurou

| Passo | O que fez | Status |
|-------|-----------|--------|
| 1 | Criar Slack workspace | ✅ |
| 2 | Criar canal #security-alerts | ✅ |
| 3 | Criar app ElectioLab Security | ✅ |
| 4 | Ativar Incoming Webhooks | ✅ |
| 5 | Testar webhook localmente | ✅ |
| 6 | Adicionar env var em Vercel | ✅ |
| 7 | Redeploy com webhook | ✅ |
| 8 | Testar alerta real | ✅ |

---

## 🚨 Troubleshooting

### "Webhook inválido" ou "401/403"
**Solução:**
1. Verifique URL não tem espaços
2. Regenere webhook (clique "Rotate" em Slack)
3. Copie URL nova e atualize em Vercel

### "Permissão negada"
**Solução:**
1. Volte para https://api.slack.com/apps
2. Clique no app "ElectioLab Security"
3. Verifique "Incoming Webhooks" está ON
4. Se não aparecer, recriar webhook

### "Nenhuma mensagem chegou"
**Solução:**
1. Verificar se cron rodou (aguarde 5 min)
2. Checar logs em Vercel → Deployments → Logs
3. Verificar se há dados em auth_failure_logs

### "Mensagens estranhas ou truncadas"
**Solução:** Verificar se a URL do webhook está exatamente correta no Vercel

---

## 📋 Checklist Final

- [ ] Workspace Slack criado
- [ ] Canal #security-alerts criado
- [ ] App "ElectioLab Security" criado
- [ ] Incoming Webhooks ativado
- [ ] Webhook testado localmente (curl)
- [ ] Webhook URL copiada
- [ ] SLACK_SECURITY_WEBHOOK adicionado em Vercel
- [ ] Vercel redeployado
- [ ] Alerta recebido em #security-alerts
- [ ] Tudo funcionando! 🎉

---

## 🎊 Resultado Final

Agora você tem:

```
✅ Slack workspace com canal privado
✅ App integrado no Slack
✅ Webhook ativo enviando alertas
✅ Vercel configurado
✅ Alertas chegando em tempo real em #security-alerts
```

**Quando um ataque acontecer:**
1. ⏱️ Você recebe alerta em #security-alerts em até 5 minutos
2. 📊 Com IP, tipo de ataque, e timestamp
3. 🔍 Você investiga no Supabase
4. 🛡️ Você toma ação (bloquear IP, resetar senha, etc)

---

## 🚀 Próximo Passo

Depois que Slack estiver funcionando:
- [ ] Criar dashboard em `/dashboard/security-alerts`
- [ ] Configurar relatório semanal por email
- [ ] Integrar com CloudFlare WAF para auto-block

**Parabéns! Você tem alertas de segurança em tempo real!** 🎉

---

*Guia criado: 2026-09-30*  
*Para ElectioLab Security Hardening*
