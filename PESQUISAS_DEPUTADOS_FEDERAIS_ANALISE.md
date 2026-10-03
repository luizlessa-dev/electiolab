# Análise: Pesquisas de Deputados Federais 2026

**Data:** 2026-09-29  
**Conclusão:** ⚠️ Dados MUITO LIMITADOS | Infraestrutura pronta, mas não há pesquisas públicas agregadas

---

## 📊 O que o Projeto TEM

### ✅ Dados Encontrados

**Arquivo:** `data/pesqele_deputado_import.json`

| Instituto | Estado | Fieldwork | Sample | Margem | TSE Registro |
|-----------|--------|-----------|--------|--------|--------------|
| Datafolha | SP | 2026-09-05 a 2026-09-08 | 1610 | 2.44% | SP-02245/2026 |
| Atlas Intel | MG | 2026-09-03 a 2026-09-06 | 1800 | 2.31% | MG-02340/2026 |
| Paraná Pesquisas | RJ | 2026-08-30 a 2026-09-02 | 1600 | 2.45% | RJ-02156/2026 |

**Status:** ✅ 3 pesquisas | ✅ Todos Tier 1 (reputados) | ✅ Metadados completos

### ✅ Infraestrutura Pronta

- ✅ Schema `polls` suporta `office='deputado'` e `scope='UF'`
- ✅ Script de conversão TSE pronto (`scripts/convert-tse-polls-to-supabase.ts`)
- ✅ Aprovação automática de institutos reputados
- ✅ Validação de deduplicação (institute + candidate + office + scope + fieldwork_end)

---

## ❌ Por que há TÃO POUCOS dados?

### 1. **Pesquisas de Deputado Federal são Raras**

```
Presidente:      ~200+ pesquisas disponíveis
Governador:      ~150+ por estado
Senador:         ~50+ por estado
Deputado Federal: ~3 públicas encontradas 😱
```

**Razões:**
- ❌ Muito caro: ~500+ candidatos por estado
- ❌ Pouca demanda: Eleitores não conhecem deputados
- ❌ Metodologia complexa: Precisa agregar ou usar rating
- ❌ TSE não libera: Dataset do TSE é só metadados

### 2. **Institutos Reputados Priorizam**

Datafolha, IPEC, Quaest, etc. focam em:
1. Presidente (nacional)
2. Governador (por estado)
3. Senador (por estado)
4. **Depois tudo mais** (se houver clientela)

### 3. **TSE Dataset é Incompleto**

O arquivo `pesquisa_eleitoral_2026_BRASIL.csv` que você baixou:
- ✅ Tem registro de pesquisas sobre Deputado Federal
- ❌ **NÃO tem os resultados** (intenção de voto por candidato)
- ❌ Só metadados (data, tamanho amostra, metodologia)

---

## 🎯 Alternativas Realistas

### Opção 1: Pesquisas por PARTIDO (não candidato)

**Disponibilidade:** ⭐⭐⭐⭐ (mais comum)

Institutos às vezes fazem:
- "Intenção de voto para Deputado Federal (agregado de partido)"
- Agregado por estado
- Exemplo: "PT 15%, PL 12%, MDB 8%" (São Paulo)

**Onde procurar:**
- Poder360 (agregador)
- Gazette do Povo
- Vox Brasil (publica regularmente)
- Relatos de imprensa dos institutos

### Opção 2: Pesquisas de Votação Potencial

**Disponibilidade:** ⭐⭐⭐ (moderado)

Institutos fazem "teste de candidatos famosos":
- Celebridades/influenciadores como deputado
- Simuladores dinâmicos
- Agregado por estado

**Exemplo:** "Se houvesse eleição hoje para Deputado Federal em SP, em qual você votaria? [lista de celebridades]"

### Opção 3: Usar Dados Presidenciais como Proxy

**Disponibilidade:** ⭐⭐⭐⭐⭐ (abundante)

Se o objetivo é entender:
- Tendência de voto por estado
- Força de coalições
- Dinâmica de cada UF

**Pode usar:** Pesquisas presidenciais + modelo Bayesiano para "down-vote" a deputado

