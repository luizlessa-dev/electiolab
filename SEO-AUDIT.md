# Auditoria de SEO — ElectioLab
**URL:** https://electiolab.com  |  **Data:** 2026-04-23

---

## Nota de SEO: 34/100

Site tecnicamente funcional, conteúdo em bom PT-BR na home, mas com lacunas críticas de infraestrutura que bloqueiam ranking, compartilhamento social e visibilidade em AI search.

---

## On-page

### Title

| Página | Atual | Chars | Nota |
|---|---|---|---|
| `/` | "ElectioLab — A verdade eleitoral está nos dados" | 47 | ✅ |
| `/precos` | "ElectioLab — Terminal de Inteligencia Eleitoral" | 47 | ❌ sem acentos |
| `/sobre` | "ElectioLab — Terminal de Inteligencia Eleitoral" | 47 | ❌ duplicado de /precos |

**Recomendado:**

| Página | Novo title | Chars |
|---|---|---|
| `/` | "ElectioLab — A verdade eleitoral está nos dados" | 47 ✅ (manter) |
| `/precos` | "Planos e Preços — ElectioLab" | 29 |
| `/sobre` | "Sobre a Metodologia — ElectioLab" | 32 |

**Por quê:** `/precos` e `/sobre` herdam o fallback do root layout com erros de acentuação ("Inteligencia" em vez de "Inteligência"). Google indexa a string exata — versão sem acento quebra relevância para buscas em PT-BR. Titles duplicados fazem o Google escolher qual ranquear, geralmente o que ele preferir, não o que você quer.

---

### Meta Description

| Página | Atual | Chars | Problema |
|---|---|---|---|
| `/` | "Agregador inteligente de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra, metodologia e histórico de acurácia. O FiveThirtyEight brasileiro." | 162 | 2 chars acima do limite |
| `/precos` | "Pesquisa individual e ruido. Tendencia agregada e sinal. Plataforma de dados eleitorais com media ponderada inteligente..." | 177 | 17 chars acima, sem acentos |
| `/sobre` | (mesma de /precos) | 177 | Duplicada, sem acentos |

**Recomendado:**

| Página | Nova description | Chars |
|---|---|---|
| `/` | "Agregador de pesquisas eleitorais do Brasil. Média ponderada por recência, amostra e acurácia dos institutos. O FiveThirtyEight brasileiro." | 140 |
| `/precos` | "Escolha o plano ElectioLab ideal para você. Acesso ao dashboard de pesquisas, API de dados eleitorais e alertas de tendência em tempo real." | 140 |
| `/sobre` | "Entenda como o ElectioLab calcula a média ponderada de pesquisas eleitorais. Metodologia baseada em recência, amostra e histórico de acurácia." | 143 |

---

### Hierarquia de Títulos

**`/` (Home)**
```
H1: "A verdade eleitoral está nos dados. Não nas manchetes." ✅
  H2: O Problema ✅
    H3: Pesquisas contradizem ✅
    H3: Mídia amplifica outliers ✅
    H3: Decisões no escuro ✅
  H2: Metodologia ✅
    H3: Recência / Amostra / Metodologia / Instituto ✅
  H2: Features ✅
  H2: Posicionamento ✅
  H2: Para Quem ✅
```

Hierarquia correta, exatamente um H1, H2s descritivos. ✅

**`/sobre`**
- H1: "A verdade eleitoral esta nos dados." — falta acento ("está") ❌
- Texto do corpo inteiro sem acentos — conteúdo parece malformado

---

### Imagens

0 imagens na home. Positivo do ponto de vista de CWV (sem LCP em imagem), mas representa oportunidade perdida: um OG image bem feita (ex: screenshot do dashboard com gráfico) aumentaria drasticamente o CTR em compartilhamentos.

---

### Linking Interno

Home aponta para: `/precos`, `/dashboard`, `#metodologia`, `#features`, `#para-quem`

Problemas:
- Não há link para `/sobre` a partir da home ❌
- Nenhuma âncora contextual — todos os links são de navegação, não editoriais ❌
- Dashboard não linka de volta para a marketing page ❌

---

### URLs

| URL | Nota |
|---|---|
| `electiolab.com/` | ✅ |
| `electiolab.com/precos` | ✅ sem acento na URL |
| `electiolab.com/sobre` | ✅ |
| `electiolab.com/dashboard` | ✅ |

---

## Técnico

| Checagem | Status | Impacto |
|---|---|---|
| HTTPS | ✅ Certificado válido | — |
| `robots.txt` | ❌ **404** | Alto — Googlebot recebe erro ao tentar ler permissões |
| `sitemap.xml` | ❌ **404** | Alto — Google não tem mapa de crawling |
| `llms.txt` | ❌ **404** | Médio — invisível para crawlers de AI |
| Canonical | ❌ Ausente em todas as páginas | Alto — risco duplicata www/non-www |
| Meta viewport | ✅ `width=device-width, initial-scale=1` | — |
| `lang="pt-BR"` | ✅ | — |
| Open Graph | ❌ **Ausente** | **Crítico** — todo compartilhamento no WhatsApp/Twitter sem imagem/título |
| Twitter Card | ❌ **Ausente** | Alto |
| JSON-LD Schema | ❌ **Zero blocos** | Alto — sem rich results, invisível para AI search |
| Hreflang | N/A (site apenas PT-BR) | — |
| Analytics (GA4/GTM/Plausible) | ❌ **Ausente** | **Crítico** — sem dados de tráfego |
| Robots meta tag | Ausente (implied index,follow) | Baixo |
| Favicon | ✅ `/favicon.ico` | — |

