-- Audit table for institute reliability tracking (2026-09-12)
-- Stores judicial suspensions, fines, media criticism, and reliability assessment
-- Based on comprehensive audit of TOP 10 institutes with highest gap

create table if not exists institute_reliability_audit (
  id uuid primary key default gen_random_uuid(),

  -- Institute identification
  institute_id uuid not null references institutes(id) on delete cascade,

  -- Audit date and source
  audit_date date not null default current_date,
  audit_source text not null, -- 'judicial_records', 'media_analysis', 'methodology_review'

  -- Core metrics
  reliability_stars integer not null default 3 check (reliability_stars >= 1 and reliability_stars <= 5),
  -- 5 = highly reliable, 1 = highly suspicious

  suspensions_count integer not null default 0,
  suspensions_states text[], -- array of state codes where suspended
  fines_total_amount_brl numeric(12, 2), -- total fines in BRL

  -- Detailed issues
  key_issues text[] not null, -- array of documented issues
  media_criticism text, -- summary of media coverage

  -- Assessment
  recommendation text not null check (recommendation in (
    'NÃO USAR',
    'NÃO USAR - Grave',
    'USAR COM CAUTELA',
    'USAR',
    'USAR - Recomendado'
  )),

  recommendation_reason text not null,

  -- Context
  notes text,
  audit_url text, -- link to investigation source

  -- Versioning
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text, -- 'claude-code' for automated audits

  -- Prevent duplicate audits for same institute on same date
  unique (institute_id, audit_date)
);

-- Indexes for quick lookup
create index institute_reliability_audit_institute_idx
  on institute_reliability_audit (institute_id);

create index institute_reliability_audit_date_idx
  on institute_reliability_audit (audit_date desc);

create index institute_reliability_audit_stars_idx
  on institute_reliability_audit (reliability_stars);

comment on table institute_reliability_audit is
  'Comprehensive reliability audit data for polling institutes. Tracks judicial suspensions, fines, media criticism, and provides reliability stars (1-5 scale). Updated periodically via judicial records review and media monitoring.';

comment on column institute_reliability_audit.reliability_stars is
  'Reliability assessment: 5 = highly reliable, 4 = reliable, 3 = neutral/razoável, 2 = suspicious, 1 = highly suspicious/fraud risk. Based on suspensions, fines, methodology issues, media criticism.';

comment on column institute_reliability_audit.suspensions_states is
  'Array of Brazilian state abbreviations where this institute had polls suspended in current election cycle.';

comment on column institute_reliability_audit.recommendation is
  'Actionable recommendation for using this institute: NÃO USAR (do not use), USAR COM CAUTELA (use with caution), USAR (use), USAR - Recomendado (recommended for use).';

-- View for current reliability status per institute
create or replace view institute_reliability_current as
select
  i.id as institute_id,
  i.name as institute_name,
  i.slug as institute_slug,
  ira.reliability_stars,
  ira.suspensions_count,
  ira.recommendation,
  ira.audit_date,
  ira.recommendation_reason,
  array_length(ira.key_issues, 1) as issues_count
from institutes i
left join institute_reliability_audit ira on ira.institute_id = i.id
  and ira.audit_date = (
    select max(audit_date)
    from institute_reliability_audit
    where institute_id = i.id
  )
order by i.name;

comment on view institute_reliability_current is
  'Current reliability assessment for all institutes based on latest audit. Join with polls to filter by institute reliability before analysis.';
