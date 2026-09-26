# Arquitetura — electiolab-apuracao

## Fluxo
```
TSE CDN (JSON)                          Supabase Electiolab (schema apuracao)            Electiolab (Next.js)
─────────────                           ──────────────────────────            ────────────────────
ele-c.json / mun-cm.json ──(1x/dia)──►  eleicao, cargo, municipio
EA14 br-…-ab.json ──(a cada ciclo)──►   acompanhamento ──┐
EA15 uf-…-ab.json ──(a cada ciclo)──►   acompanhamento   │ decide o que mudou
                                                          ▼
EA20 …-u.json (só os que mudaram) ──►  arquivo_bruto → totalizacao,           /apuracao (ISR 30–60s)
                                        votacao_candidato                     /apuracao/[uf]
EA10 …-e.json (após 1ª final) ─────►   eleito                                 /apuracao/pesquisas
                                        coletor_execucao (log)
```

## Coletor
- Cron Vercel a cada 1 minuto (`src/app/api/cron/apuracao`). `maxDuration` atual do projeto é 60s: 1 ciclo por execução. Se o ciclo não couber, dividir por eleição (federal / estadual) em execuções alternadas.
- Por ciclo, no pior caso: 1 EA14 + 27 EA15 (×2 eleições) + EA20 alterados. Arquivos por UF em jogo: presidente, governador, senador, dep. federal, dep. estadual/distrital → até ~135 EA20 + 1 BR. Estimativa de pico: < 200 requisições por ciclo → com limitador em 5 req/s, ~40s. Se ficar lento, subir para 10 req/s (ainda 10× abaixo do teto do TSE).
- Arquivos de deputados são os maiores (centenas de candidatos por UF): gravar bruto comprimido (jsonb já comprime via TOAST) e normalizar em lote.
- Requisições condicionais sempre; 304 = nada a gravar.
- Circuit breaker de 404: URL que deu 404 entra em quarentena até a config/acompanhamento indicar que existe.
- Todos os IPs da Vercel podem ser compartilhados com outros clientes — mais um motivo para taxa baixa.

## Por que não GitHub Actions
Intervalo mínimo de 5 min e atraso sob carga. Serve para o Radar FAB (diário), não para apuração.

## Idempotência
- `arquivo_bruto` único por (url, idg). Se o IDG não mudou, não reprocessa.
- Normalização reprocessável a partir do bruto.

## Mapa de campos
_(TSE: bloqueado nesta rodada — rede do container nega acesso a resultados-sim.tse.jus.br e www.tse.jus.br. Ver seção "Fase 0 — status" abaixo. Falta preencher a partir das amostras e das specs EA14/EA15/EA20/EA10.)_

### Integração com o Electiolab (item 6, verificado via Supabase MCP em 26/09/2026)
Projeto Supabase: **ElectioLab** (`xoxztzologqeqbajlhya`).

