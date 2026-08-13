-- Cobertura completa de prestação de contas de candidatos (não só FEFC, que já
-- existe em candidate_fefc). Cobre as 4 famílias do pacote TSE
-- prestacao_de_contas_eleitorais_candidatos_{ano}.zip:
--   receitas_candidatos                    → candidate_revenue
--   receitas_candidatos_doador_originario   → candidate_revenue_original_donor
--   despesas_pagas_candidatos               → candidate_expense_paid
--   despesas_contratadas_candidatos         → candidate_expense_contracted
--
-- Layout de colunas confirmado baixando amostra real (proxy 2022, última eleição
-- geral) em 2026-08-13. Volume nacional nessa amostra: ~674MB (receitas) +
-- ~1,5GB (despesas pagas) descomprimidos — ordem de grandeza que exige ingestão
-- via streaming (unzip -p | parser linha a linha), não AdmZip em memória.
-- `raw jsonb` guarda a linha bruta como rede de segurança para colunas não
-- mapeadas ou que mudem de layout entre anos (mesmo padrão de pesqele_registry).
--
-- candidate_id fica nullable e sem match imediato em muitos casos: despesas_pagas
-- não traz SQ_CANDIDATO (só SQ_PRESTADOR_CONTAS), então a ligação com candidates
-- precisa de um mapa SQ_PRESTADOR_CONTAS→candidato construído a partir de receitas
-- ou despesas_contratadas (que trazem os dois campos) durante a ingestão.

create table if not exists candidate_revenue (
  id                    uuid primary key default gen_random_uuid(),
  candidate_id          uuid references candidates(id) on delete cascade,
  sq_candidato          text,
  sq_prestador_contas   text,
  cpf                   text,
  election_year         integer not null,
  turno                 integer,
  uf                    text,
  cargo                 text,
  party_acronym         text,
  fonte_receita         text,          -- DS_FONTE_RECEITA (Fundo Partidário/FEFC/Próprios/Doações...)
  origem_receita        text,
  natureza_receita      text,
  especie_receita       text,          -- dinheiro / estimável
  donor_cpf_cnpj        text,
  donor_name            text,
  donor_name_rfb        text,
  donor_party           text,
  donor_state           text,
  donor_city            text,
  receipt_number        text,          -- NR_RECIBO_DOACAO
  sq_receita            text not null,
  receita_date          date,
  description           text,
  value_brl             numeric,
  source                text default 'TSE',
  source_url            text,
  raw                   jsonb,
  fetched_at            timestamptz default now(),
  unique (sq_receita, election_year)
);

create index if not exists idx_revenue_candidate on candidate_revenue (candidate_id);
create index if not exists idx_revenue_cpf_year on candidate_revenue (cpf, election_year);
create index if not exists idx_revenue_donor on candidate_revenue (donor_cpf_cnpj);
create index if not exists idx_revenue_value on candidate_revenue (value_brl desc);
create index if not exists idx_revenue_year on candidate_revenue (election_year);

alter table candidate_revenue enable row level security;
do $$ begin
  create policy "Public read revenue" on candidate_revenue for select using (true);
exception when duplicate_object then null; end $$;

comment on table candidate_revenue is
  'TSE receitas_candidatos — 1 linha por receita declarada. Ingestão: streaming (ver plano em docs/).';

-- Rastreia o doador original quando a receita passou por um intermediário
-- (partido/comitê repassando doação de terceiro).
create table if not exists candidate_revenue_original_donor (
  id                          uuid primary key default gen_random_uuid(),
  sq_receita                  text not null,
  election_year               integer not null,
  sq_prestador_contas         text,
  uf                          text,
  donor_original_cpf_cnpj     text,
  donor_original_name         text,
  donor_original_name_rfb     text,
  donor_original_type         text,
  receita_date                date,
  description                 text,
  value_brl                   numeric,
  source                      text default 'TSE',
  raw                         jsonb,
  fetched_at                  timestamptz default now(),
  unique (sq_receita, donor_original_cpf_cnpj, election_year)
);

