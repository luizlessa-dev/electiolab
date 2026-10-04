-- ⚠️  APLICAR NO PROJETO "transparencia-federal" (ref redggdtakzmsabwvjzhb),
--     NÃO no projeto ElectioLab (xoxztzologqeqbajlhya).
--     O arquivo mora aqui só como registro (regra do CLAUDE.md). Aplicação manual
--     pelo Luiz no SQL Editor do painel do Supabase do projeto TF. Não aplicada.
--
-- Camada de leitura de votações para a ficha do parlamentar
-- (docs/BASTIDORES-POS-ELEICAO.md §2.1, §8.1).
--
-- Contexto verificado em 2026-10-03 (somente leitura)
--   • Câmara: `plen_votos` e `plen_votacoes` têm RLS ligado e ZERO policies: o anon
--     recebe `[]` sem erro (mesmo defeito que apagou a seção CEAP). Já existe o
--     agregado público `plen_deputado_agg` (643 deputados); ele NÃO é refeito aqui.
--     Falta só a lista de votações recentes, criada abaixo sem abrir a tabela crua.
--   • Senado: `senado_votacao` / `senado_voto` já são legíveis, mas não existe
--     agregado de presença. Criado abaixo, com o mapeamento de códigos do §8.1.
--
-- O que cria
--   mv_voto_resumo_senador          1 linha por senador (cod_parlamentar = parlamentares.id_senado)
--   mv_votos_recentes_parlamentar   últimas 30 votações nominais por parlamentar, Câmara e Senado
--                                   (casa + id_externo = parlamentares.id_camara / id_senado)
--   2 jobs pg_cron de refresh diário (padrão do `refresh-ceap-resumo`)
--
-- Regras de cálculo (nossas, não oficiais; o painel deve dizer isso)
--   • Só votação NOMINAL entra em presença e em "votos recentes". Votação secreta
--     não tem voto individual: conta em `votacoes_secretas` (quem registrou "Votou")
--     e nunca aparece como posição de voto.
--   • Presente = Sim, Não, Abstenção ou P-NRV (presente sem registrar voto).
--   • Ausência justificada = AP, LS, MIS, LP, LAP. Ausência não justificada = NCom.
--   • Fora do cálculo: "Presidente (art. 51 RISF)" (não vota), NA (dispositivo não
--     citado) e MERC (a fonte não descreve).
--   • pct_presenca = presentes ÷ (presentes + justificadas + não justificadas).
--     Ausência justificada reduz a presença, mas NÃO é falta: o painel mostra
--     `pct_faltas_nao_justificadas` ao lado. Janela de 12 meses calculada no refresh.
--   • Código de voto novo cai em `votos_nao_classificados` / 'nao_classificado'
--     em vez de sumir; um teste de fumaça deve alertar quando > 0.
--
-- Reaplicação (2026-10-03): a 1a aplicação foi feita com o clipboard sem locale UTF-8
-- e os literais acentuados ('Não', 'Abstenção', 'Obstrução') foram gravados corrompidos,
-- classificando ~5 mil votos do Senado e ~6,5 mil da Câmara como 'nao_classificado'.
-- Esta versão (a) escreve esses literais com escapes Unicode (U&'...'), imunes a problema
-- de encoding no caminho de colagem, e (b) recria as views (drop + create) em vez de
-- pular as que já existem. Continua seguro rodar de novo (as views são derivadas). Copiar com: LC_ALL=en_US.UTF-8 pbcopy < arquivo.sql
--
-- Segurança: as views só trazem votos (registro público) e agregados, sem CPF.
-- MV não suporta RLS nem security_invoker; a proteção é o conteúdo + GRANT SELECT
-- explícito. O advisor `materialized_view_in_api` vai listá-las como WARN: esperado,
-- igual à `ceap_resumo_deputado`. Idempotente.

drop materialized view if exists public.mv_voto_resumo_senador;
drop materialized view if exists public.mv_votos_recentes_parlamentar;

