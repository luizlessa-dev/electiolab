# 🟦 Pesquisas de Deputado Federal 2026 — Guia Executivo

## 🎯 O que foi entregue

Três fases completas de coleta de pesquisas de Deputado Federal para os 27 estados.

---

## 📦 Arquivos Criados

### **Scripts (Executáveis)**

```bash
scripts/import-deputado-tier1.ts              # ← Fase 1: Import Tier 1
scripts/estimate-deputado-by-state.ts         # ← Fase 2: Simulador
scripts/check-poder360-weekly.sh              # ← Fase 3: Monitoramento
```

### **Bibliotecas**

```bash
src/lib/simulador-deputado.ts                 # Modelo Bayesiano (30 coligações × 27 UFs)
```

### **Documentação**

```bash
docs/PODER360-DEPUTADO-GUIDE.md              # Guia manual (Fase 3)
EXECUTAR-DEPUTADO-FEDERAL.md                 # Instruções passo-a-passo
PESQUISAS_DEPUTADOS_FEDERAIS_ANALISE.md     # Análise completa
DEPUTADO-FEDERAL-README.md                   # Este arquivo
```

### **Dados de Entrada**

```bash
data/pesqele_deputado_import.json            # 3 pesquisas Tier 1 (já existia)
```

---

## 🚀 Como Executar

### **Fase 1: Import (15 min)**

```bash
# Validar
npx tsx scripts/import-deputado-tier1.ts --dry-run

# Aplicar
npx tsx scripts/import-deputado-tier1.ts --apply
```

**Resultado:** 3 pesquisas reais no banco (Datafolha SP, Atlas MG, Paraná RJ)

---

### **Fase 2: Simulador (45 min)**

```bash
# Validar (1 estado)
npx tsx scripts/estimate-deputado-by-state.ts --dry-run --state=SP

# Aplicar (todos os 27 estados)
npx tsx scripts/estimate-deputado-by-state.ts --apply &
```

**Resultado:** ~120 pesquisas estimadas (4-5 coligações × 27 UFs)

---

### **Fase 3: Monitoramento (setup 5 min + ongoing)**

```bash
# Setup
bash scripts/check-poder360-weekly.sh

# Depois: seguir docs/PODER360-DEPUTADO-GUIDE.md
# quando encontrar dados em Poder360
```

**Resultado:** Captura manual de pesquisas reais conforme aparecerem

---

## 📊 Cobertura Esperada

| Tipo | Quantidade | Estados | Método |
|------|-----------|---------|--------|
| **Real** | 3 | SP, MG, RJ | Tier 1 (Datafolha, Atlas, Paraná) |
| **Estimado** | ~120 | Todos 27 | Simulação Bayesiana (presidencial) |
| **Poder360** | +1-2/mês | Variável | Manual (Poder360) |

**Total:** ~125+ pesquisas de Deputado Federal

---

## 🔬 Como Funciona o Simulador

```
Entrada:      Pesquisa Presidencial (estado)
                ↓
Transformação: Aplica fator de "pulverização"
                ├─ Coesão (voto direto à coligação)
                ├─ Pulverização (dispersão entre partidos)
                └─ Ruído regional
                ↓
Saída:        Estimativa de Deputado Federal
                └─ Com intervalo de confiança 95%
```

**Exemplo (São Paulo):**
```
Presidente (Lula 42%)
  → PT-Aliados: 28.5% (±3.7%)  [coesão 65%]
  
Presidente (Bolsonaro 38%)
  → PL-Aliados: 22.1% (±4.2%)  [coesão 62%]
  
Centro (diversos 20%)
  → Centro: 18.3% (±5.5%)       [coesão 45%]
```

**Vantagens:**
- ✅ Funciona mesmo SEM pesquisa de deputado
- ✅ Intervalo de confiança explícito
- ✅ Baseado em dados reais (presidencial)
- ✅ Sem dependência de scraping (seguro)

---

## ✅ Checklist Pré-Execução

```
VERIFICAÇÕES:

□ Ambiente
  □ echo $NEXT_PUBLIC_SUPABASE_URL (não vazio?)
  □ echo $SUPABASE_SERVICE_ROLE_KEY (não vazio?)
  
□ Dados
  □ ls data/pesqele_deputado_import.json (existe?)
  
□ Conexão
  □ curl -s https://xoxztzologqeqbajlhya.supabase.co/health (200?)
```

**Se algum falhar:** Setup `.env.local` primeiro

```bash
# Em electiolab/
source .env.local  # Carrega variáveis
```

---

## 📈 Pós-Execução: Verificar Dados