---

## Core Web Vitals

PageSpeed API sem chave de acesso. Análise baseada no HTML:

**Projeção:**

| Métrica | Estimativa | Base |
|---|---|---|
| **LCP** | Provavelmente bom (< 2,5s) | Sem imagens pesadas, Next.js SSR, Vercel CDN |
| **CLS** | Provavelmente bom (< 0,1) | Layout CSS puro, sem ads/banners de tamanho dinâmico |
| **INP** | Incerto | Dashboard tem gráficos Recharts (JS pesado) |
| **TTFB** | Bom | Vercel Edge CDN sa-east-1 (São Paulo) |

**Recomendação:** Rode manualmente no [PageSpeed Insights](https://pagespeed.web.dev/?url=https://electiolab.com&form_factor=mobile) com perfil **Mobile + 4G simulado**. Prioridade: verificar INP do dashboard (Recharts renderiza pesado no cliente).

---

## E-E-A-T

| Dimensão | Nota | Evidência |
|---|---|---|
| **Experiência** | 4/10 | Dados reais do banco estão no dashboard, mas a marketing page não os exibe contextualmente |
| **Expertise** | 5/10 | Seção "Metodologia" explica recência/amostra com fórmulas — bom sinal; mas sem autor identificado |
| **Autoritatividade** | 2/10 | Zero menções externas, zero press, zero citações recebidas |
| **Confiabilidade** | 4/10 | HTTPS ✅, sem CNPJ visível, sem política de privacidade linkada, sem e-mail de contato |

**Lacunas E-E-A-T críticas para um agregador eleitoral:**
- Nenhum "Quem somos" com credencial do fundador
- Sem link para política de privacidade (obrigação LGPD)
- Sem fonte primária linkada (TSE, institutos)
- A credibilidade de um agregador político DEPENDE de transparência — o FiveThirtyEight dedicava uma página inteira à metodologia com autoria assinada

---

## Prontidão GEO (busca generativa): 2/10

ElectioLab é um candidato **natural** para citação em AI Overviews e Perplexity quando alguém perguntar "quem está liderando as pesquisas presidenciais 2026 no Brasil" — mas hoje a plataforma é praticamente invisível para esses engines.

**Lacunas:**

| Gap | Impacto |
|---|---|
| Sem `llms.txt` | GPT, Claude e Perplexity não sabem que o site existe como fonte |
| Sem JSON-LD `WebApplication` + `Dataset` | AI engines não conseguem identificar o tipo de recurso |
| Sem FAQPage schema | Perguntas como "como o ElectioLab calcula a média?" não viram rich result |
| Texto do corpo sem densidade factual | "26 pesquisas, 13 institutos, 60k entrevistados" existe mas não está em markup semântico |
| Sem `dateModified` em JSON-LD | Engines de AI não sabem que os dados são fresh |
| Conteúdo de /sobre sem acentos | LLMs interpretam como qualidade baixa de PT-BR |
| GPTBot/ClaudeBot/PerplexityBot | Não bloqueados (positivo), mas robots.txt é 404 (ambíguo) |

**Oportunidade:** Em PT-BR, a concorrência por citação em AI Overviews sobre eleições 2026 é quasi zero. Um `llms.txt` + FAQPage bem estruturado + JSON-LD de Dataset pode colocar o ElectioLab como fonte citada em centenas de queries geradas.

---

## Análise de Palavras-chave

**Palavra-chave primária:** `pesquisas eleitorais 2026`
**Intenção:** Informacional com viés navegacional (usuário quer ver os dados, não só ler sobre eles)

**Auditoria de colocação:**

| Local | Presente | Nota |
|---|---|---|
| `<title>` | ❌ | "dados" e "eleitoral" sim, mas não "pesquisas eleitorais 2026" |
| `<meta description>` | ✅ | "pesquisas eleitorais do Brasil" |
| H1 | Parcial | "eleitoral" sim, "pesquisas" não |
| Primeiras 100 palavras | ✅ | "pesquisas eleitorais do Brasil" |
| URL | ✅ implícita | electiolab.com é a "marca" do conceito |

**Palavras-chave secundárias a trabalhar:**

| Keyword | Volume estimado | Presença atual |
|---|---|---|
| `agregador de pesquisas eleitorais` | médio | ✅ meta desc |
| `média ponderada pesquisas` | baixo | ✅ meta desc |
| `intenção de voto 2026` | alto | ❌ ausente |
| `pesquisa presidencial 2026` | alto | ❌ ausente |
| `Lula vs Bolsonaro pesquisa` | muito alto | ❌ ausente |
| `quaest datafolha atlas intel` | médio | ❌ ausente |
| `quem está na frente nas pesquisas` | médio | ❌ ausente |

**Recomendação:** A home não deve ranquear para "Lula vs Bolsonaro pesquisa" — muito competitivo. Mas uma **página de conteúdo** (blog/análise) focada nessa query pode trazer tráfego de topo de funil massivo em 2026.

---

## Oportunidades de Schema

### 1. WebSite + SearchAction (home) — habilita sitelinks e search box

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "ElectioLab",
  "url": "https://electiolab.com",
  "description": "Agregador inteligente de pesquisas eleitorais do Brasil",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://electiolab.com/dashboard?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### 2. Organization (home) — identidade de entidade para AI search

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ElectioLab",
  "url": "https://electiolab.com",
  "logo": "https://electiolab.com/logo.png",
  "sameAs": [],
  "description": "Plataforma de agregação e análise de pesquisas eleitorais brasileiras",
  "foundingDate": "2026",
  "areaServed": "BR"
}
```

### 3. Dataset (dashboard) — visibilidade máxima em busca de dados

```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Pesquisas Eleitorais Brasil 2026",
  "description": "Banco de dados com pesquisas de intenção de voto para as eleições presidenciais brasileiras de 2026, agregadas por instituto, metodologia e data.",
  "url": "https://electiolab.com/dashboard",
  "creator": { "@type": "Organization", "name": "ElectioLab" },
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "temporalCoverage": "2022/2026",
  "spatialCoverage": "BR",
  "variableMeasured": "Intenção de voto (%)",
  "dateModified": "2026-04-15",
  "keywords": ["pesquisa eleitoral", "intenção de voto", "eleições 2026", "presidente", "Brasil"]
}
```

### 4. FAQPage (/sobre) — rich result garantido + citação em AI Overviews

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Como o ElectioLab calcula a média ponderada?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "O ElectioLab usa quatro fatores: recência (meia-vida de 10 dias), tamanho da amostra (√n), metodologia (presencial > telefônica > online) e histórico de acurácia do instituto. A combinação produz uma estimativa mais estável que qualquer pesquisa individual."
      }
    },
    {
      "@type": "Question",
      "name": "Quais institutos o ElectioLab monitora?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "O ElectioLab monitora os principais institutos brasileiros, incluindo Quaest, Datafolha, Atlas Intel e Ipespe, entre outros. Cada instituto tem um score de confiabilidade baseado no histórico de acurácia em eleições anteriores."
      }
    }
  ]
}
```