- **`candidates`** (20.245 linhas): `tse_id text` é o **sequencial do candidato** (12 dígitos, ex.: `280002539826`), não o número de urna (`number`). Para 2026: 20.238 candidatos, 20.109 com `tse_id` preenchido (99,4%). 100% em deputado federal/estadual/distrital; um pouco menor em governador (229/279), senador (341/409) e presidente (22/33) — checar esses casos sem `tse_id` antes de confiar no FK opcional da Fase 1.
- **`elections`** (112 linhas): uma linha por (tipo de cargo × UF × ano), ex. `deputado_federal`/`MG`/2026. Coluna `tse_id text` existe mas está **null em todas as linhas de 2026** — hoje não há nenhum código do TSE (pleito/eleição) gravado aqui. A ligação `apuracao.eleicao` ↔ `elections` do Electiolab vai precisar ser por (tipo, UF, ano, turno), não por `tse_id`, a menos que decidamos populá-lo.
- **`polls`**: liga a `elections` (não a `candidates` — candidato é texto livre + `candidate_slug`). Tem `tse_registration` apontando para `pesqele_registry.protocolo`.
- **`institute_accuracy_observations`** (0 linhas): já tem exatamente o formato que a Fase 4 precisa — `poll_published_pct` vs `actual_pct`, `abs_error_pct` gerada, `fieldwork_end_days_before`, FK para `institutes`/`polls`/`elections`/`candidates`. Confirma o plano do CLAUDE.md de reaproveitar em vez de criar métrica paralela.
- **Tabelas órfãs `tse_apuracao` / `tse_apuracao_candidatos` — decisão registrada em 26/09/2026: não usar, não apagar.** Limpeza só depois da eleição. Schema `public` (não `apuracao`), sem migration commitada no repo (mesmo padrão "remote_schema" de `20260813040000_document_candidates_schema_retroactive.sql`). `tse_apuracao`: `election_id`, `cargo`, `estado`, `turno`, `data_apuracao`, `percentual_apuracao`, `secoes_apuradas`, `secoes_totais`. `tse_apuracao_candidatos`: `apuracao_id`, `candidate_id`, `numero_candidato`, `nome_candidato`, `sigla_partido`, `votos_nominais`, `votos_legenda`, `percentual`. Ambas com **0 linhas** no banco.
  Resultado do grep no repo inteiro por `tse_apuracao`/`tse_apuracao_candidatos` (26/09/2026):
  ```
  src/types/database.types.ts:3206:      tse_apuracao: {
  src/types/database.types.ts:3256:      tse_apuracao_candidatos: {
  src/types/database.types.ts:3295:            foreignKeyName: "tse_apuracao_candidatos_apuracao_id_fkey"
  src/types/database.types.ts:3298:            referencedRelation: "tse_apuracao"
  src/types/database.types.ts:3302:            foreignKeyName: "tse_apuracao_candidatos_candidate_id_fkey"
  apps/pipeline/api/tse/sync/resultados.ts:3   (comentário: sincroniza para tse_apuracao)
  apps/pipeline/api/tse/sync/resultados.ts:70,99,157,179,207,230  (.from('tse_apuracao') / .from('tse_apuracao_candidatos'))
  docs/ENDPOINTS_ADAPTED.md:15,235,264-265,297,320,323  (documentação de /api/tse/sync/resultados)
  docs/archive/WAVE2_COMPLETE.md:144  (menção no changelog da wave 2)
  ```
  `src/types/database.types.ts` é gerado (reflete o schema do banco, não é uso). O único código de aplicação que referencia as tabelas é `apps/pipeline/api/tse/sync/resultados.ts` — mas `apps/pipeline/` **não está** em `package.json`, `vercel.json`, `next.config.ts` nem `tsconfig.json` do repo: não é buildado nem deployado com o app principal, não tem cron próprio. Último commit que tocou o arquivo: `41abe49` (13/09/2026), antes desta sessão. Ou seja: código morto, não rota viva — confirma o status de órfã. Este projeto (apuracao-2026) não vai ler nem escrever em `tse_apuracao`/`tse_apuracao_candidatos`, nem em `apps/pipeline/`.
- `prior_election_results` (2.881.843 linhas) e `election_results` (0 linhas) existem mas são de eleições passadas / resultado final consolidado — fora do escopo da apuração ao vivo, mencionados aqui só por completude.
- **Vínculo `apuracao.eleicao` ↔ `elections` — aprovado em 26/09/2026**: por `(tipo, UF, ano, turno)`, não por `tse_id` (que está null em todas as linhas de 2026). Detalhar na Fase 1 o mapeamento de `apuracao.cargo.codigo` (numérico, do TSE) para `elections.type` (texto: `presidente`, `governador`, `senador`, `deputado_federal`, `deputado_estadual`, `deputado_distrital`).

## Riscos
| Risco | Mitigação |
|---|---|
| Bloqueio de IP (rate/404) | Limitador global, circuit breaker, URLs só a partir da config |
| Cron da Vercel atrasar | Monitorar `coletor_execucao`; botão manual protegido para disparar coleta |
| Mudança de leiaute entre simulado e oficial | Ensaio 28–29/09; validação de schema com erro explícito, não silencioso |
| Pico de acesso no site | Páginas servidas por ISR, sem consulta ao TSE no request |
