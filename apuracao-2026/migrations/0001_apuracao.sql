-- 0001_apuracao.sql — RASCUNHO HISTÓRICO. SUBSTITUÍDO em 26/09/2026 por
-- supabase/migrations/20260927120000_apuracao_schema.sql (Fase 1). Não usar.
-- Destino: Supabase do Electiolab. Na Fase 1 vira supabase/migrations/20260927xxxxxx_apuracao_schema.sql.

create schema if not exists apuracao;

-- Eleições (de ele-c.json)
create table apuracao.eleicao (
  id              serial primary key,
  ambiente        text not null check (ambiente in ('simulado','oficial')),
  codigo_eleicao  integer not null,          -- ex.: 6257 / 21270
  codigo_pleito   integer not null,          -- ex.: 3220 / 17801
  ciclo           text,
  turno           smallint not null,
  descricao       text,
  data_eleicao    date,
  bruto           jsonb,
  atualizado_em   timestamptz not null default now(),
  unique (ambiente, codigo_eleicao)
);

create table apuracao.cargo (
  id            serial primary key,
  eleicao_id    integer not null references apuracao.eleicao(id),
  codigo        integer not null,            -- 1 presidente, 3 governador, 5 senador... (validar)
  nome          text not null,
  unique (eleicao_id, codigo)
);

create table apuracao.municipio (
  id            serial primary key,
  eleicao_id    integer not null references apuracao.eleicao(id),
  uf            char(2) not null,
  codigo_tse    char(5) not null,            -- sempre 5 dígitos
  codigo_ibge   char(7),
  nome          text not null,
  capital       boolean default false,
  unique (eleicao_id, codigo_tse)
);

-- Todo arquivo baixado com sucesso (200)
create table apuracao.arquivo_bruto (
  id            bigserial primary key,
  url           text not null,
  tipo          text not null check (tipo in ('EA10','EA11','EA12','EA14','EA15','EA20')),
  idg           text,
  etag          text,
  last_modified text,
  conteudo      jsonb not null,
  coletado_em   timestamptz not null default now(),
  unique (url, idg)
);
create index on apuracao.arquivo_bruto (url, coletado_em desc);

-- Acompanhamento (EA14/EA15): o que já foi totalizado em cada abrangência
create table apuracao.acompanhamento (
  id                 bigserial primary key,
  eleicao_id         integer not null references apuracao.eleicao(id),
  abrangencia        text not null,           -- 'br', 'mg', 'mg41238'...
  secoes_totalizadas integer,
  secoes_total       integer,
  pct_totalizado     numeric(6,3),
  data_hora_total    timestamptz,             -- data/hora da totalização informada pelo TSE
  andamento          text,                    -- valor de 'and' (ex.: 'f' = final)
  arquivo_id         bigint references apuracao.arquivo_bruto(id),
  coletado_em        timestamptz not null default now()
);
create index on apuracao.acompanhamento (eleicao_id, abrangencia, coletado_em desc);

-- Totalização por cargo/abrangência (EA20) — série temporal da noite
create table apuracao.totalizacao (
  id                 bigserial primary key,
  eleicao_id         integer not null references apuracao.eleicao(id),
  cargo_id           integer not null references apuracao.cargo(id),
  abrangencia        text not null,
  pct_totalizado     numeric(6,3),
  secoes_totalizadas integer,
  secoes_total       integer,
  eleitorado         bigint,
  comparecimento     bigint,
  abstencao          bigint,
  votos_validos      bigint,
  votos_brancos      bigint,
  votos_nulos        bigint,
  andamento          text,
  matematicamente_definida boolean,
  data_hora_total    timestamptz,
  arquivo_id         bigint not null references apuracao.arquivo_bruto(id),
  coletado_em        timestamptz not null default now()
);
create index on apuracao.totalizacao (cargo_id, abrangencia, coletado_em desc);

create table apuracao.votacao_candidato (
  id               bigserial primary key,
  totalizacao_id   bigint not null references apuracao.totalizacao(id) on delete cascade,
  numero           integer not null,
  nome_urna        text not null,
  partido_sigla    text,
  federacao        text,                       -- deputados: federação/partido que disputa as vagas
  coligacao        text,
  votos            bigint not null,
  pct_validos      numeric(7,4),               -- como veio do TSE
  situacao         text,                       -- eleito / eleito por QP / eleito por média / suplente / 2º turno... (como veio)
  destinacao       text                        -- válido / válido (legenda) / anulado / anulado sub judice...
);
create index on apuracao.votacao_candidato (totalizacao_id);

-- Votação por partido/federação (deputados: nominais + legenda)
create table apuracao.votacao_partido (
  id               bigserial primary key,
  totalizacao_id   bigint not null references apuracao.totalizacao(id) on delete cascade,
  numero           integer not null,
  sigla            text not null,
  federacao        text,
  votos_nominais   bigint,
  votos_legenda    bigint,
  votos_total      bigint,
  destinacao       text                        -- ex.: anulado sub judice
);
create index on apuracao.votacao_partido (totalizacao_id);

-- Eleitos (EA10)
create table apuracao.eleito (
  id            bigserial primary key,
  eleicao_id    integer not null references apuracao.eleicao(id),
  cargo_id      integer not null references apuracao.cargo(id),
  uf            char(2) not null,
  numero        integer not null,
  nome_urna     text not null,
  partido_sigla text,
  situacao      text,
  arquivo_id    bigint references apuracao.arquivo_bruto(id),
  coletado_em   timestamptz not null default now(),
  unique (eleicao_id, cargo_id, uf, numero)
);

-- Log do coletor
create table apuracao.coletor_execucao (
  id               bigserial primary key,
  iniciado_em      timestamptz not null default now(),
  finalizado_em    timestamptz,
  ambiente         text not null,
  requisicoes      integer default 0,
  respostas_200    integer default 0,
  respostas_304    integer default 0,
  respostas_404    integer default 0,
  erros            integer default 0,
  mensagem         text
);

-- View de conveniência: último snapshot por cargo/abrangência
create view apuracao.v_totalizacao_atual as
select distinct on (cargo_id, abrangencia) *
from apuracao.totalizacao
order by cargo_id, abrangencia, coletado_em desc;

-- Leitura pública (anon) apenas nas tabelas de exibição
alter table apuracao.totalizacao      enable row level security;
alter table apuracao.votacao_candidato enable row level security;
alter table apuracao.votacao_partido  enable row level security;
alter table apuracao.eleito           enable row level security;
create policy leitura_publica on apuracao.totalizacao       for select using (true);
create policy leitura_publica on apuracao.votacao_candidato for select using (true);
create policy leitura_publica on apuracao.votacao_partido   for select using (true);
create policy leitura_publica on apuracao.eleito            for select using (true);
-- Lembrar: expor o schema 'apuracao' na API (Settings > API > Exposed schemas).
