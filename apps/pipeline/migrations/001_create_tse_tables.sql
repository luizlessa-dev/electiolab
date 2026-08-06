-- Migration: Create TSE Integration Tables
-- Date: 2026-08-05
-- Purpose: Store candidate registry (DivulgaCandContas) and election results (TSE Resultados)

-- ============================================================================
-- 1. CANDIDATES TABLE (DivulgaCandContas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- TSE Fields
  tse_sequencial varchar(20),
  nome varchar(255) NOT NULL,
  nome_completo varchar(255),
  nome_urna varchar(30),
  numero varchar(10),

  -- Election Info
  cargo varchar(50) NOT NULL, -- presidente, governador, senador, deputado
  estado varchar(2) NOT NULL, -- UF
  municipio varchar(255),
  ano integer NOT NULL, -- election year

  -- Party Info
  partido varchar(255) NOT NULL,
  sigla_partido varchar(10) NOT NULL,
  coligacao varchar(255),

  -- Status
  situacao varchar(20), -- APTO, INAPTO, CASSADO, RENUNCIACAO
  condicao varchar(255),
  bens numeric(15,2),

  -- Audit
  source_tse_id varchar(255) UNIQUE, -- TSE candidate ID for deduplication
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  synced_at timestamp,

  CONSTRAINT candidates_valid_cargo CHECK (cargo IN ('presidente', 'governador', 'senador', 'deputado')),
  CONSTRAINT candidates_valid_estado CHECK (char_length(estado) = 2),
  CONSTRAINT candidates_valid_ano CHECK (ano >= 2000 AND ano <= 2100)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_candidates_cargo_estado_ano
  ON candidates (cargo, estado, ano);
CREATE INDEX IF NOT EXISTS idx_candidates_numero_ano
  ON candidates (numero, ano);
CREATE INDEX IF NOT EXISTS idx_candidates_tse_sequencial
  ON candidates (tse_sequencial, ano);
CREATE INDEX IF NOT EXISTS idx_candidates_estado
  ON candidates (estado);

-- Comentário da tabela
COMMENT ON TABLE candidates IS 'Candidatos registrados no TSE via DivulgaCandContas API';
COMMENT ON COLUMN candidates.tse_sequencial IS 'ID sequencial do TSE para deduplicação';
COMMENT ON COLUMN candidates.source_tse_id IS 'ID único do TSE para tracking';

-- ============================================================================
-- 2. ELECTION RESULTS TABLE (TSE Resultados - Apuração)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.election_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Election Info
  cargo varchar(50) NOT NULL, -- presidente, governador, senador
  estado varchar(2), -- NULL para presidente (nacional)
  turno integer NOT NULL DEFAULT 1, -- 1 ou 2
  ano integer NOT NULL,

  -- Apuração Status
  data_apuracao timestamp NOT NULL,
  percentual_apuracao numeric(5,2) NOT NULL DEFAULT 0, -- 0-100
  secoes_apuradas integer NOT NULL DEFAULT 0,
  secoes_totais integer NOT NULL DEFAULT 0,

  -- Audit
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  synced_at timestamp,

  CONSTRAINT election_results_valid_cargo CHECK (cargo IN ('presidente', 'governador', 'senador')),
  CONSTRAINT election_results_valid_turno CHECK (turno IN (1, 2)),
  CONSTRAINT election_results_valid_ano CHECK (ano >= 2000 AND ano <= 2100),
  CONSTRAINT election_results_valid_percentual CHECK (percentual_apuracao >= 0 AND percentual_apuracao <= 100)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_election_results_cargo_estado_ano
  ON election_results (cargo, estado, ano);
CREATE INDEX IF NOT EXISTS idx_election_results_data_apuracao
  ON election_results (data_apuracao DESC);
CREATE INDEX IF NOT EXISTS idx_election_results_cargo_turno_ano
  ON election_results (cargo, turno, ano);

COMMENT ON TABLE election_results IS 'Resultados de eleição em tempo real (apuração) do TSE';

-- ============================================================================
-- 3. ELECTION RESULTS CANDIDATES (Vote tallies per result)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.election_results_candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES election_results(id) ON DELETE CASCADE,

  -- Candidate Info
  numero_candidato varchar(10) NOT NULL,
  nome_candidato varchar(255) NOT NULL,
  sigla_partido varchar(10) NOT NULL,

  -- Vote Count
  votos_nominais integer NOT NULL DEFAULT 0,
  votos_legenda integer DEFAULT 0, -- só para deputado
  percentual numeric(5,2) DEFAULT 0, -- percentual do total

  -- Audit
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  CONSTRAINT election_results_candidatos_valid_votos CHECK (votos_nominais >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_election_results_candidatos_result_id
  ON election_results_candidatos (result_id);
CREATE INDEX IF NOT EXISTS idx_election_results_candidatos_numero
  ON election_results_candidatos (numero_candidato);

COMMENT ON TABLE election_results_candidatos IS 'Votos por candidato em cada resultado de eleição';

-- ============================================================================
-- 4. DATA SOURCE AUDIT (track credibility & refresh times)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.data_source_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  source_type varchar(50) NOT NULL, -- 'tse_candidatos', 'tse_resultados', 'datafolha', etc
  cargo varchar(50),
  estado varchar(2),
  ano integer,

  -- Sync Info
  total_records integer,
  inserted_count integer DEFAULT 0,
  updated_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  errors text, -- JSON array of error messages

  -- Credibility
  credibility_score integer DEFAULT 5, -- 0-10
  refresh_interval_hours integer DEFAULT 24,

  -- Timestamps
  synced_at timestamp NOT NULL DEFAULT now(),
  next_sync_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),

  CONSTRAINT data_source_audit_valid_score CHECK (credibility_score >= 0 AND credibility_score <= 10)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_data_source_audit_source_type_date
  ON data_source_audit (source_type, synced_at DESC);

COMMENT ON TABLE data_source_audit IS 'Auditoria de fontes de dados com credibilidade e histórico de sync';

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS for audit trail
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_results_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_source_audit ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Enable read access for all users" ON candidates
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON election_results
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON election_results_candidatos
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON data_source_audit
  FOR SELECT USING (true);

-- Write access only for authenticated service role
CREATE POLICY "Enable insert for service role" ON candidates
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Enable update for service role" ON candidates
  FOR UPDATE USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON election_results
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Enable update for service role" ON election_results
  FOR UPDATE USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON election_results_candidatos
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Enable update for service role" ON election_results_candidatos
  FOR UPDATE USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON data_source_audit
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ============================================================================
-- 6. UTILITY FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_election_results_updated_at
  BEFORE UPDATE ON election_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_election_results_candidatos_updated_at
  BEFORE UPDATE ON election_results_candidatos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Candidatos por eleição
CREATE OR REPLACE VIEW candidates_by_election AS
  SELECT
    ano,
    cargo,
    estado,
    COUNT(*) as total_candidatos,
    COUNT(DISTINCT partido) as partidos_unicos,
    MAX(updated_at) as ultima_atualizacao
  FROM candidates
  GROUP BY ano, cargo, estado;

-- View: Resultados com cobertura
CREATE OR REPLACE VIEW election_results_coverage AS
  SELECT
    er.ano,
    er.cargo,
    er.estado,
    er.turno,
    COUNT(erc.id) as candidatos,
    SUM(erc.votos_nominais) as total_votos,
    MAX(er.percentual_apuracao) as percentual_final
  FROM election_results er
  LEFT JOIN election_results_candidatos erc ON er.id = erc.result_id
  GROUP BY er.ano, er.cargo, er.estado, er.turno;

-- ============================================================================
-- 8. GRANTS FOR API USAGE
-- ============================================================================
GRANT SELECT ON candidates TO authenticated;
GRANT SELECT ON election_results TO authenticated;
GRANT SELECT ON election_results_candidatos TO authenticated;
GRANT SELECT ON data_source_audit TO authenticated;
GRANT SELECT ON candidates_by_election TO authenticated;
GRANT SELECT ON election_results_coverage TO authenticated;

-- ============================================================================
-- 9. INITIAL DATA / SEED
-- ============================================================================

-- Insert audit record for first sync
INSERT INTO data_source_audit (
  source_type,
  credibility_score,
  refresh_interval_hours,
  total_records
) VALUES
  ('tse_candidatos', 9, 168, 0),
  ('tse_resultados', 10, 0, 0)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration End
-- ============================================================================
-- Run this migration in Supabase:
-- 1. Go to SQL Editor in Supabase dashboard
-- 2. Create new query
-- 3. Paste this entire script
-- 4. Click "Run"
-- 5. Verify all tables created successfully
