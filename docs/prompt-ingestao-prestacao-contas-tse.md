# Prompt para sessão dedicada — ingestão de prestação de contas TSE 2026

**CONCLUÍDO em 2026-08-13** — não precisa mais rodar este prompt. Entregues:
- `scripts/ingest-tse-prestacao-contas.ts` — ingestão streaming das 4
  famílias (`unzip -p | iconv | csv-parse`, upsert incremental por lote).
  Mapeamento de colunas validado contra dado real de 2022 (UF escopada +
  dry-run nacional completo — ver números no final deste arquivo).
- `scripts/refresh-candidate-fefc.ts` — substitui o antigo
  `ingest-tse-extended.ts --only=fefc` (removido); calcula `candidate_fefc`
  como agregado de `candidate_revenue`/`candidate_expense_paid` em vez de
  baixar o ZIP de prestação de contas de novo.
- `.github/workflows/ingest-tse-prestacao-contas.yml` — cron diário a partir
  de 15/09/2026, com checagem de disponibilidade do dataset (pula sem falhar
  enquanto o TSE não publicar).
- `scripts/lib/tse-csv.ts` — helpers compartilhados (streaming, retry,
  resolução de colunas por nome de header).

O ZIP de 2026 ainda não existe no CDN do TSE (confirmado 404 em 2026-08-13).
O `--apply` de verdade só roda quando o TSE publicar, em setembro — até lá o
cron pula sozinho todo dia sem intervenção.

## Achado que corrigiu o plano original: `_BRASIL.csv` não é redundante

