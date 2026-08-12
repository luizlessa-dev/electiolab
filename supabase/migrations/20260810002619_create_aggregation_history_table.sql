-- Wave 4 Phase 3: Aggregation History Table
-- Stores daily snapshots of aggregated poll results for historical tracking

CREATE TABLE IF NOT EXISTS aggregation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location
  state VARCHAR(2) NOT NULL,
  position VARCHAR(20) NOT NULL CHECK (position IN ('governador', 'senador', 'presidencial')),

  -- Snapshot data
  snapshot_date DATE NOT NULL,
  candidates_data JSONB NOT NULL, -- Array of {name, party, percentage, confidence}
  quality_metrics JSONB NOT NULL, -- {dataQualityScore, coverageScore, conflictScore}
  sample_size INTEGER DEFAULT 2000,

  -- Metadata
  source VARCHAR(20) DEFAULT 'live' CHECK (source IN ('live', 'cron', 'manual')),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_snapshot UNIQUE (state, position, snapshot_date)
);

-- Indexes for common queries
CREATE INDEX idx_aggregation_history_state_position ON aggregation_history(state, position);
CREATE INDEX idx_aggregation_history_snapshot_date ON aggregation_history(snapshot_date DESC);
CREATE INDEX idx_aggregation_history_state_position_date ON aggregation_history(state, position, snapshot_date DESC);
CREATE INDEX idx_aggregation_history_source ON aggregation_history(source);

-- RLS: this table is only ever accessed via the backend's service-role
-- client (src/lib/supabase/admin.ts), which bypasses RLS. Enable RLS with
-- zero policies — a hard default-deny for the anon/authenticated REST API.
ALTER TABLE aggregation_history ENABLE ROW LEVEL SECURITY;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_aggregation_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER aggregation_history_updated_at
  BEFORE UPDATE ON aggregation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_aggregation_history_updated_at();

-- Partitioning recommendation (optional, for large data):
-- ALTER TABLE aggregation_history PARTITION BY RANGE (snapshot_date);
-- This helps with performance when dealing with years of data
