# Setup pendente — ações que dependem de você

3 itens operacionais. **Tempo total estimado: 25 min** (Sentry 5min + R2 10min + Beehiiv 5min).

---

## 1. Sentry — Error monitoring (5 min, gratuito)

### Por que importa
Hoje você voa cego: se uma rota dá 500 em produção, só descobre quando alguém reclama. Sentry envia stack trace por email/Slack assim que acontece.

Já implementei toda a instrumentação no código (`sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`). Está **env-gated** — só ativa se `SENTRY_DSN` estiver presente.

### Passos

1. Acesse https://sentry.io/signup → **Sign up free** (cobre 5k errors/mês, suficiente)
2. Após login, **Create Project**:
   - Platform: **Next.js**
   - Alert frequency: **On every new issue** (default)
   - Project name: `electiolab`
   - Team: default
3. Na próxima tela aparece o **DSN** (formato `https://abc123@o123.ingest.sentry.io/456`). Copie.
4. Adicione no Vercel:

```bash
cd /Users/luizlessa/electiolab
SENTRY_DSN_VALUE="cole_aqui_o_dsn"

# Server-side (sensitive)
echo "$SENTRY_DSN_VALUE" | vercel env add SENTRY_DSN production
echo "$SENTRY_DSN_VALUE" | vercel env add SENTRY_DSN preview

# Client-side (NEXT_PUBLIC = exposto no bundle, mas DSN não é secret)
echo "$SENTRY_DSN_VALUE" | vercel env add NEXT_PUBLIC_SENTRY_DSN production
echo "$SENTRY_DSN_VALUE" | vercel env add NEXT_PUBLIC_SENTRY_DSN preview
```

5. Redeploy: `vercel deploy --prod --yes`
6. Teste: acesse https://electiolab.com/api/_test_sentry_does_not_exist (404 não vai gerar evento — é esperado), mas qualquer erro real (500) vai aparecer no Sentry em ~30s.

### Configuração extra recomendada
- No Sentry: **Settings → Alerts** → criar alerta "Email me on every new issue" pro seu email
- Também ative **Integration → Slack** (se usa Slack) ou GitHub (cria issue automática)

---

## 2. Backup Supabase via Cloudflare R2 (10 min, $0.015/GB/mês)

### Por que importa
Se alguém apagar a base, ou Supabase tiver problema, ou seu cartão atrasar — sem backup você perde tudo. R2 é **muito mais barato que S3** (sem egress fee = grátis pra restaurar).

Workflow `.github/workflows/backup-supabase.yml` já está no repo. Falta só configurar bucket + secrets.

### Passos Cloudflare R2

1. Acesse https://dash.cloudflare.com → **Sign up free** (se não tem conta)
2. Sidebar esquerda: **R2 Object Storage** → **Get started** → adicione cartão (R2 cobra só o que usar; backup do ElectioLab vai dar ~$0.10/mês no início)
3. **Create bucket**:
   - Name: `electiolab-backups`
   - Location hint: South America (sa-east) ou Automatic
   - Storage class: Standard
4. Após criar, vá em **R2 → Manage R2 API Tokens** → **Create API token**:
   - Permissions: **Object Read & Write**
   - Specify bucket: `electiolab-backups`
   - TTL: forever (ou 1 ano)
   - Salve: `Access Key ID`, `Secret Access Key`, e o **Endpoint URL** (formato `https://abc.r2.cloudflarestorage.com`)

### Pegar a connection string do Supabase

5. https://supabase.com/dashboard/project/xoxztzologqeqbajlhya/settings/database
6. Em **Connection string** → aba **URI** → **Mode: session** (não pooler, porque pg_dump precisa de conexão direta)
7. Copie a string (formato `postgresql://postgres.xoxztzologqeqbajlhya:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`)
8. Substitua `[YOUR-PASSWORD]` pela senha do banco (vá em **Database → Reset database password** se não souber)

### Adicionar secrets no GitHub

9. https://github.com/seu-user/electiolab/settings/secrets/actions → **New repository secret** pra cada:

