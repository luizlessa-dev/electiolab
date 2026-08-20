-- Prestação de contas PARTIDÁRIA (receita/despesa anual dos partidos) —
-- distinto de candidate_revenue/candidate_expense_* (nível candidato).
-- Fonte TSE: prestacao_contas_anual_partidaria_<ano>.zip
-- (receita_anual_<ano>_BRASIL.csv + despesa_anual_<ano>_BRASIL.csv)
--
-- receita_anual não tem um SQ_RECEITA como identificador único (diferente
-- de despesa_anual, que tem SQ_DESPESA) — natural_key é um hash calculado
-- pelo ingestor em cima de um conjunto de campos que juntos identificam a
-- doação de forma estável entre reingestões.

create table if not exists party_revenue (
  id                              uuid primary key default gen_random_uuid(),
  natural_key                     text not null,
  election_year                   integer not null,
  esfera_partidaria_code          integer,
  esfera_partidaria                text,
  uf                              text,
  municipio_code                  text,
  municipio                       text,
  zona                            text,
  cnpj_prestador_conta            text,
  party_acronym                   text,
  party_name                      text,
  origem_doacao_code              integer,
  origem_doacao                   text,
  donor_cpf_cnpj                  text,
  donor_name                      text,
  donor_esfera_partidaria_code    integer,
  donor_esfera_partidaria         text,
  donor_uf                        text,
  donor_municipio_code            text,
  donor_municipio                 text,
  donor_zona                      text,
  donor_candidate_sq              text,
  donor_candidate_number          text,
  donor_candidate_cargo_code      integer,
  donor_candidate_cargo           text,
  fonte_recurso_code              integer,
  fonte_recurso                   text,
  natureza_recurso_code           integer,
  natureza_recurso                text,
  especie_recurso_code            integer,
  especie_recurso                 text,
  receipt_number                  text,
  document_number                 text,
  receita_date                    date,
  description                     text,
  value_brl                       numeric,
  source                          text default 'TSE',
  source_url                      text,
  raw                             jsonb,
  fetched_at                      timestamptz default now()
);

create unique index if not exists party_revenue_natural_key_key
  on party_revenue (natural_key);
create index if not exists idx_party_revenue_party on party_revenue (party_acronym, election_year);
create index if not exists idx_party_revenue_donor on party_revenue (donor_cpf_cnpj);
create index if not exists idx_party_revenue_cnpj on party_revenue (cnpj_prestador_conta);

alter table party_revenue enable row level security;
do $$ begin
  create policy "Public read party_revenue" on party_revenue for select using (true);
exception when duplicate_object then null; end $$;

create table if not exists party_expense (
  id                    uuid primary key default gen_random_uuid(),
  sq_despesa            text not null,
  election_year         integer not null,
  exercicio             integer,
  expense_type          text,
  esfera_partidaria_code integer,
  esfera_partidaria     text,
  uf                    text,
  municipio_code        text,
  municipio             text,
  zona                  text,
  cnpj_prestador_conta  text,
  party_acronym         text,
  party_name            text,
  document_type_code    integer,
  document_type         text,
  document_number       text,
  aidf_year             integer,
  aidf_number           text,
  supplier_type_code    integer,
  supplier_type         text,
  supplier_cpf_cnpj     text,
  supplier_name         text,
  description           text,
  payment_date          date,
  value_expense         numeric,
  value_paid            numeric,
  value_document        numeric,
  fonte_despesa_code    integer,
  fonte_despesa         text,
  source                text default 'TSE',
  source_url            text,
  raw                   jsonb,
  fetched_at            timestamptz default now()
);

create unique index if not exists party_expense_sq_despesa_election_year_key
  on party_expense (sq_despesa, election_year);
create index if not exists idx_party_expense_party on party_expense (party_acronym, election_year);
create index if not exists idx_party_expense_supplier on party_expense (supplier_cpf_cnpj);
create index if not exists idx_party_expense_cnpj on party_expense (cnpj_prestador_conta);

alter table party_expense enable row level security;
do $$ begin
  create policy "Public read party_expense" on party_expense for select using (true);
exception when duplicate_object then null; end $$;
