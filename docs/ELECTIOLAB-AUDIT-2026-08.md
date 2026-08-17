# Auditoria Geral ElectioLab — Agosto/2026

**Data:** 2026-08-13 · **Repo:** `/Users/luizlessa/electiolab`, branch `main`, HEAD `3e92112` (git status limpo, worktree único) · **Domínio:** electiolab.com · **Eleição:** 1º turno 04/10/2026 (**~7,5 semanas a partir de hoje**)

Este documento substitui os relatórios soltos de `docs/archive/SEO-AUDIT*.md` como referência viva. Cobre 3 frentes — produto/código/dados, SEO técnico+conteúdo, GEO — sintetizadas num plano único, porque os achados das três se sobrepõem na causa raiz mais vezes do que se esperaria.

---

## 1. Health score

| Frente | Nota | Composição |
|---|---|---|
| **1 — Produto/código/dados** | **4,0/10** | Pipeline de pesquisas com dado fake ativo em produção + scraper real inoperante |
| **2 — SEO técnico + conteúdo** | **4,5/10** | Técnico 3,5/10 (sitemap cobre 5% dos candidatos, cache quebrado) · Conteúdo 6,5/10 (base editorial boa, mas relatório semanal parado há 11 semanas) |
| **3 — GEO** | **6,0/10** | Fundação técnica sólida (SSR, robots.txt, llms.txt existe, schema rico) — mas execução com furos que anulam boa parte da vantagem |
| **Geral (ponderado)** | **≈ 4,8/10** | — |

**Leitura direta:** o site tem uma base de engenharia genuinamente sólida (RLS, tipagem, arquitetura de agentes, JSON-LD rico, llms.txt já existente — coisas que a maioria dos concorrentes de nicho não tem). A nota não é baixa por falta de qualidade de base — é baixa porque **quase todo achado crítico tem o mesmo formato: "o mecanismo certo existe no código, mas não está de fato ligado/completo/sincronizado com a realidade atual"**. Isso é bom sinal para o plano de ação: a maioria dos itens críticos é curta de corrigir, não é redesenho.

Validação externa própria (fora dos agentes, testada agora via busca real): para as queries genéricas *"quem lidera as pesquisas para presidente 2026"* e *"pesquisa eleitoral governador São Paulo 2026"*, **o ElectioLab não aparece nem nas fontes nem na resposta sintetizada** — só Gazeta do Povo, Wikipédia e institutos aparecem. O site só aparece quando a busca já inclui a palavra "electiolab". Isso confirma, na prática, o que os achados de SEO técnico (sitemap/indexação) e GEO (llms.txt desatualizado, sem tabelas semânticas) preveem: hoje o site não é descoberto nem citado para as perguntas que deveria responder — só para quem já sabe que ele existe.

---

## 2. Achados críticos (bloqueantes agora)

Ordenados por urgência real, não por frente de origem — vários se combinam.