-- ─────────────────────────────────────────────────────────────────
-- Senado: resumo de presença e votos por senador
-- ─────────────────────────────────────────────────────────────────
create materialized view public.mv_voto_resumo_senador as
with base as (
  select v.cod_parlamentar, v.nome_parlamentar, v.sigla_partido, v.sigla_uf,
         s.data_sessao, s.id_sve, s.secreta,
         case
           when s.secreta then case when v.voto = 'Votou' then 'secreta' else 'ignorado' end
           when v.voto = 'Sim' then 'sim'
           when v.voto = U&'N\00e3o' then 'nao'
           when v.voto = U&'Absten\00e7\00e3o' then 'abstencao'
           when v.voto = 'P-NRV' then 'presente_sem_voto'
           when v.voto in ('AP', 'LS', 'MIS', 'LP', 'LAP') then 'ausencia_justificada'
           when v.voto = 'NCom' then 'ausencia_nao_justificada'
           when v.voto in ('Presidente (art. 51 RISF)', 'NA', 'MERC') then 'ignorado'
           else 'nao_classificado'
         end as classe
  from public.senado_voto v
  join public.senado_votacao s using (id_sve)
),
ultimo as (
  select distinct on (cod_parlamentar) cod_parlamentar, nome_parlamentar, sigla_partido, sigla_uf
  from base
  order by cod_parlamentar, data_sessao desc, id_sve desc
),
agg as (
  select cod_parlamentar,
    min(data_sessao) as primeira_sessao,
    max(data_sessao) as ultima_sessao,
    count(*) filter (where classe = 'sim') as votos_sim,
    count(*) filter (where classe = 'nao') as votos_nao,
    count(*) filter (where classe = 'abstencao') as votos_abstencao,
    count(*) filter (where classe = 'presente_sem_voto') as presentes_sem_voto,
    count(*) filter (where classe = 'ausencia_justificada') as ausencias_justificadas,
    count(*) filter (where classe = 'ausencia_nao_justificada') as ausencias_nao_justificadas,
    count(*) filter (where classe = 'secreta') as votacoes_secretas,
    count(*) filter (where classe = 'nao_classificado') as votos_nao_classificados,
    count(*) filter (where classe in ('sim', 'nao', 'abstencao', 'presente_sem_voto',
                                      'ausencia_justificada', 'ausencia_nao_justificada')) as votacoes_nominais,
    count(*) filter (where classe in ('sim', 'nao', 'abstencao', 'presente_sem_voto')) as presentes,
    count(*) filter (where classe in ('sim', 'nao', 'abstencao', 'presente_sem_voto',
                                      'ausencia_justificada', 'ausencia_nao_justificada')
                       and data_sessao >= current_date - interval '12 months') as votacoes_nominais_12m,
    count(*) filter (where classe in ('sim', 'nao', 'abstencao', 'presente_sem_voto')
                       and data_sessao >= current_date - interval '12 months') as presentes_12m
  from base
  group by cod_parlamentar
)
select a.cod_parlamentar,
       u.nome_parlamentar,
       u.sigla_partido,
       u.sigla_uf,
       a.primeira_sessao,
       a.ultima_sessao,
       a.votacoes_nominais,
       a.votos_sim,
       a.votos_nao,
       a.votos_abstencao,
       a.presentes_sem_voto,
       a.ausencias_justificadas,
       a.ausencias_nao_justificadas,
       a.votacoes_secretas,
       round(100.0 * a.presentes / nullif(a.votacoes_nominais, 0), 1) as pct_presenca,
       round(100.0 * a.ausencias_nao_justificadas / nullif(a.votacoes_nominais, 0), 1) as pct_faltas_nao_justificadas,
       a.votacoes_nominais_12m,
       round(100.0 * a.presentes_12m / nullif(a.votacoes_nominais_12m, 0), 1) as pct_presenca_12m,
       a.votos_nao_classificados,
       now() as atualizado_em
from agg a
join ultimo u using (cod_parlamentar)
with no data;

create unique index if not exists mv_voto_resumo_senador_pk
  on public.mv_voto_resumo_senador (cod_parlamentar);

comment on materialized view public.mv_voto_resumo_senador is
  'Presença e votos por senador (votações nominais; secretas só contadas). cod_parlamentar = parlamentares.id_senado. Regras no cabeçalho de 20261003130000_tf_votos_views_parlamentar.sql.';

