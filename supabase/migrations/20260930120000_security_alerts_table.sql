-- Security Alerts Table
-- Stores all security alerts that were generated and sent

CREATE TABLE IF NOT EXISTS security_alerts (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('auth_failures', 'rate_limit_abuse')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_security_alerts_type ON security_alerts(type);
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_resolved ON security_alerts(resolved);

-- Enable RLS
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can write
CREATE POLICY "security_alerts_service_role_write"
  ON security_alerts
  FOR INSERT
  WITH CHECK (true)
  USING (
    (auth.jwt() ->> 'role') = 'service_role'
    OR auth.role() = 'service_role'
  );

-- Policy: Only service_role and authenticated admins can read
CREATE POLICY "security_alerts_read"
  ON security_alerts
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'service_role'
    OR auth.role() = 'service_role'
    OR (
      auth.role() = 'authenticated'
      AND auth.uid() IN (
        SELECT id FROM auth.users
        WHERE raw_user_meta_data->>'role' = 'admin'
      )
    )
  );

-- Policy: Only service_role can update
CREATE POLICY "security_alerts_service_role_update"
  ON security_alerts
  FOR UPDATE
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
    OR auth.role() = 'service_role'
  );
