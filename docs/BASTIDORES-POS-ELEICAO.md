# Bastidores pós-eleição: schema e mapa de fontes (passo 1)

Status: **proposta para revisão**. Nada aqui foi aplicado em banco.
Data: 2026-10-02. Contexto: estratégia "histórico verificável de cada político" (ficha + Radar + API v2).

## 1. Descoberta que muda o plano

> **Correção (2026-10-03):** a primeira versão deste quadro usava a contagem estimada de linhas da listagem de tabelas do Supabase, que está desatualizada (por isso o Senado aparecia com 10 votações). Os números abaixo foram refeitos com `count(*)` exato. Para decisões, nunca usar a estimativa da listagem.

A camada legislativa **já existe** no projeto Supabase `transparencia-federal` (TF, ref `redggdtakzmsabwvjzhb`), lida via `src/lib/tf-data.ts`. Inspecionado em modo somente leitura em 2026-10-02:

| Dado | Tabela TF | Linhas | Cobertura |
|---|---|---|---|
| Parlamentares (Câmara + Senado) | `parlamentares` | 736 | 558 câmara, 88 senado, **90 deputados sem `casa_legislativa` e sem CPF** (ver §2.2) |
| Mandatos | `mandatos` | 728 | — |
| Votações nominais Câmara | `plen_votacoes` / `plen_votos` | 6.450 / 454.656 | 2023-02-07 → 2026-09-03 (só legislatura 57) |
| Agregado por deputado | `plen_deputado_agg` | 643 | presença, % de concordância com o partido |
| Votações Senado | `senado_votacao` / `senado_voto` | 900 / 72.738 | 2019-03-19 → 2026-09-03, última carga 2026-09-08. 413 nominais (com voto por senador) e 487 secretas (sem voto individual por natureza) |
| Proposições | `cam_proposicoes`, `sen_proposicoes` | 307 mil / 57 mil | — |
| Assembleias Legislativas | `ale_*` | 526 parlamentares, 33 mil votos | parcial (ver `ale_ingest_runs`) |
| Gasto (CEAP) e sanções | `cota_*`, `ceaps_*`, `sancoes` | milhões | já usado na ficha |
| Watchlists / alertas | `watchlists`, `intelligence_alerts` | 0 / 0 | tabelas vazias, sem uso |

Consequência: **não precisamos construir ingestão legislativa do zero.** O trabalho dos bastidores é a **ponte** entre a identidade do ElectioLab (candidato/TSE) e o que o TF já coleta, mais o que falta (ver §4).

## 2. Achados que bloqueiam o produto

1. **`plen_votos`, `plen_votacoes` e `mandatos` têm RLS ligado e zero policies.** Para o `anon` retornam `[]` sem erro. É o mesmo padrão que apagou a seção CEAP (migration `20260926130000_tf_ceap_resumo_deputado.sql`). Qualquer página que consulte voto direto vai aparecer vazia em produção. Solução no padrão já adotado: publicar só agregados em view materializada, nunca abrir a tabela crua.
2. **Os 90 `parlamentares` sem CPF são deputados federais reais, não lixo** (verificado em 2026-10-02, somente leitura):
   - todos têm `id_camara`, `ativo = true`, `identity_status = 'verified'` e foram inseridos num único lote em 2026-09-10, com `casa_legislativa`, `legislatura`, `cpf` e `fonte_oficial` nulos (um insert que não preencheu essas colunas);
   - nenhum duplica outra linha (0 colisões por `id_camara`, 0 por nome);
   - 86 de 90 têm votos em `plen_votos` e todos têm `mandatos` (legislatura 57, Deputado Federal, ativo);
   - 6 aparecem como suplentes em exercício em `cam_deputado_situacao`; os outros 84 não têm registro lá;
   - nenhum tem linha em `cota_deputado` (por isso a ficha deles não mostra CEAP).
   Efeito prático: **o CPF falta justamente nesses 90**, então a ponte por CPF não os alcança e a ficha deles ficaria sem votos e sem CEAP. Não é um caso para ignorar: é correção de cadastro no TF. Os 90 incluem nomes de alta visibilidade (por exemplo Alexandre Padilha, Deltan Dallagnol, Delegado Ramagem, Chiquinho Brazão), exatamente os que a audiência vai procurar.
