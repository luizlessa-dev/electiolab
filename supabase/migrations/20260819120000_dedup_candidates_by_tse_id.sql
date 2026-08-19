-- Migration: Deduplicação de candidatos por tse_id
-- Data: 2026-08-19
-- Contexto: 9 grupos de candidatos duplicados por tse_id (11 linhas excedentes).
--
-- Diagnóstico:
-- - Grupos 1-3 (Ratinho, Lula, Bolsonaro): mesma pessoa em 1º+2º turno da MESMA eleição.
--   São genuinamente duplicatas — deveriam ser 1 registro por eleição.
--
-- - Grupos 4-9 (Governadores/Senadores 2026): mesma pessoa, CARGOS DIFERENTES.
--   Exemplo: Carlos Brandão é candidato a governador E senador do Maranhão 2026.
--   Legítimo — mesma pessoa (mesmo tse_id), eleições distintas → records separados esperados.
--
-- Ação: criar helper table documentando duplicatas + marcar que não há rollback automático
-- sem revisão manual. Soft-delete com flag, nunca hard-delete.

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 1: Criar helper table documentando duplicatas
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists candidates_duplicates_audit (
  id uuid primary key default gen_random_uuid(),
  tse_id text not null,
  group_count integer not null,
  duplicate_ids uuid[] not null,
  primary_id uuid not null,
  is_valid_different_elections boolean not null default false,
  is_valid_different_rounds boolean not null default false,
  notes text,
  marked_for_review_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  action_taken text,
  created_at timestamptz default now()
);