### ✅ C1 — RESOLVIDO em 2026-08-17 — O pipeline "real" de pesquisas está quebrado; o pipeline "fake" está ativo e gravando em produção
- **Cron `daily-sync`** (`src/app/api/cron/daily-sync/route.ts`, agendado todo dia 9h BRT em `vercel.json`) usava exclusivamente **clientes mock hardcoded** (`datafolhaMockClient`, `ipecMockClient`, `quaestMockClient` e mais ~34 "institutos" simulados) e gravava direto na tabela `polls` de produção sem dedup. Confirmado via Supabase: **450 de 509 registros (88%) tinham `is_verified=false`**, 243 identificáveis como mock (`source_url ilike '%example.com%'` ou `pollId` em 4 IDs fixos). **Investigação adicional em 17/08 mostrou que o risco era menor do que parecia**: os 243 inserts foram todos entre 06/08 15h e 08/08 09h (~42h, provavelmente teste manual durante o desenvolvimento, não um cron rodando dia a dia) — o handler `GET` da rota (o que o Vercel de fato dispara num cron) era só um health-check sem efeito colateral; quem gravava mock era o `POST`, que o Vercel não invoca sozinho. Mesmo assim, a rota ficava ativa e exposta.
- Em paralelo, o **Agente 2** (`src/agents/agent-2-institutos.ts`, o scraper real que deveria substituir o mock) foi testado ao vivo contra as 4 URLs configuradas — **2 domínios nem resolvem DNS** (AtlasIntel, PoderData), os outros 2 apontam pra páginas institucionais sem dado de pesquisa na HTML. Uma execução real resultaria em **0 institutos com sucesso**. Estava encadeado no cron diário de produção via `after()` (Agente 1 → webhook `tse-complete` → Agente 2), então rodava (e falhava) todo dia às 8h UTC sem produzir nada.
- **Ações executadas em 2026-08-17:**
  - Removida a entrada `daily-sync` do `vercel.json` e deletada a rota `src/app/api/cron/daily-sync/route.ts` (confirmado sem outros pontos do repo dependendo dela).
  - `DELETE` das 243 linhas mock em `polls` (filtro validado antes de rodar, confirmado 509→266 linhas, `is_verified=true` intacto em 59). `polls` de 2026 caiu de 480 para **237** — que bate exatamente com o "Retained 237 pesquisas com institute_id válido" documentado em `docs/TSE_INTEGRATION_ROADMAP.md` como resultado da limpeza de Wikipedia de uma fase anterior. Ou seja: **a cobertura real de pesquisas curadas não cresceu desde aquela limpeza** — o que cresceu no meio tempo foi só dado mock.
  - Agente 2 **aposentado do fluxo automático**: `tse-complete` não dispara mais `run-agent-2`; a rota `run-agent-2` agora responde `410` sem executar o scraper. A classe `InstitutusScrapeAgent` continua no repo pra eventual revalidação futura, só não roda mais sozinha. **Efeito colateral identificado**: como Agente 3 (validação) só era disparado via `institutos-complete`, que só disparava quando Agente 2 tinha `completed_count > 0` (nunca acontecia, 0/4 institutos) — **Agente 3 já não tinha caminho de disparo automático antes desta mudança**. Isso não é algo que esta correção quebrou, é um gap pré-existente que ficou visível ao mapear a cascata — não investigado a fundo, sinalizando pra próxima sessão.
  - Achado adicional durante a investigação, fora do escopo original de C1: o pipeline diário de PesqEle (`​.github/workflows/ingest-pesqele.yml`) estava rodando `scripts/auto-ingest-wikipedia.ts --apply` de verdade todo dia, pra governador e senador — apesar do roadmap documentar essa fonte como removida numa fase anterior. Desligado (steps removidos do workflow) — ver `docs/prompt-verificacao-cobertura-pesqele-tse.md` pro contexto completo.
- **Pendente, não resolvido nesta passada:** o gap de cobertura em si (1.717 pesquisas registradas no TSE pra 2026 vs. 237 curadas, das quais só 59 verificadas) continua — isso é trabalho editorial contínuo, não um bug de código. Ver prompt dedicado acima.

### 🔴 C2 — Sitemap estruturalmente quebrado por dois bugs distintos, que se combinam para esconder ~99% do site de crawlers (Google e IA)
- **Bug 1 (paginação):** a query de candidatos em `src/app/sitemap.ts` não usa `.range()`/`.limit()` — bate no teto padrão de 1000 linhas do PostgREST. De 16.909 candidatos, só **895 (5,3%)** aparecem no sitemap. O mesmo padrão sem paginação existe em `partido/[slug]/page.tsx`.
- **Bug 2 (array hardcoded incompleto):** dezenas de rotas estáticas nunca foram adicionadas manualmente ao array do `sitemap.ts` — confirmado ausentes: as 27 páginas de `/pesquisas-senador/{uf}`, as 27 de `/eleicoes/{uf}`, os 6 relatórios semanais, e ~10 páginas do cluster editorial (`metodologia`, `glossario-pesquisa-eleitoral`, `pesquisas-erraram-2022`, `por-que-institutos-dao-numeros-diferentes` etc — justamente o conteúdo mais citável para GEO).
- **Agravante:** a paginação de `/candidatos` (única listagem completa) usa `<button onClick>` em vez de `<Link href="?page=N">` — Googlebot não segue clique JS, então nem por lá dá pra alcançar o resto. As 27 páginas estáticas de governador (maior prioridade do sitemap) também não linkam para nenhum candidato individual.
- **Ação:** corrigir paginação da query (baixo esforço, horas) + adicionar as ~70+27 URLs faltantes ao array, idealmente gerando a lista programaticamente em vez de hardcode manual, ou migrando para `generateSitemaps()` (sitemap index) do Next.js dado o volume. Isso é, isoladamente, o item de maior impacto/esforço de toda a auditoria.

