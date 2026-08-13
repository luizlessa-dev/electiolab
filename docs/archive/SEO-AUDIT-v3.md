# Auditoria de SEO — ElectioLab

**URL:** https://electiolab.com
**Data:** 2026-04-29
**Auditoria por:** Claude (Sonnet 4.7)

## Nota de SEO: **88/100**

Site bem estruturado, com fundamentos sólidos (HTTPS, sitemap, robots, schema, CWV). Existem ~6 correções táticas que podem subir a nota para 95+.

---

## On-page

### Tag `<title>` — home

- **Atual:** `"Pesquisas Eleitorais 2026 — Média Agregada | ElectioLab"` (49 chars)
- **Status:** ✅ Bom — keyword primária no início, marca no fim, dentro do limite.
- **Sugestão de A/B:** `"Pesquisas Eleitorais 2026 ao Vivo — Média Ponderada | ElectioLab"` (60 chars). "Ao vivo" + "ponderada" sinaliza diferencial vs. competidores que mostram listas estáticas.

### Tag `<title>` — `/instituto/{slug}` 🔴 **BUG**

- **Atual:** `"Datafolha — Pesquisas Eleitorais 2026 | ElectioLab — ElectioLab"` (63 chars, duplicado)
- **Causa:** `generateMetadata` retorna title com `| ElectioLab` no fim, e o `metadata.title.template` do `layout.tsx` adiciona ` — ElectioLab` automático.
- **Fix imediato:** trocar `title: \`${institute.name} — Pesquisas Eleitorais 2026 | ElectioLab\`` por `title: \`${institute.name} — Pesquisas Eleitorais 2026\``. Template global completa o sufixo.

### Meta description — home

- **Atual:** `"Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos. O FiveThirtyEight brasileiro."` (138 chars)
- **Status:** ✅ Bom. Tem keyword + diferencial.
- **Caveat:** "FiveThirtyEight brasileiro" funciona pra audiência tech (jornalistas, analistas). Pra eleitor médio pode ser obscuro. Considerar A/B com versão mais direta: `"Veja qual candidato lidera as pesquisas presidenciais e estaduais 2026 no Brasil. Média ponderada de Datafolha, Quaest, Ipec e mais. Atualizado a cada 6h."` (158 chars)

### Hierarquia de títulos — home

- **H1:** `"A verdade eleitoral está nos dados. Não nas manchetes."` ⚠️ **Sem keyword primária**
- **H2 (7 ocorrências):** "O Problema", "Metodologia", "Features", "Posicionamento", "Para Quem", "Eleições Estaduais 2026", "O essencial das pesquisas, toda segunda-feira"

**Problemas:**
1. **H1 não contém "pesquisas eleitorais 2026"** — keyword primária está só no `<title>`. Google passa a confiar mais em H1 quando confirma keyword.
2. **H2s "O Problema", "Features", "Para Quem"** são labels genéricos, não querystrings. "Problema" não é palavra que ninguém busca.

**Recomendado:**
- H1: `"As pesquisas eleitorais 2026, em uma média ponderada que faz sentido"` OU mantém o emocional + adiciona um subtítulo H2 logo abaixo: `"Agregador de pesquisas eleitorais 2026 — Brasil"`.
- H2s: trocar "O Problema" → "Por que pesquisas individuais erram", "Features" → "Recursos do dashboard", "Para Quem" → "Para jornalistas, analistas e cientistas políticos". Estes capturam intenção.

### Headings — `/candidato/{slug}`

- ✅ H1 = nome do candidato (correto pra rich result Person)
- ✅ H2s descritivos por seção

### Headings — `/instituto/{slug}`

- ⚠️ **H1 ausente.** Página tem só "Sobre o score de acurácia ElectioLab" como heading mais alto encontrado. Adicionar H1 com nome do instituto (ex: `<h1>Datafolha</h1>`) é crítico — Google penaliza páginas sem H1 em ranking de keyword "Datafolha pesquisa".

### Imagens

- **Total `<img>`:** 0 (usa CSS background + SVG inline — Next.js Image não usa `<img>` nativo)
- **Status:** ✅ Sem dívida de alt, mas perde oportunidade. Considere `<Image>` do Next na foto oficial TSE em `/candidato/{slug}` com `alt={c.name + ' — ' + c.party}` pra reforçar relevância.