```sql
-- Total de pesquisas de deputado
SELECT COUNT(*) FROM polls WHERE office='deputado';
-- Esperado: ~125

-- Por tipo
SELECT source_kind, COUNT(*) FROM polls 
WHERE office='deputado' GROUP BY source_kind;
-- Esperado: tier1-manual: 3, simulated: ~120

-- Cobertura de estados
SELECT DISTINCT scope FROM polls 
WHERE office='deputado' ORDER BY scope;
-- Esperado: AC, AL, AP, ... TO (27 total)
```

---

## 🎨 Frontend: Como Usar

### Query Exemplo

```typescript
// src/lib/polls-api.ts

// Buscar pesquisas de Deputado Federal em SP
const { data: deputyPolls } = await supabase
  .from('polls')
  .select('*')
  .eq('office', 'deputado')
  .eq('scope', 'SP')
  .order('publication_date', { ascending: false });

// Filtrar por tipo
const realPolls = deputyPolls.filter(p => p.source_kind === 'tier1-manual');
const estimatedPolls = deputyPolls.filter(p => p.source_kind === 'simulated');
```

### Componente Example

```tsx
// Mostrar com label diferente

{realPolls.map(poll => (
  <div key={poll.id}>
    <strong>✓ {poll.candidate}</strong> — {poll.percentage}%
    <small>Datafolha (real)</small>
  </div>
))}

{estimatedPolls.map(poll => (
  <div key={poll.id} className="estimated">
    <em>~ {poll.candidate}</em> — {poll.percentage}%
    <small>Estimado ({poll.lower_bound}%-{poll.upper_bound}%)</small>
  </div>
))}
```

---

## 🔐 Segurança & Confiabilidade

| Aspecto | Status | Detalhes |
|--------|--------|----------|
| **Termos de Serviço** | ✅ Compliant | Sem scraping automático (Poder360 manual) |
| **Fonte de Dados** | ✅ Confiável | Tier 1 + dados internos (presidencial) |
| **Rastreabilidade** | ✅ Total | Cada poll tem `source_kind` e `source_url` |
| **Validação** | ✅ Rigorosa | Scripts validam antes de inserir |
| **Deduplicação** | ✅ Automática | Unique (institute, candidate, office, scope, fieldwork_end) |

---

## 📞 Suporte & Troubleshooting

### **Problema: "Institute not found"**
```
Solução: Verificar se institutos existem em DB
psql -c "SELECT * FROM institutes WHERE name ILIKE 'datafolha';"
```

### **Problema: "Election not found"**
```
Solução: Criar elections para deputado_federal (se não existir)
INSERT INTO elections (type, state, year) VALUES ('deputado_federal', 'SP', 2026);
```

### **Problema: Simulador muito lento**
```
Solução: Rodar em background
nohup npx tsx scripts/estimate-deputado-by-state.ts --apply > /tmp/deputado.log 2>&1 &
tail -f /tmp/deputado.log  # Monitorar
```

---

## 🗺️ Próximas Melhorias (Roadmap)

```
Phase 3.2 (Futuro):
  • Scraper robusto de Poder360 (não simples curl)
  • Webhook de alertas quando nova pesquisa encontrada
  • Agregação por "candidatos famosos" (simulador específico)

Phase 4 (Muito distante):
  • Integração com APIs dos institutos (se disponível)
  • Modelo preditivo por microrregião
  • Comparação com resultados 2022
```

---

## 📚 Referências

| Arquivo | Propósito |
|---------|-----------|
| [`EXECUTAR-DEPUTADO-FEDERAL.md`](./EXECUTAR-DEPUTADO-FEDERAL.md) | Passo-a-passo completo |
| [`docs/PODER360-DEPUTADO-GUIDE.md`](./docs/PODER360-DEPUTADO-GUIDE.md) | Guia manual Poder360 |
| [`PESQUISAS_DEPUTADOS_FEDERAIS_ANALISE.md`](./PESQUISAS_DEPUTADOS_FEDERAIS_ANALISE.md) | Análise de fontes |
| [`src/lib/simulador-deputado.ts`](./src/lib/simulador-deputado.ts) | Código do modelo |

---

## ✨ TL;DR

**Se estiver com pressa:**

```bash
# 1. Validar environment
source .env.local

# 2. Rodar tudo (Fase 1 + 2 em paralelo)
npx tsx scripts/import-deputado-tier1.ts --apply
npx tsx scripts/estimate-deputado-by-state.ts --apply &

# 3. Esperar ~50 min
# (pode fazer outras coisas)

# 4. Verificar resultado
psql -c "SELECT COUNT(*) FROM polls WHERE office='deputado';"
# Output: ~125
```

Done! ✅

---

**Status:** ✅ Completo e pronto para execução  
**Data de Criação:** 2026-09-29  
**Versão:** 1.0  
**Autor:** ElectioLab Team + Claude AI