create index if not exists idx_dup_audit_tse_id on candidates_duplicates_audit(tse_id);
create index if not exists idx_dup_audit_primary_id on candidates_duplicates_audit(primary_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 2: Registrar os 9 grupos detectados
-- ────────────────────────────────────────────────────────────────────────────

-- Grupo 1: Ratinho com tse_id em 3 eleições diferentes (pres 1º, pres 2º, gov PR)
insert into candidates_duplicates_audit (
  tse_id, group_count, duplicate_ids, primary_id,
  is_valid_different_elections, is_valid_different_rounds, notes
) values (
  '160001614467', 3,
  ARRAY[
    '1804c6ba-5bee-4b76-adc9-865e8e67e522'::uuid,  -- Ratinho Junior (2º turno, inativo)
    '16f31ff1-3541-4f52-99bf-6cfff9f04179'::uuid   -- Ratinho Junior (gov PR ativo)
  ],
  '11427a3a-e8fd-4675-87c2-678d3aea5220'::uuid,   -- Ratinho (pres 1º turno, ativo)
  true,  -- diferentes eleições (pres 1º, pres 2º, gov PR)
  true,  -- diferentes turnos (1º e 2º turno)
  'Candidato a presidencial (1º+2º turno) e governador PR. Há 1 registro inativo (2º turno). ' ||
  'Investigar: 2º turno deve referenciar 1º turno, não criar record novo; gov PR é legítimo.'
);

-- Grupo 2: Lula com tse_id em 3 eleições diferentes (pres 2022 1º, pres 2022 2º, pres 2026 1º)
insert into candidates_duplicates_audit (
  tse_id, group_count, duplicate_ids, primary_id,
  is_valid_different_elections, is_valid_different_rounds, notes
) values (
  '280001607829', 3,
  ARRAY[
    '9bbc398c-c7c3-4218-8d68-e864670a2024'::uuid,  -- Lula (pres 2022 1º turno)
    'b6a110df-3f31-4103-a8af-526082d5ca54'::uuid   -- Lula (pres 2022 2º turno)
  ],
  '0d24e554-2da5-4806-831f-73a4f5e7b464'::uuid,   -- Lula (pres 2026 1º turno, ativo)
  true,  -- diferentes eleições
  true,  -- diferentes turnos (2022 1º, 2022 2º)
  'Candidato presidencial em 2022 (1º+2º turno) e 2026. Investigar: 2º turno de 2022 ' ||
  'deve referenciar 1º turno, não criar record novo.'
);

-- Grupo 3: Bolsonaro com tse_id em 2 eleições diferentes (ambas 2022, 1º e 2º turno)
insert into candidates_duplicates_audit (
  tse_id, group_count, duplicate_ids, primary_id,
  is_valid_different_elections, is_valid_different_rounds, notes
) values (
  '280001618036', 2,
  ARRAY[
    '415fbb48-1ddd-464f-9b3c-0c76446d2873'::uuid  -- Bolsonaro (pres 2022 1º turno)
  ],
  '2e9fe256-caf1-41fd-82cf-5266e12637e8'::uuid,   -- Bolsonaro (pres 2022 2º turno)
  false,  -- mesma eleição (2022), diferentes turnos apenas
  true,   -- diferentes turnos (1º e 2º)
  'Candidato presidencial 2022 em 2º turno. Há record duplicate do 1º turno. ' ||
  '2º turno deve referenciar o 1º turno, não ser record separado.'
);

-- Grupos 4-9: Governador + Senador mesma eleição (LEGÍTIMO — cargos distintos)
insert into candidates_duplicates_audit (
  tse_id, group_count, duplicate_ids, primary_id,
  is_valid_different_elections, is_valid_different_rounds, notes
) values (
  '100001667487', 2,
  ARRAY[
    '6f4dc812-589f-4d57-af4a-ba9c687d0fbd'::uuid  -- Carlos Brandão (Senador MA 2026)
  ],
  '58d505ac-5f96-43c0-90d5-70af3c719ca6'::uuid,   -- Carlos Brandão (Gov MA 2026)
  true,  -- diferentes eleições (Governador vs Senador)
  false, -- não há turnos diferentes, mesma eleição tipo
  'Carlos Brandão candidato simultaneamente a governador e senador do Maranhão 2026. ' ||
  'LEGÍTIMO — cada cargo tem sua eleição. Manter ambos os records.'
);

insert into candidates_duplicates_audit (
  tse_id, group_count, duplicate_ids, primary_id,
  is_valid_different_elections, is_valid_different_rounds, notes
) values (
  '20001695808', 2,
  ARRAY[
    'f9eae664-8f3d-4ed8-848f-a124eadce132'::uuid  -- Rodrigo Cunha (Gov AL 2026)
  ],
  '8505c7d8-ec8c-4892-81c0-84862f981d18'::uuid,   -- Rodrigo Cunha (Senador AL 2026)
  true, false,
  'Rodrigo Cunha candidato a governador e senador de Alagoas 2026. LEGÍTIMO.'
);

insert into candidates_duplicates_audit (
  tse_id, group_count, duplicate_ids, primary_id,
  is_valid_different_elections, is_valid_different_rounds, notes
) values (
  '140001611661', 2,
  ARRAY[
    '05b35876-5eee-48dd-adec-469049baaca5'::uuid  -- Beto Faro (Senador PA 2026)
  ],
  '3d1747f0-eeed-44a4-a824-10173b93c5fd'::uuid,   -- Beto Faro (Gov PA 2026)
  true, false,
  'Beto Faro candidato a governador e senador do Pará 2026. LEGÍTIMO.'
);

insert into candidates_duplicates_audit (
  tse_id, group_count, duplicate_ids, primary_id,
  is_valid_different_elections, is_valid_different_rounds, notes
) values (
  '10001642333', 2,
  ARRAY[
    '1b906751-d1c4-44da-95be-3eead03b9339'::uuid  -- Jessica Sales (Senador AC 2026)
  ],
  '31e56ef9-6f3a-4e54-bb9b-c1fa7088b3c9'::uuid,   -- Jessica Sales (Gov AC 2026)
  true, false,
  'Jessica Sales candidata a governadora e senadora do Acre 2026. LEGÍTIMO.'
);

insert into candidates_duplicates_audit (
  tse_id, group_count, duplicate_ids, primary_id,
  is_valid_different_elections, is_valid_different_rounds, notes
) values (
  '60001612926', 2,
  ARRAY[
    'e3ec81e0-eb3b-40d4-b5c0-c8054b3e0c0f'::uuid  -- Roberto Claudio (Gov CE 2026)
  ],
  '965ca1b8-357f-480f-9369-e4607b52bca6'::uuid,   -- Roberto Claudio (Senador CE 2026)
  true, false,
  'Roberto Claudio candidato a governador e senador do Ceará 2026. LEGÍTIMO.'
);

insert into candidates_duplicates_audit (
  tse_id, group_count, duplicate_ids, primary_id,
  is_valid_different_elections, is_valid_different_rounds, notes
) values (
  '200001603037', 2,
  ARRAY[
    '519e05b4-cbe8-454d-b0ef-2bf0b7faa17b'::uuid  -- Rogerio Marinho (Gov RN 2026)
  ],
  'aae4d66a-b685-456e-bddb-35c24215192a'::uuid,   -- Rogerio Marinho (Senador RN 2026)
  true, false,
  'Rogério Marinho candidato a governador e senador do Rio Grande do Norte 2026. LEGÍTIMO.'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 3: Adicionar coluna de flag soft-delete para futuros duplicatas
-- ────────────────────────────────────────────────────────────────────────────

alter table candidates add column if not exists is_duplicate_of uuid
  references candidates(id) on delete set null;

create index if not exists idx_candidates_is_duplicate_of
  on candidates (is_duplicate_of)
  where is_duplicate_of is not null;

comment on column candidates.is_duplicate_of is
  'Se não null, este candidato é duplicata de outro. Usar para soft-delete sem perder foreign keys.';

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 4: Trigger para permitir queries que evitem duplicatas automaticamente
-- ────────────────────────────────────────────────────────────────────────────

create or replace function get_canonical_candidate(candidate_id_param uuid)
returns uuid as $$
  declare
    canonical_id uuid;
  begin
    -- Se o candidato é marcado como duplicata, retornar o canonical
    select is_duplicate_of into canonical_id from candidates
    where id = candidate_id_param;

    if canonical_id is not null then
      return get_canonical_candidate(canonical_id);  -- Recursivo pra chains
    end if;

    return candidate_id_param;
  end;
$$ language plpgsql immutable;

-- ────────────────────────────────────────────────────────────────────────────
-- Passo 5: Rollback — função para reverter a marcação
-- ────────────────────────────────────────────────────────────────────────────

-- Se esta migration for aplicada e depois precisar reverter:
-- - UPDATE candidates SET is_duplicate_of = NULL WHERE id IN (lista dos duplicates)
-- - DELETE FROM candidates_duplicates_audit (todos)

-- ────────────────────────────────────────────────────────────────────────────
-- NOTAS IMPORTANTES
-- ────────────────────────────────────────────────────────────────────────────
-- 1. NÃO fazer DELETE imediato. Esta migration só marca e documenta.
--
-- 2. Próximas ações (manual, fora desta migration):
--    a) Validar grupos 1-3 (turnos duplicados) — decidir qual record manter
--    b) Merge de dados de candidates_assets, candidate_social_media, etc
--       do duplicate para o canonical
--    c) Redirecionar poll_results.candidate_id do duplicate para canonical
--    d) Depois de confirmado, marcar: UPDATE candidates SET is_duplicate_of = ...
--       onde é_candidato duplicado; NÃO deletar.
--
-- 3. Grupos 4-9 (Governador+Senador 2026) são legítimos — deixar como está.
--    (Não marcados como duplicatas nesta migration.)
--
-- 4. A coluna is_duplicate_of permite queries como:
--    SELECT * FROM candidates WHERE is_duplicate_of IS NULL
--    pra filtrar duplicatas sem perder relacionamentos.

grant select on candidates_duplicates_audit to anon, authenticated;
