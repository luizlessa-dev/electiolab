# Plano de Ação ElectioLab — Status 19/08/2026

## Status Geral

| Item | Status | Esforço | ETA |
|------|--------|---------|-----|
| **P0.1** — Proteger rotas test-* | ✅ CONCLUÍDO | 1h | ✅ |
| **P0.2** — Dedup candidatos | ✅ CONCLUÍDO | 4h | ✅ |
| **P1.1** — Social media 2026 | 🟡 BLOQUEADO | 10h | Dep. TSE |
| **P1.2** — Cobertura PesqEle TSE | 📋 READY | 6h | Ready |

---

## P0.1 ✅ Proteção de Rotas Test-Phase2

**Completado em:** 19/08 ~21:30 UTC  
**Commit:** `27f9da1`

### O que foi feito
- Criado `src/lib/auth/test-api-guard.ts` com validação de Bearer token
- 3 endpoints protegidos:
  - `POST /api/institutes/test-phase2.disabled` → requer `Authorization: Bearer <TEST_API_KEY>`
  - `GET /api/institutes/test-phase2-hybrid` → requer `Authorization: Bearer <TEST_API_KEY>`
  - `GET /api/institutes/test-tier3` → requer `Authorization: Bearer <TEST_API_KEY>`

### Uso em produção
```bash
curl -X GET "https://electiolab.com/api/institutes/test-phase2-hybrid" \
  -H "Authorization: Bearer $TEST_API_KEY"
```

### Próximos passos
- Adicionar `TEST_API_KEY` ao `.env.local` e Vercel secrets
- Documentar no README de desenvolvimento

---

## P0.2 ✅ Deduplicação de Candidatos

**Completado em:** 19/08 ~21:45 UTC  
**Commit:** `132b8c3`

### Investigação Realizada
- ✅ 9 grupos de duplicatas por `tse_id` investigados
- ✅ Classificação: 6 legítimos (cargos diferentes), 3 problemáticos (mesma eleição)
- ✅ Relatório com IDs de todos os registros

### Grupos Problemáticos Identificados
1. **Ratinho** — 3 records (pres 1º + pres 2º inativo + gov PR)
2. **Lula** — 3 records (pres 2026 + pres 2022 1º + pres 2022 2º)
3. **Bolsonaro** — 2 records (pres 2022 1º + pres 2022 2º)

### Migration Criada
- **Arquivo:** `supabase/migrations/20260819120000_dedup_candidates_by_tse_id.sql`
- **Tamanho:** 237 linhas, bem documentada (PT-BR)
- **Segurança:** Cria structure apenas (audit table + soft-delete flag), não deleta dados
- **Reversível:** 100% segura de rollback

### Status de Aplicação
- ⚠️ Migration commitada localmente
- ⚠️ **Pendente:** Reconciliação de histórico Supabase (sync local/remote)
- 📋 **Próximo:** `supabase db push --linked` (após resolver sincronização)

### Ações Manuais Pós-Deploy
1. Revisar os 3 grupos problemáticos
2. Verificar `poll_results` orphaned
3. Merge de `candidate_assets`, `candidate_social_media`
4. Marcar soft-delete via `UPDATE candidates SET is_duplicate_of = ...`
5. Hard-delete após 1-2 semanas observação

---

## P1.1 🟡 Social Media 2026 — Bloqueado Externamente

**Status:** TSE ainda não publicou dados  
**HTTP:** 403 (arquivo não encontrado em CDN)

### Descoberta
- Script de ingestão existe: `scripts/ingest-tse-extended.ts`
- Dados 2022: ✅ 123 records em `candidate_social_media`
- Dados 2026: ❌ 0 records (TSE não publicou)

### Opções de Desbloqueio
1. **Esperar TSE** (recomendado, sem custo) — prazo desconhecido
2. **API Perfil Político** — alternativa com custo
3. **Scraper customizado** — parsing HTML de redes sociais (alto custo)

### Próximos Passos
- Monitorar CDN do TSE pra quando publicarem 2026
- Decision futura: qual alternativa usar se TSE não publicar até set/2026

---

## P1.2 📋 Cobertura PesqEle TSE — Ready para Começar

**Gap atual:** 1.714 registros TSE vs 246 curados no banco (14% cobertura)

### O que fazer
1. Investigar os 1.714 registros do PesqEle que não estão no banco
2. Decidir se vale a pena importar os faltantes ou aceitar 14% cobertura
3. Se sim: batch import via `scripts/ingest-tse-extended.ts` ou custom script

### Timeline
- **Esforço:** 6h (análise + ingestão)
- **Status:** Pronto para começar imediatamente (não depende de outros)
- **Bloqueador:** Nenhum (dados já disponíveis no TSE)

---

## Resumo Executivo — Progresso Geral

### Antes (13/08)
- Health score: 7.2/10
- Duplicatas: 17 grupos
- TypeScript erros: 73
- Rotas test protegidas: 0/3

### Depois (19/08)
- Health score: 7.8/10 (+0.6)
- Duplicatas: 9 grupos (-47%) + migration pronta pra dedup final
- TypeScript erros: 0 ✅
- Rotas test protegidas: 3/3 ✅

### Próximas 2 Semanas (Prioridade)
1. ✅ P0.1 — Rotas test (FEITO)
2. ✅ P0.2 — Dedup (FEITO, await DB push)
3. 📋 P1.2 — Cobertura PesqEle (READY, comece quando quiser)
4. 🟡 P1.1 — Social media (AWAIT TSE)

---

**Gerado:** 2026-08-19 22:00 UTC  
**Próxima revisão:** 2026-08-26 (após aplicação de P0.2 + conclusão P1.2)
