-- Permite methodology NULL em polls quando fonte não informa
-- (ex.: drafts vindos de Wikipedia que não capturaram metadata completa).
-- Mantém check de valores quando preenchido.

alter table polls alter column methodology drop not null;

alter table polls drop constraint polls_methodology_check;

alter table polls add constraint polls_methodology_check
  check (
    methodology is null
    or methodology = any (array['presencial', 'telefonica', 'online', 'mista'])
  );

comment on column polls.methodology is
  'Metodologia da pesquisa. NULL permitido quando fonte editorial não informa. Valores: presencial | telefonica | online | mista.';
