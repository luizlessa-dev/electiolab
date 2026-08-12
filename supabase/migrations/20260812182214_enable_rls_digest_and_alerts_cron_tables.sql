-- Fecha os 3 achados restantes do advisor "RLS Disabled in Public".
-- digest_runs, stale_poll_alerts e user_alert_deliveries não têm nenhuma
-- referência em código de aplicação — são gravadas só por funções internas
-- do Postgres via pg_cron/pg_net (cron_send_weekly_digest, cron_check_stale_polls,
-- cron_check_user_alerts, ver `select * from cron.job`). Mesmo padrão de
-- service-role-only já usado nas demais tabelas de automação do ElectioLab.

alter table public.digest_runs enable row level security;

create policy "service_role_full_access"
  on public.digest_runs
  for all
  to service_role
  using (true)
  with check (true);

alter table public.stale_poll_alerts enable row level security;

create policy "service_role_full_access"
  on public.stale_poll_alerts
  for all
  to service_role
  using (true)
  with check (true);

alter table public.user_alert_deliveries enable row level security;

create policy "service_role_full_access"
  on public.user_alert_deliveries
  for all
  to service_role
  using (true)
  with check (true);
