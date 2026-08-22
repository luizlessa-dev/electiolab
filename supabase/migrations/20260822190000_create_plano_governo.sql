-- Planos de governo dos presidenciáveis 2026 — anexo obrigatório do registro de
-- candidatura, público no DivulgaCandContas do TSE (um PDF por candidato).
-- Esta tabela cobre só a ingestão bruta: PDF baixado + hash + metadados.
-- Extração de texto por página (plano_pagina) e recorte por tema (tema,
-- plano_trecho) são etapas seguintes, ainda não implementadas.
--
-- Nomenclatura em PT-BR por decisão explícita do produto (feature editorial
-- "Planos de governo") — diferente do padrão em inglês do resto do schema
-- (candidates, party_revenue etc.), mantido assim a pedido do usuário.
--
-- candidato_id aponta pra candidates(id) — o registro de candidatura, e
-- portanto o plano de governo, é único por pessoa (não existe um por turno).
-- Na prática `candidates` tem hoje uma linha por (candidato, turno) com
-- tse_id nem sempre sincronizado entre elas (achado em 2026-08-22: Lula e
-- outros têm tse_id atual só na linha de 2º turno); o script de ingestão
-- resolve por tse_id em qualquer linha presidencial do ano, então
-- candidato_id pode acabar apontando pra linha de 1º ou 2º turno dependendo
-- de qual estiver com o tse_id certo no momento da ingestão. O script não
-- cria candidatos novos; espera que scripts/ingest-tse-candidaturas.ts já
-- tenha rodado antes.

create table if not exists plano_governo (
  id              uuid primary key default gen_random_uuid(),
  candidato_id    uuid not null references candidates(id) on delete cascade,
  ano             integer not null,
  url_origem      text not null,
  hash            text not null,
  data_download   timestamptz not null default now(),
  num_paginas     integer,
  caminho_arquivo text
);

create unique index if not exists plano_governo_candidato_ano_key
  on plano_governo (candidato_id, ano);
create index if not exists idx_plano_governo_hash on plano_governo (hash);

alter table plano_governo enable row level security;
do $$ begin
  create policy "Public read plano_governo" on plano_governo for select using (true);
exception when duplicate_object then null; end $$;
