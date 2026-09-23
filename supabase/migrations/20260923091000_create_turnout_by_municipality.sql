-- Comparecimento e abstenção por município — TSE Dados Abertos, grupo
-- "Comparecimento e Abstenção" (fonte: perfil_comparecimento_abstencao_{ano}.zip,
-- cdn.tse.jus.br/estatistica/sead/odsele/perfil_comparecimento_abstencao/).
-- Um dataset por ano eleitoral concluído (2012-2024 hoje; 2026 só existirá
-- depois do pleito de 04/10/2026).
--
-- Mesma lógica de agregação de electorate_profile: o arquivo original é um
-- cross-tab por município × zona × demografia (17M+ linhas/ano, ~2.5GB só o
-- arquivo nacional de 2022). Agregamos por (ano, turno, uf, municipio)
-- somando QT_APTOS/QT_COMPARECIMENTO/QT_ABSTENCAO — ver
-- scripts/ingest-comparecimento.ts.

create table if not exists turnout_by_municipality (
  id                  uuid primary key default gen_random_uuid(),
  year                integer not null,
  round               integer not null default 1,
  uf                  text not null,
  municipio_tse_code  text not null,
  municipio_nome      text not null,
  total_aptos             bigint default 0,
  total_comparecimento    bigint default 0,
  total_abstencao         bigint default 0,
  source              text not null default 'TSE',
  fetched_at          timestamptz not null default now()
);

create unique index if not exists turnout_by_municipality_year_round_uf_municipio_key
  on turnout_by_municipality (year, round, uf, municipio_tse_code);
create index if not exists idx_turnout_uf on turnout_by_municipality (uf);
create index if not exists idx_turnout_year on turnout_by_municipality (year desc);

alter table turnout_by_municipality enable row level security;
do $$ begin
  create policy "Public read turnout_by_municipality" on turnout_by_municipality for select using (true);
exception when duplicate_object then null; end $$;
