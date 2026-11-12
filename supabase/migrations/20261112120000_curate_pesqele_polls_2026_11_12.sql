-- Curadoria diária pesqele_missing (2026-11-12).
-- Gerado automaticamente — NÃO aplicado via MCP (Supabase MCP deste projeto é somente leitura,
-- ver CLAUDE.md). Luiz aplica manualmente no SQL Editor do painel do Supabase antes do merge.
--
-- 1 pesquisa nova confirmada (protocolo TSE citado explicitamente na matéria, batendo
-- instituto+amostra+janela de campo EXATAMENTE contra pesqele_registry — dt_inicio=17/10,
-- dt_fim=20/10, dt_divulgacao=21/10, qt_entrevistados=1104, todos conferidos).
--
-- ───────────────────────────────────────────────────────────────────────────
-- 1) Quaest · Governador DF, 2º turno · 17-20 out 2026 · TSE DF-00402/2026 · n=1.104
--    Fonte: https://soubrasilia.com/quaest-df-celina-50-grass-35-segundo-turno/
--    Divulgada 21/10/2026, contratante TV Globo. Percentual gravado é o corte sobre o TOTAL de
--    entrevistados (convenção da base): Celina Leão 50% / Leandro Grass 35% (vs. 58,8%/41,2% em
--    votos válidos). Metodologia presencial confirmada em pesqele_registry.ds_metodologia
--    ("entrevistas pessoais, domiciliares e presenciais"). Margem de erro ~3pp, 95% confiança.
-- ───────────────────────────────────────────────────────────────────────────
with new_poll_df_gov_2t_quaest_1020 as (
  insert into polls (
    election_id, institute_id, publication_date, fieldwork_start, fieldwork_end,
    sample_size, margin_of_error, confidence_level, methodology, scope, poll_type,
    source_url, tse_registration, is_verified
  )
  select e.id, i.id, '2026-10-21', '2026-10-17', '2026-10-20',
         1104, 3.0, 95, 'presencial', 'DF', 'estimulada',
         'https://soubrasilia.com/quaest-df-celina-50-grass-35-segundo-turno/',
         'DF-00402/2026', true
  from elections e, institutes i
  where e.name = 'Governador DF 2026 - 2º Turno'
    and i.name = 'Quaest'
    and not exists (
      select 1 from polls p where p.tse_registration = 'DF-00402/2026'
    )
  returning id, election_id
)
insert into poll_results (poll_id, candidate_id, percentage)
select np.id, c.id, v.percentage
from new_poll_df_gov_2t_quaest_1020 np
join elections e on e.id = np.election_id
cross join (values
  ('Celina Leao', 50.0),
  ('Leandro Grass', 35.0)
) as v(candidate_name, percentage)
join candidates c on c.election_id = e.id and c.is_active = true and c.name ilike v.candidate_name;

