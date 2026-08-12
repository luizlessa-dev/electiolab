-- Add monitoring tables for Ruflo agents
-- agent_runs: track each agent execution
-- webhook_queue: queue for failed webhooks with retry logic
-- webhook_logs: audit trail of all webhook attempts

-- 1. Agent runs table (tracks execution history)
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  success boolean default false,
  error text,
  duration_ms integer,
  run_at timestamptz default now(),

  -- Result metadata
  row_count integer,
  upserted_count integer,
  poll_count integer,
  completed_count integer,
  failed_count integer,

  -- Audit
  output jsonb,
  created_at timestamptz default now()
);

create index idx_agent_runs_agent on agent_runs(agent_name);
create index idx_agent_runs_run_at on agent_runs(run_at desc);
create index idx_agent_runs_success on agent_runs(success);

-- 2. Webhook queue (async retry for failed webhooks)
create table if not exists webhook_queue (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  payload jsonb not null,
  status text default 'pending', -- pending, success, failed
  attempts integer default 0,
  max_attempts integer default 3,
  next_retry_at timestamptz default now(),
  error text,
  last_error_at timestamptz,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_webhook_queue_status on webhook_queue(status);
create index idx_webhook_queue_next_retry on webhook_queue(next_retry_at)
  where status = 'pending';

-- 3. Webhook logs (audit trail)
create table if not exists webhook_logs (
  id uuid primary key default gen_random_uuid(),
  agent text,
  url text not null,
  ok boolean,
  status_code integer,
  error text,
  attempts integer,
  duration_ms integer,
  created_at timestamptz default now()
);

create index idx_webhook_logs_agent on webhook_logs(agent);
create index idx_webhook_logs_created on webhook_logs(created_at desc);

-- 4. Alert rules (configurable thresholds for degradation)
create table if not exists agent_alert_rules (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  rule_type text not null, -- 'success_rate', 'no_run_for', 'error_contains'
  threshold text not null, -- JSON: {success_rate_pct: 50, no_run_mins: 120, error_pattern: "..."}
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(agent_name, rule_type)
);

-- Seed default alert rules
insert into agent_alert_rules (agent_name, rule_type, threshold, enabled)
values
  ('agent-1-tse', 'success_rate', '{"min_pct": 80}', true),
  ('agent-1-tse', 'no_run_for', '{"max_mins": 180}', true),
  ('agent-2-institutos', 'success_rate', '{"min_pct": 60}', true),
  ('agent-2-institutos', 'no_run_for', '{"max_mins": 240}', true),
  ('agent-3-validacao', 'success_rate', '{"min_pct": 90}', true),
  ('agent-3-validacao', 'no_run_for', '{"max_mins": 180}', true)
on conflict (agent_name, rule_type) do nothing;

-- Grant permissions
grant select, insert on agent_runs to service_role;
grant select, insert, update on webhook_queue to service_role;
grant select, insert on webhook_logs to service_role;
grant select on agent_alert_rules to service_role;