| Secret | Valor |
|---|---|
| `SUPABASE_DB_URL` | connection string da etapa 7-8 |
| `BACKUP_S3_BUCKET` | `electiolab-backups` |
| `BACKUP_S3_ACCESS_KEY` | Access Key ID do passo 4 |
| `BACKUP_S3_SECRET_KEY` | Secret Access Key do passo 4 |
| `BACKUP_S3_ENDPOINT` | URL do passo 4 (ex: `https://abc.r2.cloudflarestorage.com`) |
| `BACKUP_S3_REGION` | `auto` |
| `RESEND_API_KEY` | (opcional, pra notificação de falha) — você já tem essa no Vercel |

### Testar manualmente

10. https://github.com/seu-user/electiolab/actions/workflows/backup-supabase.yml → **Run workflow** → branch `main` → **Run workflow**
11. Veja o run aparecer; deve completar em ~2 min com "✅ uploaded"
12. Confira no R2: bucket deve ter `electiolab/2026-04-29/electiolab-backup-20260429-XXXXXX.sql.gz`

### Custo real estimado
- DB hoje ~50MB comprimido. 365 dias × 50MB = 18GB de armazenamento → **$0.27/mês**
- Restore (egress) = grátis no R2

---

## 3. Beehiiv Scale upgrade (5 min, $39/mês ou pulo)

### Decisão antes de pagar

Você já tem **double opt-in funcionando** sem Beehiiv (salva no Supabase). O que **muda com Scale**:
- ✅ Welcome email automático ao confirmar
- ✅ Newsletter delivery profissional (templates, drag-drop editor, agendamento)
- ✅ Analytics de open rate / click rate / unsubscribe
- ✅ Segmentação por tag (ex: "interessados em SP", "Pro subscribers")
- ✅ Conformidade DKIM/SPF automática

### Alternativas se quer evitar $39/mês

**A) Resend pra newsletter também (DIY, $0)**
- Resend tem free tier de 3000 emails/mês ou $20/mo pra 50k.
- Já temos integração funcionando. Eu posso adaptar o `cron_send_weekly_digest` pra usar Resend direto, sem Beehiiv. Você perde o editor visual mas economiza.

**B) Substack ($0)**
- Free, mas migração trabalhosa: você importa o CSV de subscribers e troca o domínio do `subscribe`. Substack não tem API pública pra cadastro automático — só import manual de CSV mensal.

**C) Mailchimp Free**
- 500 contatos / 1000 emails/mês grátis. Suficiente pra começar. API REST decente.

### Se decidir Beehiiv Scale (recomendado se priorizar UX editorial)

1. https://app.beehiiv.com/ → Settings (engrenagem) → **Subscription** → **Upgrade**
2. Escolha **Scale** ($39/mo) → cartão internacional → checkout
3. Após upgrade, vá em **Settings → Integrations → API** → **Create API key** (agora desbloqueado)
4. Adicione no Vercel:

```bash
cd /Users/luizlessa/electiolab
echo "bh_..." | vercel env add BEEHIIV_API_KEY production
echo "bh_..." | vercel env add BEEHIIV_API_KEY preview
echo "pub_c3bcbc9a-500b-4f27-8a5b-ba341b4d9970" | vercel env add BEEHIIV_PUBLICATION_ID production
echo "pub_c3bcbc9a-500b-4f27-8a5b-ba341b4d9970" | vercel env add BEEHIIV_PUBLICATION_ID preview
```

5. Redeploy
6. Teste: novo cadastro em `electiolab.com`, confirma o link, verifica que welcome email do Beehiiv chega

### Recomendação minha

- Se você planeja **enviar newsletter editorial semanal de verdade** (3000+ subscribers projetados pro fim de 2026): **Beehiiv Scale vale**
- Se a newsletter é **só notificação/digest automatizado**: **fica com Resend DIY** ($0 ou $20)

---

## Status de cada item

- [ ] Sentry DSN configurado
- [ ] Cloudflare R2 + GitHub secrets
- [ ] Decisão Beehiiv (upgrade ou Resend DIY)

Quando completar 1 e 2, me avise — eu valido fazendo um deploy de teste e checando o Sentry capturar o erro + checando o backup no R2.

Pra item 3, me diz qual rota escolheu (A/B/C/Beehiiv) que eu termino o setup ou refatoro pra Resend DIY.
