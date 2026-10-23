-- 2º turno de governador 2026 (25/10): elections round=2 + os 2 finalistas de cada UF.
--
-- UFs com 2º turno (apuração oficial TSE de 04/10, 100% das seções):
--   AC, AM, DF, ES, RJ, RN, TO.
-- Os outros 20 estados elegeram no 1º turno e não ganham election de 2º turno.
--
-- Mesmo padrão do presidencial: election própria (round=2), candidatos próprios
-- (copiados do 1º turno, mesmo CPF/tse_id/slug). 1º e 2º turno nunca se fundem.
-- Idempotente: pode rodar duas vezes sem duplicar nada.
--
-- Literais com acento escritos com escape Unicode (U&), por causa do pbcopy.
-- (\00ba = º)

begin;

-- 1) Elections de 2º turno ---------------------------------------------------
insert into public.elections (name, type, state, year, round, election_date, is_active)
values
  (U&'Governador Acre 2026 - 2\00ba Turno',       'governador', 'AC', 2026, 2, '2026-10-25', true),
  (U&'Governador Amazonas 2026 - 2\00ba Turno',   'governador', 'AM', 2026, 2, '2026-10-25', true),
  (U&'Governador DF 2026 - 2\00ba Turno',         'governador', 'DF', 2026, 2, '2026-10-25', true),
  (U&'Governador ES 2026 - 2\00ba Turno',         'governador', 'ES', 2026, 2, '2026-10-25', true),
  (U&'Governador RJ 2026 - 2\00ba Turno',         'governador', 'RJ', 2026, 2, '2026-10-25', true),
  (U&'Governador RN 2026 - 2\00ba Turno',         'governador', 'RN', 2026, 2, '2026-10-25', true),
  (U&'Governador Tocantins 2026 - 2\00ba Turno',  'governador', 'TO', 2026, 2, '2026-10-25', true)
on conflict (type, state, year, round) do nothing;

-- 2) Finalistas (identificados por tse_id do 1º turno) ----------------------
with finalistas(uf, tse_id) as (
  values
    ('AC', '10002544107'), -- Mailza Assis (PP)
    ('AC', '10002532492'), -- Alan Rick
    ('AM', '40002532272'), -- Omar Aziz (PSD)
    ('AM', '40002541626'), -- Maria do Carmo Seffair (PL)
    ('DF', '70002553055'), -- Celina Leao (PP)
    ('DF', '70002552496'), -- Leandro Grass
    ('ES', '80002552682'), -- Lorenzo Pazolini (Republicanos)
    ('ES', '80002552172'), -- Ricardo Ferraco (MDB)
    ('RJ', '190002542887'), -- Douglas Ruas (PL)
    ('RJ', '190002543380'), -- Eduardo Paes (PSD)
    ('RN', '200002535255'), -- Allyson Bezerra
    ('RN', '200002534001'), -- Cadu de Lula (PT)
    ('TO', '270002544599'), -- Professora Dorinha
    ('TO', '270002544544')  -- Vicentinho Junior (PSDB)
)
insert into public.candidates (
  name, full_name, party, coalition, number, photo_url, color, election_id,
  tse_id, is_active, slug, birth_date, profession, education, net_worth,
  current_position, current_term_start, current_term_end, bio,
  twitter_handle, instagram_handle, website_url, official_photo_url, cpf,
  tse_last_situation, tse_last_situation_year, tse_last_situation_detail,
  editorial_bio, editorial_summary, editorial_published_at
)
select
  c1.name, c1.full_name, c1.party, c1.coalition, c1.number, c1.photo_url, c1.color, e2.id,
  c1.tse_id, true, c1.slug, c1.birth_date, c1.profession, c1.education, c1.net_worth,
  c1.current_position, c1.current_term_start, c1.current_term_end, c1.bio,
  c1.twitter_handle, c1.instagram_handle, c1.website_url, c1.official_photo_url, c1.cpf,
  c1.tse_last_situation, c1.tse_last_situation_year, c1.tse_last_situation_detail,
  c1.editorial_bio, c1.editorial_summary, c1.editorial_published_at
from finalistas f
join public.elections e1
  on e1.type = 'governador' and e1.year = 2026 and e1.round = 1 and e1.state = f.uf
join public.candidates c1
  on c1.election_id = e1.id and c1.tse_id = f.tse_id
join public.elections e2
  on e2.type = 'governador' and e2.year = 2026 and e2.round = 2 and e2.state = f.uf
where not exists (
  select 1 from public.candidates x
  where x.election_id = e2.id and x.tse_id = f.tse_id
);

commit;

-- Conferência (esperado: 7 elections, 14 candidatos, 2 por UF):
-- select e.state, e.name, count(c.id) candidatos, string_agg(c.name, ' x ' order by c.name)
-- from public.elections e left join public.candidates c on c.election_id = e.id
-- where e.type = 'governador' and e.year = 2026 and e.round = 2
-- group by 1, 2 order by 1;
