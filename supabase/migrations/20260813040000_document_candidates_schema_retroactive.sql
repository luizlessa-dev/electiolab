-- Migration retroativa (documentação) — fecha o gap dos migrations "remote_schema"
-- (20260302073406, 20260302074457) que criaram estas tabelas direto no banco sem
-- que o DDL fosse commitado no repo. Todo o corpo é idempotente (IF NOT EXISTS):
-- as tabelas já existem em produção, isso só sincroniza o histórico local.
--
-- Estado confirmado ao vivo via Supabase MCP (list_tables + pg_indexes + pg_policies)
-- em 2026-08-13, antes de qualquer alteração de schema. candidates, candidate_assets,
-- candidate_fefc, candidate_social_media e prior_election_results estavam com 0 linhas.

create table if not exists candidates (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  full_name                   text,
  party                       text,
  coalition                   text,
  number                      integer,
  photo_url                   text,
  color                       text,
  election_id                 uuid,
  tse_id                      text,
  is_active                   boolean default true,
  created_at                  timestamptz default now(),
  slug                        text,
  birth_date                  date,
  profession                  text,
  education                   text,
  net_worth                   numeric,
  current_position            text,
  current_term_start          date,
  current_term_end            date,
  bio                         text,
  twitter_handle              text,
  instagram_handle            text,
  website_url                 text,
  official_photo_url          text,
  cpf                         text,
  datajud_searched_at         timestamptz,
  tse_last_situation          text,
  tse_last_situation_year     integer,
  tse_last_situation_detail   text,
  editorial_bio               text,
  editorial_summary           varchar(160),
  editorial_published_at      timestamptz
);

create index if not exists idx_candidates_editorial_published
  on candidates (editorial_published_at desc nulls last)
  where editorial_published_at is not null;
create index if not exists idx_candidates_election on candidates (election_id);
create index if not exists idx_candidates_slug on candidates (slug) where slug is not null;
create unique index if not exists idx_candidates_slug_unique on candidates (slug, election_id) where slug is not null;

alter table candidates enable row level security;

do $$ begin
  create policy "Public read access" on candidates for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "candidates_read" on candidates for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "candidates_insert" on candidates for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "candidates_update" on candidates for update using (true);
exception when duplicate_object then null; end $$;

comment on table candidates is
  'Candidatos. RLS: candidates_insert/candidates_update liberam escrita pra role public — revisar antes de expor client-side.';

-- candidate_assets — TSE bens declarados, 1 linha por bem por eleição.
create table if not exists candidate_assets (
  id               uuid primary key default gen_random_uuid(),
  candidate_id     uuid,
  cpf              text,
  election_year    integer not null,
  asset_order      integer,
  asset_type_code  text,
  asset_type_name  text,
  description      text,
  value_brl        numeric,
  source           text default 'TSE',
  source_url       text,
  fetched_at       timestamptz default now()
);

create index if not exists idx_assets_candidate on candidate_assets (candidate_id);
create index if not exists idx_assets_cpf_year on candidate_assets (cpf, election_year);
create index if not exists idx_assets_value on candidate_assets (value_brl desc);

alter table candidate_assets enable row level security;
do $$ begin
  create policy "Public read assets" on candidate_assets for select using (true);
exception when duplicate_object then null; end $$;

-- candidate_social_media — redes sociais oficiais declaradas ao TSE.
create table if not exists candidate_social_media (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid,
  cpf             text,
  election_year   integer not null,
  platform        text not null,
  url             text not null,
  handle          text,
  source          text default 'TSE',
  fetched_at      timestamptz default now()
);

create unique index if not exists candidate_social_media_candidate_id_election_year_url_key
  on candidate_social_media (candidate_id, election_year, url);
create index if not exists idx_social_candidate on candidate_social_media (candidate_id);
create index if not exists idx_social_platform on candidate_social_media (platform);

alter table candidate_social_media enable row level security;
do $$ begin
  create policy "Public read social" on candidate_social_media for select using (true);
exception when duplicate_object then null; end $$;

-- candidate_fefc — Fundo Especial de Financiamento de Campanha, agregado por candidato+ano.
create table if not exists candidate_fefc (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid,
  cpf               text,
  party_acronym     text,
  election_year     integer not null,
  amount_received   numeric default 0,
  amount_spent      numeric default 0,
  source            text default 'TSE',
  source_url        text,
  fetched_at        timestamptz default now()
);

create unique index if not exists candidate_fefc_candidate_id_election_year_key
  on candidate_fefc (candidate_id, election_year);
create index if not exists idx_fefc_amount on candidate_fefc (amount_received desc);
create index if not exists idx_fefc_candidate on candidate_fefc (candidate_id);
create index if not exists idx_fefc_year on candidate_fefc (election_year);

alter table candidate_fefc enable row level security;
do $$ begin
  create policy "Public read fefc" on candidate_fefc for select using (true);
exception when duplicate_object then null; end $$;

-- prior_election_results — histórico de resultados eleitorais (2018/2022/...).
create table if not exists prior_election_results (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid,
  cpf_clean       text,
  year            integer not null,
  round           integer default 1,
  election_type   text not null,
  state           text,
  city            text,
  party           text,
  total_votes     bigint default 0,
  result_status   text,
  source          text default 'TSE',
  fetched_at      timestamptz default now()
);

create unique index if not exists prior_election_results_candidate_id_year_round_election_typ_key
  on prior_election_results (candidate_id, year, round, election_type, state, city);
create index if not exists idx_prior_candidate on prior_election_results (candidate_id);
create index if not exists idx_prior_cpf on prior_election_results (cpf_clean);
create index if not exists idx_prior_year on prior_election_results (year desc);

alter table prior_election_results enable row level security;
do $$ begin
  create policy "Public read prior" on prior_election_results for select using (true);
exception when duplicate_object then null; end $$;
