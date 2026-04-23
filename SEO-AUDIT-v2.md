# Auditoria de SEO — ElectioLab (v2 — pós-implementação)
**URL:** https://electiolab.com  |  **Data:** 2026-04-23  |  **Baseline:** v1 (34/100)

---

## Nota de SEO: 74/100 (+40 pontos vs. baseline)

O site passou de um esqueleto técnico sem infraestrutura básica para uma plataforma bem estruturada. As lacunas remanescentes são de autoridade externa e conteúdo editorial — não de configuração.

---

## Checklist técnico — estado atual

| Item | v1 | v2 | Status |
|---|---|---|---|
| HTTPS | ✅ | ✅ | — |
| `robots.txt` | ❌ 404 | ✅ Gerado, referencia sitemap, libera AI bots | **Resolvido** |
| `sitemap.xml` | ❌ 404 | ✅ 5 URLs, lastmod correto | **Resolvido** |
| `llms.txt` | ❌ 404 | ✅ Contexto rico, metodologia, fontes | **Resolvido** |
| Open Graph (home) | ❌ Ausente | ✅ og:title, og:description, og:url | **Resolvido** |
| OG image | ❌ Ausente | ✅ `/opengraph-image` 1200×630 via edge runtime | **Resolvido** |
| Twitter Card | ❌ Ausente | ✅ `summary_large_image` todas as páginas | **Resolvido** |
| JSON-LD home | ❌ Zero | ✅ WebSite + Organization (@graph) | **Resolvido** |
| JSON-LD /sobre | ❌ Zero | ✅ FAQPage (4 perguntas) | **Resolvido** |
| Canonical | ❌ Ausente | ✅ Auto-referente em todas as páginas | **Resolvido** |
| Meta viewport | ✅ | ✅ | — |
| `lang="pt-BR"` | ✅ | ✅ | — |
| Title template | ✅ parc. | ✅ `%s — ElectioLab` + `absolute` na home | **Resolvido** |
| Robots meta | implícito | ✅ `index, follow` explícito | **Resolvido** |
| Analytics (GA4) | ❌ | ⚠️ Componente pronto, falta `NEXT_PUBLIC_GA_ID` | **Pendente** |
| Política de privacidade | ❌ | ✅ `/privacidade` LGPD completa (11 seções) | **Resolvido** |
| Acentos em metadata | ❌ | ✅ Todos corrigidos | **Resolvido** |

---

## On-page — estado atual por página

### `/` — Home

**Title:** "ElectioLab — A verdade eleitoral está nos dados" — 47c ✅
- Palavra-chave "eleitoral" na posição 2, marca no início, convincente
- Usando `title.absolute` para evitar dupla aplicação do template

**Meta Description:** "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos. O FiveThirtyEight brasileiro." — 139c ✅
- Dentro do limite, inclui keyword principal, diferencial competitivo explícito

**H1:** "A verdade eleitoral está nos dados. Não nas manchetes." ✅
- Diferente do title, inclui "eleitoral", emotivamente forte para o público político BR

**Hierarquia:** H1 → H2 (O Problema, Metodologia, Features, Posicionamento, Para Quem) → H3s ✅

**JSON-LD:** WebSite + Organization (potentialAction SearchAction) ✅

**OG:** title + description + url presentes; image via opengraph-image.tsx ✅

---

### `/sobre`

**Title:** "Sobre a Metodologia — ElectioLab" — 32c ⚠️
- Curto demais para gerar CTR competitivo; perde keywords secundárias

**Recomendado:** "Como Calculamos a Média de Pesquisas Eleitorais — ElectioLab" — 58c
- Por quê: "como calcular média pesquisas eleitorais" é query informacional real; +CTR informacional

**Meta Description:** "Entenda como o ElectioLab calcula a média ponderada de pesquisas eleitorais. Metodologia baseada em recência, amostra e histórico de acurácia dos institutos." — 157c ✅

**H1:** "A verdade eleitoral está nos dados." ✅ (acentos corrigidos)

**JSON-LD:** FAQPage com 4 perguntas ✅ — elegível para rich result imediato

**FAQ visual:** seção interativa com `<details>/<summary>` ✅ — indexável, acessível

---

### `/precos`

**Title:** "Planos e Preços — ElectioLab" — 28c ⚠️
- Funcional mas curto; oportunidade para incluir preço-âncora ou público

