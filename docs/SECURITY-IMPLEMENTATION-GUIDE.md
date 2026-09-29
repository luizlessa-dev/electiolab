# 🔒 Guia de Implementação de Segurança

Implementação de segurança completa do ElectioLab em 2026-09-29.

---

## ✅ Implementado

### 1. Headers de Segurança
- **Arquivo**: `next.config.ts`
- **Status**: ✅ Ativo
- **Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy

### 2. Middleware Global
- **Arquivo**: `middleware.ts`
- **Status**: ✅ Ativo
- **Funcionalidade**: Aplica headers de segurança em todas requisições

### 3. Autenticação de Admin
- **Arquivo**: `src/app/admin/layout.tsx`
- **Status**: ✅ Ativo
- **Proteção**: Supabase session + verificação de role admin

### 4. Proteção de Rotas
- ✅ `/admin/*` — autenticação obrigatória
- ✅ `/api/health*` — proteção com `HEALTH_CHECK_KEY`
- ✅ `/api/admin/*` — requerem API key
- ✅ `/api/debug/*` — bloqueadas em produção
- ✅ `/api/cron/*` — protegidas por Vercel Cron

### 5. Validação de Inputs
- **Arquivo**: `src/lib/validation/api-schemas.ts`
- **Status**: ✅ Schemas criados
- **Schemas**: RevalidateQuery, HealthCheck, DiscrepancyFilter, PollIngestion, StripeWebhook, TseSync

### 6. Rate Limiting Distribuído
- **Arquivo**: `src/lib/middleware/distributed-rate-limit.ts`
- **Status**: ✅ Implementado
- **Backend**: Supabase (funciona em serverless)
- **Migration**: `20260929120000_distributed_rate_limit.sql`

### 7. Debug Guard Reforçado
- **Arquivo**: `src/lib/debug-guard.ts`
- **Status**: ✅ Atualizado
- **Proteção**: Bloqueado em produção, requer token em dev

### 8. Secrets Rotation
- ✅ SUPABASE_SERVICE_ROLE_KEY — rotacionada
- ✅ RESEND_API_KEY — rotacionada
- ✅ CRON_SECRET — novo valor gerado
- ✅ REVALIDATE_TOKEN — novo valor gerado
- ✅ .env.local — removido do git tracking

---

## 📋 TODO: Aplicar Zod nas Rotas

### Rotas que Precisam Validação

1. **`/api/revalidate`**
   ```typescript
   import { RevalidateQuerySchema } from '@/lib/validation/api-schemas';
   
   export async function POST(req: NextRequest) {
     const query = RevalidateQuerySchema.parse(req.nextUrl.searchParams);
     // ... resto da lógica
   }
   ```

2. **`/api/v1/polls`**
   - Validar query parameters (state, year, limit, offset)
   - Criar schema: `PollsQuerySchema`

3. **`/api/v1/averages`**
   - Validar query parameters
   - Criar schema: `AveragesQuerySchema`

4. **`/api/v1/drift`**
   - Validar query parameters (url, baseline)
   - Usar schema existente

5. **`/api/admin/ingest`**
   ```typescript
   import { PollIngestionSchema } from '@/lib/validation/api-schemas';
   
   export async function POST(req: NextRequest) {
     const body = PollIngestionSchema.parse(await req.json());
     // ... resto da lógica
   }
   ```

6. **`/api/tse/sync`**
   ```typescript
   import { TseSyncParamsSchema } from '@/lib/validation/api-schemas';
   
   export async function POST(req: NextRequest) {
     const params = TseSyncParamsSchema.parse(
       Object.fromEntries(req.nextUrl.searchParams)
     );
     // ... resto da lógica
   }
   ```

---

## 🚀 Como Usar Rate Limiting Distribuído

### Exemplo 1: Proteger uma rota com rate limit

```typescript
import { checkDistributedRateLimit, getRateLimitIdentifier } from '@/lib/middleware/distributed-rate-limit';

export async function POST(req: NextRequest) {
  const identifier = getRateLimitIdentifier(req, 'authorization');
  const limit = await checkDistributedRateLimit(identifier, 100, 60); // 100 req/min
  
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfter),
        }
      }
    );
  }
  
  // ... resto da lógica
}
```

### Exemplo 2: Rate limit customizado por rota

```typescript
// /api/cron/ingest - 10 req/hour
const limit = await checkDistributedRateLimit(identifier, 10, 3600);

// /api/revalidate - 50 req/minute  
const limit = await checkDistributedRateLimit(identifier, 50, 60);
```

---

## 🔄 Próximos Passos Recomendados

### Prioridade ALTA (esta semana)
1. [ ] Aplicar Zod validation em `/api/v1/*` rotas
2. [ ] Aplicar Zod validation em `/api/admin/*` rotas
3. [ ] Implementar rate limiting em rotas críticas
4. [ ] Aplicar migration de rate limit no Supabase (`npx supabase migration up`)

### Prioridade MÉDIA (próximas 2 semanas)
1. [ ] Revisar RLS em tabelas públicas (`polls`, `weighted_averages`)
2. [ ] Implementar logging de segurança (tentativas de acesso a `/admin`)
3. [ ] Adicionar alertas para múltiplas falhas de autenticação
4. [ ] Audit de CORS configuration

### Prioridade BAIXA (próximo mês)
1. [ ] Implementar CSP header (Content-Security-Policy)
2. [ ] Implementar HSTS header (Strict-Transport-Security)
3. [ ] Revisar e atualizar RLS policies
4. [ ] Automação de security audit mensal

---

## 📊 Checklist de Deploy

Antes de fazer deploy para produção:

- [ ] Todas as chaves foram rotacionadas em Vercel
- [ ] `.env.local` foi removido do git tracking
- [ ] Migration de rate limit foi aplicada (`supabase migration up`)
- [ ] Zod schemas foram aplicados nas rotas críticas
- [ ] Rate limiting foi testado em staging
- [ ] Debug endpoints estão bloqueados (`NODE_ENV === production`)
- [ ] Headers de segurança aparecem nas responses
- [ ] Middleware está ativo (checar logs)

---

## 🔗 Referências

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Zod Documentation](https://zod.dev)
- [Next.js Security Best Practices](https://nextjs.org/docs/basic-features/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
