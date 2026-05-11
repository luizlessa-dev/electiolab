-- Fase A — descoberta automática de pesquisas via TSE PesqEle
-- (Sistema de Registro de Pesquisas Eleitorais, Lei 9.504/97).
--
-- Tabela pesqele_registry guarda TODOS os registros oficiais do TSE
-- (metadata por pesquisa: instituto, datas, cargo, UF, amostra), sem os
-- percentuais por candidato. Os números só ficam nos PDFs do questionário
-- ou nos sites dos institutos — Fase B trata da coleta.
--
-- A relação com `polls` é via `tse_registration = pesqele_registry.protocolo`.

create table if not exists pesqele_registry (
  protocolo            text primary key,            -- NR_PROTOCOLO_REGISTRO (ex: AC007702026)
  ano                  integer not null,            -- AA_ELEICAO (2026, 2024, ...)
  uf                   text not null,               -- SG_UF
  municipio            text,                        -- NM_UE (cidade ou estado)
  cnpj_empresa         text,                        -- NR_CNPJ_EMPRESA
  nome_empresa         text not null,               -- NM_EMPRESA
  nome_fantasia        text,                        -- NM_EMPRESA_FANTASIA
  cargos               text not null,               -- DS_CARGO ("Governador, Senador, ...")
  dt_inicio            date,                        -- DT_INICIO_PESQUISA
  dt_fim               date,                        -- DT_FIM_PESQUISA (fieldwork end)
  dt_divulgacao        date,                        -- DT_DIVULGACAO
  dt_registro          timestamptz,                 -- DT_REGISTRO (quando foi registrado no TSE)
  qt_entrevistados     integer,                     -- QT_ENTREVISTADO
  pesquisa_propria     boolean default false,       -- ST_PESQUISA_PROPRIA = 'S'
  cd_conre             text,                        -- CD_CONRE (registro estatístico)
  nm_estatistico       text,                        -- NM_ESTATISTICO_RESP
  vr_pesquisa          numeric(12,2),               -- VR_PESQUISA (custo)
  ds_metodologia       text,                        -- DS_METODOLOGIA_PESQUISA
  ds_plano_amostral    text,                        -- DS_PLANO_AMOSTRAL
  ingested_at          timestamptz not null default now(),
  raw                  jsonb                        -- linha bruta para auditoria
);

create index pesqele_registry_uf_idx        on pesqele_registry (uf);
create index pesqele_registry_dt_fim_idx    on pesqele_registry (dt_fim desc);
create index pesqele_registry_empresa_idx   on pesqele_registry (cnpj_empresa);
create index pesqele_registry_ano_uf_idx    on pesqele_registry (ano, uf);

comment on table pesqele_registry is
  'Registros oficiais do TSE PesqEle (metadata, sem percentuais). Atualizado por scripts/ingest-pesqele.ts.';

-- View: registros TSE que ainda não estão em polls
-- (ou seja: pesquisas que existem oficialmente mas ainda não foram ingeridas
-- com os números por candidato — fila editorial).
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
left join polls p on p.tse_registration = r.protocolo
where p.id is null
  and r.dt_fim is not null
order by r.dt_fim desc;

comment on view pesqele_missing is
  'Registros TSE PesqEle sem correspondência em polls — fila editorial de ingestão.';

-- View: cobertura por UF/cargo (% TSE registrado já em nossa base)
create or replace view pesqele_coverage as
with by_uf_cargo as (
  select
    r.uf,
    case
      when r.cargos ilike '%governador%' then 'governador'
      when r.cargos ilike '%presidente%' then 'presidente'
      when r.cargos ilike '%senador%' then 'senador'
      else 'outros'
    end as cargo,
    count(*) as total_tse,
    count(p.id) as on_electiolab
  from pesqele_registry r
  left join polls p on p.tse_registration = r.protocolo
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

comment on view pesqele_coverage is
  'Cobertura por UF+cargo: quantas pesquisas registradas no TSE vs quantas já temos em polls.';