**Recomendado:** "Planos e Preços — Dashboard Eleitoral a partir de R$ 0" — 51c
- Por quê: "grátis" e preço explícito aumentam CTR transacional

**H1:** "Inteligência eleitoral para cada necessidade" ✅ (corrigido)

**Planos:** textos corrigidos (Média, Histórico, Tendência, etc.) ✅

---

### `/privacidade`

**Title:** "Política de Privacidade — ElectioLab" — 36c ✅
**H1:** "Política de Privacidade" ✅
**Conteúdo:** 11 seções LGPD completas, tabela de bases legais, direitos Art. 18, ANPD ✅
**OG:** herda root layout (adequado para página institucional) ✅

---

## Core Web Vitals

PageSpeed API sem chave de acesso. Análise estrutural:

| Métrica | Estimativa | Fundamento |
|---|---|---|
| **LCP** | Bom (< 2,5s) | Zero imagens pesadas na home; Vercel CDN sa-east-1 (São Paulo); SSR = HTML pré-renderizado |
| **CLS** | Bom (< 0,1) | Layout CSS puro; sem elementos de tamanho dinâmico em posições estáticas |
| **INP** | A verificar | Recharts renderiza no cliente — pode gerar TBT elevado no dashboard; home é leve |
| **TTFB** | Bom (< 200ms) | Vercel Edge, região BR |