### URL structure

- ✅ Limpa: `/candidato/lula`, `/instituto/datafolha`, `/comparar`, `/mapa`, `/eleicoes-governador-sp-2026`
- ✅ Sem acentos, com hífens, minúsculas, < 75 chars.

### Linking interno

- **Home** → /candidatos, /comparar, /mapa, /precos, /sobre, /imprensa, /privacidade, /pesquisas-presidenciais-2026, 27 páginas `/eleicoes-governador-{uf}-2026` (no footer)
- **`/candidato/{slug}`**: → /dashboard, sem link cruzado pro `/instituto/{slug}` da pesquisa mais recente. **Lacuna:** cada poll listado deveria linkar `<Link href="/instituto/{slug}">{institute.name}</Link>` em vez de só texto.
- **`/instituto/{slug}`**: tem link pra `/sobre#metodologia` ✅. Lacuna: histórico de polls não linka pro `/candidato/{slug}` quando aparece nome de candidato.

**Correção priorizada:** transformar nome de instituto em link cruzado dentro de `/candidato/{slug}` (todas as 10 ocorrências de `pr.poll?.institute?.name`). 1h de trabalho, ganho de PageRank interno.

---

## SEO técnico

| Checagem | Status | Nota |
|---|---|---|
| HTTPS | ✅ Cert válido | 10/10 |
| robots.txt | ✅ Presente, lista sitemap, permite GPTBot/Claude/Perplexity/Google-Extended/CCBot, bloqueia /api/+/dashboard/ | 10/10 |
| sitemap.xml | ✅ 358 URLs (candidatos + institutos + UFs + core) | 10/10 |
| Canonical | ✅ Auto-referente em home, candidato, instituto | 10/10 |
| Meta viewport | ✅ Presente | 10/10 |
| Meta robots | ✅ `index, follow` | 10/10 |
| Schema.org JSON-LD | ⚠️ Home: WebSite+Organization+SearchAction. Falta BreadcrumbList nas internas. | 7/10 |
| hreflang | N/A (site monolíngue) | — |
| OG + Twitter Card | ✅ Completos com og:image dinâmico | 10/10 |
| llms.txt | ⚠️ Presente mas **desatualizado** (lista só 3 governadores de 27) | 6/10 |

---

## Core Web Vitals

(Lighthouse mobile, simulação 4G + CPU 4× throttle, medido em 28-29 de abril)

| Métrica | home | /candidato/{slug} | /comparar | Meta |
|---|---|---|---|---|
| **Performance score** | 97 | 96 | 96 | ≥ 90 ✅ |
| **LCP** | 2.0s | 2.3s | 2.3s | ≤ 2.5s ✅ |
| **INP** | < 200ms | < 200ms | < 200ms | ≤ 200ms ✅ |
| **CLS** | 0 | 0 | 0 | ≤ 0.1 ✅ |
| **FCP** | 1.3s | 1.5s | 1.4s | ≤ 1.8s ✅ |

**Conclusão:** CWV está nas três métricas em "Bom". Sem dívida.

---

## E-E-A-T

| Dimensão | Nota | Evidência |
|---|---|---|
| **Experiência** | 7/10 | Metodologia detalhada (4 fatores ponderação) + dados reais 2022 + scores reais de instituto. Mas sem "case study" de previsão acertada vs errada. |
| **Expertise** | 6/10 | Conteúdo técnico correto (terminologia "média ponderada", "intervalo de confiança", "MAE"). **Falta bio do autor visível.** Quem está por trás? Página `/sobre` deveria ter foto + LinkedIn de quem opera. |
| **Autoritatividade** | 5/10 | Plataforma é nova (sem citações de imprensa ainda). Schema Organization sem `sameAs` apontando pra LinkedIn/Twitter da marca. |
| **Confiabilidade** | 9/10 | HTTPS ✅, política de privacidade LGPD-compliant ✅, e-mail contato ✅, fontes citadas (TSE/Bacen/IBGE/CNJ) ✅. |