### 🔴 C3 — Cache ISR não está funcionando em `candidato/[slug]`, `instituto/[slug]`, `partido/[slug]` (todas as 3 famílias de rota dinâmica)
- `curl` em produção mostra `cache-control: no-store`, `x-vercel-cache: MISS` em toda requisição repetida, apesar de `revalidate = 3600` estar no código. TTFB 6-10x mais lento que páginas estáticas (0,76-1,4s vs 0,12-0,15s). Causa raiz não fechada (pode ser client Supabase com `cookies()` forçando renderização dinâmica, ou configuração Fluid Compute/PPR da Vercel anulando o ISR) — precisa checar o dashboard da Vercel, não só o código.
- **Efeito:** cada crawl de cada uma das (mesmo que corrigido) ~17.000 páginas de candidato bate direto no Postgres, sem cache de borda — risco de LCP ruim em escala + pressão de banco desnecessária.
- **Ação:** investigar runtime Vercel (Fluid Compute/PPR) + trocar client Supabase cookie-based por client read-only nas 3 rotas públicas. Esforço médio, mas precisa de acesso ao dashboard que só você tem.

### 🔴 C4 — Relatórios semanais parados há ~11 semanas, num produto que se anuncia como "atualizado semanalmente"
- Últimos relatórios: `semana-17` a `semana-22` (meados abril a final maio/2026). Hoje é semana ISO ~33. `/sobre` ainda promete cadência semanal. Para conteúdo eleitoral (YMYL) a 2 meses do pleito, isso é o pior tipo de sinal de abandono — tanto para E-E-A-T quanto para o `changeFrequency: weekly` que o sitemap ainda declara para essas páginas.
- **Ação imediata (baixa):** mudar `changeFrequency` dessas 6 páginas pra `never`, e ajustar a copy de `/sobre`/`/imprensa` para não prometer algo que não está sendo entregue. **Ação estrutural (mais lenta):** decidir se retoma a cadência ou formaliza um ritmo diferente e comunica isso — decisão sua, sinalizo mas não vou processar sozinho.

### 🔴 C5 — Person duplicado/conflitante e uso indevido de `AggregateRating` no schema da página mais replicada do site
- `candidato/[slug]/page.tsx` e `candidate-schema.tsx` renderizam **dois nós `Person` com o mesmo `@id`** mas dados divergentes (um deles com `jobTitle: "Political Candidate"` hardcoded em inglês num site 100% PT-BR).
- `candidate-schema.tsx` usa `AggregateRating` pra representar % de intenção de voto — exatamente o erro que o próprio time já identificou e evitou em `instituto/[slug]/page.tsx`, com comentário no código explicando por que isso é "spammy markup" segundo as diretrizes do Google. A correção não se propagou para o arquivo irmão.
- **Ação:** ambos são fixes de baixo esforço (30min-1h cada) — remover o `Person` duplicado, trocar `AggregateRating` por `additionalProperty`/`PropertyValue` no mesmo padrão já usado em `instituto/[slug]`.

