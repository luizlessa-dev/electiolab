# Prompt para sessão dedicada — auditoria fresca ElectioLab (pós-fixes de 17-19/08)

**Por que uma auditoria nova, não só reler a de 13/08:** entre 17 e 19/08, duas sessões (uma delas em paralelo, sem coordenação prévia) resolveram os 6 achados críticos da auditoria original (`docs/ELECTIOLAB-AUDIT-2026-08.md`), reescreveram o sitemap e o `llms.txt`, corrigiram proveniência de dado e apagaram um lote de pesquisas de origem Wikipedia, e promoveram 32 pesquisas novas (presidencial + governador) via um pipeline de curadoria assistida construído nesse meio tempo. É volume grande de mudança pra confiar só no autorrelato de quem fez — o valor desta sessão é verificar com olhos de fora, não repetir o que já foi checado.

**Contexto:** campanha eleitoral 2026 aberta desde 17/08. 1º turno 04/10/2026 (~6,5 semanas a partir de hoje). Repo `/Users/luizlessa/electiolab`, branch `main`, Supabase `xoxztzologqeqbajlhya` (compartilhado — só SELECT read-only pra exploração; qualquer escrita precisa ser explícita e revisável).

## O que já foi verificado e não precisa ser re-auditado do zero

- **C1** (cron mock + Agente 2 + Wikipedia): resolvido, 243 linhas mock apagadas, Agente 2 aposentado da cascata, Wikipedia fora do pipeline PesqEle.
- **C2** (sitemap): paginado, 16.448 candidatos, URLs faltantes geradas de `UFS`.
- **C3** (cache ISR): as 3 rotas (`candidato`/`instituto`/`partido`) tinham `generateStaticParams` faltando — corrigido, confirmado ao vivo `x-vercel-cache: HIT`.
- **C4** (relatórios semanais): parte mecânica resolvida (`changeFrequency: never`, copy sem promessa falsa). Decisão de fundo (retomar série editorial ou não) segue em aberto, não é bug.
- **C5** (schema Person duplicado/AggregateRating): resolvido.
- **C6** (llms.txt desatualizado): virou rota gerada do banco.

Não gaste tempo reconfirmando esses 6 pontualmente — mas SIM vale conferir se **continuam** corrigidos (nenhuma regressão), já que várias sessões mexeram no repo em sequência.

## O que fazer — cobertura ampla, como a auditoria de 13/08, mas do estado atual

1. **Produto/código/dados**: além de confirmar que C1-C6 não regrediram, cubra os achados menores da auditoria original nunca tocados — tipagem `client.ts`/`admin.ts` (**primeiro regenere `database.types.ts`** contra o schema atual, boa parte dos ~73 erros medidos em 13/08 era tipo desatualizado, não bug real), `apps/pipeline/` código morto (órfão confirmado, seguro remover), 17 candidatos duplicados por `tse_id` mal validado na ingestão, `candidate_social_media` mostrando dado 2022 sem aviso em `/redes-sociais`, confirmar guard de auth nas 3 rotas `src/app/api/institutes/test-*` (achado desde 13/08, nunca verificado).
2. **Cobertura de pesquisas (novo, não estava na auditoria original)**: `polls` 2026 foi de 185→217 hoje via curadoria assistida (ver `docs/prompt-verificacao-cobertura-pesqele-tse.md` e a memória do projeto pra contexto). Gap real contra `pesqele_registry` (1.714 pra 2026) continua grande. Dois institutos — **Real Time Mídia** (61 registros TSE, só 2 com cobertura de imprensa achável) e **Vox Brasil** — mostraram padrão sistemático de baixa achabilidade via busca. Vale uma segunda opinião: são genuinamente pesquisas não publicadas, ou existe um canal de acesso (site próprio, PDF direto no TSE) que uma abordagem diferente acharia? Não force mais buscas idênticas às já tentadas — tente algo estruturalmente diferente (ex.: baixar o CSV completo do PesqEle e cruzar por CNPJ do instituto pra achar padrão, ou checar se o TSE disponibiliza o resultado além do registro).
3. **Qualidade do que já foi promovido**: audite uma amostra das 32 pesquisas promovidas hoje — `poll_drafts` com `reviewed_by ilike '%draft-assist%'` — confirme que `source_url` de fato sustenta o número gravado (não confie no meu relatório, abra a fonte de verdade). Confirme também que nenhum outro candidato no banco tem o mesmo tipo de ambiguidade de nome que causou o incidente Flávio/Jair Bolsonaro (`resolveCandidates` em `scripts/promote-approved-polls.ts` — ver se há outro par de sobrenome comum entre candidatos ativos, tipo pai/filho ou homônimos).
4. **SEO técnico + conteúdo + GEO**: rode uma passada nova, não assumindo que nada mudou desde 13/08 — o volume de commits foi grande o suficiente pra ter introduzido regressão em qualquer lugar. Preste atenção especial a `src/app/llms.txt/route.ts` (agora dinâmico — confirme que o conteúdo gerado está correto e atualizado) e ao sitemap (confirme contagem real de URLs em produção, não só no código).
5. **Validação externa**: repita o teste de visibilidade em busca por IA que a auditoria de 13/08 fez ("quem lidera as pesquisas pra presidente 2026", "pesquisa governador SP 2026") — compare se mudou algo depois do llms.txt/sitemap corrigidos.

## Entregável

Health score atualizado (o de 13/08 está obsoleto, os itens que mais pesavam negativo foram resolvidos), lista de qualquer regressão encontrada nos C1-C6, os achados menores endereçados ou não, e um plano de ação novo dado o prazo real até 04/10. Pode ser uma nova seção em `docs/ELECTIOLAB-AUDIT-2026-08.md` ou um documento novo — critério seu dependendo do volume de achados.