**Para subir E-E-A-T:**
1. Adicionar página `/sobre` com **bio do operador** (foto, credenciais, LinkedIn)
2. JSON-LD `Organization.sameAs` → `["https://twitter.com/electiolab", "https://linkedin.com/company/electiolab", "https://github.com/electiolab"]` (mesmo se ainda não existirem — registrar é grátis)
3. Pitchar release de imprensa pra 3-5 jornalistas (Folha, UOL, Poder360, etc.) — **uma menção em veículo grande** dispara E-E-A-T autoritatividade
4. Adicionar selo "Cadastrado no TSE" se aplicável (ou fontes oficiais)

---

## Prontidão GEO (busca generativa) — **8.5/10**

Pontos fortes:

- ✅ **llms.txt presente** (2.5kb com overview canônico, metodologia, rotas)
- ✅ **robots.txt explicitamente permite GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot**
- ✅ **Schema rico** (Person, Organization, WebSite, SearchAction)
- ✅ **Densidade factual alta** — números, datas, %, TSE registration codes (LLMs adoram)
- ✅ **OG image dinâmica** com tagline + stats (Twitter/Threads/WhatsApp share)
- ✅ **PT-BR bem escrito** — vantagem competitiva em AI Overviews em português

Lacunas:

1. 🔴 **llms.txt desatualizado** — lista só 3 governadores estados (SP/MG/RJ) quando temos 27. Atualizar pra refletir cobertura completa.
2. ⚠️ **Sem H2/H3 em formato de pergunta** — engines generativos extraem passagens 40-80 palavras de blocos pergunta+resposta. Adicionar:
   - `<h2>Como funciona a média ponderada?</h2>` + 50-80 palavras
   - `<h2>Qual o instituto mais acurado em 2022?</h2>` + 50-80 palavras
3. ⚠️ **FAQPage schema ausente** — home tem 6 H2 que poderiam virar `FAQPage` no JSON-LD.
4. ⚠️ **Sem `dateModified` em Person/Organization schema** — frescor importa.
5. ⚠️ **Sem Wikipedia/Wikidata entry** — "ElectioLab" como entidade Wikipedia é inviável (muito novo), mas registrar Wikidata é fácil e ajuda LLMs.

**Quick win:** atualizar `llms.txt` + adicionar 1 FAQPage no `/sobre`. Em 1h leva GEO score pra 9.5.

---

## Análise de palavras-chave

### Home

- **Primária:** `"pesquisas eleitorais 2026"` (volume alto, intenção informacional/navegacional)
- **Auditoria de colocação:**
  - title ✅
  - meta description ✅
  - URL ⚠️ (slug `/` não inclui — domínio compensa parcialmente)
  - H1 ❌ (apenas tagline)
  - 1º H2 ❌ ("O Problema")
  - primeiras 100 palavras ✅ (tagline + intro)
- **Densidade:** 0.8% (saudável)
- **Secundárias presentes:** "média ponderada" ✅, "Datafolha" ✅, "Quaest" ✅, "Ipec" ✅, "intenção de voto" ⚠️ (só meta, não corpo), "Lula" ✅, "presidente" ✅, "governador" ✅

**Gaps de keyword:**
- "intenção de voto" — termo MUITO buscado em PT-BR, deveria aparecer no H1 ou primeiro H2
- "ranking institutos" — termo de cauda longa, viraria página `/institutos` (que já existe)
- "agregador pesquisa eleitoral" — competitivo mas alcançável; reforçar no copy

### `/candidato/{slug}` — sample Lula

- **Primária:** `"lula pesquisa 2026"` (alto volume)
- ✅ title menciona "Lula", H1 = "Lula", schema Person presente
- ⚠️ falta seção "Lula nas pesquisas para presidente 2026" como H2 explícito (hoje é "Histórico em pesquisas — Presidencial 2026 - 1º Turno"). Reescrever pra: `"Lula nas pesquisas presidenciais 2026"` ranqueia pra long-tail melhor.

### `/instituto/datafolha`

- **Primária:** `"datafolha 2026"` ou `"datafolha pesquisa eleitoral"`
- ✅ Score de acurácia destacado (Datafolha 92%) — único site que faz isso, oportunidade enorme
- ⚠️ Title duplicado (bug acima)
- ⚠️ Sem H1 (apenas H2 "Sobre o score")

---

## Oportunidades de schema

### 1. BreadcrumbList em todas internas (CRÍTICO)

