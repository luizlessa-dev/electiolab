-- Enable RLS on polls and weighted_averages tables
-- Strategy: Public read access, restricted write access

-- 1. Enable RLS on polls table
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- 2. Create public read policy for polls
CREATE POLICY "polls_read_public" ON polls
  FOR SELECT
  USING (true);

-- 3. Create write policy for polls (authenticated users with admin role or service_role)
CREATE POLICY "polls_write_authenticated" ON polls
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "polls_write_service_role" ON polls
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 4. Update policy for polls (admin/service_role only)
CREATE POLICY "polls_update_authenticated" ON polls
  FOR UPDATE
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "polls_update_service_role" ON polls
  FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

-- 5. Delete policy for polls (admin/service_role only)
CREATE POLICY "polls_delete_authenticated" ON polls
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "polls_delete_service_role" ON polls
  FOR DELETE
  USING (auth.role() = 'service_role');

-- 6. Enable RLS on weighted_averages table
ALTER TABLE weighted_averages ENABLE ROW LEVEL SECURITY;

-- 7. Create public read policy for weighted_averages
CREATE POLICY "weighted_averages_read_public" ON weighted_averages
  FOR SELECT
  USING (true);

-- 8. Create write policy for weighted_averages (authenticated users with admin role or service_role)
CREATE POLICY "weighted_averages_write_authenticated" ON weighted_averages
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "weighted_averages_write_service_role" ON weighted_averages
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 9. Update policy for weighted_averages (admin/service_role only)
CREATE POLICY "weighted_averages_update_authenticated" ON weighted_averages
  FOR UPDATE
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "weighted_averages_update_service_role" ON weighted_averages
  FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

-- 10. Delete policy for weighted_averages (admin/service_role only)
CREATE POLICY "weighted_averages_delete_authenticated" ON weighted_averages
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "weighted_averages_delete_service_role" ON weighted_averages
  FOR DELETE
  USING (auth.role() = 'service_role');

-- 11. Create audit log table for tracking unauthorized access attempts
CREATE TABLE IF NOT EXISTS auth_failure_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  method text NOT NULL,
  ip_address inet NOT NULL,
  user_id uuid,
  status_code integer NOT NULL,
  error_message text,
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  user_agent text
);

-- Enable RLS on audit log (only service_role can write/read)
ALTER TABLE auth_failure_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_failure_logs_service_role_only" ON auth_failure_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- 12. Create index for efficient querying of recent failures
CREATE INDEX IF NOT EXISTS idx_auth_failure_logs_timestamp ON auth_failure_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auth_failure_logs_ip_endpoint ON auth_failure_logs(ip_address, endpoint, timestamp DESC);
