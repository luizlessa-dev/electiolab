# Mapa Político do Brasil - Setup Concluído

**Data:** 29/09/2026
**Status:** MVP Base Pronto ✓

## ✓ O que foi criado

### 1. Dados Geográficos
- `public/geo/estados.geojson` — Geometrias dos 27 estados brasileiros em Web Mercator
- Coordenadas: latitude/longitude dos limites estaduais
- Metadados: nome, sigla, região, população

### 2. Frontend Components

#### `src/app/geografia/page.tsx`
Página principal: layout com mapa + painel lateral

#### `src/app/geografia/components/BrazilMap.tsx`
- Renderiza 27 estados como `<svg><path>` elementos
- Interação: click/hover dispara eventos
- Cores por região (fallback)
- Projeção: Web Mercator simplificada

#### `src/app/geografia/components/StateStatsPanel.tsx`
- Painel lateral mostrando:
  - Nome do estado, região, população
  - Total de votos (2022)
  - Líder + partido + percentual
  - Indicador de carregamento

### 3. State Management
#### `src/hooks/useGeography.ts`
- Gerencia estado do mapa (selectedState, hoveredState)
- Cache local de dados por UF
- Funções: handleStateClick, handleStateHover, fetchStateData

### 4. API Backend
#### `src/app/api/v1/geography/state/[uf]/route.ts`
- Endpoint: `GET /api/v1/geography/state/SP` (exemplo)
- Retorna: stats de 2022 por estado (dados simulados por enquanto)
- Response fields: sigla, nome, region, populacao, total_votos, top_partido, top_partido_pct, color, polls_count
- Cache: 1 hora (HTTP ETag)

### 5. Estrutura de Pastas
```
src/
├── app/
│   ├── geografia/
│   │   ├── page.tsx
│   │   └── components/
│   │       ├── BrazilMap.tsx
│   │       └── StateStatsPanel.tsx
│   └── api/v1/geography/
│       └── state/[uf]/route.ts
├── hooks/
│   └── useGeography.ts
└── lib/geography/ (preparado para queries futuros)

public/
└── geo/
    └── estados.geojson
```

---

## 📋 Próximos Passos (Semana 1)

### [ ] Fase 1A: Validação + Dados Reais (2022)
1. [ ] Testar página /geografia (dev server)
2. [ ] Validar renderização do mapa SVG
3. [ ] Validar clicks/hover nos estados
4. [ ] Substituir dados simulados por queries reais do Supabase
   - Query: `SELECT * FROM elections WHERE year = 2022 AND state = ?`
   - Agregar por estado, calcular líder, percentual

### [ ] Fase 1B: Polish Visual
1. [ ] Melhorar cores (usar palette do projeto)
2. [ ] Responsivo (mobile: mapa menor, painel empilha)
3. [ ] Tooltips com info rápida (sem painel)
4. [ ] Busca de estado (autocomplete)

### [ ] Fase 2: Municípios (após domingo)
1. [ ] Endpoint `/api/v1/geography/state/:uf/municipalities`
2. [ ] Click em estado → modal/expansão com top 20 municípios
3. [ ] Integrar dados de votação municipal (apuracao.votacao_candidato)

### [ ] Fase 3: Histórico Eleitoral
1. [ ] Comparação 2022 vs 2026
2. [ ] Gráfico pequeno de evolução por estado
3. [ ] Destaques: estados que mudaram

---

## 🔧 Como Rodar

```bash
# Dev server
npm run dev

# Acessar
http://localhost:3000/geografia
```

---

## ⚠️ Notas Técnicas

### Dados Simulados (MVP)
`STATE_DATA_2022` em route.ts tem dados mockados. Será substituído por queries Supabase.

### Projeção Cartográfica
- Usando Web Mercator simplificado (não D3, sem dependências)
- Suficiente para MVP
- Se precisar zoom/pan, migrar para D3-geo depois

### Performance
- GeoJSON é ~15KB (compressível)
- SVG com 27 paths é rápido
- Cache HTTP de 1h nos endpoints

### Próximas Integrações Supabase
```sql
-- Query base para agregar por estado
SELECT 
  e.state as uf,
  COUNT(DISTINCT c.id) as candidatos,
  SUM(p.votes) as total_votos,
  p.party as top_partido,
  ROUND(100 * SUM(p.votes) / SUM(SUM(p.votes)) OVER (PARTITION BY e.state), 1) as pct
FROM elections e
JOIN candidates c ON e.id = c.election_id
JOIN polls p ON c.id = p.candidate_id
WHERE e.year = 2022 AND e.state = $1
GROUP BY e.state, p.party
ORDER BY total_votos DESC
LIMIT 1;
```

---

## 📅 Timeline Realista

- **Hoje (29/09):** Base estrutural ✓
- **Segunda (30/09):** Dados reais 2022, queries Supabase
- **Terça-Quarta (01-02/10):** Polish visual, responsivo
- **Quinta-Sexta (03-04/10):** QA, testes antes de domingo
- **Domingo (04/10):** Eleição — dados começam a sair
- **Segunda (05/10):** Integrar resultados 2026
- **Quinta (10/10):** Mapa completo com histórico 2022 vs 2026

