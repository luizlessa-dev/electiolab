# Wave 4 - Plano de Validação em Produção

**Data:** 2026-08-08 (nomes de migration corrigidos e passos novos adicionados em 2026-08-11)
**Status:** Em Progresso
**Objetivo:** Validar todas as 3 phases com dados reais

---

## 📋 Checklist de Validação

### ✅ Phase 1: Alertas & Notificações (Slack, Email, Admin)

#### Database Migration
- [ ] Migration `20260810002618_create_discrepancies_table.sql` executou
- [ ] Tabela `discrepancies` criada com índices
- [ ] RLS policies ativas
- [ ] Trigger de `updated_at` funcionando

#### Discrepancy Manager
- [ ] Criar discrepância: POST `/api/admin/discrepancies`
- [ ] Listar discrepâncias: GET `/api/admin/discrepancies?state=SP`
- [ ] Filtrar por severidade: GET `/api/admin/discrepancies?severity=critical`
- [ ] Resolver em lote: POST com ids
- [ ] Estatísticas: Contagem atualizada
- [ ] Auditoria: `resolvedBy` e `resolvedAt` preenchidos

#### Slack Integration
- [ ] Test connection: GET `/api/admin/notifications/test?channel=slack`
- [ ] Enviar anomaly: POST `/api/alerts/anomaly` com `channels: ["slack"]`
- [ ] Mensagem apareceu em #eleicoes-alerts
- [ ] Botões funcionam (View Dashboard, Review)
- [ ] Menções funcionam (@team-analytics)

#### Email Integration
- [ ] Test configuration: GET `/api/admin/notifications/test?channel=email`
- [ ] Email provider configurado (Resend/SendGrid/Mailgun)
- [ ] Enviar anomaly email: POST `/api/alerts/anomaly` com `channels: ["email"]`
- [ ] Email recebido com formatação correta
- [ ] Links clicáveis funcionam

#### Admin Dashboard
- [ ] Acessar: GET `/api/admin/discrepancies`
- [ ] Filtros funcionam (state, severity, type)
- [ ] Busca por candidato funciona
- [ ] Resolver discrepâncias via API
- [ ] Estatísticas atualizadas

---

### ✅ Phase 2: Enriquecimento de Dados (Presidencial, Aprovação, Regional)

#### Presidential Support
- [ ] Adicionar candidatos presidenciais ao real-candidates-2026.ts
- [ ] TSE sync inclui posição presidencial
- [ ] Agregação presidencial: GET `/api/polls/aggregated?position=presidencial`
- [ ] Dashboard mostra seletor de 3 posições

#### Approval Metrics
- [ ] Database: Migration `20260811120000_approval_polls_baseline.sql` executou
- [ ] Tabela `approval_polls` criada com validações
- [ ] Agregação presidencial: GET `/api/approval/aggregated?position=presidencial`
- [ ] Aprovação estadual: GET `/api/approval/aggregated?position=governador&uf=SP`
- [ ] Resposta inclui approval%, disapproval%, neutral%, confidence
- [ ] Tendências detectadas (up/down/stable)

#### Regional Aggregation
- [ ] Agregação Sudeste: GET `/api/regions/aggregated?region=sudeste&position=governador`
- [ ] Agregação em lote: POST `/api/regions/aggregated` com múltiplas regiões
- [ ] Ponderação por população funciona
- [ ] Cobertura de estados atualizada
- [ ] Comparação entre regiões funciona
- [ ] Qualidade de dados calculada

---

### ✅ Phase 3: Analytics & Histórico (Snapshots, Trends, Comparison)

#### Database Migration
- [ ] Migration `20260810002619_create_aggregation_history_table.sql` executou
- [ ] Tabela `aggregation_history` criada
- [ ] Índices otimizados
- [ ] RLS policies ativas

#### Snapshot Recording
- [ ] Registrar snapshot manual via POST (se tiver endpoint)
- [ ] Dados persistem no banco
- [ ] Candidatos armazenados em JSONB
- [ ] Métricas de qualidade salvas

#### Candidate History
- [ ] GET `/api/history/candidate?candidate=João%20Silva&state=SP&days=90`
- [ ] Histórico retorna lista de datas
- [ ] Percentuais variam ao longo do tempo
- [ ] Confiança inclusa
- [ ] Tendência detectada

#### Trend Analysis
- [ ] GET `/api/history/trends?state=SP&days=30` (todos candidatos)
- [ ] GET `/api/history/trends?state=SP&candidate=João%20Silva&days=30` (específico)
- [ ] Volatilidade calculada (std dev)
- [ ] Consistência pontuada (high/medium/low)
- [ ] Trends detectadas (up/down/stable)

#### Period Comparison
- [ ] GET `/api/history/comparison?state=SP` (defaults)
- [ ] GET com períodos customizados
- [ ] Mudanças detectadas por candidato
- [ ] Maiores ganhos e perdas identificados
- [ ] Comparação acurada

---

## 🧪 Testes de Integração

### Executar suíte de testes

```bash
# Phase 1
npm test -- src/__tests__/wave4-phase1.test.ts

# Phase 2
npm test -- src/__tests__/wave4-phase2.test.ts

# Phase 3
npm test -- src/__tests__/wave4-phase3.test.ts

# Todas
npm test -- wave4
```

**Critério de sucesso:** Todos os 59 testes passam

---

## 🔗 Endpoints a Testar

