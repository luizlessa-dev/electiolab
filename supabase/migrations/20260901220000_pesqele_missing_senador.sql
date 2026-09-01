-- pesqele_missing considera um registro "resolvido" assim que QUALQUER poll
-- referencia o protocolo, sem checar o cargo. Registros do TSE que combinam
-- "Governador, Senador" (a maioria) somem da fila assim que o Governador é
-- curado — mesmo que o Senador daquele mesmo protocolo nunca tenha sido.
-- Essa view isola especificamente a pendência de Senador, checando a
-- existência de poll com election.type = 'senador' pro protocolo, não
-- qualquer poll.
create or replace view public.pesqele_missing_senador as
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
  and r.cargos ilike '%senador%'
  and not exists (
    select 1
    from public.polls p
    join public.elections e on e.id = p.election_id
    where public.tse_protocolo_base(p.tse_registration) = r.protocolo
      and e.type = 'senador'
      and (p.source_kind is null or p.source_kind <> 'wikipedia')
  )
order by r.dt_fim desc;

comment on view public.pesqele_missing_senador is
  'Pendências de Senador na fila TSE — diferente de pesqele_missing, exige poll com election.type=senador especificamente (não qualquer poll do mesmo protocolo). Usada por scripts/pending-polls.ts (Tier 4).';
