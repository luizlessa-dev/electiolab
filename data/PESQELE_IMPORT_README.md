# Extração Lote 1: Pesquisas TSE PesqEle Faltantes

**Status:** ✅ PRONTO PARA IMPORT  
**Data:** 2026-08-19 10:46 UTC  
**Arquivo:** `pesqele_import_lote1.json`

## Resumo Rápido

- **Total faltantes (Tier 1, Fase 1):** 74 pesquisas
- **Lote 1:** 50 pesquisas
- **Institutos:** 5 (Datafolha, Paraná Pesquisas, Genial/Quaest, Atlas Intel, Nexus)
- **Posições:** Presidencial (34) + Governadores (16)
- **Qualidade:** n=804–5.000, MoE=±1.4–3.5%

## Como Usar

### 1. Revisar Dados

```bash
# Ver estrutura
jq '.metadata' /Users/luizlessa/electiolab/data/pesqele_import_lote1.json

# Ver primeiros 5 registros
jq '.lote1[0:5]' /Users/luizlessa/electiolab/data/pesqele_import_lote1.json

# Contar registros por instituto
jq '.lote1 | group_by(.institute) | map({institute: .[0].institute, count: length})' \
  /Users/luizlessa/electiolab/data/pesqele_import_lote1.json
```

### 2. Executar Import (Dry-Run)

```bash
cd /Users/luizlessa/electiolab

# Simular import (sem gravar no banco)
npx ts-node scripts/import-pesqele-batch.ts --position PRES --limit 50
```

Esperar output como:
```
🔍 Buscando pesquisas faltantes para PRES...
✓ Found 50 registros faltantes
📥 Preparando import de 50 pesquisas...
   Institutos: 5
     - Datafolha: 15 pesquisas
     - Genial/Quaest: 14 pesquisas
     ...
⚠️  Dry-run mode. Use --apply pra gravar.
```

### 3. Executar Import (Com Gravação)

```bash
cd /Users/luizlessa/electiolab

# GRAVAR no banco (com --apply)
npx ts-node scripts/import-pesqele-batch.ts --position PRES --limit 50 --apply
```

Esperar output como:
```
✓ 10/50 inseridos
✓ 20/50 inseridos
...
✅ Import concluído: 50 pesquisas
```

### 4. Validar Resultado

```bash
# 1. Verificar se pesquisas aparecem em polls
psql -h localhost -U postgres -d electiolab -c \
  "SELECT COUNT(*), MIN(created_at) FROM polls WHERE reviewed_by = 'import-pesqele-batch.ts';"

# 2. Atualizar cobertura
curl -X POST http://localhost:3000/api/tse/sync

# 3. Ver cobertura atualizada
psql -h localhost -U postgres -d electiolab -c \
  "SELECT * FROM pesqele_coverage WHERE cargo = 'presidente' AND uf = 'BR';"
```

## Estrutura do JSON

```json
{
  "metadata": {
    "extraction_date": "2026-08-19T10:46:02.565Z",
    "total_missing": 74,        // Total faltante Tier 1
    "tier1_total": 74,
    "institutos": 5,
    "institutos_list": ["..."],
    "positions": ["PRES", "GOV_SP", ...],
    "lote1_count": 50           // Registros neste lote
  },
  "lote1": [
    {
      "institute": "Datafolha",
      "position": "PRES",         // PRES ou GOV_UF
      "state": "BR",              // BR ou UF específica
      "fieldwork_date": "2026-08-21",
      "poll_name": "Datafolha — PRES",
      "sample_size": 1610,
      "margin_of_error": 2.44,    // % (95% CI)
      "publication_date": "2026-08-21",
      "source_url": "https://www.tse.jus.br/..."
    },
    ...
  ]
}
```

## Distribuição por Lote

| Lote | Pesquisas | Status |
|------|-----------|--------|
| Lote 1 | 50 | ✅ Pronto |
| Lote 2 | 24 | Sequencial |
| **Total** | **74** | |

## Próximos Passos

1. ✅ **Approvar Lote 1** (revisar dados acima)
2. ⏳ **Rodar import --apply**
3. ⏳ **Validar resultado** (pesquisas em /dashboard)
4. ⏳ **Lote 2** (mesma seq, após Lote 1)

## Troubleshooting

### "Dry-run mode. Use --apply"
Você rodou o script sem `--apply`. Adicione flag para gravar.

### "Batch 1 falhou: ..."
Erro no banco (constraints, permissions, etc). Ver full error message.

### Pesquisas não aparecem em /dashboard
1. Conectar ao Supabase (dev env vs prod)
2. Rodar `curl /api/tse/sync` pra atualizar cache
3. Refreshar página

### Duplicatas nas pesquisas?
1. Verificar `polls.tse_registration` — deve ser UNIQUE
2. Rodar SQL cleanup se necessário

---

**Questões?** Ver `/docs/ELECTIOLAB-AUDIT-2026-08.md` ou `/docs/tse-integration-guide.md`