### Phase 1: Alertas
```bash
# Test notifications
curl http://localhost:3000/api/admin/notifications/test

# List discrepancies
curl "http://localhost:3000/api/admin/discrepancies?state=SP&limit=5"

# Send alert
curl -X POST http://localhost:3000/api/alerts/anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "anomaly": {
      "state": "SP",
      "position": "governador",
      "candidateName": "João Silva",
      "researchPercentage": 30,
      "aggregatedPercentage": 38,
      "deviation": 8,
      "confidence": 0.85,
      "severity": "critical",
      "timestamp": "2026-08-08T12:00:00Z"
    },
    "channels": ["slack", "email"],
    "emailRecipients": ["team@gastronomizae.com"]
  }'
```

### Phase 2: Approval & Regional
```bash
# Presidential approval
curl "http://localhost:3000/api/approval/aggregated?position=presidencial"

# Governor approval
curl "http://localhost:3000/api/approval/aggregated?position=governador&uf=SP"

# Regional aggregation
curl "http://localhost:3000/api/regions/aggregated?region=sudeste&position=governador"

# Multi-region comparison
curl -X POST http://localhost:3000/api/regions/aggregated \
  -d '{"regions": ["sul", "sudeste", "nordeste"], "position": "governador"}'
```

### Phase 3: History
```bash
# Candidate history
curl "http://localhost:3000/api/history/candidate?candidate=João%20Silva&state=SP&days=90"

# Trends
curl "http://localhost:3000/api/history/trends?state=SP&days=30"

# Period comparison
curl "http://localhost:3000/api/history/comparison?state=SP"
```

---

## 📊 Dados de Teste

### Usar dados dos mock clients
- 27 estados × 2 posições = 54 combinações
- 3 institutos × variação realista
- Candidatos reais do real-candidates-2026.ts

### Verificar
- [ ] Dados de mock geram corretamente
- [ ] Variação ±2-4% de baseline
- [ ] Candidatos reais aparecem
- [ ] Métricas de qualidade razoáveis

---

## 🔍 Verificação de Qualidade

### Code Quality
- [ ] `npm run lint` - sem erros
- [ ] TypeScript compilation - sem erros
- [ ] All tests passing - 59/59 ✅

### Database
- [ ] Migrations executadas
- [ ] Schema correto (3 tabelas)
- [ ] RLS policies ativas
- [ ] Índices criados

### API Performance
- [ ] Agregação: <500ms (p95)
- [ ] Histórico: <1s (p95)
- [ ] Aprovação: <500ms (p95)
- [ ] Regional: <1s (p95)

### Data Integrity
- [ ] Snapshots armazenados corretamente
- [ ] Candidatos em histórico
- [ ] Cálculos estatísticos corretos
- [ ] Sem perda de dados

---

## 🚀 Configuração Pré-Produção

### Environment Variables
```bash
# Verificar que estão setadas
SLACK_WEBHOOK_URL=...
EMAIL_PROVIDER=resend
EMAIL_API_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database
```bash
# Executar migrations
supabase db push

# Verificar tabelas
supabase db query "SELECT name FROM sqlite_master WHERE type='table';"
```

### Caches
- [ ] Redis/cache limpo
- [ ] TTLs configurados (3600s)
- [ ] Cache headers ativos

---

## 📈 Métricas de Sucesso

| Métrica | Meta | Status |
|---------|------|--------|
| Testes Passando | 59/59 | ⏳ |
| Response Time (p95) | <1s | ⏳ |
| Data Completeness | 100% | ⏳ |
| Alert Delivery | 100% | ⏳ |
| Zero Errors | 0 | ⏳ |

---

## 📝 Notas de Validação

### Phase 1 Insights
- Discrepâncias aparecem quando candidatos não estão em ambas fontes
- Alerts precisam de configuração de webhook válida
- Admin dashboard precisa de dados para ser útil

### Phase 2 Insights
- Aprovação precisa de polls específicos na tabela
- Regional usa população como ponderação
- Presidencial é agregação nacional, sem estado

### Phase 3 Insights
- Snapshots precisam ser registrados continuamente
- Histórico revela padrões ao longo de semanas
- Volatilidade mostra instabilidade em pesquisas

---

## ✅ Checklist Final

Antes de considerar validação completa:
- [ ] Todos endpoints respondendo (GET/POST)
- [ ] Database migrations aplicadas
- [ ] 59 testes passando
- [ ] Alertas funcionando (Slack/Email)
- [ ] Dados aparecem em Dashboard
- [ ] Sem erros em logs
- [ ] Performance aceitável

---

## 🆕 Validação dos Fixes de 2026-08-11

Passos adicionais para confirmar os três fixes descritos em `docs/CHANGELOG.md` (entrada 2026-08-11):

- [ ] **Cron de snapshots grava dados reais:** chamar `GET /api/cron/aggregation-snapshots` com pesquisas reais presentes na tabela `polls` do Supabase (para pelo menos um estado/cargo) e confirmar que a resposta retorna `recordedCount > 0` — não mais o placeholder fixo `recordedCount: 0`. Se não houver pesquisas reais, confirmar que o fallback para o mock institute client ainda produz um `recordedCount > 0`.
- [ ] **TSE sync persiste discrepâncias:** rodar um sync do TSE (`POST /api/tse/sync?state=SP&position=governador&detailed=true`) para um estado/cargo com discrepância conhecida e confirmar que aparecem linhas correspondentes na tabela `discrepancies` — via `GET /api/admin/discrepancies?state=SP` ou via query direta (`select * from discrepancies where state = 'SP' order by created_at desc limit 5;`).

---

**Próximo:** Deploy em staging / Produção

---

Criado: 2026-08-08
Última atualização: 2026-08-11 (nomes de migration corrigidos + passos de validação dos fixes de 2026-08-11)
