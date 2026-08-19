# Prompt para sessão dedicada — verificação de cobertura PesqEle (TSE) × ElectioLab

**CONCLUÍDO em 2026-08-17** — outra janela pegou este prompt (ou chegou ao mesmo problema por conta própria, em paralelo) e entregou mais do que ele pedia, direto em `main`, sem PR:

- `fix: registra proveniência em polls e corrige views de cobertura PesqEle` (`b0b259e`) — coluna `polls.source_kind`, filtro central em `src/lib/poll-provenance.ts` aplicado nas 7 consultas públicas, `approve-reputable-polls.ts` parou de auto-aprovar draft de Wikipedia.
- `fix: apaga dado Wikipedia, normaliza tse_registration e marca lote legado` (`d3a1277`) — decisão editorial: **apagar**, não só marcar. Removidos 52 `polls` de origem Wikipedia + 210 `poll_results` em cascata + 606 `poll_drafts`, incluindo 14 pesquisas com data pós-eleição (nov/dez/2026) e 21 drafts presos em `approved`. Achado extra no caminho: `pesqele_registry` tinha 3 linhas seed plantadas à mão (`TSE-2026-001/002/003`) inflando o denominador presidencial — removidas também.

Depois disso, a mesma sessão (ou outra em sequência) ainda resolveu C2 (sitemap) e C6 (llms.txt) da auditoria geral, numa branch separada (`fix/llms-txt-e-sitemap`) — mesclada em `main` via PR #58 em 2026-08-17.

**Números finais confirmados (17/08, pós tudo):**
```
pesqele_registry (2026):  1.714 registros  (3 seeds falsos removidos)
polls (2026):                185 linhas    (era 237 — 52 de origem Wikipedia removidas de vez)
  - verificadas:               59           (32%, intacto — nada de real foi tocado)
poll_drafts:                    9           (era 615)
source_kind='wikipedia':        0 residual
```

**Gap real que continua aberto, não é bug de código:** 1.714 pesquisas registradas no TSE pra 2026 vs. 185 curadas (10,8%), das quais só 59 verificadas (3,4%). Isso é trabalho editorial de curadoria contínuo — ver `scripts/pending-polls.ts` pra fila priorizada (tier 1 presidencial, tier 2 governador estado-chave, tier 3 demais), curar via `scripts/ingest-manual.ts`.

O prompt original fica abaixo como registro do raciocínio (a restrição sobre Wikipedia, em particular, segue valendo pra qualquer curadoria futura — só que agora é regra de produto confirmada, não mais uma checagem a fazer).

---

**Contexto:** campanha eleitoral 2026 abriu oficialmente em 17/08/2026. 1º turno em 04/10/2026 (~7 semanas). A partir de agora o volume de pesquisas registradas no TSE tende a crescer rápido — vale medir o gap de cobertura agora, antes que fique maior.

Estou no repo `/Users/luizlessa/electiolab` (Next.js + Supabase, projeto `xoxztzologqeqbajlhya`, compartilhado com outro produto — só SELECT read-only pra exploração, qualquer UPDATE/DELETE em `polls`/`poll_drafts` precisa ser explícito e revisável, não silencioso). Quero saber: **de tudo que o TSE já disponibilizou (registro oficial de pesquisas eleitorais, sistema PesqEle), quanto o ElectioLab realmente tem como resultado curado e publicado?**

## ⚠️ Restrição explícita — não usar Wikipedia como fonte nesta verificação

Isso não é precaução genérica: **o pipeline de produção hoje usa Wikipedia de verdade.** A GitHub Action diária (`.github/workflows/ingest-pesqele.yml`, 11h UTC) roda, nessa ordem: (1) ingestão de `pesqele_registry` a partir do CSV oficial do TSE, (2) **`scripts/auto-ingest-wikipedia.ts --apply`** pra governador e senador (popula `poll_drafts` a partir de páginas da Wikipedia), (3) `scripts/match-drafts-to-pesqele.ts` (fuzzy match dos drafts contra `pesqele_registry` por UF+cargo+data+instituto). Isso convive com `docs/TSE_INTEGRATION_ROADMAP.md`, que documenta "Phase 1: Clean Wikipedia Data ✅ DONE — Replace all Wikipedia sources with official TSE data" como concluído — ou seja, o Wikipedia scraping foi removido em algum momento e depois reintroduzido (ou nunca saiu de fato do cron), sem que o roadmap fosse atualizado.

