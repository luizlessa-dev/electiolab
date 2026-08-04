-- Create approval_polls table with proper structure and RLS
CREATE TABLE IF NOT EXISTS approval_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES institutes(id),
  institute_name VARCHAR(255) NOT NULL,
  subject_label VARCHAR(255) NOT NULL,
  subject_slug VARCHAR(255) NOT NULL,
  office VARCHAR(100) NOT NULL,
  scope VARCHAR(100) NOT NULL DEFAULT 'nacional',
  metric VARCHAR(50) NOT NULL,
  publication_date DATE NOT NULL,
  fieldwork_start DATE,
  fieldwork_end DATE,
  sample_size INTEGER,
  margin_of_error VARCHAR(10),
  methodology VARCHAR(100),
  tse_registration VARCHAR(255),
  source_url TEXT,
  pct_otimo NUMERIC(5,2),
  pct_bom NUMERIC(5,2),
  pct_regular NUMERIC(5,2),
  pct_ruim NUMERIC(5,2),
  pct_pessimo NUMERIC(5,2),
  pct_aprova NUMERIC(5,2),
  pct_desaprova NUMERIC(5,2),
  pct_rejeita NUMERIC(5,2),
  pct_nsnr NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_approval_polls_subject_slug ON approval_polls(subject_slug);
CREATE INDEX IF NOT EXISTS idx_approval_polls_metric ON approval_polls(metric);
CREATE INDEX IF NOT EXISTS idx_approval_polls_publication_date ON approval_polls(publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_approval_polls_institute_id ON approval_polls(institute_id);

-- Enable RLS
ALTER TABLE approval_polls ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "approval_polls_readable" ON approval_polls
  FOR SELECT USING (true);

-- Allow authenticated admins to insert/update
CREATE POLICY "approval_polls_editable_by_admin" ON approval_polls
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      auth.email() = 'admin@electiolab.com'
      OR auth.email() = 'luiz@gastronomizae.com'
    )
  );

CREATE POLICY "approval_polls_updatable_by_admin" ON approval_polls
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (
      auth.email() = 'admin@electiolab.com'
      OR auth.email() = 'luiz@gastronomizae.com'
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      auth.email() = 'admin@electiolab.com'
      OR auth.email() = 'luiz@gastronomizae.com'
    )
  );

CREATE POLICY "approval_polls_deletable_by_admin" ON approval_polls
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
      auth.email() = 'admin@electiolab.com'
      OR auth.email() = 'luiz@gastronomizae.com'
    )
  );