3. **`id_tse_candidato` está vazio nas 736 linhas** de `parlamentares`. O comentário de `tf-data.ts` diz que o match é "por CPF ou id_tse_candidato", mas só o CPF funciona (646 de 736). Os 90 sem CPF não têm casa legislativa definida, então são os primeiros suspeitos de lixo ou de registros incompletos.
4. **CPF como chave tem prazo de validade.** `candidates.cpf` do ElectioLab e `parlamentares.cpf` do TF são texto sem normalização garantida (`tf-data.ts` faz `padStart(11,"0")` na hora). A ponte precisa de uma função única de normalização.
5. **Cobertura histórica rasa.** Câmara só desde 2023; Senado praticamente sem votos. Para "quem votou em quê" no mandato 2027–2030, isso é suficiente. Para accountability de 2019–2022 (eleitos de 2018), não.
6. **Senado: cobertura boa, com três ressalvas** (verificado com contagem exata em 2026-10-03):
   - 900 votações de 2019 a 2026, das quais **413 nominais** e 487 secretas. Votação secreta não tem voto individual, então a ficha mostra "votação secreta" e não "sem dado". Das 413 nominais, só 1 (de 2019) está sem votos.
   - **153 senadores têm voto, mas só 88 existem em `parlamentares`** (81 ativos). Os outros 65 são ex-senadores e suplentes antigos sem cadastro; o histórico deles não aparece até serem cadastrados.
   - `senado_voto.voto` tem 14 valores (`Sim`, `Não`, `Abstenção` e códigos de ausência/justificativa como `AP`, `LAP`, `LP`, `LS`, `MERC`, `MIS`, `NA`, `NCom`, `P-NRV`, `Votou`, `Presidente (art. 51 RISF)`). O mapeamento está em §8.1. `senado_orientacao` está vazia no TF, mas a orientação de bancada existe na API oficial do Senado e pode ser ingerida (§8.2).

## 3. Arquitetura proposta

Princípio: **ElectioLab é dono da identidade de pessoa; TF é dono do dado legislativo bruto.** Nada é duplicado entre projetos; o ElectioLab guarda só a chave e o que for derivado para o produto.

```
 ElectioLab (xoxztzologqeqbajlhya)            TF (redggdtakzmsabwvjzhb)
 ┌──────────────────────────────┐             ┌───────────────────────────────┐
 │ candidates (por eleição)     │             │ parlamentares (cpf, id_camara,│
 │ prior_election_results       │             │   id_senado)                  │
 │ polls / poll_results         │             │ plen_votos, senado_voto, ale_*│
 │                              │  CPF        │ cota_*, sancoes, cam_*        │
 │ politicians   (NOVA)  ◄──────┼─────────────┼──► (somente leitura via       │
 │ politician_links (NOVA)      │  normalizado│     views agregadas)          │
 │ watchlists / alert_events    │             │                               │
 │   (NOVAS, usuários EL)       │             │ + views/MVs de leitura pública│
 │ ingest_runs (NOVA)           │             │   (NOVAS, aplicar no TF)      │
 └──────────────────────────────┘             └───────────────────────────────┘
```

### 3.1 No ElectioLab (migrations em `supabase/migrations/`)

**`politicians`**: uma linha por pessoa. Chave natural: CPF normalizado (11 dígitos).

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid pk | |
| `cpf` | text unique not null | `check (cpf ~ '^[0-9]{11}$')` |
| `display_name` | text | nome de urna mais recente |
| `slug` | text unique | **pessoa**, não candidatura (resolve o problema dos 384 slugs que cobrem mais de um CPF; slugs antigos de `candidates` viram redirecionamento) |
| `birth_date` | date | desempate de homônimos |
| `created_at`, `updated_at` | timestamptz | |

**`politician_links`**: liga a pessoa às demais chaves, com origem e confiança.

| Coluna | Tipo | Nota |
|---|---|---|
| `politician_id` | uuid fk | |
| `system` | text | `candidates`, `tf_parlamentar`, `camara`, `senado`, `tse_sq` |
| `external_id` | text | `candidates.id`, `parlamentares.id`, `id_camara`, `id_senado`, `sq_candidato` |
| `confidence` | text | `exact_cpf`, `exact_tse_id`, `manual`; **nunca** `fuzzy_name` |
| `verified_by`, `verified_at` | | quem confirmou (manual) |
| unique | `(system, external_id)` | uma chave externa pertence a uma pessoa só |

