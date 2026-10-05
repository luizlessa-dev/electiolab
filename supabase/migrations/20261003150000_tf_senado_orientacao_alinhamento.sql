-- ⚠️  APLICAR NO PROJETO "transparencia-federal" (ref redggdtakzmsabwvjzhb),
--     NÃO no projeto ElectioLab (xoxztzologqeqbajlhya).
--     O arquivo mora aqui só como registro (regra do CLAUDE.md). Aplicação manual
--     pelo Luiz no SQL Editor do painel do Supabase do projeto TF. Não aplicada.
--
-- Orientação de bancada do Senado (docs/BASTIDORES-POS-ELEICAO.md §8.2).
--
-- A tabela `senado_orientacao` (id_sve, sigla_partido, orientacao) já existe, vazia. A carga
-- vem de scripts/ingest-senado-orientacao.ts (API oficial do Senado). Esta migration prepara
-- o que lê dela. ORDEM: (1) esta migration, (2) o script com --apply, (3) o refresh manual
-- abaixo (depois disso o pg_cron mantém diariamente).
--
-- O que faz
--   1. CORRIGE a view `senado_dissidencia`, que existia esperando esses dados. Com os dados
--      carregados ela listaria como "dissidente" quem FALTOU (AP, LS, MIS...) ou ficou
--      P-NRV contra uma orientação "Sim": a regra antiga só excluía Abstenção, P-OD e NCom
--      do voto. Agora só conta voto Sim/Não contra orientação Sim/Não. Mesmas colunas, mesma
--      ordem (12 colunas, conferidas contra a view em produção, incluindo sigla_uf); nada no código
--      nem no banco depende dela (verificado em 2026-10-03).
--   2. CRIA `mv_senador_alinhamento`: alinhamento de cada senador com a orientação do partido.
--   3. Agenda o refresh diário (pg_cron), depois do `mv_voto_resumo_senador` (09:45 UTC).
--
-- Regra de alinhamento (nossa, não oficial; o painel deve dizer isso)
--   Conta as votações NOMINAIS em que o partido do senador orientou Sim ou Não e ele votou Sim,
--   Não ou Abstenção. Alinhado = voto igual à orientação (abstenção conta como não alinhada).
--   Fora: orientação Liberado ou Obstrução, voto P-NRV/ausência, votação secreta, votação sem
--   orientação. Cobertura parcial: só ~25-64% das votações têm orientação registrada por ano.
--   O partido é o do senador NA DATA do voto (senado_voto.sigla_partido). O TF grava PODE em
--   parte de 2026; a orientação usa PODEMOS, então PODE é tratado como PODEMOS.
--
-- Encoding: literais acentuados da lógica escritos com escape Unicode (U&'...'), imunes a
-- erro de colagem (ver docs §9). Copiar com: LC_ALL=en_US.UTF-8 pbcopy < arquivo.sql
-- Idempotente (drop + create nas views materializadas; create or replace na view).

-- ─────────────────────────────────────────────────────────────────
-- 1. senado_dissidencia corrigida (mesmas colunas, mesma ordem)
-- ─────────────────────────────────────────────────────────────────
create or replace view public.senado_dissidencia as
select v.id_sve,
       v.cod_parlamentar,
       v.nome_parlamentar,
       v.sigla_partido,
       v.sigla_uf,
       v.voto as voto_real,
       o.orientacao as orientacao_partido,
       vot.data_sessao,
       vot.descricao,
       vot.sigla_materia,
       vot.numero_materia,
       vot.ano_materia
from public.senado_voto v
join public.senado_orientacao o
  on o.id_sve = v.id_sve
 and o.sigla_partido = case when v.sigla_partido = 'PODE' then 'PODEMOS' else v.sigla_partido end
join public.senado_votacao vot on vot.id_sve = v.id_sve
where not vot.secreta
  and o.orientacao in ('Sim', U&'N\00e3o')
  and v.voto in ('Sim', U&'N\00e3o')
  and v.voto <> o.orientacao;

-- ─────────────────────────────────────────────────────────────────
-- 2. mv_senador_alinhamento
-- ─────────────────────────────────────────────────────────────────
drop materialized view if exists public.mv_senador_alinhamento;

create materialized view public.mv_senador_alinhamento as
with base as (
  select v.cod_parlamentar,
         v.id_sve,
         s.data_sessao,
         case when v.sigla_partido = 'PODE' then 'PODEMOS' else v.sigla_partido end as partido,
         v.voto
  from public.senado_voto v
  join public.senado_votacao s using (id_sve)
  where not s.secreta
    and v.voto in ('Sim', U&'N\00e3o', U&'Absten\00e7\00e3o')
),
comparadas as (
  select b.cod_parlamentar,
         b.data_sessao,
         (b.voto = o.orientacao) as alinhado
  from base b
  join public.senado_orientacao o
    on o.id_sve = b.id_sve
   and o.sigla_partido = b.partido
  where o.orientacao in ('Sim', U&'N\00e3o')
)
select cod_parlamentar,
       count(*) as votacoes_com_orientacao,
       count(*) filter (where alinhado) as votos_alinhados,
       round(100.0 * count(*) filter (where alinhado) / count(*), 1) as pct_alinhamento,
       count(*) filter (where data_sessao >= current_date - interval '12 months') as votacoes_com_orientacao_12m,
       round(
         100.0 * count(*) filter (where alinhado and data_sessao >= current_date - interval '12 months')
         / nullif(count(*) filter (where data_sessao >= current_date - interval '12 months'), 0),
         1
       ) as pct_alinhamento_12m,
       now() as atualizado_em
from comparadas
group by cod_parlamentar
with no data;

create unique index mv_senador_alinhamento_pk on public.mv_senador_alinhamento (cod_parlamentar);

comment on materialized view public.mv_senador_alinhamento is
  'Alinhamento do senador com a orientacao de bancada do partido (votacoes nominais com orientacao Sim/Nao). cod_parlamentar = parlamentares.id_senado. Regras no cabecalho de 20261003150000_tf_senado_orientacao_alinhamento.sql.';

-- Primeira carga (vazia enquanto senado_orientacao estiver vazia) e leitura pública
-- (precedente: mv_voto_resumo_senador e ceap_resumo_deputado).
refresh materialized view public.mv_senador_alinhamento;
grant select on public.mv_senador_alinhamento to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────
-- 3. Refresh diário (só agenda se o pg_cron existir)
-- ─────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('refresh-senador-alinhamento', '55 9 * * *',
      'refresh materialized view concurrently public.mv_senador_alinhamento');
  end if;
end $$;

-- Depois de rodar o script de ingestão com --apply, atualizar na hora (sem esperar o cron):
--   refresh materialized view public.mv_senador_alinhamento;
-- Conferência (esperado: ~150 senadores; Renan Calheiros ~92%, Irajá ~93,7%, mesmos valores do dry-run do script):
--   select cod_parlamentar, votacoes_com_orientacao, pct_alinhamento from public.mv_senador_alinhamento
--   where cod_parlamentar in (70, 35, 5973, 5385, 5207) order by 1;
--   select count(*) filter (where voto_real not in ('Sim', U&'N\00e3o')) as dissidencias_invalidas from public.senado_dissidencia; -- esperado 0