---

## Correções Priorizadas

### 🔴 Crítico (esta semana)

1. **Adicionar `robots.txt`** → Googlebot recebe 404 hoje. Risco real de indexação errática.
   _Resultado esperado: crawling estável, sitemap discovery_

2. **Adicionar `sitemap.xml`** → Google não sabe quais páginas existem.
   _Resultado esperado: indexação completa em 7–14 dias_

3. **Adicionar Open Graph + Twitter Card** → Todo compartilhamento em WhatsApp, Twitter, LinkedIn está chegando sem imagem, sem título customizado.
   _Resultado esperado: +CTR social imediato; WhatsApp é o principal canal de consumo de conteúdo político no Brasil_

4. **Corrigir acentuação no root layout** → "Inteligencia", "ruido", "Tendencia" são erros que aparecem em snippets do Google.
   _Resultado esperado: melhor CTR no SERP, E-E-A-T mais alto_

5. **Adicionar Google Analytics 4 ou Plausible** → Sem analytics, não existe dados de tráfego.
   _Resultado esperado: dados para decisões de conteúdo e conversão_

### 🟠 Alto (este mês)

6. **Adicionar JSON-LD `WebSite` + `Organization` na home**
   _Resultado esperado: elegível para sitelinks, identidade de entidade para AI search_

7. **Adicionar canonical tag em todas as páginas**
   _Resultado esperado: eliminar risco de conteúdo duplicado www vs non-www_

8. **Criar metadata específica para `/precos` e `/sobre`**
   _Resultado esperado: cada página ranqueia pela sua palavra-chave própria_

9. **Corrigir `/sobre` — acentos em todo o corpo do texto**
   _Resultado esperado: E-E-A-T, leitura humana, sinal de qualidade para LLMs_

10. **Adicionar `llms.txt`**
    _Resultado esperado: elegível para citação em GPT, Claude, Perplexity_

### 🟡 Médio (este trimestre)

11. **Criar página de blog/análise** focada em "pesquisa presidencial 2026" + "intenção de voto Lula Bolsonaro"
    _Resultado esperado: captura de tráfego informacional de alto volume_

12. **Adicionar `FAQPage` schema em `/sobre`**
    _Resultado esperado: rich result no Google, citação em AI Overviews_

13. **Adicionar `Dataset` schema no dashboard**
    _Resultado esperado: visibilidade em Google Dataset Search_

14. **Adicionar política de privacidade** (obrigação LGPD)
    _Resultado esperado: E-E-A-T Confiabilidade, compliance_

15. **Criar OG image dinâmica** com o número atual do líder nas pesquisas
    _Resultado esperado: CTR social muito acima da média_
