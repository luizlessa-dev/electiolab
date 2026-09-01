-- Migration: documenta o reparo dos carimbos de candidatura do TSE
-- Data: 2026-08-31
--
-- Migration só de documentação — a correção de dados rodou por script, porque
-- depende do arquivo consulta_cand_2026.zip do TSE e não cabe em SQL puro:
--   scripts/fix-tse-candidate-stamps.ts --apply
--   scripts/ingest-tse-candidaturas.ts --apply
--
-- ── O bug ────────────────────────────────────────────────────────────────────
-- `ingest-tse-candidaturas.ts` indexava os candidatos já cadastrados em mapas
-- GLOBAIS de tse_id e cpf:
--
--     if (c.tse_id) byTseId.set(c.tse_id, c);
--     if (c.cpf)    byCpf.set(c.cpf, c);
--
-- Como a mesma pessoa costuma ter um registro por corrida (pré-candidato em
-- governador E senador, por exemplo), a linha do TSE de uma corrida achava o
-- registro da pessoa em OUTRA e gravava a candidatura lá. 42 candidaturas 2026
-- ficaram no cargo errado. Exemplos:
--
--   Alexandre Kalil  candidatura de GOVERNADOR/MG carimbada no registro de senador
--   Carlos Viana     candidatura de SENADOR/MG    carimbada no registro de governador
--   Kim Kataguiri    candidatura de DEP. FEDERAL/SP carimbada no registro de governador
--   Cabo Daciolo     candidatura de GOVERNADOR/AM  carimbada no registro presidencial
--
-- Pior: com CPF repetido no cadastro, o carimbo pulou de PESSOA. O registro de
-- Renan Calheiros (senador/AL) estava com o CPF 71014772168, que é do FILHO, e
-- por isso recebeu a candidatura a governador do Renan Filho. O CPF do pai
-- (11078685487, conforme SQ 20002553727) foi restaurado no mesmo reparo.
--
-- ── A correção ───────────────────────────────────────────────────────────────
-- Os índices passaram a ser escopados por eleição (`${election_id}:${tse_id}`),
-- com um pool separado só pra registros sem election_id — que continuam
-- adotáveis por qualquer corrida, e saem do pool assim que reivindicados.
-- Uma candidatura pertence a exatamente uma eleição; o match respeita isso agora.
--
-- ── Consequência pra quem consulta ───────────────────────────────────────────
-- `candidates.tse_last_situation_year = 2026` NÃO é teste confiável de "está
-- concorrendo" isoladamente: presidente tem duas eleições (1º e 2º turno) e a
-- candidatura só é gravada na de 1º turno (ver loadElectionsMap), então o
-- registro de 2º turno da mesma pessoa fica sem carimbo. Pra saber se alguém
-- concorre a um cargo/UF, case contra o arquivo do TSE — é o que
-- scripts/flag-non-candidates-in-polls.ts faz.
--
-- ── Backup ───────────────────────────────────────────────────────────────────
-- O estado anterior de tse_id/cpf/situação está em
-- candidates_tse_stamp_backup_20260831 (19.959 linhas).

comment on column candidates.tse_last_situation_year is
  'Ano do arquivo de candidaturas do TSE de onde veio o carimbo. Não use sozinho '
  'como teste de "está concorrendo": o registro de 2º turno presidencial não recebe '
  'carimbo (a candidatura só é gravada no 1º turno). Case contra consulta_cand_<ano>.zip '
  'por (cargo, UF) quando a pergunta for elegibilidade.';