Exemplo:
```
PT vota Lula 42% em SP
  → Assume-se ~30-35% pode votar PT para deputado
  → Ajusta por histórico + pesquisas pontuais
```

---

## 📈 Dados Disponíveis no Projeto

### 1. Governador (por Estado)

**Arquivo:** `tmp/wiki/` (Acre: `ac-t0.json`, São Paulo: `sp-t1.json`, etc)

```json
[
  {
    "institute": "Datafolha",
    "state": "SP",
    "fieldwork_end": "2026-09-20",
    "results": [
      {"name": "João Dória PSDB", "pct": 25.3},
      {"name": "Geraldo Alckmin PSD", "pct": 18.2},
      ...
    ]
  }
]
```

**Status:** ✅ ~80+ pesquisas por estado | ✅ Pronto pra usar

### 2. Senador (por Estado)

**Status:** ✅ Disponível também em `tmp/wiki/` | ✅ Agregado por estado

### 3. Presidente (Nacional + 2º turno)

**Arquivo:** `data/tier2-pesquisas-2026.json`

**Status:** ✅ ~30 pesquisas | ✅ Pronto pra usar

---

## 💡 Recomendação

### Para Avançar com Deputados Federais:

**1. Curto Prazo (1-2 dias)**
```bash
# Use os 3 dados Tier 1 que temos
# + Procure por pesquisas recentes de Poder360/Gazette
# + Adicione via ingest-manual.ts

# Estrutura esperada pra cada:
{
  "institute": "Datafolha",
  "office": "deputado",
  "scope": "SP",
  "candidate": "PT",        # Partido agregado
  "percentage": 15.2,
  "fieldwork_end": "2026-09-20",
  "source_url": "https://poder360.com.br/..."
}
```

**2. Médio Prazo (1-2 semanas)**
```bash
# Scraper de Poder360 (API ou webscraping)
# Coleta pesquisas de Deputado Federal por partido/estado
# Daily cron para update

# Estrutura:
scripts/ingest-poder360-deputado-polls.ts
  └─ Busca "deputado federal" + estado
  └─ Extrai partido + %
  └─ Valida e insere em poll_drafts
```

**3. Longo Prazo (1-2 meses)**
```bash
# Contato direto com institutos
# Negociar acesso a dados históricos de deputado federal
# Gerar simulador dinâmico baseado em modelo Bayesiano
```

---

## 📋 Checklist para Ativar Deputados Federais

- [ ] Importar 3 pesquisas Tier 1 (Datafolha SP, Atlas MG, Paraná RJ) via `ingest-manual.ts`
- [ ] Procurar em Poder360 (manual) por últimas pesquisas de deputado/partido
- [ ] Criar query para agregar por partido + estado em Supabase
- [ ] Adicionar endpoint `/api/polls/deputado-federal?uf=SP&partido=PT`
- [ ] Mostrar em página de estado (e.g., `/eleicoes/2026/sp`)
- [ ] Implementar scraper de Poder360 (webscraping ou contato com API)

---

## 🔗 Referências

| Recurso | Link |
|---------|------|
| 3 Pesquisas Tier 1 | `data/pesqele_deputado_import.json` |
| Infraestrutura Pronta | Schema `polls` em Supabase |
| Poder360 (busca) | https://www.poder360.com.br/poder-pesquisas-hoje/ |
| TSE Metadados | `pesquisa_eleitoral_2026_BRASIL.csv` (15 MB) |
| Wikipedia Governador | `tmp/wiki/*-t*.json` (gov por estado) |

---

## Conclusão

**Deputados Federais por partido/estado é possível, MAS:**
- ✅ Infraestrutura está pronta
- ❌ Dados públicos agregados são raros (~3 encontradas)
- ✅ Alternativa viável: Pesquisas por PARTIDO (agregado UF)
- ⚠️ Requer scraping de Poder360 ou contato direto com institutos

**Próximo passo:** Qual você prefere?
1. Importar os 3 dados que temos + procurar em Poder360 manualmente?
2. Construir scraper automático de Poder360?
3. Usar simulador dinâmico a partir de dados presidenciais?
