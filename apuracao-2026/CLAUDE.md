# CLAUDE.md — apuração 2026 (Electiolab)

Regras permanentes deste projeto. Valem para toda sessão do Claude Code aqui.

## O que é
Módulo de **apuração ao vivo** do Electiolab (electiolab.com) para as Eleições Gerais 2026.
- 1º turno: **domingo, 4/10/2026** (votação 8h–17h, horário de Brasília)
- 2º turno eventual: **domingo, 25/10/2026**
- Foco editorial do Electiolab: dados ao vivo + comparação **pesquisas × resultado**.
- A camada de análise/contexto sai no thebrinsider (não neste repo).

## Regras invioláveis
1. **Nunca alterar números do TSE.** Os JSON oficiais são exibidos como vieram. É vedado às entidades alterar conteúdo distribuído pela Justiça Eleitoral (Res. TSE 23.751/2026, arts. 264–269). Cálculos derivados (margens, erro de pesquisa, projeções de vagas) ficam em colunas/tabelas separadas e sempre rotulados como "cálculo Electiolab".
2. **Rate limit do TSE:** máximo 100 requisições/segundo por IP; estouro = bloqueio de 10 min, renovado se insistir. Mirar **muito** abaixo disso (ver docs/arquitetura.md). Respostas 304 também contam.
3. **Zero 404 por descuido.** Muitos 404 bloqueiam o IP. Não existe listagem de diretório: toda URL é construída a partir do arquivo de configuração (`ele-c.json`) e da config de municípios (`mun-e<ELEICAO>-cm.json`). Código de município sempre com **5 dígitos** e zeros à esquerda. Nunca "chutar" URL.
4. **Arquivo de eleitos (EA10) dá 404 até a primeira totalização final de UF** — isso é esperado; o coletor não deve pedir EA10 antes de ver totalização final no acompanhamento (EA14/EA15).
5. **Sempre requisições condicionais** (`If-None-Match` / `If-Modified-Since`) e gravar ETag/Last-Modified.
6. **Nada de fato inventado, nada de rosto de figura pública** (regras do Electiolab). Candidatos aparecem por nome/número/partido.
7. **Escopo do 1º turno = todos os cargos em disputa**: Presidente, Governador, Senador (2 vagas), Deputado Federal, Deputado Estadual e Deputado Distrital. Parar para aprovação ao fim de cada fase do PROMPT_INICIAL.md. Não avançar sozinho.
8. **Eleição proporcional (deputados):** eleitos e situação vêm do TSE. Não calcular quociente eleitoral, sobras ou distribuição de vagas como se fosse dado oficial; projeções só como "cálculo Electiolab", separadas.
9. Alterações de schema: migration versionada em `supabase/migrations/` do Electiolab, no padrão de nome já usado lá; só aplicar depois da minha aprovação explícita.

## Onde isto vive
Esta pasta (`~/electiolab/apuracao-2026/`) guarda só o plano, as regras e as fontes. **O código entra no próprio app do Electiolab**, seguindo as convenções que já existem lá:
- Next.js App Router **com `src/`**: páginas em `src/app/apuracao/`, rota do coletor em `src/app/api/cron/apuracao/route.ts`, lógica em `src/lib/apuracao/`.
- Banco: o **Supabase do próprio Electiolab** (`NEXT_PUBLIC_SUPABASE_URL` do `.env.local`), não o `transparencia-federal` (`TF_SUPABASE_*`). Schema Postgres novo: **`apuracao`**.
- Migrations: em `supabase/migrations/` no padrão já usado (`AAAAMMDDHHMMSS_descricao.sql`). O rascunho está em `migrations/0001_apuracao.sql` desta pasta; na Fase 1 ele vira `supabase/migrations/20260927xxxxxx_apuracao_schema.sql`. Não aplicar sem aprovação.
- Crons: `vercel.json` já tem dois crons e `maxDuration: 60` para `src/app/api/**`. O coletor precisa caber em 60s por execução.
- Reaproveitar o que existe: `candidates` (tem `tse_id`), `elections`, `polls`, `prior_election_results` e **`institute_accuracy_observations`** (base natural da Fase 4). Não duplicar cadastro de candidato.
- Não mexer nas rotas, crons e tabelas existentes além do necessário, e nunca commitar sem eu pedir.
- **Não** usar GitHub Actions para a apuração.

## Ambientes do TSE
- `simulado` → `https://resultados-sim.tse.jus.br/simulado` / ambiente `simulado2026` (desenvolvimento e testes)
- `oficial` → `https://resultados.tse.jus.br` / ambiente `oficial` (noite da eleição)
- Controlado por `TSE_AMBIENTE` no `.env`. Nenhum código de eleição fixo no código: tudo vem da config.

## Convenções
- Datas/horas em UTC no banco; exibição em America/Sao_Paulo.
- Todo registro de dado bruto guarda: URL de origem, IDG do arquivo, ETag, hora da coleta.
- Página pública sempre mostra "Fonte: TSE — atualizado às HH:MM" e o % de seções totalizadas.
- Textos em português do Brasil.
