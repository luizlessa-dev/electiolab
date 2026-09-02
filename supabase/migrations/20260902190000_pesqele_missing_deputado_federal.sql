-- Mesma lógica de pesqele_missing_senador, agora pra Deputado Federal. O TSE
-- quase sempre registra Deputado Federal no MESMO protocolo de Governador +
-- Senador ("Governador, Senador, Deputado Federal, Deputado Estadual" = 461
-- dos 559 protocolos pendentes) — ou seja, a mesma matéria/pesquisa já curada
-- pra Governador provavelmente também testou Deputado Federal, só não foi
-- extraído ainda. pesqele_missing esconde essa pendência assim que QUALQUER
-- poll do protocolo existe (ex.: o de Governador), mesmo sem Deputado Federal.
create or replace view public.pesqele_missing_deputado_federal as
select
  r.protocolo,
  r.ano,
  r.uf,
  r.cargos,
  r.nome_empresa as instituto,
  r.dt_fim as fieldwork_end,
  r.dt_divulgacao as publication_date,
  r.qt_entrevistados as sample_size,
  current_date - r.dt_fim as days_since_fieldwork
from public.pesqele_registry r
where r.dt_fim is not null
  and r.cargos ilike '%deputado federal%'
  and not exists (
    select 1
    from public.polls p
    join public.elections e on e.id = p.election_id
    where public.tse_protocolo_base(p.tse_registration) = r.protocolo
      and e.type = 'deputado_federal'
      and (p.source_kind is null or p.source_kind <> 'wikipedia')
  )
order by r.dt_fim desc;

comment on view public.pesqele_missing_deputado_federal is
  'Pendências de Deputado Federal na fila TSE — exige poll com election.type=deputado_federal especificamente (não qualquer poll do mesmo protocolo). Usada por scripts/pending-polls.ts (Tier 5).';
