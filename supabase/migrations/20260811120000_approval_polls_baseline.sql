-- Approval Polls — baseline / consolidação
-- ---------------------------------------------------------------------------
-- Substitui os dois arquivos anteriores e conflitantes para approval_polls
-- (1722781200_create_approval_polls.sql e 20260601000000_approval_polls.sql):
-- nenhum dos dois reproduzia sozinho o schema real de produção, e nenhum
-- estava registrado no ledger de migrations (supabase_migrations.schema_migrations)
-- — a tabela foi criada/alterada fora do fluxo do CLI, misturando DDL das
-- duas fontes (colunas/constraints do arquivo de 2026-06-01 + índices e RLS
-- do arquivo de timestamp epoch 1722781200).
--
-- Este arquivo reproduz fielmente o schema já em produção (introspectado via
-- information_schema/pg_catalog em 2026-08-11) e é 100% idempotente, para
-- que qualquer ambiente novo criado a partir das migrations chegue ao mesmo
-- estado sem duplicar objetos.
--
-- Pesquisas de avaliação de governo (rating/binary) e rejeição de
-- candidatos. Cada linha é uma pesquisa de um instituto sobre UM sujeito
-- (presidente, governo, candidato), em UMA das três métricas comparáveis
-- ('rating', 'binary', 'rejection') — as três NUNCA são misturadas na
-- agregação.

create table if not exists approval_polls (
  id                 uuid primary key default gen_random_uuid(),

  institute_id       uuid references institutes(id),
  institute_name     text not null,

  subject_label      text not null,
  subject_slug       text,
  office             text not null default 'presidente',
  scope              text not null default 'nacional',

  metric             text not null check (metric in ('rating', 'binary', 'rejection')),

  publication_date   date not null,
  fieldwork_start    date,
  fieldwork_end      date,
  sample_size        integer,
  margin_of_error    numeric(4,2),
  methodology        text,
  tse_registration   text,
  source_url         text,

  pct_otimo          numeric(5,2),
  pct_bom            numeric(5,2),
  pct_regular        numeric(5,2),
  pct_ruim           numeric(5,2),
  pct_pessimo        numeric(5,2),

  pct_aprova         numeric(5,2),
  pct_desaprova      numeric(5,2),

  pct_rejeita        numeric(5,2),

  pct_nsnr           numeric(5,2),

  created_at         timestamptz not null default now(),

  unique (institute_name, subject_label, metric, fieldwork_end, scope)
);

comment on table approval_polls is
  'Pesquisas de avaliacao de governo (rating/binary) e rejeicao de candidatos. Agregadas por src/lib/approval/approval-aggregation.ts. Tres metricas comparaveis, nunca misturadas.';

-- Índices (nomes e definições exatamente como já existem em produção)
create index if not exists approval_polls_subject_idx
  on approval_polls (subject_slug, metric, publication_date desc);
create index if not exists approval_polls_office_idx
  on approval_polls (office, scope, metric, publication_date desc);
create index if not exists approval_polls_metric_idx
  on approval_polls (metric, publication_date desc);
create index if not exists idx_approval_polls_subject_slug
  on approval_polls (subject_slug);
create index if not exists idx_approval_polls_metric
  on approval_polls (metric);
create index if not exists idx_approval_polls_publication_date
  on approval_polls (publication_date desc);
create index if not exists idx_approval_polls_institute_id
  on approval_polls (institute_id);

-- Leitura pública (dashboard e páginas SSR usam a anon key). Escrita via
-- service role (bypassa RLS) ou pelos e-mails admin abaixo.
grant select on approval_polls to anon, authenticated;

alter table approval_polls enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'approval_polls' and policyname = 'approval_polls_readable'
  ) then
    create policy "approval_polls_readable" on approval_polls
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'approval_polls' and policyname = 'approval_polls_editable_by_admin'
  ) then
    create policy "approval_polls_editable_by_admin" on approval_polls
      for insert with check (
        auth.role() = 'authenticated'
        and (
          auth.email() = 'admin@electiolab.com'
          or auth.email() = 'luiz@gastronomizae.com'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'approval_polls' and policyname = 'approval_polls_updatable_by_admin'
  ) then
    create policy "approval_polls_updatable_by_admin" on approval_polls
      for update using (
        auth.role() = 'authenticated'
        and (
          auth.email() = 'admin@electiolab.com'
          or auth.email() = 'luiz@gastronomizae.com'
        )
      )
      with check (
        auth.role() = 'authenticated'
        and (
          auth.email() = 'admin@electiolab.com'
          or auth.email() = 'luiz@gastronomizae.com'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'approval_polls' and policyname = 'approval_polls_deletable_by_admin'
  ) then
    create policy "approval_polls_deletable_by_admin" on approval_polls
      for delete using (
        auth.role() = 'authenticated'
        and (
          auth.email() = 'admin@electiolab.com'
          or auth.email() = 'luiz@gastronomizae.com'
        )
      );
  end if;
end $$;
