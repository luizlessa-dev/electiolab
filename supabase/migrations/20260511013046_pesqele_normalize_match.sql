-- Normaliza tse_registration ao fazer match com pesqele_registry.protocolo.
-- polls.tse_registration vem como "BR-03770/2026" (legível, editorial)
-- pesqele_registry.protocolo vem como "BR037702026" (formato do CSV TSE)
--
-- Estratégia: usar regexp_replace para strip non-alphanumeric no JOIN,
-- sem alterar dados existentes. Cria índice funcional pra performance.

create index if not exists polls_tse_registration_normalized_idx
  on polls (regexp_replace(upper(tse_registration), '[^A-Z0-9]', '', 'g'))
  where tse_registration is not null;

create or replace view pesqele_missing as
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
from pesqele_registry r
left join polls p
  on regexp_replace(upper(p.tse_registration), '[^A-Z0-9]', '', 'g') = r.protocolo
where p.id is null
  and r.dt_fim is not null
order by r.dt_fim desc;

create or replace view pesqele_coverage as
with by_uf_cargo as (
  select
    r.uf,
    case
      when r.cargos ilike '%governador%' then 'governador'
      when r.cargos ilike '%presidente%' then 'presidente'
      when r.cargos ilike '%senador%' then 'senador'
      when r.cargos ilike '%deputado%' then 'deputado'
      else 'outros'
    end as cargo,
    count(*) as total_tse,
    count(p.id) as on_electiolab
  from pesqele_registry r
  left join polls p
    on regexp_replace(upper(p.tse_registration), '[^A-Z0-9]', '', 'g') = r.protocolo
  where r.ano = 2026
  group by 1, 2
)
select
  uf, cargo, total_tse, on_electiolab,
  case when total_tse = 0 then 0
       else round(100.0 * on_electiolab / total_tse, 1)
  end as coverage_pct
from by_uf_cargo
order by coverage_pct asc, uf, cargo;
