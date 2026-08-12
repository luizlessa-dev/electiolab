-- Intention Polls (Intenção de Voto)
-- ============================================================================
-- Tabela de pesquisas de intenção de voto, populada por:
-- - Agent 2 (Institutos scraping): extrai de sites dos institutos
-- - Manual ingest: dados de pesquisas publicadas
--
-- Ligação com TSE: tse_registration aponta para pesqele_registry.protocolo
--   (quando é uma pesquisa registrada no TSE)

create table if not exists polls (
  id                 uuid primary key default gen_random_uuid(),

  -- Instituto
  institute_id       uuid references institutes(id),
  institute_name     text not null,            -- texto bruto da fonte (Datafolha, IPEC, etc)

  -- Candidato
  candidate          text not null,            -- nome do candidato
  candidate_slug     text,                     -- "lula" (normalizado pra busca)

  -- Cargo + Escopo
  office             text not null default 'presidente',  -- 'presidente' | 'governador'
  scope              text not null default 'nacional',    -- 'nacional' | sigla UF

  -- Métrica
  percentage         numeric(5,2) not null,   -- percentual de intenção de voto
  margin_of_error    numeric(4,2),             -- margem de erro

  -- Metadata da pesquisa
  publication_date   date not null,
  fieldwork_start    date,
  fieldwork_end      date,
  sample_size        integer,
  methodology        text,                     -- 'presencial' | 'telefonica' | 'online' | 'mista'
  tse_registration   text,                     -- referência a pesqele_registry.protocolo
  source_url         text,                     -- URL da fonte

  created_at         timestamptz not null default now(),

  -- Idempotência: mesmo instituto, candidato, cargo, escopo, data = não duplica
  unique (institute_name, candidate, office, scope, fieldwork_end)
);

create index if not exists polls_candidate_idx
  on polls (candidate_slug, office, scope, publication_date desc);
create index if not exists polls_office_idx
  on polls (office, scope, publication_date desc);
create index if not exists polls_institute_idx
  on polls (institute_name, publication_date desc);
create index if not exists polls_tse_registration_idx
  on polls (tse_registration);
create index if not exists polls_fieldwork_end_idx
  on polls (fieldwork_end desc);

comment on table polls is
  'Pesquisas de intenção de voto (% candidato por instituto). Populada por Agent 2 (scraping) e ingest manual. Ligada a TSE via tse_registration = pesqele_registry.protocolo.';

-- Permissões: leitura pública, escrita apenas via service role
grant select on polls to anon, authenticated;

-- View: Últimas pesquisas por candidato (agregado rápido)
create or replace view polls_latest as
select
  candidate,
  candidate_slug,
  office,
  scope,
  institute_name,
  percentage,
  fieldwork_end,
  publication_date,
  sample_size,
  row_number() over (partition by candidate, office, scope order by fieldwork_end desc) as rank
from polls
where fieldwork_end is not null
order by fieldwork_end desc;

comment on view polls_latest is
  'Últimas pesquisas por candidato+cargo+escopo (ranked por recência).';
