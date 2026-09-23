-- Perfil do eleitorado por município — TSE Dados Abertos, grupo "Eleitorado",
-- dataset "Eleitorado - Atual" (fonte: perfil_eleitorado_ATUAL.zip,
-- cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado/).
--
-- O arquivo original do TSE é um cross-tab de contagem (QT_ELEITORES) por
-- município × zona × gênero × faixa etária × escolaridade × raça/cor × etc —
-- 11M+ linhas, 2.3GB descompactado. Agregamos na ingestão para (uf,
-- municipio) somando QT_ELEITORES/QT_ELEITORES_BIOMETRIA/
-- QT_ELEITORES_DEFICIENCIA — o produto não consome o cruzamento demográfico
-- completo, só totais por município (ver scripts/ingest-eleitorado.ts).
--
-- year = ano de referência da extração (o TSE usa ANO_ELEICAO=9999 pro
-- dataset "Atual"; gravamos o ano civil real da extração, não o sentinela).

create table if not exists electorate_profile (
  id                  uuid primary key default gen_random_uuid(),
  year                integer not null,
  uf                  text not null,
  municipio_tse_code  text not null,
  municipio_nome      text not null,
  total_eleitores           bigint not null default 0,
  total_biometria           bigint default 0,
  total_deficiencia         bigint default 0,
  total_nome_social         bigint default 0,
  source              text not null default 'TSE',
  fetched_at          timestamptz not null default now()
);

create unique index if not exists electorate_profile_year_uf_municipio_key
  on electorate_profile (year, uf, municipio_tse_code);
create index if not exists idx_electorate_profile_uf on electorate_profile (uf);
create index if not exists idx_electorate_profile_year on electorate_profile (year desc);

alter table electorate_profile enable row level security;
do $$ begin
  create policy "Public read electorate_profile" on electorate_profile for select using (true);
exception when duplicate_object then null; end $$;
