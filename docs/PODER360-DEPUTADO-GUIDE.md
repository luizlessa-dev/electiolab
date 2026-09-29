# Guia: Coleta Manual de Poder360 — Deputado Federal

**Objetivo:** Encontrar e adicionar pesquisas de Deputado Federal do Poder360 de forma segura e rastreada.

---

## 📍 Onde Procurar

### 1. **Poder360 — Pesquisas**
- URL: https://www.poder360.com.br/poder-pesquisas-hoje/
- Filtrar por: "Deputado Federal" + estado
- Formato típico: "PT 15% | PL 12% | MDB 8% | Outros 65%"

### 2. **Search Strategy**
```
site:poder360.com.br "deputado federal" "SP" 2026
site:poder360.com.br "deputado federal" "RJ" 2026
site:poder360.com.br "deputado federal" "MG" 2026
```

### 3. **Sinais de Pesquisa Confiável**
- ✅ Instituto Tier 1 (Datafolha, IPEC, Quaest, AtlasIntel, etc)
- ✅ Fieldwork de ago-set 2026
- ✅ Sample size 1000+
- ✅ Data exata de publicação
- ✅ Margem de erro informada

---

## 📋 Template de Extração

Quando encontrar uma pesquisa, preencher:

```json
{
  "institute": "Datafolha",
  "position": "DEPUTADO_FEDERAL",
  "state": "SP",
  "fieldwork_start": "2026-09-15",
  "fieldwork_end": "2026-09-18",
  "publication_date": "2026-09-20",
  "sample_size": 1600,
  "margin_of_error": 2.4,
  "poll_name": "Datafolha — Deputado Federal São Paulo",
  "source_url": "https://www.poder360.com.br/...",
  "tse_register": "SP-XXXXX/2026",
  "poll_type": "estimulada",
  "results": [
    {"name": "PT", "pct": 15.2},
    {"name": "PL", "pct": 12.8},
    {"name": "MDB", "pct": 8.5},
    {"name": "Outros", "pct": 63.5}
  ],
  "notes": "Pesquisa agregada por partido (não candidatos específicos)"
}
```

---

## 🔧 Como Adicionar ao ElectioLab

### Opção A: Via `ingest-manual.ts` (Recomendado)

1. **Abrir arquivo:**
   ```bash
   vim scripts/ingest-manual.ts
   ```

2. **Procurar por seção `DEPUTADO_FEDERAL`:**
   ```typescript
   // 🟢 DEPUTADO FEDERAL (2026)
   // Pesquisas por estado/partido (agregadas, não candidatos)
   
   const deputadoPolls = [
     // Adicionar aqui
   ];
   ```

3. **Adicionar entrada:**
   ```typescript
   {
     election_id: '...', // UUID da election (deputado_federal + estado)
     institute_name: 'Datafolha',
     candidate: 'PT',  // Usar party como candidate
     candidate_slug: 'pt',
     office: 'deputado',
     scope: 'SP',
     percentage: 15.2,
     fieldwork_end: '2026-09-18',
     publication_date: '2026-09-20',
     sample_size: 1600,
     margin_of_error: 2.4,
     methodology: 'presencial',
     tse_registration: 'SP-XXXXX/2026',
     source_url: 'https://poder360.com.br/...',
     notes: 'Agregado por partido'
   },
   ```

4. **Rodar:**
   ```bash
   npx tsx scripts/ingest-manual.ts --dry-run
   npx tsx scripts/ingest-manual.ts --apply
   ```

---

### Opção B: Via SQL Direto (Para Tier 1 Rápido)

Se já validou e quer rapidez:

```sql
INSERT INTO polls (
  institute_name, candidate, candidate_slug,
  office, scope, percentage, margin_of_error,
  publication_date, fieldwork_end, sample_size,
  methodology, tse_registration, source_url
) VALUES (
  'Datafolha', 'PT', 'pt',
  'deputado', 'SP', 15.2, 2.4,
  '2026-09-20', '2026-09-18', 1600,
  'presencial', 'SP-XXXXX/2026',
  'https://poder360.com.br/...'
)
ON CONFLICT DO NOTHING;
```

---

## ✅ Checklist de Validação

Antes de adicionar, verificar:

- [ ] Instituto é Tier 1 ou 2 reputado?
- [ ] Fieldwork entre ago-set 2026?
- [ ] Sample size entre 800-3000?
- [ ] Margem de erro entre 2-4%?
- [ ] URL do Poder360 (ou fonte clara)?
- [ ] Dados agregados por partido (não específico por candidato)?
- [ ] TSE registro disponível?
- [ ] Conflito com pesquisa mais recente? (dedup)

---

## 📊 Frequência de Atualização

- **Tier 1:** Quando encontrar (raro — 1-2x por mês)
- **Automatização futura:** Scraper diário (Phase 3.2)

---

## 🔍 Monitoramento

Checklist semanal de Poder360:

```bash
# Salvar semanalmente:
curl -s "https://www.poder360.com.br/poder-pesquisas-hoje/" \
  | grep -i "deputado federal" \
  > /tmp/poder360-deputy-check-$(date +%Y-%m-%d).html

# Revisar manualmente
```

---

## ⚠️ O que NÃO fazer

- ❌ Não adicionar pesquisas de institutos desconhecidos
- ❌ Não misturar candidatos específicos com dados agregados
- ❌ Não usar dados de jul-ago (muito antigos)
- ❌ Não duplicar (sempre verificar pesquisa recente)
- ❌ Não scraping automático (respeitar ToS do Poder360)

---

## 📌 Referência Rápida

| Campo | Valor |
|-------|-------|
| `office` | `'deputado'` |
| `candidate` | Nome do partido (ex: `'PT'`, `'PL'`) |
| `candidate_slug` | Partido em slug (ex: `'pt'`, `'pl'`) |
| `scope` | Sigla UF (ex: `'SP'`, `'RJ'`) |
| `source_kind` | `'poder360-manual'` (opcional) |
| `status` (draft) | `'approved'` (Tier 1) ou `'pending'` (validar) |

---

**Última atualização:** 2026-09-29  
**Responsável:** ElectioLab Team