Regra de ouro herdada dos incidentes: **sem fusão por nome.** Match só por CPF ou `tse_id`. Conflito (mesmo CPF, nomes muito diferentes; mesmo `tse_id`, CPFs diferentes) vai para `politician_link_conflicts` e para revisão manual, não é resolvido automaticamente. Eleições distintas (1º e 2º turno) continuam sendo `candidates` separados, ligados à mesma `politicians`.

**`ingest_runs`**: `source`, `started_at`, `finished_at`, `status`, `rows_read/written`, `error`. Alimenta um painel de frescura em `/admin`. É a resposta direta ao incidente do backup (43 dias de falha silenciosa).

**Radar (fase 2, não nesta rodada):** `watchlists` e `alert_events` próprias no ElectioLab (usuários do ElectioLab ≠ usuários do TF; as tabelas do TF estão vazias e atrelam `user_id` a outro projeto de auth).

### 3.2 No TF (migrations só como registro, aplicação manual no projeto TF)

Mesmo padrão da `tf_ceap_resumo_deputado`:

- `mv_voto_resumo_parlamentar`: por parlamentar e legislatura: total de votações, presença, sim/não/abstenção/obstrução, `% concordância com o partido`, `% concordância com o governo`. Base: `plen_votos` + `plen_votacoes` + `plen_orientacoes`.
- `mv_votos_recentes_parlamentar`: últimas N votações nominais por parlamentar, com descrição e resultado (sem expor a tabela crua).
- `GRANT SELECT` explícito ao `anon` só nessas views; tabelas cruas permanecem sem policy.

## 4. O que falta e quem resolve

| Lacuna | Ação | Fase |
|---|---|---|
| `legislative_votes` do ElectioLab (2.939 linhas) e `scripts/ingest-camara-votes.ts` / `ingest-senado-votes.ts` | **Conflito com a regra de identidade:** esses scripts ligam voto a `candidate_id` casando por **nome** (`normalize(full_name/name)`), o que reintroduz o risco de pessoa errada. Decisão: a nova ficha lê votos do TF (`plen_votos`, por `id_camara`, via CPF), e `legislative_votes` fica congelada e é aposentada depois da migração; **não criar** outra tabela `legislative_votes` (já existe, com outro desenho) | 1 |
| Ponte pessoa↔parlamentar | `politicians` + `politician_links` + backfill por CPF (leitura primeiro) | 1 |
| 90 deputados sem CPF/casa/legislatura (lote de 2026-09-10) | **Em andamento.** (a) `supabase/migrations/20261003100000_tf_parlamentares_corrige_lote_20260910.sql` (registro, aplicar no TF): preenche casa e legislatura nos 90 e CPF em 55, a partir de `cam_parlamentar_risco` por `id_camara` (553/553 de concordância com `parlamentares.cpf`; 55/55 passam no dígito verificador, 0 colisões); (b) `scripts/backfill-cpf-camara.ts` (dry-run por padrão): resolve os 35 restantes pela API da Câmara (`/deputados/{id}` devolve `cpf`), com validação de dígito, colisão e cruzamento com `candidates`. Nada vincula por nome | 1 |
| `id_tse_candidato` vazio | Preencher a partir de `candidates.tse_id` via CPF, **gravando no ElectioLab** (`politician_links`), não no TF | 1 |
| Leitura de votos bloqueada por RLS | MVs agregadas no TF | 1 |
| Senado: 65 senadores com voto e sem cadastro; códigos de voto sem mapeamento; sem orientação de bancada | Cadastrar ex-senadores a partir de `senado_voto` + `sen_senadores`; documentar o mapeamento dos 14 códigos; deixar "concordância com partido" fora do MVP de senador | 2 |
| Votos 2019–2022 (Câmara) | Backfill de legislaturas 56 | 2 |
| Eleitos municipais (prefeitos/vereadores) | Fonte TSE (já ingerida como candidatura) + resultado; sem votações | 3 (2027) |
| Promessas | Extração dos planos de governo do TSE (já existe `classify-planos-trechos.ts`) com curadoria humana | 3 |
| Radar (watchlists + e-mail) | Reaproveitar o padrão de `quota_alerts` / cron de e-mail | 2 |

