-- Corrige as Datafolha de 02/10/2026 (PE, MG, RJ), criadas antes do ingest-manual.ts desta
-- rodada com poll_results incompletos ou na base errada. O ingest se recusa a mexer em poll
-- existente, por isso a correção vem por aqui.
--
--   PE (PE-06822/2026): completa Ivan Moraes e Renan.
--   MG (MG-09729/2026): estava em votos VALIDOS (49/20/13/5/5); a base usa votos TOTAIS.
--                       Troca pelos totais e completa os candidatos que faltavam.
--   RJ (RJ-02070/2026): completa Siri, Cyro Garcia, Juliete, Marinho, Busnello e Monteiro.
--                       Garotinho (7) ja esta no poll e nao e tocado.
--
-- Fonte: relatorios Datafolha de 02/10/2026 (campo 28/09-01/10), votos totais.
-- BRANCO/NULO e NAO SABE nao sao candidatos na base: ficam de fora, como no ingest.
--
-- Nunca apaga linha. Aborta (rollback do bloco inteiro) se algum poll ou candidato nao
-- resolver para exatamente 1 registro. Nomes com acento escritos via U& (literal acentuado
-- na logica corrompe ao colar no SQL Editor — ver pbcopy-sem-locale-corrompe-acentos).
--
-- Depois de aplicar: rodar recalculate-averages (cron de 6h ou disparo manual) e
-- revalidar /candidato/[slug] dos candidatos de PE, MG e RJ.

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
      -- PE
      ('PE-06822/2026', 'Raquel Lyra',                   46::numeric),
      ('PE-06822/2026', U&'Jo\00e3o Campos',             44),
      ('PE-06822/2026', 'Ivan Moraes',                    2),
      ('PE-06822/2026', 'Renan',                          1),
      -- MG (totais)
      ('MG-09729/2026', 'Cleitinho',                     40),
      ('MG-09729/2026', 'Patrus Ananias',                16),
      ('MG-09729/2026', 'Alexandre Kalil',               11),
      ('MG-09729/2026', U&'Fl\00e1vio Roscoe',            4),
      ('MG-09729/2026', U&'Mateus Sim\00f5es',            4),
      ('MG-09729/2026', 'Gabriel Azevedo',                2),
      ('MG-09729/2026', 'Ben Mendes',                     1),
      ('MG-09729/2026', U&'T\00falio Lopes',              1),
      ('MG-09729/2026', 'Rafael Duda',                    1),
      ('MG-09729/2026', 'Indira Xavier',                  1),
      ('MG-09729/2026', U&'Henrique \00c1reas',           1),
      -- RJ
      ('RJ-02070/2026', 'Eduardo Paes',                  42),
      ('RJ-02070/2026', 'Douglas Ruas',                  31),
      ('RJ-02070/2026', 'Anthony Garotinho',              7),
      ('RJ-02070/2026', 'William Siri',                   3),
      ('RJ-02070/2026', 'Cyro Garcia',                    2),
      ('RJ-02070/2026', 'Juliete Pantoja',                1),
      ('RJ-02070/2026', U&'Andr\00e9 Marinho',            1),
      ('RJ-02070/2026', 'Coronel Busnello',               1),
      ('RJ-02070/2026', 'Luan Monteiro',                  1)
    ) AS t(tse, cand_name, pct)
  LOOP
    -- STRICT: aborta se nao houver exatamente 1 poll Datafolha com esse protocolo.
    SELECT p.id, p.election_id INTO STRICT v_poll, v_election
    FROM polls p
    JOIN institutes i ON i.id = p.institute_id
    WHERE p.tse_registration = f.tse AND i.name = 'Datafolha';

    -- candidato da eleicao do poll, sem filtrar is_active: o Garotinho ja tem linha no
    -- poll e e inativo; os demais sao ativos.
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

  RAISE NOTICE 'Datafolha 02/10: % inserido(s), % atualizado(s)', v_ins, v_upd;
END $$;

-- Conferencia (esperado: PE 4 linhas · MG 11 · RJ 9):
-- SELECT p.tse_registration, count(*) AS n, sum(pr.percentage) AS soma
-- FROM polls p
-- JOIN institutes i ON i.id = p.institute_id AND i.name = 'Datafolha'
-- JOIN poll_results pr ON pr.poll_id = p.id
-- WHERE p.tse_registration IN ('PE-06822/2026','MG-09729/2026','RJ-02070/2026')
-- GROUP BY 1 ORDER BY 1;
