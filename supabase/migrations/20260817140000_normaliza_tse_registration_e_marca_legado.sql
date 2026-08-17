-- Normaliza `polls.tse_registration` e torna explícita a proveniência do lote legado.
--
-- Contexto: docs/ELECTIOLAB-AUDIT-2026-08.md §9.
--
-- 1. 40 linhas carregavam cenário editorial embutido no protocolo do TSE
--    ('BR-03770/2026-2T-FLAVIO', 'SP-00378/2026-S1', 'BR-01075/2026-CEN2').
--    `tse_registration` é chave estrangeira para a realidade — tem que ser o
--    protocolo puro. O cenário é dimensão editorial e mora em `scenario_label`,
--    coluna que já existia e estava subutilizada.
--
-- 2. `source_kind` NULL era ambíguo: não distinguia "sem proveniência
--    registrada" de "ainda não classificado". Passa a 'legacy' explícito.

-- ── 1. Deriva scenario_label onde falta, ANTES de descartar o sufixo ─────────

-- Cenários de 2º turno: os 11 sem rótulo têm exatamente 2 candidatos, então o
-- par vem dos próprios resultados — mais confiável que reparsear o sufixo.
update polls p
set scenario_label = sub.label
from (
  select r.poll_id,
         string_agg(c.name, ' vs ' order by r.percentage desc) as label
  from poll_results r
  join candidates c on c.id = r.candidate_id
  group by r.poll_id
  having count(*) = 2
) sub
where sub.poll_id = p.id
  and p.scenario_label is null
  and p.tse_registration ~ '2T-';

-- Sufixos -S1/-SEN (17 linhas de senador) não são cenário: nenhuma linha tem
-- -S2, então o sufixo não distingue nada e não vira rótulo. Só se descarta.

-- ── 2. Descarta o sufixo, preservando o protocolo canônico ──────────────────

update polls
set tse_registration = regexp_replace(
      upper(tse_registration),
      '^([A-Z]{2}-[0-9]{4,5}/[0-9]{4}).*$',
      '\1'
    )
where tse_registration is not null
  and upper(tse_registration) ~ '^[A-Z]{2}-[0-9]{4,5}/[0-9]{4}.+$';

-- Trava a recorrência. Sem isso o sufixo volta na próxima curadoria manual —
-- foi exatamente assim que as 40 linhas surgiram. Duplicata de protocolo segue
-- permitida de propósito: é o que representa múltiplos cenários da mesma
-- pesquisa (não há unique constraint em tse_registration, e não deve haver).
alter table polls drop constraint if exists polls_tse_registration_formato;
alter table polls add constraint polls_tse_registration_formato
  check (
    tse_registration is null
    or tse_registration ~ '^[A-Z]{2}-[0-9]{4,5}/[0-9]{4}$'
  );

comment on column polls.tse_registration is
  'Protocolo do TSE PesqEle, formato canônico UF-NNNNN/AAAA. Só o protocolo: cenário editorial (2º turno, cenário N, expandido) vai em scenario_label. Ver docs/ELECTIOLAB-AUDIT-2026-08.md §9.';

comment on column polls.scenario_label is
  'Cenário editorial da pesquisa quando o mesmo protocolo do TSE gera mais de uma linha: "Lula vs Zema", "Cenário 2 — sem Greca", "Cenário expandido 1T". NULL = cenário único.';

-- ── 3. Proveniência explícita do lote legado ────────────────────────────────

update polls
set source_kind = 'legacy'
where source_kind is null;

comment on column polls.source_kind is
  'Proveniência do resultado: manual | tse | imprensa | legacy. "legacy" = lotes de abr-jun/2026 e 2022 importados antes de haver registro de proveniência — a pesquisa pode ser real, mas de onde veio o percentual não é recuperável do banco. Ver docs/ELECTIOLAB-AUDIT-2026-08.md §9.';