Pra esta verificação:
- **Não conte um draft como "cobertura resolvida" só por ter `tse_protocolo` preenchido via match automático.** Isso confirma que o TSE registrou aquela pesquisa (metadado), não que o ElectioLab tem o resultado (%) real curado com fonte primária.
- **Não trate Wikipedia como fonte primária válida em nenhuma etapa desta checagem** — nem pra confirmar que um resultado existe, nem pra preencher um gap. Todo resultado numérico em `polls` precisa rastrear a um `source_url` que seja release do instituto, matéria de veículo de imprensa, ou o próprio TSE — nunca um artigo da Wikipedia.
- **Se achar hoje, em `polls` ou `poll_drafts`, algum resultado cujo único lastro seja Wikipedia** (checar `source_url ilike '%wikipedia%'` ou equivalente), reporte como achado à parte — é exatamente o tipo de regressão que a Fase 1 do roadmap achava ter eliminado.
- Isso não é uma crítica ao uso de Wikipedia como *descoberta* de que uma pesquisa existe (fair enough como sinal) — é sobre não aceitar Wikipedia como *validação* de que temos o dado certo.

## O que já existe — não recriar, só usar

- **`pesqele_registry`**: espelho do CSV oficial do TSE (`pesquisa_eleitoral_{ano}.zip`, baixado de `cdn.tse.jus.br`). Só metadados — instituto, UF, cargo, datas de campo/divulgação/registro, protocolo, amostra, metodologia. **Nunca tem os percentuais** (o TSE não registra isso). Ingestão em `src/lib/ingest/pesqele.ts` / `scripts/ingest-pesqele.ts`.
- **Views `pesqele_missing` e `pesqele_coverage`** (`supabase/migrations/20260511012749_pesqele_registry.sql`, refinadas em `20260511013046_pesqele_normalize_match.sql`) — comparam `pesqele_registry` contra `polls.tse_registration`. Use-as, não reescreva a lógica de join do zero.
- **`scripts/pending-polls.ts`**: fila priorizada a partir de `pesqele_missing` — Tier 1 (Presidente, institutos reputados, n≥1500), Tier 2 (Governador em estado-chave, n≥1000), Tier 3 (demais governadores reputáveis). Tem uma lista `SUSPECT_TOKENS` (hoje só "verita" — pesquisas suspensas pela Justiça Eleitoral em 2026 por vício metodológico) que sinaliza sem remover — preserve esse comportamento, não decida por conta própria excluir ou incluir o instituto.
- **`scripts/match-drafts-to-pesqele.ts`**: fuzzy match `poll_drafts` (sem protocolo) → `pesqele_registry`.
- **`scripts/ingest-manual.ts`**: ponto de entrada de curação manual — editar array `PENDING_POLLS` e rodar. É deliberadamente manual: "TSE registra apenas metadados — nunca os percentuais. Resultados saem em fonte primária e são curados com `source_url` pra manter proveniência auditável" (comentário em `pending-polls.ts`). **Não tente automatizar a extração de percentuais nesta sessão** — isso esbarra no mesmo problema que já quebrou o Agente 2 (scraper de institutos testado ao vivo e confirmado inoperante contra os sites reais — ver achado crítico C1/achado 4 em `docs/ELECTIOLAB-AUDIT-2026-08.md`). Escopo aqui é medir e reportar, não construir extração nova.
- **`scripts/check-poll-freshness.ts`**: roda no fim da GH Action diária, gera relatório.

## Números já medidos agora (17/08/2026, ~14h) — não redescobrir do zero, mas re-confirme o que for usar no relatório final (algumas horas podem ter passado)

