# ElectioLab: Roadmap Fase 2 → Fase 3+

**Status:** Fase 2 ✅ Completa e Deployada | Fase 3+ 🚀 Em Preparação  
**Data:** 2026-08-06  
**Arquivos Preparados:** 5 novos arquivos, prontos para implementação

---

## 📋 O QUE FOI PREPARADO HOJE

### A) Validação de Fase 2
**Arquivo:** `scripts/phase2-validation.sql` (6 queries de auditoria)

```sql
-- 1. Status geral dos polls (total, credibilidade, MoE)
-- 2. Distribuição de credibilidade_score
-- 3. Distribuição de margin_of_error
-- 4. Comparação MoE teórico vs real
-- 5. Pesquisas que precisam de backfill
-- 6. Médias ponderadas calculadas com Fase 2
```

**Como rodar:**
```bash
# Copiar queries do arquivo e executar no Supabase
# Monitorar: credibilidade_score e margin_of_error
```

---

### B) Backfill de Margin of Error
**Arquivo:** `scripts/backfill-moe.sql`

**O quê faz:**
- Calcula MoE teórico: `1.96 * sqrt(0.25 / sample_size)`
- Atualiza NULLs nos polls existentes
- Loga mudanças em `data_source_audit`

**Fórmula:**
```
MoE = 1.96 * sqrt(p * (1-p) / n)
      onde p = 0.5 (worst case para conservadorismo)
```

**Exemplos:**
```
Sample Size    Theoretical MoE
500            4.38%
1000           3.10%
1500           2.53%
2000           2.19%
2500           1.96%
3000           1.79%
```

**Status:** ✅ Pronto para executar

---

### C) Datafolha Institute Client
**Arquivo:** `apps/pipeline/lib/institutes/datafolha-client.ts`

**Recursos:**
- ✅ API client structure
- ✅ Retry logic com exponential backoff
- ✅ Cache management (24h TTL)
- ✅ Conversion to PollData format
- ⏳ Web scraping parser (TODO)

**Métodos:**
```typescript
await datafolhaClient.searchPresidencial(2026)
await datafolhaClient.searchGovernador('SP', 2026)
await datafolhaClient.getLatestScenario('lula-vs-bolsonaro', 2026)
```

**Próximos Passos:**
1. Implement `fetchAndParse()` method
2. Test with real Datafolha website
3. Add Quaest e AtlasIntel clients (similar pattern)

---

### D) UI Component: Poll Weight Visualization
**Arquivo:** `src/components/PollWeightVisualization.tsx` (~320 linhas)

**Exibe:**
- ✅ Summary card (média, pesquisas, outliers)
- ✅ Weight distribution bar chart
- ✅ Detailed poll cards com 6 weight factors
- ✅ Individual factor breakdowns
- ✅ Warning cards (outliers, MoE ausente, idade)

**Componentes internos:**
- `WeightFactorCard` - Visualiza um fator
- `PollWeightRow` - Análise detalhada de uma pesquisa

**Como usar:**
```typescript
import { PollWeightVisualization } from '@/components/PollWeightVisualization';

<PollWeightVisualization 
  polls={pollsWithWeights}
  weightedAverage={34.2}
/>
```

**Próximos Passos:**
1. Integrar com página de eleições
2. Calcular factors em tempo real
3. Add export para PDF/CSV

---

### E) TSE Base Client
**Arquivo:** `apps/pipeline/lib/tse/tse-client-base.ts` (~280 linhas)

**Classes:**
- `TSEClient` - Base com retry logic e rate limiting
- `DivulgaCandContasClient` - Candidate registry (needs CORS proxy)
- `TSEResultadosClient` - Live results during apuração

**Rate Limiting:**
- 1s delay between requests
- Exponential backoff: 1s → 2s → 4s (max 3 retries)
- Random User-Agent headers

**Métodos (TSE Resultados):**
```typescript
await tseResultadosClient.buscarResultadosPresidencial(2026, 1)
await tseResultadosClient.buscarResultadosGovernador('SP', 2026, 1)
await tseResultadosClient.buscarStatusApuracao(2026)
```

**Próximos Passos:**
1. Implement parsing methods
2. Add CORS proxy for DivulgaCandContas
3. Test com election results reais

---

## 🗺️ ROADMAP PRÓXIMOS PASSOS

### Fase 2.5 - Data Preparation (1-2 dias)
```
Tarefa                      Status    Tempo
─────────────────────────────────────────────
A) Executar backfill MoE     ⏳        1h
A) Validar com queries       ⏳        2h
A) Recalcular médias Phase2  ⏳        1h
────────────────────────────── Subtotal: 4h
```

### Fase 3 - Real Polling Data (1-2 semanas)
```
Tarefa                           Status    Tempo
────────────────────────────────────────────
B) Complete Datafolha parser     ⏳        3h
B) Add Quaest client             ⏳        3h
B) Add AtlasIntel client         ⏳        3h
C) Create sync-polls endpoint    ⏳        4h
C) Add polling jobs (scheduler)  ⏳        4h
────────────────────────────────── Subtotal: 17h
```

