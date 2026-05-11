-- Fase B — fila editorial de rascunhos de pesquisas extraídos automaticamente
-- de fontes externas (Wikipedia, sites de institutos). NÃO entra direto em
-- polls para preservar revisão humana antes da publicação.
--
-- Workflow:
-- 1. scrape-wikipedia-polls.ts (ou similar) popula poll_drafts.
-- 2. Job match-pesqele preenche tse_registration cruzando com pesqele_registry.
-- 3. Operador revisa em /dashboard, aprova (status='approved' → promove a polls).

create type poll_draft_status as enum ('pending', 'approved', 'rejected', 'imported');

create table if not exists poll_drafts (
  id                 uuid primary key default gen_random_uuid(),

  -- Identificação
  election_id        uuid references elections(id) on delete cascade,
  institute_name     text not null,    -- texto bruto da fonte ("Datafolha", "Genial/Quaest")
  institute_id       uuid references institutes(id), -- preenchido após match

  -- Metadata da pesquisa
  fieldwork_start    date,
  fieldwork_end      date,
  publication_date   date,
  sample_size        integer,
  margin_of_error    numeric(4,2),
  methodology        text,
  scope              text,             -- "estimulada", "espontânea"
  round              integer default 1,

  -- Match com TSE PesqEle
  tse_protocolo      text references pesqele_registry(protocolo),

  -- Resultados (JSON: [{candidate_name, candidate_slug?, percentage}])
  results            jsonb not null,

  -- Auditoria
  source_url         text not null,    -- URL da fonte (Wikipedia, instituto, etc.)
  source_kind        text not null,    -- 'wikipedia' | 'institute' | 'manual'
  raw_row            jsonb,            -- linha bruta para auditoria
  status             poll_draft_status not null default 'pending',
  promoted_poll_id   uuid references polls(id),

  imported_at        timestamptz not null default now(),
  reviewed_at        timestamptz,
  reviewed_by        text,
  notes              text,

  -- Idempotência: mesma fonte, mesma pesquisa não duplica
  unique (election_id, institute_name, fieldwork_end, scope, round)
);

create index poll_drafts_status_idx     on poll_drafts (status);
create index poll_drafts_election_idx   on poll_drafts (election_id, status);
create index poll_drafts_fieldwork_idx  on poll_drafts (fieldwork_end desc);
create index poll_drafts_tse_idx        on poll_drafts (tse_protocolo) where tse_protocolo is not null;

comment on table poll_drafts is
  'Rascunhos de pesquisas extraídas automaticamente. Revisão humana obrigatória antes de virar polls.';

-- View agregada para dashboard
create or replace view poll_drafts_summary as
select
  e.name as election_name,
  e.type as cargo,
  e.state,
  count(*) filter (where d.status = 'pending') as pending,
  count(*) filter (where d.status = 'approved') as approved,
  count(*) filter (where d.status = 'rejected') as rejected,
  count(*) filter (where d.status = 'imported') as imported,
  count(*) filter (where d.tse_protocolo is not null) as with_tse_match,
  max(d.fieldwork_end) as last_fieldwork_end
from poll_drafts d
join elections e on e.id = d.election_id
group by e.id, e.name, e.type, e.state
order by pending desc, last_fieldwork_end desc;
