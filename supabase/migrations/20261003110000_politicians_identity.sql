-- Identidade canônica de pessoa (passo 2 de docs/BASTIDORES-POS-ELEICAO.md).
--
-- APLICAR NO PROJETO ElectioLab (ref xoxztzologqeqbajlhya). Aplicação manual pelo
-- Luiz no SQL Editor do painel do Supabase, antes do merge (regra do CLAUDE.md).
-- O arquivo é o registro do que foi aplicado. Não aplicada.
--
-- Por que existe
--   `candidates` tem uma linha por candidatura (pessoa × eleição), e o slug dela
--   não identifica pessoa (384 slugs cobrem mais de um CPF). Para ligar a mesma
--   pessoa a votos, mandatos e gastos que vivem no projeto TF, precisamos de uma
--   linha por pessoa, chaveada por CPF.
--
-- O que cria (tudo novo; nenhuma tabela existente é alterada)
--   politicians                uma linha por pessoa (CPF único)
--   politician_links           chaves externas da pessoa (candidates, TF, Câmara, Senado, TSE)
--   politician_link_conflicts  fila de revisão humana; conflito nunca é resolvido sozinho
--   ingest_runs                registro de execução de cada ingestão (frescura / falha silenciosa)
--
-- Regras de identidade
--   • Vínculo só por CPF ou tse_id exatos, ou manual com responsável. Nunca por nome.
--   • 1º e 2º turno continuam sendo `candidates` distintos, ligados à mesma pessoa.
--
-- Segurança
--   • RLS ligado nas quatro tabelas. Só `politicians` é legível pelo anon, e apenas
--     nas colunas id, slug e display_name (GRANT por coluna): CPF e data de
--     nascimento não saem pela API pública. As demais tabelas não têm acesso para
--     anon/authenticated; quem escreve e lê é a service role (que ignora RLS).

-- ─────────────────────────────────────────────────────────────────
-- politicians
-- ─────────────────────────────────────────────────────────────────
create table if not exists politicians (
  id           uuid primary key default gen_random_uuid(),
  cpf          text not null,
  display_name text not null,
  slug         text not null,
  birth_date   date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint politicians_cpf_formato check (cpf ~ '^[0-9]{11}$'),
  constraint politicians_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint politicians_cpf_key unique (cpf),
  constraint politicians_slug_key unique (slug)
);

comment on table politicians is
  'Uma linha por pessoa, chave natural = CPF (11 dígitos). slug é por pessoa, não por candidatura. Leitura pública só de id, slug e display_name.';

-- ─────────────────────────────────────────────────────────────────
-- politician_links
-- ─────────────────────────────────────────────────────────────────
create table if not exists politician_links (
  id            uuid primary key default gen_random_uuid(),
  politician_id uuid not null references politicians(id) on delete cascade,
  system        text not null,
  external_id   text not null,
  confidence    text not null,
  verified_by   text,
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  constraint politician_links_system_valido
    check (system in ('candidates', 'tf_parlamentar', 'camara', 'senado', 'tse_sq')),
  constraint politician_links_confidence_valida
    check (confidence in ('exact_cpf', 'exact_tse_id', 'manual')),
  constraint politician_links_manual_exige_responsavel
    check (confidence <> 'manual' or (verified_by is not null and verified_at is not null)),
  -- uma chave externa pertence a uma pessoa só
  constraint politician_links_externo_key unique (system, external_id)
);

create index if not exists idx_politician_links_politician on politician_links (politician_id);

comment on table politician_links is
  'Chaves externas de cada pessoa. confidence só aceita exact_cpf, exact_tse_id ou manual (com verified_by); não existe vínculo por nome.';

-- ─────────────────────────────────────────────────────────────────
-- politician_link_conflicts
-- ─────────────────────────────────────────────────────────────────
create table if not exists politician_link_conflicts (
  id                     uuid primary key default gen_random_uuid(),
  kind                   text not null,
  system                 text not null,
  external_id            text not null,
  candidate_politician_ids uuid[] not null default '{}',
  details                jsonb not null default '{}'::jsonb,
  status                 text not null default 'open',
  resolved_by            text,
  resolved_at            timestamptz,
  resolution_note        text,
  created_at             timestamptz not null default now(),
  constraint plc_kind_valido
    check (kind in ('cpf_names_diverge', 'tse_id_multiple_cpfs', 'cpf_invalid', 'external_id_claimed')),
  constraint plc_system_valido
    check (system in ('candidates', 'tf_parlamentar', 'camara', 'senado', 'tse_sq')),
  constraint plc_status_valido
    check (status in ('open', 'resolved', 'dismissed')),
  constraint plc_resolucao_exige_responsavel
    check (status = 'open' or (resolved_by is not null and resolved_at is not null))
);

-- no máximo um conflito aberto por (tipo, sistema, chave): o backfill pode rodar de novo sem duplicar a fila
create unique index if not exists idx_plc_aberto_unico
  on politician_link_conflicts (kind, system, external_id)
  where status = 'open';

comment on table politician_link_conflicts is
  'Fila de revisão humana. Conflito de identidade (mesmo CPF com nomes que divergem, mesmo tse_id com CPFs diferentes, CPF inválido, chave externa já ligada a outra pessoa) fica aqui até alguém resolver; nada é fundido automaticamente.';

-- ─────────────────────────────────────────────────────────────────
-- ingest_runs
-- ─────────────────────────────────────────────────────────────────
create table if not exists ingest_runs (
  id            bigint generated always as identity primary key,
  source        text not null,
  status        text not null default 'running',
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  rows_read     integer,
  rows_written  integer,
  error         text,
  metadata      jsonb not null default '{}'::jsonb,
  constraint ingest_runs_status_valido
    check (status in ('running', 'ok', 'partial', 'error')),
  constraint ingest_runs_fim_apos_inicio
    check (finished_at is null or finished_at >= started_at)
);

create index if not exists idx_ingest_runs_source_started on ingest_runs (source, started_at desc);

comment on table ingest_runs is
  'Uma linha por execução de ingestão. Base do painel de frescura em /admin: última execução ok por source, e alerta quando passa do esperado.';

-- ─────────────────────────────────────────────────────────────────
-- RLS e permissões
-- ─────────────────────────────────────────────────────────────────
alter table politicians                enable row level security;
alter table politician_links           enable row level security;
alter table politician_link_conflicts  enable row level security;
alter table ingest_runs                enable row level security;

-- Os defaults do Supabase concedem tudo ao anon/authenticated em tabelas novas do schema public.
revoke all on politicians, politician_links, politician_link_conflicts, ingest_runs
  from anon, authenticated;

-- Leitura pública só de politicians, só dessas colunas (cpf e birth_date ficam de fora).
grant select (id, slug, display_name) on politicians to anon, authenticated;

do $$ begin
  create policy "politicians_public_read" on politicians
    for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;

-- Sem policies nas outras três: só a service role acessa (ela ignora RLS).