create index if not exists idx_revenue_donor_orig_sq_receita on candidate_revenue_original_donor (sq_receita, election_year);
create index if not exists idx_revenue_donor_orig_cpf on candidate_revenue_original_donor (donor_original_cpf_cnpj);

alter table candidate_revenue_original_donor enable row level security;
do $$ begin
  create policy "Public read revenue original donor" on candidate_revenue_original_donor for select using (true);
exception when duplicate_object then null; end $$;

comment on table candidate_revenue_original_donor is
  'TSE receitas_candidatos_doador_originario — doador real por trás de repasses via partido/comitê.';

-- Despesas efetivamente pagas. TSE não inclui SQ_CANDIDATO neste arquivo — só
-- SQ_PRESTADOR_CONTAS; candidate_id é resolvido em um passo de ingestão separado.
create table if not exists candidate_expense_paid (
  id                     uuid primary key default gen_random_uuid(),
  candidate_id           uuid references candidates(id) on delete cascade,
  sq_prestador_contas    text not null,
  election_year          integer not null,
  uf                     text,
  document_type          text,
  document_number        text,
  fonte_despesa          text,
  origem_despesa         text,
  natureza_despesa       text,
  especie_recurso        text,
  sq_despesa             text not null,
  sq_parcelamento_despesa text,
  payment_date           date,
  description            text,
  value_brl              numeric,
  source                 text default 'TSE',
  raw                    jsonb,
  fetched_at             timestamptz default now(),
  unique (sq_despesa, election_year)
);

create index if not exists idx_expense_paid_candidate on candidate_expense_paid (candidate_id);
create index if not exists idx_expense_paid_prestador on candidate_expense_paid (sq_prestador_contas, election_year);
create index if not exists idx_expense_paid_value on candidate_expense_paid (value_brl desc);
create index if not exists idx_expense_paid_year on candidate_expense_paid (election_year);

alter table candidate_expense_paid enable row level security;
do $$ begin
  create policy "Public read expense paid" on candidate_expense_paid for select using (true);
exception when duplicate_object then null; end $$;

comment on table candidate_expense_paid is
  'TSE despesas_pagas_candidatos — 1 linha por pagamento efetuado.';

-- Despesas contratadas (podem diferir das pagas — sinal de dívida de campanha).
-- Ao contrário de despesas_pagas, este arquivo traz SQ_CANDIDATO diretamente.
create table if not exists candidate_expense_contracted (
  id                      uuid primary key default gen_random_uuid(),
  candidate_id            uuid references candidates(id) on delete cascade,
  sq_candidato            text,
  sq_prestador_contas     text,
  cpf                     text,
  election_year           integer not null,
  uf                      text,
  cargo                   text,
  party_acronym           text,
  supplier_type           text,
  supplier_cnae           text,
  supplier_cpf_cnpj       text,
  supplier_name           text,
  supplier_name_rfb       text,
  supplier_state          text,
  supplier_city           text,
  document_type           text,
  document_number         text,
  origem_despesa          text,
  sq_despesa              text not null,
  despesa_date            date,
  description             text,
  value_brl               numeric,      -- VR_DESPESA_CONTRATADA
  source                  text default 'TSE',
  raw                     jsonb,
  fetched_at              timestamptz default now(),
  unique (sq_despesa, election_year)
);

create index if not exists idx_expense_contracted_candidate on candidate_expense_contracted (candidate_id);
create index if not exists idx_expense_contracted_supplier on candidate_expense_contracted (supplier_cpf_cnpj);
create index if not exists idx_expense_contracted_value on candidate_expense_contracted (value_brl desc);
create index if not exists idx_expense_contracted_year on candidate_expense_contracted (election_year);

alter table candidate_expense_contracted enable row level security;
do $$ begin
  create policy "Public read expense contracted" on candidate_expense_contracted for select using (true);
exception when duplicate_object then null; end $$;

comment on table candidate_expense_contracted is
  'TSE despesas_contratadas_candidatos — 1 linha por despesa contratada (pode não ter sido paga ainda).';
