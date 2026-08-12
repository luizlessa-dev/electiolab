-- Wave 4 Phase 1: Discrepancies Table
-- Stores all detected discrepancies from TSE sync and validation

CREATE TABLE IF NOT EXISTS discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  state VARCHAR(2) NOT NULL,
  position VARCHAR(20) NOT NULL,
  candidate_name VARCHAR(255) NOT NULL,

  -- Classification
  type VARCHAR(50) NOT NULL CHECK (type IN ('missing_in_research', 'missing_in_tse', 'name_mismatch', 'status_change')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),

  -- Details
  details TEXT NOT NULL,
  tse_data JSONB,
  research_data JSONB,

  -- Resolution
  resolution VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (resolution IN ('verified', 'dismissed', 'escalated', 'pending')),
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT unique_discrepancy UNIQUE (state, position, candidate_name, type)
);

-- Indexes
CREATE INDEX idx_discrepancies_state ON discrepancies(state);
CREATE INDEX idx_discrepancies_position ON discrepancies(position);
CREATE INDEX idx_discrepancies_severity ON discrepancies(severity);
CREATE INDEX idx_discrepancies_type ON discrepancies(type);
CREATE INDEX idx_discrepancies_resolution ON discrepancies(resolution);
CREATE INDEX idx_discrepancies_created_at ON discrepancies(created_at DESC);
CREATE INDEX idx_discrepancies_candidate ON discrepancies(candidate_name);
CREATE INDEX idx_discrepancies_state_position ON discrepancies(state, position);

-- RLS: this table is only ever accessed via the backend's service-role
-- client (src/lib/supabase/admin.ts), which bypasses RLS. There is no
-- end-user/session-based access model in this app (no `users`/`role`
-- table), so we enable RLS with zero policies — a hard default-deny for
-- the anon/authenticated REST API — rather than modeling permissions
-- that don't exist yet.
ALTER TABLE discrepancies ENABLE ROW LEVEL SECURITY;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discrepancies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER discrepancies_updated_at
  BEFORE UPDATE ON discrepancies
  FOR EACH ROW
  EXECUTE FUNCTION update_discrepancies_updated_at();