### 🔴 C6 — `llms.txt`/`llms-full.txt` desatualizados com erro factual sobre quem está na disputa presidencial
- Datados de 01/06/2026, listam Jair Bolsonaro como candidato monitorado — mas o candidato ativo do PL hoje é **Flávio Bolsonaro**, conforme a própria página `/pesquisas-presidenciais-2026` e conforme confirmado por busca externa nesta auditoria. Ciro Gomes e Ratinho Jr, citados no arquivo, não aparecem no top 10 real.
- **Por que isso pesa mais do que parece:** `llms.txt` é o arquivo desenhado especificamente para ser lido por LLMs como fonte de verdade. Um erro factual ali é o tipo de sinal que reduz a confiança de um modelo em citar a fonte — o oposto do que se quer numa janela de 7 semanas pré-eleição.
- **Ação:** atualizar os dois arquivos agora (1-2h) e, se possível, automatizar a seção de "candidatos monitorados"/estatísticas a partir do banco em vez de escrita manual, pra não repetir.

---

## 3. Matriz de priorização impacto × esforço (as 3 frentes juntas)

```
IMPACTO ALTO
│
│  [FAZER JÁ]                          │  [PLANEJAR — alto valor, mais fôlego]
│  • C2 sitemap (2 bugs)               │  • C1 decisão Agente 2 (scraping real)
│  • C1 desligar cron mock             │  • C3 cache ISR (precisa Vercel dashboard)
│  • C5 schema Person/AggregateRating  │  • Tabelas HTML semânticas nos rankings
│  • C6 atualizar llms.txt             │  • Conteúdo gerado p/ 16.909 páginas sem bio
│  • 3 páginas UF sem JSON-LD (BA/RJ/RS)│  • Retomar (ou reformular) relatório semanal
│  • Título/H1 candidato c/ cargo+UF   │
│  • Divergência dado SP (achado GEO)  │
│  esforço: horas a 1-2 dias           │  esforço: dias a 1-2 semanas
│───────────────────────────────────────┼─────────────────────────────────
│  [RÁPIDO, BAIXO RISCO]               │  [BACKLOG — sem urgência eleitoral]
│  • /imprensa duplicado no sitemap    │  • Limpeza de código morto (apps/pipeline)
│  • OAI-SearchBot nomeado em robots.ts│  • Auditar rotas test-* (possível endpoint  │
│  • Badge dado defasado AC/RR         │    esquecido sem auth — checar ASAP mesmo   │
│  • Byline visível nos artigos        │    sendo baixo esforço, ver nota abaixo)    │
│  • dateModified fake freshness       │  • Tipagem client.ts/admin.ts (73 erros)    │
│  • /comparar sem schema              │  • Dedupe 19 candidatos por tse_id          │
│  • CreativeWork → Dataset            │  • candidate_social_media aviso 2022        │
│  esforço: minutos a poucas horas     │  esforço: horas a 1-2 dias
│
IMPACTO BAIXO
```

**Nota fora da grade, mas não esperar o backlog:** as 3 rotas `test-phase2.disabled`/`test-phase2-hybrid`/`test-tier3` em `src/app/api/institutes/` continuam sendo **rotas HTTP reais e públicas** no Next.js — o `.disabled` no nome é só convenção, não desativa nada tecnicamente. Vale confirmar em minutos se têm guard de auth antes de tratar como limpeza de baixa prioridade; se não tiverem, é uma exposição, não um item de hygiene.

