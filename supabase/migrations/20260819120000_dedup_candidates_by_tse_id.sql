-- Migration: Deduplicação de candidatos por tse_id
-- Data: 2026-08-19
-- Contexto: 9 grupos de candidatos duplicados por tse_id (11 linhas excedentes).
--
-- Diagnóstico ORIGINAL (2026-08-19) — ver CORREÇÃO 2026-08-31 abaixo:
-- - Grupos 1-3 (Ratinho, Lula, Bolsonaro): mesma pessoa em 1º+2º turno da MESMA eleição.
--   São genuinamente duplicatas — deveriam ser 1 registro por eleição.
--
-- ════════════════════════════════════════════════════════════════════════════
-- CORREÇÃO 2026-08-31 — o diagnóstico dos grupos 1-3 estava ERRADO.
-- ════════════════════════════════════════════════════════════════════════════
-- Esta migration NUNCA foi aplicada no banco remoto (xoxztzologqeqbajlhya):
-- em 2026-08-31 `candidates_duplicates_audit` não existe e `candidates` não tem
-- a coluna `is_duplicate_of`. Corrigindo o texto antes que alguém a aplique ou
-- execute o "próximo passo" descrito no fim do arquivo — que corromperia dados.
--
-- 1º turno e 2º turno são eleições DIFERENTES nesta base, não duplicatas:
--
--   elections '2a8761ab-9dc0-4436-8682-4095c0b7f014'  Presidencial 2022 - 1º Turno
--             year=2022 round=1 election_date=2022-10-02  → 18 polls, 5 candidatos
--   elections '7bacada6-f9ea-4665-b0a4-0ee08d9d35fc'  Presidencial 2022 - 2º Turno
--             year=2022 round=2 election_date=2022-10-30  → 11 polls, 2 candidatos
--
-- São disputas distintas, com campos de candidatos distintos e números que não
-- se misturam (medido em 2026-08-31, poll_results):
--
--   Lula       1º turno n=18  42,2–50,0  média 45,3   |  2º turno n=11  47,0–54,0  média 51,9
--   Bolsonaro  1º turno n=18  31,0–39,4  média 34,1   |  2º turno n=11  42,0–49,6  média 47,1
--
-- Ciro, Simone Tebet e Soraya só existem no 1º turno — o campo do 2º turno tem
-- só dois nomes. Somar as 18 + 11 pesquisas numa linha só produziria uma média
-- ponderada que não descreve eleição nenhuma. As janelas de campo nem se tocam
-- (1º: 2022-08-17 a 2022-10-01; 2º: 2022-10-13 a 2022-10-29).
--
-- election_results confirma que cada linha guarda o resultado do SEU turno:
--   1º turno: Lula 48,43% / Bolsonaro 43,2% (ambos "2º turno" como desfecho)
--   2º turno: Lula 50,9% "Eleito" / Bolsonaro 49,1% "Não eleito"
-- Fundir as linhas obrigaria a jogar fora metade desses resultados.
--
-- weighted_averages já está correto: é chaveado por (election_id, candidate_id),
-- então cada turno tem sua própria média (46,7/34,5 no 1º; 51,8/47,3 no 2º).
-- Nada a recalcular.
--
-- CRITÉRIO: duplicata de candidato é mesma pessoa (tse_id) na MESMA eleição —
-- comparar year + round + type + state da election, nunca só tse_id+type.
--
-- O que sobra de problema real NÃO é deduplicação, é rota: as linhas de 2º turno
-- de 2022 estão com slug NULL e portanto não têm página; /candidato/bolsonaro
-- resolve para a linha de 1º turno de 2022 (única com slug) e mostra as 18
-- pesquisas daquele turno. Preencher slug nessas linhas não resolve sozinho —
-- getCandidateBySlug (src/lib/queries.ts) desempata por year DESC, round DESC,
-- então dar "bolsonaro" à linha de 2º turno só trocaria qual turno aparece.
-- Expor os dois turnos exige decisão de rota (ex.: /candidato/<slug>/<ano>-<turno>),
-- fora do escopo desta migration.
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

-- Grupo 1: Ratinho — REGISTRO OBSOLETO (ver CORREÇÃO no topo).
-- Em 2026-08-31 sobraram 2 linhas, ambas de 2026 e ambas com slug:
--   11427a3a (Ratinho, slug 'ratinho-jr', Presidencial 2026 - 1º Turno)
--   16f31ff1 (Ratinho Junior, slug 'ratinho-junior', Governador Paraná 2026)
-- A terceira (1804c6ba) não existe mais. Cargos distintos no mesmo ciclo =
-- LEGÍTIMO, igual aos grupos 4-9. Nada a fazer.
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
  true,  -- diferentes eleições — 1º e 2º turno são elections separadas
  true,  -- diferentes turnos (2022 1º, 2022 2º)
  'CORRIGIDO 2026-08-31: NÃO são duplicatas. Três eleições distintas ' ||
  '(2022 1º turno, 2022 2º turno, 2026 1º turno), cada uma com seu campo de ' ||
  'candidatos, suas pesquisas e seu election_results. Manter as três linhas ' ||
  'separadas. O que falta é rota para os turnos de 2022, não merge.'
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
  true,   -- CORRIGIDO: 1º e 2º turno são elections separadas, não "mesma eleição"
  true,   -- diferentes turnos (1º e 2º)
  'CORRIGIDO 2026-08-31: NÃO são duplicatas. 415fbb48 é o 1º turno de 2022 ' ||
  '(18 pesquisas, média 34,1%, resultado 43,2%) e 2e9fe256 é o 2º turno ' ||
  '(11 pesquisas, média 47,1%, resultado 49,1%). Disputas diferentes. ' ||
  'Manter as duas linhas separadas.'
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
-- 2. Próximas ações — CANCELADAS em 2026-08-31 para os grupos 1-3.
--    O plano abaixo (merge + redirecionar poll_results) foi escrito sob o
--    diagnóstico errado de que 1º e 2º turno eram a mesma eleição. NÃO executar:
--      x) Validar grupos 1-3 — feito: não são duplicatas, ver CORREÇÃO no topo
--      x) Merge de candidates_assets/social_media do "duplicate" p/ canonical
--      x) Redirecionar poll_results.candidate_id do "duplicate" p/ canonical
--      x) UPDATE candidates SET is_duplicate_of = ... nos grupos 1-3
--    Não há grupo de duplicata real conhecido hoje: 1-3 são turnos/cargos
--    distintos e 4-9 já estavam marcados como legítimos.
--
-- 3. Grupos 4-9 (Governador+Senador 2026) são legítimos — deixar como está.
--    (Não marcados como duplicatas nesta migration.)
--    Grupos 1-3 também são legítimos, pelo mesmo motivo estendido a turnos:
--    eleição diferente = linha diferente.
--
-- 4. A coluna is_duplicate_of permite queries como:
--    SELECT * FROM candidates WHERE is_duplicate_of IS NULL
--    pra filtrar duplicatas sem perder relacionamentos.

grant select on candidates_duplicates_audit to anon, authenticated;
