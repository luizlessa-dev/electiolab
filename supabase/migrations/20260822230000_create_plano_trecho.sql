-- Trechos (parágrafos) de plano_governo classificados por tema — etapa 3.
-- TODO trecho nasce status='pendente'. Regra de produto: nada pendente
-- aparece no site — em vez de confiar só no app pra filtrar, a policy de
-- leitura pública já restringe a status='aprovado' diretamente no banco.
-- A revisão (etapa 4) grava revisado_por/revisado_em ao aprovar/rejeitar,
-- usando a service_role key (que ignora RLS, então enxerga pendente também).

create table if not exists plano_trecho (
  id           uuid primary key default gen_random_uuid(),
  plano_id     uuid not null references plano_governo(id) on delete cascade,
  tema_id      uuid not null references tema(id) on delete cascade,
  pagina       integer not null,
  texto        text not null,
  status       text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  revisado_por text,
  revisado_em  timestamptz,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_plano_trecho_plano on plano_trecho (plano_id);
create index if not exists idx_plano_trecho_tema_status on plano_trecho (tema_id, status);

alter table plano_trecho enable row level security;
do $$ begin
  create policy "Public read plano_trecho aprovado" on plano_trecho for select using (status = 'aprovado');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "service_role_full_access" on plano_trecho for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
