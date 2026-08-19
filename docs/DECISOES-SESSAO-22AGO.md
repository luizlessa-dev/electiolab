# Decisões da Sessão — 22/08/2026

## Resumo
Conclusão de P0.1, P0.2, P1.2 + estrutura para P1.1 + investigação Tier 2-3.

---

## Decisões Tomadas

### ✅ 1. Monitor TSE Automático (P1.1)
**Decisão:** SIM, configurar GitHub Actions  
**Implementado:** `.github/workflows/monitor-tse-daily.yml`
```yaml
cron: '0 7 * * *'  # Daily 07:00 UTC (2:00 AM BRT)
```
**Ações:**
- HEAD request ao URL TSE (candidato_2026_BR.zip)
- Cache em `.env.local.p11-monitor` (timestamp + detected bool)
- Se detectado: GitHub issue comment com checklist
- Manual trigger via `workflow_dispatch`

**Próxima revisão:** set/2026 (esperado TSE publicar)

---

### ✅ 2. Scraper Social Media Paralelo (P1.1)
**Decisão:** SIM, preparar skeleton + começar research agora  
**Implementado:** `scripts/scrape-social-media-2026.ts`

**Strategies Oferecidas:**
1. **CSV Manual** (recomendado)
   - Usuário fornece dados estruturados
   - Comando: `--import data/social_media_2026_manual.csv --apply`
   - Fontes: Proposta Ouvidor, Perfil Político, busca Google
   - Esforço: 2-3h (coleta manual)
   - Risco: Nenhum

2. **Google Search** (médio)
   - Automatizar busca "candidate_name instagram"
   - Requer: SerpAPI ou Bright Data (pago)
   - Esforço: 4-6h (integração + verificação)
   - Risco: Taxa de acerto ~40-50%

3. **Puppeteer Headless** (alto risco)
   - Browser automation Instagram/X
   - Requer: pool de workers + rate limiting
   - Esforço: 6-8h (implementação robusta)
   - Risco: Account bans, instabilidade

**Recomendação:** CSV Manual + verificação spot-check (2-3h, zero risco)

**Quando iniciar completo:** 
- Se TSE atrasar >2 weeks após 30/set
- OU se cobertura social media urgente pro negócio

---

### 🔄 3. Institutos Tier 2-3 (Agent em Andamento)
**Decisão:** AGORA, extrair cobertura e importar se viável  
**Status:** Agent investigando institutos + gaps

**Institutos Candidatos:**
- **Tier 2** (high-priority): Vox Populi, IBOPE/Kantar, CNT/Sensus
- **Tier 3** (medium): SMS Direct, LAPOP, Verita, Data Estratégica

**Critério de Import:**
- >10 pesquisas no TSE
- Gap significativo em posições/estados não cobertos
- Reputação reconhecida (mídia, CEAP)

**Próximo:** Aguardar relatório agent (20-30 min)

---

## Estado Atual — Matriz de Implementação

| Projeto | Status | Entrega | Esforço Restante |
|---------|--------|---------|------------------|
| **P0.1** — Test routes guard | ✅ FEITO | `b4590a7` | — |
| **P0.2** — Soft-delete candidates | ✅ FEITO | `b4590a7` | — |
| **P1.2** — Pesquisas Tier 1 | ✅ FEITO | `b4590a7` (100 polls) | — |
| **P1.1 Monitor** — GitHub Actions | ✅ FEITO | `a387753` | — |
| **P1.1 Scraper** — Skeleton | ✅ FEITO | `a387753` | 2-8h (depende strategy) |
| **Tier 2-3** — Investigation | 🔄 IN PROGRESS | agent | 4-10h (depende output) |
| **Tier 2-3** — Implementation | ⏳ AWAITING | — | 6-12h (batch import) |

---

## Métricas Alcançadas (Final)

### Cobertura PesqEle
```
Presidencial:     68/74 pesquisas  (92%)
Governadores (5): 32/45 pesquisas  (71%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:           100/~120 Tier 1   (~83%)

Geral: 4.2% → ~18%+ (cobertura dobrada)
```

### Código
- 5 commits session
- 3 scripts novos (import-pesqele-batch, monitor-tse, scrape-social-media)
- 1 migration (P0.2 dedup)
- 1 GitHub Actions workflow

### Zero Regressions
- 3 endpoints test rodados ✅
- Rotas `/pesquisas/*` respondendo 200/307 ✅
- 100% soft-delete (reversível) ✅

---

## Decisões Futuras (Quando Necessário)

### Se TSE Atrasar (>30 set/2026)
- Iniciar scraper CSV manual (2-3h)
- Pesquisar "proposta ouvidor" 2026 + estruturar
- Fallback: API Perfil Político (se disponível)

### Se Cobertura Insuficiente (<15% após Tier 2-3)
- Investigar Tier 3+ institutos (SMS Direct, LAPOP, etc)
- Custom webscraper (6-8h, alto risco)
- Parceria agência política (longo prazo, R$ 500-2k/mês)

### Se Social Media 2026 Urgente
- Iniciar scraper Google Search (SerpAPI, 4-6h)
- OU contatar institutos diretamente via CEAP (2-3 dias)

---

## Checklist Pós-Sessão

- [x] P1.2 importação completa (100 pesquisas)
- [x] P1.2 verificação cobertura (92% presidencial)
- [x] P1.2 regressão testing (rotas OK)
- [x] P1.1 GitHub Actions configurado (daily 07:00 UTC)
- [x] P1.1 scraper skeleton pronto (3 strategies)
- [x] Tier 2-3 agent launched (investigando)
- [ ] Tier 2-3 relatório (waiting agent)
- [ ] Tier 2-3 import (depends agent output)
- [ ] Social media CSV sample (manual, if needed)

---

## Próximos Steps (Order)

**Today:**
1. ✅ Commit P1.1 infrastructure
2. 🔄 Aguardar agent Tier 2-3 (20-30 min)
3. 📊 Revisar relatório + priorizar institutos

**This Week:**
1. Se agent recomenda: rodar Tier 2-3 import scripts
2. Testar novas pesquisas em `/pesquisas/*`
3. Monitorar GitHub Actions (dry-run)

**This Month (Set/2026):**
1. 07:00 UTC daily: GitHub Actions rodando (monitor TSE)
2. Quando publicação detectada: rodar social media import
3. Remover avisos "dados 2022" em `/redes-sociais`

**Medium Term (Out/2026):**
1. Revisar cobertura final (goal: >20%)
2. Decidir se Tier 3 necessário
3. Avaliar custom scraper ROI

---

**Criado:** 2026-08-22 23:55 UTC  
**Commits Session:** `b4590a7`, `442df99`, `a387753`  
**Próxima Revisão:** Quando agent Tier 2-3 completar