## 5. Ordem de execução (passos seguintes)

1. **Você revisa este documento** e decide as perguntas do §6.
2. **[Gerada, não aplicada]** Migration ElectioLab `supabase/migrations/20261003110000_politicians_identity.sql`: `politicians`, `politician_links`, `politician_link_conflicts`, `ingest_runs`. Leitura pública só de `id`, `slug` e `display_name` (grant por coluna; CPF e nascimento não saem pela API). Validada em Postgres 17 local (aplica, reaplica sem erro, e rejeita CPF curto/duplicado, slug inválido, vínculo por nome, vínculo manual sem responsável, mesma chave externa em duas pessoas, conflito aberto duplicado). `mandates` não entra aqui: mandatos vivem no TF (`mandatos`, com `inicio`/`fim`).
3. Script de backfill **em modo `--dry-run` por padrão** (padrão de `scripts/ingest-tse-candidaturas.ts`): lê `candidates` e `parlamentares` do TF, propõe vínculos, lista conflitos. Você revisa a saída antes de qualquer `--apply`.
4. **[Aplicada em 2026-10-03, reaplicada com correção]** Migration TF `supabase/migrations/20261003130000_tf_votos_views_parlamentar.sql`: `mv_voto_resumo_senador` (presença e votos por senador, 153) e `mv_votos_recentes_parlamentar` (últimas 30 votações nominais por parlamentar, Câmara e Senado), com refresh diário via pg_cron. O agregado da Câmara já existe (`plen_deputado_agg`) e foi mantido. Testada em Postgres 17 local com dados de teste (secretas, presidente, código desconhecido, corte em 30, idempotência, `refresh concurrently`) e a lógica conferida contra os dados reais do TF (soma de "Sim" do Senado bate com a fonte: 22.258). `senado_dissidencia` (já existente no TF) passa a funcionar quando `senado_orientacao` for ingerida (§8.2).
5. **[Implementada, atrás de flag `FICHA_VOTACOES=1`]** Bloco "Votações no plenário" em `/candidato/[slug]` (`src/components/votacoes-parlamentar.tsx`, `src/lib/votacoes.ts`, `getVotacoesParlamentar` em `src/lib/tf-data.ts`). Lê pela CPF: `candidates.cpf` → `parlamentares` (TF) → views. Verificada no navegador com dados reais (deputado com janela de exercício, deputado sem janela, senador). Quando o bloco aparece, a seção legada "Atividade legislativa" (votos ligados por nome) some. **Regra de segurança editorial:** a presença da Câmara só é exibida quando há janela de exercício identificada (558 de 643 deputados); sem ela o agregado do TF cai para a legislatura inteira e um suplente aparece com ~7% de presença, o que seria falso. Limitação conhecida: as 104 pessoas só do TF (sem linha em `candidates`, como Padilha) não têm página, pois a rota lê `candidates`.

## 6. Decisões

1. **Slug por pessoa: SIM (decidido em 2026-10-02).** `politicians.slug` vira a identidade pública, com 301 de `candidates.slug`. O redirect precisa tratar slug ambíguo (um slug de candidatura que hoje cobre mais de um CPF): nesses casos o redirect vai para uma página de desambiguação, não para uma pessoa escolhida às cegas.
2. **Identidade só no ElectioLab, nenhuma coluna nova de identidade no TF: SIM (decidido em 2026-10-02).** A única escrita no TF recomendada é a correção de cadastro dos 90 (§4), que preenche colunas já existentes.
3. **Escopo do MVP de votos: EM ABERTO, com recomendação.** O Senado tem dado suficiente (§2.6), então a pergunta deixou de ser técnica. Recomendação: incluir senadores no MVP com votos nominais e presença para os 81 da legislatura atual (decidido em 2026-10-03: manter os 81 e acrescentar os novos na posse de fevereiro de 2027, sem apagar quem sai; ver §8.3). "Concordância com a orientação" entra quando a ingestão de §8.2 estiver pronta. Os 65 ex-senadores entram na fase 2.
4. **Os 90 órfãos: VERIFICADO (§2.2).** São deputados reais; o conserto é no TF, não na ponte.

