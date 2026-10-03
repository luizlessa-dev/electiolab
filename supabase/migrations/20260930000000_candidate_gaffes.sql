-- Create candidate_gaffes table for tracking controversial statements and gaffes
-- This table stores historical records of candidate statements, contradictions, and controversial moments

create table if not exists candidate_gaffes (
  id uuid primary key default gen_random_uuid(),

  -- Reference to candidate
  candidate_id uuid not null references candidates(id) on delete cascade,

  -- Gaffe details
  title text not null,
  description text,
  statement text, -- the exact statement made
  context text, -- context or full story

  -- Metadata
  date_event timestamptz not null, -- when the gaffe happened
  date_published timestamptz, -- when it was published

  -- Source & tracking
  source_url text,
  source_name text, -- e.g., "Poder360", "Twitter", "TSE", etc.

  -- Status & categorization
  status varchar(50) default 'reported', -- reported, verified, disputed, resolved, retracted
  category varchar(50), -- e.g., 'contradiction', 'controversial', 'false_statement', 'legal_issue', 'ethical'

  -- Impact metrics
  viral_score integer, -- 0-100 based on reach/importance (optional)
  fact_checked boolean default false,
  fact_check_url text,
  fact_check_result varchar(50), -- 'true', 'false', 'misleading', 'partially_true'

  -- Audit trail
  created_by text, -- who added this (manual or agent name)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Soft delete
  deleted_at timestamptz
);

-- Indexes for performance
create index idx_candidate_gaffes_candidate_id on candidate_gaffes(candidate_id);
create index idx_candidate_gaffes_date_event on candidate_gaffes(date_event desc);
create index idx_candidate_gaffes_status on candidate_gaffes(status);
create index idx_candidate_gaffes_category on candidate_gaffes(category);
create index idx_candidate_gaffes_created_at on candidate_gaffes(created_at desc);
create index idx_candidate_gaffes_candidate_status on candidate_gaffes(candidate_id, status);

-- Enable RLS
alter table candidate_gaffes enable row level security;

-- Policy: allow public read access
create policy "candidate_gaffes_readable"
  on candidate_gaffes for select
  using (deleted_at is null);

-- Policy: allow authenticated users to insert
create policy "candidate_gaffes_insertable"
  on candidate_gaffes for insert
  with check (auth.role() = 'authenticated');

-- Policy: allow users to update their own entries (if they have editor role)
create policy "candidate_gaffes_updatable"
  on candidate_gaffes for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Add updated_at trigger
create or replace function update_candidate_gaffes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger candidate_gaffes_updated_at_trigger
  before update on candidate_gaffes
  for each row
  execute function update_candidate_gaffes_updated_at();