**Por que essa ordem e não uma lista por frente:** C2 (sitemap) sozinho destrava a maior parte do que SEO técnico *e* GEO estão reclamando — ele é citado, com raiz técnica idêntica, em 3 achados diferentes (SEO C1/A1, GEO Achado 1). Arrumar ele uma vez resolve os três. Da mesma forma, C1 (dado fake em produção) é ao mesmo tempo o achado mais grave de produto *e* a explicação de fundo para por que a "última pesquisa indexada" pode divergir do texto editorial (achado GEO #4) — dado mock e dado real convivendo na mesma tabela sem marcação visível é exatamente o tipo de coisa que gera inconsistência de número entre blocos da mesma página.

---

## 4. Plano de ação com prazos

Eleição em **04/10/2026** — ~7,5 semanas a partir de hoje (13/08). Pico de busca/tráfego esperado em setembro. O plano é desenhado pra fechar os itens de descoberta/indexação **antes** de setembro — depois disso, mudança estrutural de sitemap/schema tem cada vez menos tempo pra ser reprocessada pelo Google/crawlers de IA antes do pico.

### Semana 1 (13–20/ago) — Parar o sangramento
- [ ] Desligar `daily-sync` do `vercel.json` / early-return no código (C1) — **1h**
- [ ] Corrigir paginação da query de candidatos em `sitemap.ts` (e `partido/[slug]`) (C2, bug 1) — **2-4h**
- [ ] Adicionar as ~70+27 URLs faltantes ao array do `sitemap.ts` (C2, bug 2) — **2-4h**
- [ ] Atualizar `llms.txt`/`llms-full.txt` com dados corretos (C6) — **1-2h**
- [ ] Corrigir `Person` duplicado + `AggregateRating`→`PropertyValue` em `candidate-schema.tsx` (C5) — **1-2h**
- [ ] Portar JSON-LD (WebPage+Breadcrumb+FAQ+Dataset) pras 3 páginas de UF sem nada: BA/RJ/RS — **15min**
- [ ] Checar se as 3 rotas `test-*` têm auth guard; se não tiverem, desativar de verdade — **30min**
- [ ] Mudar `changeFrequency` dos relatórios semana-17→22 pra `never`, ajustar copy de "atualizado semanalmente" em `/sobre`/`/imprensa` até decidir sobre C4 — **1h**

**Total Semana 1: ~1-2 dias de trabalho focado, maior redução de risco por hora investida de todo o plano.**

### Semana 2 (20–27/ago) — Fechar o que ficou pendente de decisão humana
- [ ] Aprovar e executar `DELETE` dos 243 registros mock em `polls` (C1) — precisa da sua confirmação, é ação destrutiva em prod
- [ ] Investigar causa raiz do cache ISR quebrado (dashboard Vercel: Fluid Compute/PPR) + trocar client Supabase nas 3 rotas dinâmicas (C3) — **1-2 dias**
- [ ] Título/H1/description de `candidato/[slug]` incluindo cargo+UF (evita duplicidade em escala) — **meio dia**
- [ ] Corrigir `<Image unoptimized>` na foto de candidato (LCP) — **meio dia**
- [ ] Investigar e corrigir divergência parágrafo-abertura × "última pesquisa indexada" em SP, checar se se repete nas outras 26 UFs (achado GEO #4) — **meio dia**

### Semanas 3–4 (27/ago–10/set) — Decisões estratégicas + conteúdo em escala
- [ ] Decisão: Agente 2 vira viável (achar URL/endpoint real por instituto, 1-2 dias, incerto) ou o produto formaliza que pesquisas vêm só do registro oficial TSE por ora — **decisão sua, não é só técnica**
- [ ] Trocar paginação client-side de `/candidatos` por `<Link href="?page=N">` real (destrava crawl da cauda longa) — **1 dia**
- [ ] Adicionar tabelas HTML semânticas nos rankings de pesquisa (presidencial, UF, institutos) — **1-2 dias**
- [ ] Byline visível no corpo dos ~8 artigos editoriais — **meio dia**
- [ ] Badge de "dado defasado" em UFs com pesquisa >90 dias (AC/RR e outras) — **meio dia**
- [ ] Aviso de "dado 2022" em `/redes-sociais` até TSE publicar 2026 — **2h**

### Semanas 5–6 (10–24/set) — Antes do pico de busca
- [ ] Gerar parágrafo-resumo factual (a partir de dados já carregados) para candidatos sem `editorial_bio`/`bio` — reduz risco de thin content em escala
- [ ] Schema em `/comparar` (WebPage+Breadcrumb+ItemList referenciando `@id` dos candidatos)
- [ ] Nomear `OAI-SearchBot`/`ChatGPT-User`/`Anthropic-AI` explicitamente em `robots.ts`
- [ ] Limpar código morto: `apps/pipeline` (órfão confirmado, seguro remover) + auditoria arquivo-a-arquivo de `src/lib/institutes/` (parcialmente vivo, cuidado)
- [ ] Dedupe dos 19 candidatos duplicados por `tse_id` mal validado + guard na ingestão do Agent 1
- [ ] Tipar `client.ts`/`admin.ts` com `<Database>` — mas **primeiro** regenerar `database.types.ts` contra o schema real (parte dos 73 erros é tipo desatualizado, não bug)

### Contínuo / setembro em diante
- [ ] Configurar acesso à API do Google Search Console (gap identificado — hoje não há como confirmar indexação real sem isso, e é o único jeito de saber se o fix do sitemap está de fato sendo processado)
- [ ] Re-rodar as queries de teste de visibilidade em IA (as mesmas 2 desta auditoria + 2-3 novas) depois que sitemap/llms.txt estiverem corrigidos, pra medir se algo mudou
- [ ] Monitorar chegada dos dados de 2026 (`candidate_social_media`, prestação de contas — TSE publica em setembro) e remover os avisos de staleness quando os dados chegarem

---

## 5. Apêndice — achados completos por frente

<details>
<summary><b>Frente 1 — Produto/código/dados (nota 4,0/10)</b></summary>

**Achado 0 (crítico):** Cron `daily-sync` grava dado 100% mock em produção — ver C1.

**Achado 1 (alto):** `client.ts`/`admin.ts` sem `<Database>`. Blast radius medido de verdade (não estimado): **73 erros em 5 arquivos** ao aplicar o generic. Causa raiz dividida em duas: (a) `discrepancy-manager.ts`/`poll-history.ts` usam `tableName: string` não-literal; (b) `database.types.ts` parece desatualizado contra a view `state_polls` real — regenerar tipos antes de tipar os clients, senão parte dos erros é ruído.

**Achado 2 (baixo, revisado):** `poll-history.ts` NÃO é o risco estrutural que se temia — não há SQL injection nem RLS bypass, é só `tableName` como `string` largo em vez de literal tipado. Fix trivial (`as const`).

**Achado 3 (médio):** Código morto de scraping — `apps/pipeline` inteiro é órfão confirmado (zero imports, fora do build). Mas `src/lib/institutes/` **não pode ser apagado em bloco**: 9 dos 23 arquivos alimentam as 3 rotas `test-*`, só que outros arquivos da mesma pasta (`mock-state-clients.ts`, `mock-clients.ts` etc) são importados por rotas de produção (`polls/aggregated`, `cron/aggregation-snapshots`, `regions/aggregated`, `polls/anomalies`, e o próprio `daily-sync` do achado 0). Precisa de auditoria arquivo-a-arquivo antes de remover.

**Achado 4 (crítico):** Agente 2 testado ao vivo contra as 4 URLs configuradas — AtlasIntel e PoderData com DNS que não resolve; Quaest e Datafolha resolvem mas sem dado de pesquisa na HTML crua da home. Execução real hoje = 0 institutos com sucesso.

**Achado 5 (médio):** `candidate_social_media` = 123 linhas, 100% de 2022, zero de 2026. UI degrada sem quebrar (`?? []`), mas `/redes-sociais` mostra esse dado como se fosse atual, sem aviso.

**Achado 6 (baixo-médio):** 0 pesquisas sem instituto, 0 eleições sem candidato. "Duplicatas" por nome+cargo+UF (26 grupos) são majoritariamente legítimas (1º/2º turno, homônimos com `tse_id` distinto) — não são bug. Duplicatas reais por mesmo `tse_id`: **17 grupos / 19 linhas excedentes** (~0,1% de 16.906), incluindo um caso onde a mesma pessoa aparece vinculada a duas eleições incompatíveis (governador PR + presidencial 2º turno) — sinal de falta de validação de compatibilidade cargo/eleição na ingestão.
</details>

<details>
<summary><b>Frente 2a — SEO técnico (nota 3,5/10)</b></summary>

**C1 (crítico):** Sitemap só cobre 895/16.909 candidatos (5,3%) — query sem paginação, teto de 1000 linhas do PostgREST.

**C2 (crítico):** ISR não funciona em `candidato`/`instituto`/`partido` — sempre `cache-control: no-store`, `x-vercel-cache: MISS`. TTFB 6-10x mais lento que páginas estáticas. Causa raiz não fechada (código + config Vercel).

**C3 (crítico):** Órfandade estrutural — maioria das páginas de candidato (cargos proporcionais) sem nenhum caminho de crawl: fora do sitemap, sem link interno, paginação de `/candidatos` client-side (`onClick`, não `<Link>`).

**C4 (crítico):** Título/description/H1 de candidato não incluem cargo/UF — risco de duplicidade em nomes comuns repetidos entre 16.909 páginas. (Nota: description já não é mais corte cru de bio como no baseline anterior — isso foi corrigido.)

**A1 (alto):** 54 URLs (`/pesquisas-senador/{uf}` × 27 + `/eleicoes/{uf}` × 27) ausentes do sitemap, apesar de totalmente estáticas e geradas.

**A2 (alto):** `/imprensa` duplicada no sitemap com `changeFrequency` divergente — regressão do baseline 01/06 não corrigida.

**A3 (alto):** TTFB de candidato ~6-10x pior (proxy, não CWV real — projeto já tem `@vercel/speed-insights`, puxar dado de campo real de lá antes de otimizar às cegas).

**A4 (alto):** Foto de candidato com `next/image unoptimized`, carregando `priority` (LCP) em 16.909 páginas.

**M1-M3 (médio):** páginas de governador não linkam candidatos individuais; cross-canibalização `/eleicoes/{uf}` × `/eleicoes-governador-{uf}-2026` parcialmente mitigada (título diferenciado, canonicals ainda independentes); internal linking instituto↔comparar não mapeado (gap de cobertura desta auditoria).

**Positivo confirmado:** HTTPS/HSTS ok, viewport explícito (corrigido desde baseline), GSC verificado via meta tag (mas sem acesso à API pra confirmar indexação real — gap a resolver), robots.txt correto e permissivo pra crawlers de IA.
</details>

<details>
<summary><b>Frente 2b — Conteúdo / E-E-A-T (nota 6,5/10)</b></summary>

**F13 (crítico):** Relatórios semanais parados há ~11 semanas — ver C4.

**F1 (alto):** Byline ainda só existe no JSON-LD/`@id`, não como texto visível no corpo dos ~8 artigos editoriais. (`/sobre` em si melhorou bastante desde o baseline — card de fundador robusto, `sameAs` Wikidata.)

**F7 (alto):** Dados de pesquisa em UFs pequenas (AC, RR) ~4,5 meses defasados, sem badge de alerta (mecanismo de detecção já existe no código, falta só o componente visual).

**F10 (alto):** Risco estrutural de thin content — prosa editorial por candidato depende de `editorial_bio`/`bio`, campos opcionais e provavelmente não preenchidos pra maioria dos 16.909 (não foi possível quantificar exatamente via código). Página tem dado estruturado rico (pesquisas, patrimônio, votos, processos) mesmo sem prosa — não é thin no sentido penalizável, mas é risco de "conteúdo template" em escala.

**F2 (médio-alto):** `dateModified` setado como `new Date()` sempre — sinal de frescor artificial sem mudança real de conteúdo.

**F3 (médio):** `/imprensa` com press release de abril rotulado "PARA PUBLICAÇÃO IMEDIATA" e números defasados (25 pesquisas / SP-MG-RJ vs cobertura real hoje de 27 UFs completas).

**Positivo confirmado:** metodologia exemplar (fórmulas explícitas, seção de limitações honesta); artigos do glossário com profundidade real, não genéricos; cobertura textual das 27 UFs de governador não é rasa nem em estados pequenos; gap de 19 UFs em 404 no senador foi corrigido desde o baseline.
</details>

<details>
<summary><b>Frente 3a — GEO (nota 6,5/10 no corte isolado, 6,0/10 combinado com schema)</b></summary>

**Achado 1 (crítico):** ~70 URLs de alto valor citável ausentes do sitemap — mesma raiz do bug 2 de C2/SEO.

**Achado 2 (alto):** `llms.txt`/`llms-full.txt` desatualizados com erro factual sobre a corrida presidencial — ver C6.

**Achado 3 (alto):** Zero `<table>` HTML semânticas nas páginas de ranking testadas — números só citáveis via JSON-LD (invisível ao "leitor" de texto de um LLM que trata `<script>` como metadado, não corpo).

**Achado 4 (alto):** Divergência entre parágrafo de abertura e bloco "última pesquisa indexada" em `/eleicoes-governador-sp-2026` — risco direto de citação incorreta por IA. Não verificado se se repete nas outras 26 UFs.

**Achado 5 (médio):** `llms.txt` alega permissão "explícita" a `OAI-SearchBot` que na prática só existe via wildcard `*` em `robots.ts` — funciona hoje, mas frágil a regressão futura.

**Achado 6 (médio):** TSE como fonte citado só em rodapé/FAQ, não no parágrafo de resposta direta.

**Achado 7 (baixo):** Autoria não aparece como texto visível no corpo, só via `@id` — mesmo padrão do F1 de conteúdo.

**Pontos fortes confirmados:** parágrafos de abertura diretos e autocontidos nas 4 páginas testadas; H2/H3 em formato de pergunta; SSR 100% (dado visível sem JS); `robots.txt` não bloqueia nenhum crawler de IA relevante; estrutura de `llms.txt`/`llms-full.txt` correta, só o conteúdo está desatualizado/incompleto.

**Não verificado nesta auditoria:** menções de marca em Reddit/YouTube/Wikipedia (bloqueio de ferramenta) — dado o perfil solo/2026 do projeto, presumir presença mínima; considerar 1 vídeo de metodologia no YouTube e presença pontual em comunidades como alavanca de citação (correlaciona mais com citação em IA do que backlinks tradicionais).
</details>

<details>
<summary><b>Frente 3b — Dados estruturados / schema.org (nota 7,0/10)</b></summary>

**Achado 1 (crítico):** `Person` duplicado com mesmo `@id` e dados conflitantes entre `page.tsx` e `candidate-schema.tsx` — ver C5.

**Achado 2 (crítico):** `AggregateRating` indevido sobre % de pesquisa em `candidate-schema.tsx` — mesmo erro já evitado (com comentário explicando o porquê) em `instituto/[slug]/page.tsx`. Correção não se propagou.

**Achado 3 (alto):** `CreativeWork` como tipo genérico forçado, quando o padrão do resto do site é `Dataset` — trocar ou fundir com `additionalProperty`.

**Achado 5 (alto):** 3 páginas de governador (BA, RJ, RS) sem NENHUM JSON-LD, apesar de terem `FAQ_ITEMS` prontos no código e o padrão completo existir em 27 páginas irmãs. Correção de 15 minutos.

**Achado 6 (médio):** `/comparar` sem nenhum schema — oportunidade de `ItemList` referenciando os `@id` já existentes das páginas de candidato.

**Achado 4, 9, 11, 12 (baixo):** inconsistência de `null` vs `undefined` em campos opcionais; `spatialCoverage: "BR"` como string solta em vez de `Place`/`Country`; `PoliticalParty` como tipo não-core (validar no Rich Results Test); `numberOfItems` do `ItemList` de `/candidatos` reflete total filtrado mas só lista 24.

**Achado 10 (médio, não é bug):** Dataset do `/dashboard` está atrás de autenticação — invisível a qualquer crawler, provavelmente redundante já que os dados públicos (`pesquisas-presidenciais-2026`, `governor-dataset.ts`) cobrem o mesmo papel publicamente.

**Positivo confirmado:** `Dataset` bem modelado com `license`/`distribution`/`creator` na home e páginas de eleição; uso disciplinado de `@id` para grafo de entidades; `FAQPage` amplamente usado (sem valor de rich result Google desde 2023 porque o site não é gov/saúde, mas com valor real de GEO); nenhum uso de tipos depreciados (`HowTo` etc); `@context` sempre HTTPS.
</details>

---

**Próxima revisão sugerida:** depois da Semana 2 (fechados os itens de C1-C6), re-rodar o teste de visibilidade em busca por IA e confirmar via GSC (uma vez configurado) se a cobertura de indexação subiu.
