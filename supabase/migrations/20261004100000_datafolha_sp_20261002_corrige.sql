-- Corrige a Datafolha de SP de 02/10/2026 (SP-01367/2026), criada na mesma carga de 02/10 que
-- as de PE, MG e RJ (ver 20261003150000_datafolha_20261002_corrige_pe_mg_rj.sql), com o mesmo
-- defeito: so Tarcisio 56 e Haddad 37 (votos VALIDOS, e incompleta). A base usa votos TOTAIS.
--
-- Fonte: relatorio Datafolha de 02/10/2026 (campo 28-30/09, n=1.610, presencial), votos totais:
--   Tarcisio 50, Haddad 33, Carlos Machado 2, Vera Lucia 2, Vivian Mendes 2, Izadora Dias 1.
-- Brancos/nulos (7%) e indecisos (3%) nao sao candidatos na base.
--
-- Nao altera fieldwork_end/publication_date do poll (base: 01/10; Folha informa 28-30/09) —
-- fora do escopo desta correcao. Nunca apaga linha. STRICT: aborta se o poll ou algum
-- candidato nao resolver para exatamente 1 registro. Acentos na logica via U&.
--
-- Depois de aplicar: recalculate-averages e revalidar /candidato/[slug] dos candidatos de SP.

DO $$
DECLARE
  f record;
  v_poll uuid;
  v_election uuid;
  v_cand uuid;
  v_cur numeric;
  v_ins int := 0;
  v_upd int := 0;
BEGIN
  FOR f IN
    SELECT * FROM (VALUES
      ('SP-01367/2026', U&'Tarc\00edsio',        50::numeric),
      ('SP-01367/2026', 'Haddad',                 33),
      ('SP-01367/2026', 'Carlos Machado',          2),
      ('SP-01367/2026', U&'Vera L\00facia',        2),
      ('SP-01367/2026', 'Vivian Mendes',           2),
      ('SP-01367/2026', 'Izadora Dias',            1)
    ) AS t(tse, cand_name, pct)
  LOOP
    SELECT p.id, p.election_id INTO STRICT v_poll, v_election
    FROM polls p
    JOIN institutes i ON i.id = p.institute_id
    WHERE p.tse_registration = f.tse AND i.name = 'Datafolha';

    SELECT c.id INTO STRICT v_cand
    FROM candidates c
    WHERE c.election_id = v_election AND lower(c.name) = lower(f.cand_name);

    SELECT percentage INTO v_cur
    FROM poll_results WHERE poll_id = v_poll AND candidate_id = v_cand;

    IF NOT FOUND THEN
      INSERT INTO poll_results (poll_id, candidate_id, percentage)
      VALUES (v_poll, v_cand, f.pct);
      v_ins := v_ins + 1;
      RAISE NOTICE '% | % | inserido %', f.tse, f.cand_name, f.pct;
    ELSIF v_cur <> f.pct THEN
      UPDATE poll_results SET percentage = f.pct
      WHERE poll_id = v_poll AND candidate_id = v_cand;
      v_upd := v_upd + 1;
      RAISE NOTICE '% | % | % -> %', f.tse, f.cand_name, v_cur, f.pct;
    END IF;
  END LOOP;

  RAISE NOTICE 'Datafolha SP 02/10: % inserido(s), % atualizado(s) (esperado: 4 e 2)', v_ins, v_upd;
END $$;

-- Conferencia (esperado: 6 linhas, soma 90):
-- SELECT count(*) AS n, sum(pr.percentage) AS soma
-- FROM polls p
-- JOIN institutes i ON i.id = p.institute_id AND i.name = 'Datafolha'
-- JOIN poll_results pr ON pr.poll_id = p.id
-- WHERE p.tse_registration = 'SP-01367/2026';
