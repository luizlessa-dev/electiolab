-- Fecha o achado do advisor "RLS Disabled in Public" para 4 tabelas que já são
-- acessadas exclusivamente via SUPABASE_SERVICE_ROLE_KEY (agentes Ruflo, rotas
-- /api/admin/poll-drafts, ip-rate-limit.ts, backfill-institute-accuracy.ts) —
-- nenhum client anon/authenticated as consulta hoje. Mesmo padrão já usado em
-- discrepancies/aggregation_history/newsletter_subscribers.

alter table public.pesqele_registry enable row level security;

create policy "service_role_full_access"
  on public.pesqele_registry
  for all
  to service_role
  using (true)
  with check (true);

alter table public.poll_drafts enable row level security;

create policy "service_role_full_access"
  on public.poll_drafts
  for all
  to service_role
  using (true)
  with check (true);

alter table public.ip_rate_limits enable row level security;

create policy "service_role_full_access"
  on public.ip_rate_limits
  for all
  to service_role
  using (true)
  with check (true);

alter table public.institute_accuracy_observations enable row level security;

create policy "service_role_full_access"
  on public.institute_accuracy_observations
  for all
  to service_role
  using (true)
  with check (true);