-- ───────────────────────────────────────────────────────────────────────────
-- Itens tentados e descartados nesta rodada (sem matéria confirmando protocolo+percentual sobre
-- o total, ou achados mas com ressalva que impede curar com segurança):
--   • BR-03112/2026 (Datafolha, Presidente, campo até 24/10, n=1.620) — rodadas Datafolha
--     nacionais encontradas em outubro têm amostras de 2.520 ou 4.050, nunca 1.620; a amostra de
--     1.620 só aparece associada a uma rodada do DF (BR-03112 é nacional, não bate). Não curado.
--   • BR-02828/2026 (PoderData, Presidente, campo até 24/10, n=4.000) — já curado em 2026-11-05
--     (migration 20261105120000) com campo 23-24/10; a rodada de n=4.000 encontrada hoje tem
--     campo terminando em 21/10, não 24/10 — protocolo/data não bate, sem ação nova.
--   • DF-03453/2026 (Datafolha, Governador DF, campo até 24/10, n=1.620) — já em migration
--     pendente (20261030120000), sem ação nova.
--   • DF-00368/2026 (Quaest, Governador DF, campo até 24/10, n=2.652) — já em migration pendente
--     (20261030120000, corrigida em 2026-11-01), sem ação nova. NÃO confundir com DF-00402/2026
--     (curado acima hoje) — mesmo instituto e UF, rodadas de datas diferentes (24/10 vs 20/10).
--   • DF-08658/2026 (AtlasIntel, Governador DF, campo até 23/10, n=1.800) — achada matéria (Times
--     Brasil) com Celina 57,9%/Grass 42,1%, mas só em corte de VOTOS VÁLIDOS — sem o corte sobre
--     o total exigido pela convenção da base, e sem confirmação de texto primário (WebFetch
--     bloqueado nesta sessão pra esse domínio). Mesma ressalva já registrada em migration
--     20261105120000 (linha "DF-08658/2026 continua com a ressalva..."). Não curado.
--   • BR-00957/2026 (AtlasIntel, Presidente, campo até 23/10, n=1.800) — nenhuma pesquisa nacional
--     da AtlasIntel com essa amostra específica foi encontrada (toda evidência aponta pra uma
--     única rodada de campo 18-23/10 com n≈5.000, que é o próprio BR-06380/2026 já curado). Não
--     curado — risco de estar duplicando BR-06380/2026 com amostra errada.
--   • BR-03181/2026 (Instituto Veritá, Presidente, campo até 23/10, n=15.554) — já tem migration
--     própria (20261028120000), sem ação nova.
--   • BR-06380/2026 (AtlasIntel, Presidente, campo até 23/10, n=5.000) — já tem migration própria
--     (20261023120000/20261102120000/20261105120000); matérias encontradas hoje pra essa mesma
--     janela (Revista Oeste 50,8%/49,2%, BP Money 49,9%/48,4%, outra fonte 51,1%/48,9%) trazem
--     percentuais DIVERGENTES entre si e todos em corte de votos válidos — não é motivo pra
--     revisar o que já está gravado (gravado via fonte distinta já confirmada em rodada
--     anterior), só reforça que não dá pra curar esse protocolo de novo com segurança a partir
--     da pesquisa de hoje.
--   • DF-08808/2026 (Instituto Veritá, Governador DF, campo até 22/10, n=1.220) — mesma conclusão
--     de pelo menos 3 rodadas anteriores (23/10, 01/11, hoje): nenhuma pesquisa Veritá pro
--     governo do DF circulando na imprensa nesta janela. A única pesquisa Veritá-DF encontrada é
--     de MAIO/2026 (1º turno, suspensa por liminar do TRE-DF a pedido do PSB, protocolo
--     DF-01208/2026) — não relacionada a este protocolo de 2º turno. Praticamente certo que esse
--     protocolo nunca vai ter matéria (padrão de pesquisas Veritá suspensas/não publicadas).
--   • BR-00875/2026 (Datafolha, Presidente, campo até 22/10, n=910) — nenhuma rodada nacional do
--     Datafolha com amostra de 910 encontrada (todas são 2.002+); 910 é o tamanho de amostra de
--     uma pesquisa ESTADUAL do Datafolha pro DF (ver DF-01738/2026, já curado), não nacional.
--     Protocolo/UF não bate. Não curado.
--   • BR-03835/2026 (GERP, Presidente, campo até 20/10, n=2.400) — GERP rodou várias pesquisas
--     parecidas na mesma semana (campo 14-16/10, 15-19/10, 19-21/10, 22-24/10), nenhuma com
--     fieldwork_end exatamente em 20/10. Risco de confusão entre rodadas — não curado.
--   • BR-08771/2026 (Instituto Vox Brasil, Presidente, campo até 15/10, n=2.100) — rodadas Vox
--     Brasil de 2º turno encontradas têm campo 29/09-01/10, 05-07/10, 15-17/10 e 20-22/10;
--     nenhuma com campo terminando exatamente em 15/10. Não curado.
--   • BR-07337/2026 (Quaest, Presidente, campo até 13/10, n=1.098) — rodada Quaest nacional mais
--     próxima da data (campo 10-13/10) tem amostra de 2.154, quase o dobro do registro TSE
--     (1.098) — discrepância grande demais pra confirmar com segurança. Não curado.
-- ───────────────────────────────────────────────────────────────────────────