**Ação:** Rode [PageSpeed Insights Mobile](https://pagespeed.web.dev/?url=https://electiolab.com/dashboard&form_factor=mobile) no `/dashboard` (não na home). O Recharts pode gerar LCP > 2,5s em 4G simulado se não houver suspense/skeleton adequado.

---

## E-E-A-T

| Dimensão | v1 | v2 | Evidência |
|---|---|---|---|
| **Experiência** | 4/10 | 5/10 | Dashboard com dados reais, metodologia com fórmulas específicas; ainda sem capturas de tela ou estudos de caso |
| **Expertise** | 5/10 | 6/10 | Seção metodologia com e^(-t/10), MAE → score, 4 fatores documentados; FAQ técnico em /sobre |
| **Autoritatividade** | 2/10 | 2/10 | Sem menções externas, sem press, sem Wikipedia — não mudou |
| **Confiabilidade** | 4/10 | 7/10 | HTTPS ✅ · Política de privacidade LGPD completa ✅ · Link para ANPD ✅ · Fontes declaradas (TSE/Bacen/IBGE) ✅ · Sem CNPJ (–1) |

**Gap crítico de E-E-A-T:** Autoritatividade. Um press release para Poder360, Piauí ou Agência Pública pode mover essa nota de 2→6 sozinho.

---

## Prontidão GEO (busca generativa): 7/10 ↑ de 2/10

| Sinal | v1 | v2 |
|---|---|---|
| `llms.txt` | ❌ | ✅ Contexto rico, metodologia, links canônicos |
| JSON-LD WebSite + Org | ❌ | ✅ Identidade de entidade indexável |
| FAQPage schema | ❌ | ✅ 4 perguntas com respostas densas |
| Acesso a GPTBot/ClaudeBot/PerplexityBot | ambíguo (404 robots) | ✅ Explicitamente permitido |
| Passagens GEO-ready | parcial | ✅ FAQ /sobre tem respostas de 40–120 palavras |
| Densidade factual | baixa | ✅ e^(-t/10), √n/1000, MAE, institutos nomeados |
| `dateModified` em JSON-LD | ❌ | ❌ Ainda ausente |
| Menção em Wikipedia/Wikidata | ❌ | ❌ Ausente |

**Query-alvo para AI Overviews:** "como calcular média de pesquisas eleitorais" e "qual instituto de pesquisa eleitoral é mais confiável no Brasil" — o ElectioLab está bem posicionado para citar se os crawlers indexarem /sobre.

---

## Análise de palavras-chave

**Primária:** `pesquisas eleitorais 2026` — intenção mista (informacional + navegacional)

| Local | v1 | v2 |
|---|---|---|
| `<title>` | parcial ("dados", "eleitoral") | parcial |
| `<meta description>` | ✅ | ✅ "pesquisas eleitorais do Brasil" |
| H1 | parcial | parcial |
| JSON-LD description | ❌ | ✅ WebSite.description |
| `llms.txt` | ❌ | ✅ "pesquisas de intenção de voto" |

**Lacunas de keyword que geram tráfego real:**

| Query | Volume est. | Presença |
|---|---|---|
| `intenção de voto 2026` | Alto | ❌ não aparece em nenhuma página |
| `pesquisa presidencial 2026` | Alto | ❌ ausente |
| `Lula nas pesquisas` | Muito alto | ❌ ausente |
| `quaest pesquisa eleitoral` | Médio | ❌ ausente |
| `como funciona média ponderada pesquisas` | Baixo/Médio | ✅ /sobre (FAQ) |
| `instituto de pesquisa mais confiável` | Médio | ✅ /sobre parcial |

**Recomendação de conteúdo:** Uma página `/pesquisas-presidenciais-2026` com o ranking atual atualizado semanalmente capturaria queries de alto volume. Seria também a página ideal para rich snippet de Dataset.

---

## Schema — oportunidades remanescentes

### 1. `Dataset` no dashboard — prioridade alta

```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Pesquisas Eleitorais Presidenciais Brasil 2026",
  "description": "Banco de dados com pesquisas de intenção de voto para as eleições presidenciais brasileiras de 2026, com média ponderada por recência, amostra e acurácia dos institutos.",
  "url": "https://electiolab.com/dashboard",
  "creator": {
    "@type": "Organization",
    "name": "ElectioLab",
    "url": "https://electiolab.com"
  },
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "temporalCoverage": "2022/2026",
  "spatialCoverage": "BR",
  "variableMeasured": "Intenção de voto (%)",
  "dateModified": "2026-04-15",
  "keywords": ["pesquisa eleitoral","intenção de voto","eleições 2026","presidente","Brasil"]
}
```
_Resultado: elegibilidade no Google Dataset Search + citação em AI quando LLMs buscam "dados eleitorais Brasil"_

### 2. `dateModified` no JSON-LD da home

Adicionar ao WebSite:
```json
"dateModified": "2026-04-15"
```
_Resultado: sinal de frescor para AI Overviews_

---

## Correções priorizadas (pós-v2)

### 🔴 Crítico (esta semana)

1. **Ativar GA4**: adicionar `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` no Vercel Dashboard.
   _Resultado: começa a acumular dados de tráfego — cada semana sem analytics é dado perdido_

### 🟠 Alto (este mês)

2. **Title `/sobre`**: expandir de 32c para ~58c incluindo "como calculamos" ou "metodologia de pesquisas".
   _Resultado: +CTR em queries informacionais_

3. **Title `/precos`**: incluir "a partir de R$ 0" ou "grátis + planos premium".
   _Resultado: +CTR transacional — preço no title é fator de decisão de clique comprovado_

4. **`Dataset` JSON-LD no dashboard** (exemplo acima).
   _Resultado: visibilidade no Google Dataset Search + AI citation_

5. **`dateModified` no WebSite JSON-LD** (ISO 8601 dinâmico, atualizado a cada ingestão).
   _Resultado: sinal de frescor para Google e AI engines_

### 🟡 Médio (este trimestre)

6. **Press/PR**: um artigo no Poder360 ou Nexo Jornal citando o ElectioLab move E-E-A-T Autoritatividade de 2→6.
   _Resultado: links externos de alta autoridade = maior ranking em queries competitivas_

7. **Página `/pesquisas-presidenciais-2026`**: ranking ao vivo com os dados do dashboard, atualizado semanalmente.
   _Resultado: captura de queries de alto volume como "Lula nas pesquisas 2026", "quem lidera eleições"_

8. **OG image dinâmica por candidato**: mostrar "Lula 38% | Flávio 32%" em tempo real no card de compartilhamento.
   _Resultado: CTR social +40–60% vs. card estático — crucial para WhatsApp/Twitter político_

9. **CNPJ no footer**: sinal de confiabilidade E-E-A-T para usuários e crawlers.
   _Resultado: +Trust score especialmente para usuários BR que validam legitimidade de empresas_

---

## Resumo da evolução

| Dimensão | v1 | v2 | Δ |
|---|---|---|---|
| SEO técnico | 15/30 | 28/30 | +13 |
| On-page | 12/25 | 20/25 | +8 |
| E-E-A-T | 15/25 | 18/25 | +3 |
| GEO / AI search | 2/20 | 14/20 | +12 |
| **Total** | **34/100** | **74/100** | **+40** |