-- ─────────────────────────────────────────────────────────────────
-- Câmara + Senado: últimas 30 votações nominais por parlamentar
-- ─────────────────────────────────────────────────────────────────
create materialized view public.mv_votos_recentes_parlamentar as
with camara as (
  select 'camara'::text as casa,
         v.deputado_id::bigint as id_externo,
         v.votacao_id::text as votacao_id,
         c.data,
         c.descricao,
         c.proposicao_autora as materia,
         case c.aprovacao when 1 then 'aprovada' when 0 then 'rejeitada' else null end as resultado,
         case v.tipo_voto
           when 'Sim' then 'sim'
           when U&'N\00e3o' then 'nao'
           when U&'Absten\00e7\00e3o' then 'abstencao'
           when U&'Obstru\00e7\00e3o' then 'obstrucao'
           when 'Artigo 17' then 'artigo_17'
           else 'nao_classificado'
         end as voto,
         c.data_hora_registro as ordem
  from public.plen_votos v
  join public.plen_votacoes c on c.id = v.votacao_id
),
senado as (
  select 'senado'::text as casa,
         v.cod_parlamentar::bigint as id_externo,
         v.id_sve::text as votacao_id,
         s.data_sessao as data,
         s.descricao,
         case when s.sigla_materia is not null
              then s.sigla_materia || ' ' || s.numero_materia || '/' || s.ano_materia end as materia,
         s.resultado,
         case
           when v.voto = 'Sim' then 'sim'
           when v.voto = U&'N\00e3o' then 'nao'
           when v.voto = U&'Absten\00e7\00e3o' then 'abstencao'
           when v.voto = 'P-NRV' then 'presente_sem_voto'
           when v.voto in ('AP', 'LS', 'MIS', 'LP', 'LAP') then 'ausencia_justificada'
           when v.voto = 'NCom' then 'ausencia_nao_justificada'
           else 'nao_classificado'
         end as voto,
         (s.data_sessao::timestamp at time zone 'UTC') as ordem
  from public.senado_voto v
  join public.senado_votacao s using (id_sve)
  where not s.secreta
    and v.voto not in ('Presidente (art. 51 RISF)', 'NA', 'MERC', 'Votou')
),
todas as (
  select * from camara
  union all
  select * from senado
),
numeradas as (
  select t.*,
         row_number() over (
           partition by casa, id_externo
           order by data desc, ordem desc nulls last, votacao_id desc
         ) as rn
  from todas t
)
select casa, id_externo, votacao_id, data, descricao, materia, resultado, voto
from numeradas
where rn <= 30
with no data;

create unique index if not exists mv_votos_recentes_parlamentar_pk
  on public.mv_votos_recentes_parlamentar (casa, id_externo, votacao_id);
create index if not exists mv_votos_recentes_parlamentar_busca
  on public.mv_votos_recentes_parlamentar (casa, id_externo, data desc);

comment on materialized view public.mv_votos_recentes_parlamentar is
  'Últimas 30 votações nominais por parlamentar. casa=camara: id_externo = parlamentares.id_camara; casa=senado: id_externo = parlamentares.id_senado. Votação secreta nunca aparece.';

-- Primeira carga e leitura pública (precedente: ceap_resumo_deputado)
refresh materialized view public.mv_voto_resumo_senador;
refresh materialized view public.mv_votos_recentes_parlamentar;

grant select on public.mv_voto_resumo_senador to anon, authenticated;
grant select on public.mv_votos_recentes_parlamentar to anon, authenticated;

-- Refresh diário, depois do refresh-ceap-resumo (09:30 UTC). Guardado: só agenda se o pg_cron existir.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('refresh-voto-resumo-senador', '45 9 * * *',
      'refresh materialized view concurrently public.mv_voto_resumo_senador');
    perform cron.schedule('refresh-votos-recentes-parlamentar', '50 9 * * *',
      'refresh materialized view concurrently public.mv_votos_recentes_parlamentar');
  end if;
end $$;

-- Conferência (rodar depois; esperado: senadores = 153, nao_classificados = 0, recentes ≈ 24 mil linhas):
--   select count(*) senadores, sum(votos_nao_classificados) nao_classificados from public.mv_voto_resumo_senador;
--   select casa, count(distinct id_externo) parlamentares, count(*) linhas, count(*) filter (where voto = 'nao_classificado') nao_classificados
--   from public.mv_votos_recentes_parlamentar group by casa;
