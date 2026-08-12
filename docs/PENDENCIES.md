# Wave 4 - Checklist de Pendências

**Criado:** 2026-08-08
**Atualizado:** 2026-08-11 (correção da data de conclusão do cron de snapshots)
**Status:** Críticas/Altas/Médias resolvidas. Restam itens de baixa prioridade (pós-produção).

---

## ✅ Implementado (referência)

### Phase 1: Alertas & Notificações
- slack-notifier.ts, email-notifier.ts, discrepancy-manager.ts (services)
- `/api/alerts/anomaly`, `/api/admin/discrepancies` (GET/POST), `/api/admin/notifications/test`
- Migration `20260810002618_create_discrepancies_table.sql`
- wave4-phase1.test.ts (20 testes)

### Phase 2: Enriquecimento de Dados
- approval-aggregation.ts, regional-aggregation.ts (services)
- `/api/approval/aggregated`, `/api/regions/aggregated` (GET/POST)
- Migration `20260811120000_approval_polls_baseline.sql`
- wave4-phase2.test.ts (16 testes)

### Phase 3: Analytics & Histórico
- poll-history.ts (service)
- `/api/history/candidate`, `/api/history/trends`, `/api/history/comparison`
- Migration `20260810002619_create_aggregation_history_table.sql`
- wave4-phase3.test.ts (23 testes)

---

## ✅ Pendências Críticas, Altas e Médias — Resolvidas

Todas resolvidas em 2026-08-08, **exceto o item 3 (cron de snapshots), que só ficou verdadeiro em 2026-08-11** — o arquivo original desta checklist o marcava como "PRODUCTION READY" em 2026-08-08, mas o endpoint `/api/cron/aggregation-snapshots` era um placeholder que sempre retornava `recordedCount: 0` sem gravar nada. Só passou a buscar pesquisas reais e popular `aggregation_history` de fato depois da correção de 2026-08-11 (ver `docs/CHANGELOG.md`, entrada 2026-08-11).

| # | Item | Implementado em | Resolvido em |
|---|------|------------------|--------------|
| 1 | Autenticação & Autorização (`/admin`, API key, rate limiting) | `src/lib/middleware/auth.ts` | 2026-08-08 |
| 2 | Validação de entrada (Zod) | `src/lib/validation/wave4.ts` | 2026-08-08 |
| 3 | Cron job para snapshots diários | `src/app/api/cron/aggregation-snapshots/route.ts` | **2026-08-11** (não 08-08) |
| 4 | Integração entre serviços (Wave4Orchestrator) | `src/lib/services/wave4-orchestrator.ts` | 2026-08-08 |
| 5 | Type safety centralizado | `src/lib/types/wave4.ts` | 2026-08-08 |
| 6 | Error handling global | `src/lib/utils/error-handler.ts` | 2026-08-08 |
| 7 | Environment variables validation | `src/lib/middleware/auth.ts` | 2026-08-08 |
| 8 | Jest configurado (59 testes) | `jest.config.ts` + `package.json` | 2026-08-08 |
| 9 | Endpoints com validação/auth/rate limiting aplicados | endpoints atualizados | 2026-08-08 |

Nenhuma outra pendência desta checklist descreve a persistência de discrepâncias do TSE sync como resolvida antes da hora — esse fix (também de 2026-08-11) não estava rastreado aqui; ver `docs/CHANGELOG.md`.

---

## ⚠️ Pendências Reais (ainda abertas, pós-produção)

Confirmadas por leitura do arquivo original como genuinamente não feitas — todas de baixo impacto (o sistema funciona via API sem elas).

### 1. Dashboard UI Components
- ❌ Componente React para `/admin/discrepancies`
- ❌ Componente para approval charts
- ❌ Componente para regional comparison

**Impacto:** BAIXO (API funciona sem UI)

### 2. Documentação de API
- ❌ OpenAPI/Swagger spec
- ❌ Request/response examples mais detalhados

**Impacto:** BAIXO

### 3. Logging Estruturado
- ❌ Winston ou Pino logger
- ❌ Logs estruturados em JSON
- ❌ Log levels (info, warn, error)

**Impacto:** BAIXO

### 4. Testes E2E Wave4
- ❌ Playwright tests para validar workflows
- ❌ Teste completo: Alert → Slack → Admin Dashboard

**Impacto:** BAIXO (Playwright já está no package.json)

---

## 🚀 Próximas Etapas

**Antes de deploy:**
1. `npm test` - verificar que os testes passam
2. `npm run lint` - sem erros
3. `npm run build` - build sem erros
4. Configurar environment variables
5. `./scripts/validate-wave4.sh` - validação final

**Pós-produção (baixa prioridade, quando houver tempo):**
- Dashboard UI
- OpenAPI docs
- Logging estruturado
- Testes E2E
