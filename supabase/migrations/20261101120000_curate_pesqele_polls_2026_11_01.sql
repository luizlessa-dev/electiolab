-- Curadoria diária pesqele_missing (2026-11-01).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 1 pesquisa nova confirmada com fonte de imprensa real (protocolo TSE batendo, instituto+
-- amostra+janela de campo exatos). Além disso, uma correção foi feita na migration de 2026-10-30
-- (ver nota lá e no PENDING_POLLS) — não repetida aqui porque o `not exists` já cobre.
--
-- ───────────────────────────────────────────────────────────────────────────
-- Datafolha · Senador Pernambuco · 02-03 out 2026 · TSE PE-02404/2026 · n=1.650 · presencial
--   Fonte: https://www.diariodepernambuco.com.br/politica/2026/10/11725699-datafolha-marilia-e-humberto-lideram-senado-com-29-mendonca-tem-16-e-eduardo-14.html
--   Mesmo protocolo TSE do Governador PE já curado na migration 20261030120000 (pesquisa única
--   perguntou os dois cargos) — esta é a parte de Senado, que ainda não tinha sido inserida.
--   tse_registration não é UNIQUE em `polls` (só tem CHECK de formato), então duas linhas
--   (Governador + Senador) com o mesmo protocolo coexistem sem conflito.
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_pe_senado_datafolha_1003 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-03', '2026-10-02', '2026-10-03',
         1650, 2.0, 95, 'presencial', 'nacional', 'estimulada',
         'https://www.diariodepernambuco.com.br/politica/2026/10/11725699-datafolha-marilia-e-humberto-lideram-senado-com-29-mendonca-tem-16-e-eduardo-14.html',
         'PE-02404/2026', true
  from elections e, institutes i
  where e.name = 'Senador Pernambuco 2026'
    and i.name = 'Datafolha'
    and not exists (
      select 1 from polls p
      join elections e2 on e2.id = p.election_id
      where p.tse_registration = 'PE-02404/2026' and e2.name = 'Senador Pernambuco 2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_pe_senado_datafolha_1003 np
join elections e on e.id = np.election_id
cross join (values
  ('Marilia Arraes', 29.0),
  ('Humberto Costa', 29.0),
  ('Mendonça Filho', 16.0),
  ('Eduardo da Fonte', 14.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- Itens tentados e descartados nesta rodada (sem matéria confirmando protocolo+percentual, ou
-- achados mas com ressalva que impede curar com segurança):
--   • DF-03453/2026 (Datafolha, Governador DF 2º turno, n=1.620, campo até 24/out) — nenhuma
--     matéria encontrada batendo essa amostra/instituto/data (só achei uma Datafolha DF sobre
--     Presidente nessa janela, cargo errado).
--   • DF-08658/2026 (AtlasIntel, Governador DF 2º turno, n=1.800/1.807, campo 18-23/out) — já
--     tinha migration pendente (20261030120000) com percentual de votos válidos (57,9/42,1); hoje
--     não achei fonte nova com o corte sobre o total, então não toquei nessa entrada.
--   • DF-08808/2026 (Instituto Veritá, Governador DF 2º turno, n=1.220, campo até 22/out) —
--     nenhuma matéria encontrada (mais uma tentativa consecutiva sem sucesso; Veritá teve
--     pesquisas suspensas pela Justiça Eleitoral em 2026, várias nunca circulam).
--   • DF-00402/2026 (Quaest, Governador DF 2º turno, n=1.104, campo até 20/out) — ARMADILHA:
--     achei uma Quaest com exatamente essa amostra/janela/data de divulgação, mas é sobre
--     PRESIDENTE (Flávio Bolsonaro 50% x Lula 39% no DF), não Governador — cargo do conteúdo não
--     bate com o cargo do registro TSE. Não curado (mais uma tentativa descartada, ver histórico
--     em migrations anteriores).
--   • RJ-07597/2026 (Quaest, Governador RJ, n=1.302, campo até 11/out) — nenhuma matéria
--     encontrada (mais uma tentativa consecutiva sem sucesso).
--   • RJ-02766/2026 (Datafolha, Governador+Senador RJ, n=1.204, campo até 08/out) — nenhuma
--     matéria encontrada pra essa janela específica.
--   • SP-07439/2026 (Datafolha, Governador SP, n=1.610, campo até 08/out), MG-05749/2026
--     (Datafolha, Governador+Senador MG, n=1.204, campo até 08/out), PE-09774/2026 (Datafolha,
--     Governador PE, n=1.204, campo até 08/out) — SP, MG e PE não têm 2º turno de Governador
--     cadastrado (decididas no 1º turno, 04/out); fieldwork pós-eleição não corresponde a nada
--     publicável. Mantidos fora da curadoria (mesma decisão de rodadas anteriores).
--   • BA-02224/2026 (Quaest, Governador+Senador BA, n=2.004, campo até 03/out) — só achei
--     rodadas de jul/ago (ACM Neto x Jerônimo); nada específico da rodada de 03/out.
--   • SP-09337/2026 (Datafolha, Governador+Senador SP, n=2.520, campo até 03/out) — só achei
--     números de 01/out (outro protocolo); nada específico de 03/out.
--   • RS-08922/2026 — já tinha migration pendente (20261030120000, votos válidos Zucco 52/
--     Brizola 35); hoje não achei fonte nova com o corte sobre o total.
--
-- ✅ Ver também a correção feita hoje na migration 20261030120000_curate_pesqele_polls_2026_10_30.sql
--    (item 2, Quaest DF-00368/2026: trocado de 61%/39% votos válidos para 50%/35% sobre o total,
--    fonte https://www.dgabc.com.br/Noticia/4354109/) e em PENDING_POLLS (mesmo protocolo).
--    DF-01738/2026 (Datafolha, Governador DF 2º turno) foi reconfirmado hoje numa segunda fonte
--    independente (dgabc.com.br/Noticia/4354291) com os mesmos 54%/37% já pendentes na migration
--    20261028120000 — nenhuma mudança necessária. Nota: PENDING_POLLS ainda tem uma entrada
--    duplicada/divergente pra esse protocolo (60%/40%, fonte congressoemfoco) já flagada pra Luiz
--    revisar em rodadas anteriores — não resolvida aqui.