## 7. Riscos

- **Identidade errada vira acusação a pessoa errada.** Por isso o vínculo exige CPF/`tse_id`, e conflito vai para revisão humana.
- **Acoplamento entre dois projetos Supabase.** A leitura cruzada depende de `TF_SUPABASE_ANON_KEY` e de views públicas estáveis; qualquer mudança de schema no TF quebra a ficha sem aviso. Mitigação: `ingest_runs` + teste de fumaça que consulta cada MV.
- **Escopo.** Isto cobre só o legislativo federal. Assembleias (`ale_*`) e municipal ficam fora até validar a ficha federal.

## 8. Senado: mapeamento de votos, orientação de bancada e troca de legislatura

### 8.1 Mapeamento dos códigos de `senado_voto.voto`

Fonte das descrições: API oficial `legis.senado.leg.br/dadosabertos/votacao?ano=AAAA` (campo `descricaoVotoParlamentar`), conferida em 2026-10-03 para 2019 e 2025. Contagens são do TF.

| Código | Descrição oficial | Linhas | Classe proposta | Conta como presente? |
|---|---|---|---|---|
| `Sim` | (sem descrição) | 22.258 | voto | sim |
| `Não` | (sem descrição) | 5.142 | voto | sim |
| `Abstenção` | (sem descrição) | 58 | voto | sim |
| `Presidente (art. 51 RISF)` | (sem descrição) | 495 | presidente (não vota, salvo desempate) | **excluir do denominador** |
| `Votou` | (sem descrição) | 25.673 | votou em votação secreta (só em secretas) | sim |
| `P-NRV` | Presente – Não registrou voto | 10.729 | presente sem voto | sim |
| `AP` | Atividade parlamentar | 4.750 | ausência justificada | não |
| `LS` | Licença saúde | 1.492 | ausência justificada | não |
| `MIS` | Missão da Casa no País/exterior | 1.164 | ausência justificada | não |
| `LP` | Licença Particular | 240 | ausência justificada | não |
| `LAP` | Licença paternidade ou ao adotante | 1 | ausência justificada | não |
| `NCom` | Não Compareceu | 669 | ausência não justificada | não |
| `NA` | Dispositivo não citado | 62 | não se aplica ao senador naquele item | **excluir do denominador** |
| `MERC` | (a fonte não traz descrição) | 5 | não classificado | **excluir do denominador** |

`MERC` aparece só em 2 votações de dezembro de 2019 e a API não o descreve. Foi deixado fora do cálculo em vez de adivinhado.

Regras de cálculo propostas (nossas, não oficiais; o painel deve citar isso):
- `% presença` = presentes ÷ (presentes + justificadas + não justificadas), sobre votações em que o senador estava em exercício.
- Ausência justificada **reduz** a % de presença (ela está no denominador), mas **não** é chamada de falta. A ficha mostra dois números lado a lado: `pct_presenca` e `pct_faltas_nao_justificadas` (só `NCom`). Quem quiser a leitura "comparecimento sem contar licenças" tem as contagens brutas para calcular.
- Votação secreta (`Votou`) conta para presença e nunca aparece como posição de voto.
- O mapeamento fica numa cláusula `CASE` na view materializada do TF (não numa tabela), para o código novo que a Casa criar cair em "não classificado" e aparecer num teste de fumaça em vez de sumir.

### 8.2 Orientação de bancada do Senado: existe fonte oficial

Há como verificar. O endpoint `GET legis.senado.leg.br/dadosabertos/plenario/votacao/orientacaoBancada/{AAAAMMDD}/{AAAAMMDD}` devolve, por votação, `orientacoesLideranca` (partido ou bloco, voto: SIM, NÃO, LIVRE, OBSTRUÇÃO).