### Fase 3.5 - UI Integration (3-4 dias)
```
Tarefa                              Status    Tempo
──────────────────────────────────────────────
D) Integrate PollWeightViz component ⏳        4h
D) Add to election dashboard        ⏳        3h
D) Responsiveness & mobile          ⏳        3h
────────────────────────────────────── Subtotal: 10h
```

### Fase 4 - TSE Integration (2-3 semanas)
```
Tarefa                                 Status    Tempo
──────────────────────────────────────────────────
E) Implement parsing methods           ⏳        6h
E) Add CORS proxy for DivulgaCandContas ⏳        8h
E) Create sync-candidatos endpoint     ⏳        4h
E) Create sync-resultados endpoint     ⏳        4h
E) Add live result tracking job        ⏳        8h
E) Display live results in UI          ⏳        6h
──────────────────────────────────────────────────  Subtotal: 36h
```

---

## 📊 PRIORIZAÇÃO

### 🔴 Critical (Próxima semana)
1. **Backfill MoE** (Fase 2.5) - Ativa MoE weight imediatamente
2. **Datafolha parser** (Fase 3) - Dados reais mais confiáveis

### 🟡 Important (Próximas 2 semanas)
1. **PollWeightViz UI** (Fase 3.5) - Transparência ao usuário
2. **Quaest + AtlasIntel** (Fase 3) - Cobertura completa

### 🟢 Nice-to-have (Depois)
1. **TSE Integration** (Fase 4) - Enriquece com dados oficiais
2. **Live apuração tracking** - Tracking em tempo real

---

## 🏗️ ESTRUTURA DE ARQUIVOS

```
electiolab/
├── src/components/
│   └── PollWeightVisualization.tsx       ✨ NOVO (D)
├── apps/pipeline/lib/
│   ├── institutes/
│   │   └── datafolha-client.ts           ✨ NOVO (B)
│   │   ├── quaest-client.ts             (TODO)
│   │   └── atlasitel-client.ts          (TODO)
│   └── tse/
│       └── tse-client-base.ts            ✨ NOVO (E)
├── scripts/
│   ├── backfill-moe.sql                  ✨ NOVO (C)
│   └── phase2-validation.sql             ✨ NOVO (A)
└── docs/
    └── PHASE2_TO_PHASE3_ROADMAP.md       ✨ NOVO
```

---

## 🎯 CHECKLIST PARA PRÓXIMA SESSÃO

### Fase 2.5 - Preparation
- [ ] Execute `backfill-moe.sql` no Supabase
- [ ] Run `phase2-validation.sql` queries
- [ ] Recalculate all weighted_averages com Fase 2
- [ ] Verify results fazem sentido

### Fase 3 - Start
- [ ] Implement Datafolha parser (fetchAndParse)
- [ ] Test com real Datafolha website
- [ ] Create Quaest client
- [ ] Create AtlasIntel client

### Fase 3.5 - UI
- [ ] Create page to display PollWeightViz
- [ ] Wire up with API endpoint
- [ ] Test responsiveness

---

## 💡 INSIGHTS & NOTES

### MoE Distribution (Esperado)
```
Most polls: 2.0-2.5% (boas pesquisas)
Some polls: 3.0-4.0% (amostra média)
Rare: 5.0%+ (amostras pequenas, menos confiáveis)
```

### Credibility Spread (Esperado)
```
Real institutes (Datafolha, Quaest, etc): 7-9/10
Unknown or historical: 5/10 (default)
Suspicious sources: 2/10 (rare, mostly cleaned in Phase 1)
```

### Institute Clients Pattern
Todos seguem o mesmo padrão:
1. Autenticação/headers
2. API URL building
3. Retry com exponential backoff
4. Cache management
5. Parsing e normalization

### TSE vs Polling Data
```
Polling Data:     Projeções (antes da eleição)
TSE Resultados:   Resultados oficiais (durante/após apuração)
TSE Candidatos:   Registro oficial de candidatos

Uso no ElectioLab:
- Polls em homepage (agregação Datafolha, Quaest, etc)
- TSE para validação e tracking em tempo real
- TSE Candidatos para lista de candidatos oficiais
```

---

## 🚀 DEPLOYMENT STRATEGY

### Phase 2.5 (Low Risk)
```
MoE backfill é SQL puro, sem mudança de código
✅ Safe to deploy immediately
```

### Phase 3 (Medium Risk)
```
Novo código, mas isolado (novo endpoint)
✅ Deploy com monitoring
⚠️ Start com Datafolha, expand depois
```

### Phase 3.5 (Low Risk)
```
UI component novo, sem lógica crítica
✅ Deploy com feature flag se necessário
```

### Phase 4 (High Risk)
```
Integração com dados oficiais do governo
⚠️ Thorough testing
⚠️ Staging first, then production
```

---

## 📞 QUANDO CHAMAR

**Pergunta?** → Confira `PHASE2_IMPLEMENTATION.md` e `PHASE2_SUMMARY.md`  
**Erro?** → Veja logs da Edge Function em Supabase  
**Como começar Fase 3?** → Execute checklist acima, depois avise

---

**Próximo passo:** Quer que eu comece Fase 2.5 (backfill MoE) ou prefere explorar os 5 arquivos criados primeiro? 👊
