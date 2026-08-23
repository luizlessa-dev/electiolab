-- Síntese por (candidato, tema) — substitui trecho literal solto como
-- conteúdo primário da página pública, decidido em 2026-08-24: revisar
-- dezenas de parágrafos longos por candidato/tema não era prático (economia
-- chegou a 333 trechos pendentes pra 12 candidatos). plano_trecho continua
-- existindo — vira matéria-prima auditável por trás da síntese, não é
-- removido nem perde a própria revisão.
--
-- Diferente de plano_trecho (cópia literal, por isso dispensava revisão de
-- fidelidade), plano_sintese é texto reescrito por LLM — precisa do mesmo
-- portão pendente/aprovado/rejeitado, e a policy pública já restringe a
-- aprovado no banco (mesmo padrão de plano_trecho).
create table if not exists plano_sintese (
  id                  uuid primary key default gen_random_uuid(),
  plano_id            uuid not null references plano_governo(id) on delete cascade,
  tema_id             uuid not null references tema(id) on delete cascade,
  texto               text not null,
  paginas_referencia  integer[] not null default '{}',
  status              text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  revisado_por        text,
  revisado_em         timestamptz,
  gerado_em           timestamptz not null default now(),
  unique (plano_id, tema_id)
);

create index if not exists idx_plano_sintese_tema_status on plano_sintese (tema_id, status);

alter table plano_sintese enable row level security;
do $$ begin
  create policy "Public read plano_sintese aprovado" on plano_sintese for select using (status = 'aprovado');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "service_role_full_access" on plano_sintese for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
