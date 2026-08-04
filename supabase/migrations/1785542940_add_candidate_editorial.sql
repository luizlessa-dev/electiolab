-- Add editorial content columns to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS editorial_bio TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS editorial_summary VARCHAR(160);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS editorial_published_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_editorial_published 
ON candidates(editorial_published_at DESC NULLS LAST) 
WHERE editorial_published_at IS NOT NULL;

-- Enable RLS if not already enabled
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Allow public read access to editorial content
CREATE POLICY "candidates_editorial_readable" ON candidates
  FOR SELECT USING (true);

-- Allow authenticated users (admin) to update editorial content
CREATE POLICY "candidates_editorial_updatable" ON candidates
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

-- Insert initial data for top 8 candidates (editorial_bio will be populated in next PR)
UPDATE candidates SET editorial_summary = NULL WHERE slug IN ('lula', 'tarcisio', 'flavio-bolsonaro', 'boulos', 'marina', 'datena', 'soraya', 'simone-tebet');