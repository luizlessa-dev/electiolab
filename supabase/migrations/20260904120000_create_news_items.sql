-- Feed de notícias eleitorais — MVP: só metadado + link editorial, nunca corpo
-- da matéria (evita reprodução de conteúdo com direitos autorais de terceiros).
-- Curadoria semi-manual no mesmo molde do poll_drafts: linhas entram como
-- 'draft' e só aparecem no site depois de revisão humana (status='published').
--
-- Não existe tabela de partido no schema (partido/[slug] deriva de
-- candidates.party via slugToParty) — por isso o link é só candidate_id
-- e/ou election_id. MVP cobre apenas Presidente/Governador.

create table if not exists news_items (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  source_name  text not null,
  source_url   text not null unique,
  published_at timestamptz not null,
  summary      text,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  created_by   text not null default 'manual',
  created_at   timestamptz not null default now()
);

create index if not exists idx_news_items_published_at
  on news_items (published_at desc)
  where status = 'published';

create table if not exists news_item_links (
  id           uuid primary key default gen_random_uuid(),
  news_item_id uuid not null references news_items(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  election_id  uuid references elections(id) on delete cascade,
  constraint news_item_links_target_check
    check (candidate_id is not null or election_id is not null)
);

create index if not exists idx_news_item_links_candidate on news_item_links (candidate_id);
create index if not exists idx_news_item_links_election on news_item_links (election_id);
create index if not exists idx_news_item_links_news_item on news_item_links (news_item_id);

alter table news_items enable row level security;
alter table news_item_links enable row level security;

do $$ begin
  create policy "Public read published news_items" on news_items
    for select using (status = 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "service_role_full_access" on news_items
    for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public read news_item_links" on news_item_links
    for select using (
      exists (select 1 from news_items ni where ni.id = news_item_id and ni.status = 'published')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "service_role_full_access" on news_item_links
    for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
