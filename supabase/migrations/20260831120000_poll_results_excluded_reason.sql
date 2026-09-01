-- Migration: marca resultados de pesquisa de quem não é candidato registrado
-- Data: 2026-08-31
--
-- Contexto: pesquisas publicadas exibiam nomes que não constam no arquivo de
-- candidaturas do TSE para aquele cargo/UF. Parte é pré-candidato que nunca
-- registrou (Tarcísio como presidenciável, Rodrigo Pacheco em governador/MG);
-- parte é gente que registrou em OUTRA corrida (Cabo Daciolo é candidato a
-- governador do AM, não a presidente).
--
-- Decisão editorial: soft-delete. A linha continua no banco — o que o instituto
-- publicou é registro histórico e o electiolab é um produto de transparência —
-- mas sai das leituras públicas. Os percentuais NÃO são renormalizados: os
-- remanescentes ficam como o instituto divulgou e a soma passa a ser < 100.
--
-- Fonte da verdade: consulta_cand_<ano>.zip do TSE, casado por (cargo, UF) +
-- CPF/nome. Nunca `candidates.tse_last_situation_year` — esse carimbo já esteve
-- errado em 42 registros (ver 20260831120500_fix_tse_stamp_matching.sql).

alter table poll_results
  add column if not exists excluded_reason text,
  add column if not exists excluded_at timestamptz;

comment on column poll_results.excluded_reason is
  'Null = resultado válido, entra nas leituras públicas. Preenchido = candidato não '
  'confirmado na urna; a linha é preservada como registro do que o instituto publicou, '
  'mas filtrada na exibição e na agregação.';

comment on column poll_results.excluded_at is
  'Quando a linha foi marcada. Serve pra auditar de qual rodada de checagem veio.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'poll_results_excluded_reason_check'
  ) then
    alter table poll_results
      add constraint poll_results_excluded_reason_check
      check (excluded_reason is null or excluded_reason in (
        'sem_registro_tse',      -- não consta no arquivo de candidaturas do cargo/UF
        'registrado_outro_cargo', -- registrou, mas em outra corrida
        'revisao_editorial'       -- retirado por decisão da redação
      ));
  end if;
end $$;

-- As leituras públicas quase sempre pedem "só as válidas". Índice parcial
-- cobrindo o caso comum sem inchar o índice com as linhas excluídas.
create index if not exists idx_poll_results_validos
  on poll_results (poll_id)
  where excluded_reason is null;

create index if not exists idx_poll_results_excluidos
  on poll_results (excluded_reason)
  where excluded_reason is not null;