Adicionar em `/candidato/[slug]`:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "ElectioLab", "item": "https://electiolab.com" },
    { "@type": "ListItem", "position": 2, "name": "Candidatos", "item": "https://electiolab.com/candidatos" },
    { "@type": "ListItem", "position": 3, "name": "Lula" }
  ]
}
```

Resultado: rich result com breadcrumb na SERP.

### 2. FAQPage no /sobre (ALTO)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Como funciona a média ponderada do ElectioLab?",
      "acceptedAnswer": { "@type": "Answer", "text": "Cada pesquisa recebe peso por 4 fatores: recência (meia-vida 10 dias), tamanho da amostra (raiz quadrada do n), metodologia (presencial > telefônica > online) e acurácia histórica do instituto..." }
    },
    { "@type": "Question", "name": "Qual o instituto mais acurado nas eleições de 2022?", ... }
  ]
}
```

Resultado: AI Overviews + accordion na SERP.

### 3. Article schema em relatórios

Página `/relatorio/semana-17-2026` deveria ter:

```json
{
  "@type": "Article",
  "headline": "...",
  "datePublished": "2026-04-23",
  "dateModified": "2026-04-23",
  "author": { "@type": "Person", "name": "Luiz Lessa", "url": "..." }
}
```

### 4. Person schema com `dateModified`

`/candidato/{slug}` já tem Person — adicionar `dateModified: c.updated_at` ajuda Google saber que é recente.

### 5. SpeakableSpecification (BÔNUS — Google Assistant)

Em `/sobre`:

```json
{
  "@type": "WebPage",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".intro", ".methodology"]
  }
}
```

---

## Correções priorizadas

### 🔴 CRÍTICO (esta semana)

1. **Fix title duplicado** em `/instituto/{slug}` — remover `| ElectioLab` do generateMetadata, deixar template global completar. (15 min)
2. **Adicionar H1 em `/instituto/{slug}`** — `<h1>{institute.name}</h1>` (5 min)
3. **Atualizar `llms.txt`** — listar todos 27 governadores 2026 + 27 senadores + as novas páginas (`/candidatos`, `/comparar`, `/mapa`, `/institutos`, `/embed`). (10 min)
4. **Linkar nome de instituto em `/candidato/{slug}`** — toda menção `pr.poll.institute.name` vira `<Link href="/instituto/{slug}">`. Boost de PageRank interno + UX. (1h)

### 🟠 ALTO (este mês)

5. **Adicionar `<h2>` em formato de pergunta** na home + `/sobre`:
   - "Como funciona a média ponderada?"
   - "Qual o instituto mais acurado?"
   - "Quem lidera em cada estado?"
6. **FAQPage JSON-LD** em `/sobre` (5-7 perguntas)
7. **BreadcrumbList JSON-LD** em /candidato/, /instituto/, /comparar
8. **Bio do autor** em `/sobre` com foto + LinkedIn (E-E-A-T)
9. **`Organization.sameAs`** apontando pra perfis sociais reais (mesmo recém-criados)
10. **A/B test do H1 home** — emocional vs keyword-rich

### 🟡 MÉDIO (este trimestre)

11. **Pitch de imprensa** — 3-5 jornalistas pra ganhar primeira menção autoritativa
12. **Wikidata entry** pra ElectioLab (gratuito, 30 min)
13. **Article schema** nos relatórios semanais
14. **Speakable** no /sobre
15. **Schema NewsArticle** (se ElectioLab vai publicar análises editoriais)
16. **Páginas dedicadas pra perguntas de cauda longa**:
    - `/quem-vence-no-segundo-turno-presidencia-2026`
    - `/instituto-mais-acurado-eleicoes-2022`
    - `/candidato-com-mais-rejeicao-presidencia-2026`

---

## Sumário pra ação

**Esta semana (≤ 2h total):** itens 1-4 do crítico. Sobe nota de 88 → 92.

**Este mês (~1 dia útil):** itens 5-10. Sobe nota pra 95+ e desbloqueia rich results.

**Este trimestre:** marketing/PR + páginas long-tail. Esse é o trabalho que diferencia ElectioLab de competidores diretos (Poder360 dashboard, Folha de S.Paulo agregação).

— fim —