Verificado em 2026-10-03:
- **Chave de junção:** `sequencialVotacao` da API = `senado_votacao.id_sve` do TF. Conferi com PEC 18/2024 (id 4235, 72 sim, 0 não, 2025-03-11, igual nos dois lados). Em 2025 a API lista 126 votações e o TF tem 125; só a 4237 falta no TF. (O campo `codigoVotacaoSve` da API é outro identificador e **não** serve de chave.)
- **Cobertura parcial:** em 2025, só 52 das 126 votações têm orientação registrada (41%). A métrica precisa mostrar "sem orientação" em vez de assumir concordância.
- **Rótulos que não são partido:** `Governo`, `Oposição`, `Maioria`, `Minoria`, `Banc Fem`, além de grafias diferentes das siglas do TF (`Republica`, `Podemos`). Precisa de tabela de normalização antes de comparar com `senado_voto.sigla_partido`.
- **Mudança de partido:** o voto do senador é comparado com a orientação do partido **na data da votação**, não o atual.

Alternativa sem a API, mais barata mas menos justa: "concordância com a maioria do partido" calculada só com os votos que já temos. É útil como fallback e deve ter rótulo próprio (não chamar de "orientação").

**Status (2026-10-03): implementado, aguardando aplicação.** Normalização e testes em `src/lib/senado-orientacao.ts`; ingestão em `scripts/ingest-senado-orientacao.ts` (dry-run por padrão); migration TF `20261003150000_tf_senado_orientacao_alinhamento.sql`; cartão "Alinhamento com o partido" na ficha do senador (some enquanto a view não existe). No dry-run: 2019–2026, **5.363 linhas** (Sim 3.994, Não 774, Liberado 587, Obstrução 8) e **nenhum rótulo de liderança desconhecido**. Cobertura de votações com orientação por ano: 25% a 64%, então o alinhamento é calculado só sobre o que foi orientado. 92 votações da API não estão em `senado_votacao` do TF (a maioria de 2021 e 2022) e são puladas pela FK; não afeta o alinhamento, que só compara votos existentes.

Ordem de aplicação: (1) migration no TF, (2) `npx tsx scripts/ingest-senado-orientacao.ts --apply`, (3) `refresh materialized view public.mv_senador_alinhamento` (depois o pg_cron mantém). Conferência: o dry-run imprime o alinhamento de 5 senadores calculado em memória; a view tem que dar os mesmos valores.

Defeito encontrado e corrigido na mesma migration: a view `senado_dissidencia` que o TF já tinha só excluía Abstenção, P-OD e NCom do voto; com orientação carregada ela listaria como dissidente quem faltou (AP, LS, MIS) ou ficou P-NRV. Agora só conta voto Sim/Não contra orientação Sim/Não. A view é pública (anon lê) e nada no código ou no banco dependia dela.

### 8.3 Troca de legislatura (posse em 1º de fevereiro de 2027)

Manter os 81 atuais está correto, com um ajuste de conceito: **acrescentar, não substituir.**
- Em 2026 renovam-se 2/3 do Senado (54 vagas). Quem sai segue como pessoa em `politicians` com mandato encerrado e todo o histórico de votos intacto; quem entra ganha mandato novo.
- Para o modelo, isso exige que `mandates` tenha `inicio`/`fim` e que o filtro da ficha use "mandato vigente na data" e não `ativo = true`.
- Muitos dos que entram já existem como deputados federais ou candidatos: a ponte por CPF liga a pessoa nova ao histórico de votos da Câmara dela, o que é um ganho direto da ficha unificada.
- Tarefa para janeiro de 2027: reingerir `sen_senadores`/`parlamentares` após a posse e rodar o backfill de CPF antes de abrir as fichas dos novos.

## 9. Operação: encoding ao colar migrations

Em 2026-10-03 a migration das views de voto foi colada com acentos corrompidos (`Não` virou `NÃ£o`), porque o `pbcopy` rodou sem locale UTF-8. O defeito foi funcional: ~5 mil votos do Senado e ~6,5 mil da Câmara caíram em `nao_classificado`. Regras daqui em diante:
- Copiar sempre com `LC_ALL=en_US.UTF-8 pbcopy < arquivo.sql`.
- Em migration, **literal acentuado que participa de lógica** (comparação, CASE) é escrito com escape Unicode: `U&'N\00e3o'`.
- Toda migration com classificação tem uma consulta de conferência no fim; para as views de voto, `nao_classificado` esperado = 0.