A suposição do prompt original abaixo ("o agregado é redundante com os
arquivos por UF, não uma fonte exclusiva") **estava errada** — só foi
descoberta ao medir contra dado real de 2022. `_BRASIL.csv` é um superset
nacional exato (mesmas linhas dos 26 arquivos por UF, confirmado byte a byte
por SQ_RECEITA) **mais** todos os candidatos a Presidente, que só existem
nele — mesmo padrão de `consulta_cand`/`ingest-tse-candidaturas.ts`. O script
final usa só `_BRASIL.csv` por família (não os 26 arquivos por UF); `--uf=XX`
agora filtra linhas já parseadas, não seleciona arquivo.

## Números reais (2022, última eleição geral — proxy pra 2026)

Dry-run nacional completo, ~2:20min de execução, 385MB comprimido / ~1,9GB
CSV total descomprimido:

| Tabela | Linhas | Chave natural válida | Com candidate_id |
|---|---:|---:|---:|
| candidate_revenue | 674.944 | 671.965 | 501.083 |
| candidate_expense_contracted | 2.209.819 | 2.204.872 | 1.082.559 |
| candidate_revenue_original_donor | 199.241 | 174.230 | 0 (não tem candidate_id — chave é sq_receita+doador) |
| candidate_expense_paid | 2.411.941 | 2.411.941 | 1.176.691 (48,8% — só P/G/S estão em `candidates`, o arquivo cobre todos os cargos) |

`candidate_revenue_original_donor` tem ~13% de linhas sem chave natural — são
placeholders genuínos do TSE (SQ_RECEITA=-1, tudo #NULO, sem doador
originário a declarar), não um bug.

DF (Distrito Federal) não tem arquivo dedicado por UF no pacote 2022 (só 26
dos 27 estados) — mas está presente dentro do `_BRASIL.csv` (10.576 linhas em
receitas), confirmado. Mais um motivo pra usar só o agregado: um pipeline
baseado nos 26 arquivos por UF perderia DF inteiro, além de Presidente.

Prompt original mantido abaixo como histórico da decisão.

---

Estou no repo `/Users/luizlessa/electiolab` (Next.js + Supabase, projeto
`xoxztzologqeqbajlhya`). Preciso construir a ingestão de prestação de contas
eleitorais de candidatos do TSE para 2026 — schema já existe, script de
ingestão não.

## O que já existe (não recriar)

Migration `supabase/migrations/20260813040200_candidate_revenue_expense_tables.sql`
criou 4 tabelas, todas vazias:
- `candidate_revenue` — receitas, natural key `(sq_receita, election_year)`
- `candidate_revenue_original_donor` — doador original quando a receita passou
  por intermediário, key `(sq_receita, donor_original_cpf_cnpj, election_year)`
- `candidate_expense_paid` — despesas pagas, key `(sq_despesa, election_year)`
- `candidate_expense_contracted` — despesas contratadas, key `(sq_despesa, election_year)`

Todas têm `candidate_id uuid references candidates(id)` nullable e `raw jsonb`
como rede de segurança pra colunas não mapeadas. Leia a migration inteira antes
de começar — tem o motivo de cada coluna nos comentários.

`candidates` já está populada para 2026 (582 registros: Presidente, 27
Governadores, 27 Senadores) via `scripts/ingest-tse-candidaturas.ts` — use
`cpf`/`tse_id` de lá pra resolver `candidate_id`.

## Fonte e volume real (medido em 2026-08-13, proxy 2022 — última eleição geral)

ZIP nacional único: `https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_{ano}.zip`

4 famílias de arquivo dentro do ZIP (todos `;`-delimitados, latin-1, aspas com
escaping `""`, sentinelas `#NULO#`/`#NE#`/`-1`/`NÃO INFORMADO` = null):
- `receitas_candidatos_{ano}_{UF}.csv` → ~674MB descomprimido nacional
- `despesas_pagas_candidatos_{ano}_{UF}.csv` → ~1,5GB descomprimido nacional
- `despesas_contratadas_candidatos_{ano}_{UF}.csv` → não medido, mesma ordem de grandeza de despesas pagas
- `receitas_candidatos_doador_originario_{ano}_{UF}.csv` → não medido, mesma ordem de grandeza de receitas

ZIP comprimido total: ~385MB. Cada família também tem um `_BRASIL.csv` agregado
— **pule-o pra essas 4 famílias** (diferente de `consulta_cand`, aqui o agregado
é redundante com os arquivos por UF, não uma fonte exclusiva).

**Isso é grande demais pra `AdmZip` em memória** (o padrão usado em
`scripts/ingest-tse-extended.ts` e `scripts/ingest-tse-candidaturas.ts` —
funciona bem pra candidaturas/bens, ~70k linhas, mas decompactar ~2GB+ em
memória de um runner do GitHub Actions é arriscado).

## Padrão de referência: transparencia-federal

Repo irmão (mesmo autor): `/Users/luizlessa/transparencia-federal` (ou worktree
`/Users/luizlessa/transparencia-federal-worktrees/tf-score` se o principal não
existir mais — confirme com `git worktree list` antes). Tem 2 scripts que
resolvem exatamente esse problema de volume:
- `scripts/import-contas-partidarias-tse.mjs` — usa `unzip -p zip member | python3 -c "..."`
  pra converter CSV em NDJSON via shell pipe, escreve em `/tmp`, lê de volta
  linha a linha via `readline`/`createInterface` — nunca materializa o CSV
  inteiro na heap do Node. Também tem `id_hash` SHA-1 pra idempotência quando
  não há chave natural confiável.
- `packages/ingestao-portal/src/job-ingestao-tse-receitas.ts` e
  `job-ingestao-tse-bens.ts` — usam `execSync` com `maxBuffer` alto (200-500MB)
  + parser CSV manual, mais simples que o pipe Python, adequado quando o CSV
  filtrado já é menor (eles filtram só Senador+Deputado Federal antes de
  processar tudo).

Estude os dois padrões e decida qual se encaixa melhor aqui — nosso caso é
"todos os cargos" (Presidente/Governador/Senador, não filtra por cargo antes),
então provavelmente precisa do padrão de streaming completo, não o mais leve.

## Nuances de schema já descobertas (não redescobrir)

- `despesas_pagas_candidatos` **não tem `SQ_CANDIDATO`**, só `SQ_PRESTADOR_CONTAS`.
  Resolva `candidate_id` via um mapa `SQ_PRESTADOR_CONTAS → SQ_CANDIDATO`
  construído a partir de `receitas_candidatos` ou `despesas_contratadas_candidatos`
  (que trazem os dois campos), processado antes ou em paralelo.
- `despesas_contratadas_candidatos` **tem** `SQ_CANDIDATO` diretamente.
- Todas as 4 famílias compartilham `SQ_PRESTADOR_CONTAS` + `SG_UF` como
  contexto comum.

## Timing — não é urgente hoje

TSE só divulga a prestação de contas **parcial** de 2026 em 15/09/2026 (prazo de
prestação: 9-13/09). Antes disso o dataset provavelmente nem existe no CKAN
(`dadosabertos.tse.jus.br`) pra 2026. Confirme se o pacote já foi publicado
(`https://dadosabertos.tse.jus.br/dataset/prestacao-de-contas-eleitorais-2026`
ou nome similar) antes de tentar baixar — se ainda não existir, é cedo demais
pra essa sessão.

## Entregáveis

1. Script de ingestão (streaming) pras 4 famílias, seguindo o padrão de
   dedupe/staging do transparencia-federal.
2. Testar em dry-run com volume real antes de `--apply`.
3. Decidir cadência de cron — TSE atualiza esse dataset com que frequência
   (diária? semanal, como em 2024)? Verificar na página do dataset quando
   publicado.
4. Considerar se `candidate_fefc` (já existente, hoje alimentada por
   `scripts/ingest-tse-extended.ts --only=fefc`, que baixa o mesmo ZIP gigante
   em memória) deveria passar a ser calculada como agregado de
   `candidate_revenue` (`fonte_receita ILIKE '%FUNDO ESPECIAL%'`) em vez de
   baixar o arquivo duas vezes — decisão de arquitetura, não obrigatória.
