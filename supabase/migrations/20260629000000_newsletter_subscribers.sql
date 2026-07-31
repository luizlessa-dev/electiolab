-- Newsletter subscribers (double opt-in, LGPD-compliant)
-- Confirmação via token enviado por Resend; integração opcional com Beehiiv.

create table if not exists public.newsletter_subscribers (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  source                text not null default 'site',
  confirmation_token    text,                        -- nulo após confirmação (single-use)
  confirmation_sent_at  timestamptz,
  subscribed_at         timestamptz default now(),
  confirmed_at          timestamptz,                 -- preenchido no double opt-in
  is_active             boolean not null default false,
  unsubscribed_at       timestamptz,                 -- LGPD: revogação de consentimento
  beehiiv_id            text,                        -- ID no Beehiiv após sync
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint newsletter_subscribers_email_unique unique (email),
  constraint newsletter_subscribers_token_unique unique (confirmation_token)
);

-- Índice para lookup rápido por token (chamado a cada clique de confirmação)
create index if not exists newsletter_subscribers_token_idx
  on public.newsletter_subscribers (confirmation_token)
  where confirmation_token is not null;

-- Índice para listar ativos (envio de broadcasts)
create index if not exists newsletter_subscribers_active_idx
  on public.newsletter_subscribers (is_active, confirmed_at)
  where is_active = true;

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger newsletter_subscribers_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

-- RLS: leitura/escrita só via service_role (API routes usam SUPABASE_SERVICE_ROLE_KEY)
alter table public.newsletter_subscribers enable row level security;

create policy "service_role_full_access"
  on public.newsletter_subscribers
  for all
  to service_role
  using (true)
  with check (true);