```
pesqele_registry (ano=2026):     1.717 registros — dt_registro de 07/jan a 16/ago/2026 (fresco, GH Action rodou ontem)
poll_drafts:                       615 total — 434 já com tse_protocolo, 181 ainda sem
polls (join elections.year=2026):  480 linhas — mas:
  - is_verified = true:             59  (12%)
  - is_verified = false:           421  (88%)
  - com tse_registration:          103
  - sem tse_registration:          377
  - identificáveis como mock:     ≥180  (medido só com 3 dos ~38 padrões de ID mock conhecidos —
                                          a auditoria de 13/08 mediu 243 no total de 509 linhas; refaça essa
                                          contagem completa, não confie neste número parcial)
```

Ou seja, à primeira vista: **1.717 pesquisas que o TSE já registrou como existentes, contra algo entre 59 e 103 linhas em `polls` que são de fato verificadas/rastreáveis a um protocolo — e isso é ANTES de descontar as linhas mock residuais do bug do cron `daily-sync`** (achado C1 da auditoria de 13/08 — confirme se essas ~243 linhas já foram removidas ou ainda estão lá; se ainda estiverem, exclua explicitamente da sua análise de cobertura, não conte como resultado real, e sinalize que persistem).

## O que fazer

1. **Primeiro**, confirme o estado atual de `polls` (linhas mock ainda presentes? `daily-sync` ainda rodando?) — isso muda a base de comparação de tudo o resto. Ver `docs/ELECTIOLAB-AUDIT-2026-08.md` achado C1 pra contexto de por que isso existe.
2. Rode (ou reproduza a lógica de) `pesqele_missing`/`pesqele_coverage` e `scripts/pending-polls.ts` pra pegar o estado real de agora, não confiar nos números acima com horas de idade.
3. Produza um **relatório de cobertura**: do que o TSE registrou pra 2026 em `pesqele_registry`, quanto tem resultado real (%, com `source_url` de fonte primária não-Wikipedia) em `polls`? Quebre por Presidente, Governador (27 UFs) e Senador (27 UFs). Cargos proporcionais (deputado federal/estadual/distrital) provavelmente não têm pesquisa registrada no TSE de qualquer forma dado o padrão do produto até agora — **confirme essa hipótese, não assuma**.
4. Para os itens de maior prioridade (Tier 1/2 do `pending-polls.ts` — presidencial e governador de estado-chave, instituto reputado, campo recente): verifique se o resultado já está publicamente disponível em fonte primária (site do instituto, matéria de imprensa — **nunca Wikipedia**) e simplesmente não foi curado ainda, versus se genuinamente ainda não há resultado publicado em lugar nenhum. Não precisa curar tudo nesta sessão — mapear e priorizar já é o entregável principal.
5. **Checagem reversa**: existe alguma linha em `polls`/`poll_drafts` marcada como resultado real que NÃO tem `tse_registration`/`tse_protocolo` correspondente em `pesqele_registry`? Pode ser legítimo (pesquisa fora do período de registro obrigatório, erro de fuzzy match) — mas reporte, é sensível num produto que se vende como "auditável".
6. Verifique se há resultado com **único lastro Wikipedia** (ver restrição acima) — reporte como achado de qualidade separado, independente do resto do relatório de cobertura.

## Entregável

Relatório com: números reais de cobertura (TSE registrado × ElectioLab curado, por cargo/UF), tabela de gaps priorizada reaproveitando a lógica de tiers existente, e uma seção separada de achados de qualidade de dado (mock residual? Wikipedia como único lastro em algum resultado? pesquisa publicada sem `tse_registration`?). Não precisa ser um `.md` novo solto — se fizer sentido, isso pode virar uma seção de acompanhamento dentro de `docs/ELECTIOLAB-AUDIT-2026-08.md` (achado C1 já aponta pra esse mesmo problema de fundo), mas fica a seu critério dependendo do que a sessão encontrar.
