-- Pipeline de Aprovação / Rejeição
-- ---------------------------------------------------------------------------
-- Pesquisas de AVALIAÇÃO DE GOVERNO e REJEIÇÃO DE CANDIDATOS, separadas das
-- pesquisas de intenção de voto (polls). Cada linha é uma pesquisa de um
-- instituto sobre UM sujeito (presidente, governo, candidato), em UMA das três
-- métricas comparáveis:
--   - 'rating'    : escala ótimo / bom / regular / ruim / péssimo
--   - 'binary'    : aprova / desaprova
--   - 'rejection' : % que rejeita / não votaria de jeito nenhum
-- A agregação (média ponderada por recência, amostra, metodologia e acurácia do
-- instituto) é feita em src/lib/approval-data.ts, reusando src/lib/weighting/.
-- As três métricas NUNCA são misturadas: cada uma agrega só dentro do seu grupo.

create table if not exists approval_polls (
  id                 uuid primary key default gen_random_uuid(),

  -- Instituto
  institute_id       uuid references institutes(id),
  institute_name     text not null,            -- texto bruto da fonte

  -- Sujeito avaliado
  subject_label      text not null,            -- "Lula", "Governo Federal", "Tarcísio de Freitas"
  subject_slug       text,                     -- "lula" (liga a /candidato/{slug} quando aplicável)
  office             text not null default 'presidente', -- 'presidente' | 'governador'
  scope              text not null default 'nacional',   -- 'nacional' | sigla UF

  -- Métrica
  metric             text not null check (metric in ('rating', 'binary', 'rejection')),

  -- Metadata da pesquisa
  publication_date   date not null,
  fieldwork_start    date,
  fieldwork_end      date,
  sample_size        integer,
  margin_of_error    numeric(4,2),
  methodology        text,                     -- 'presencial' | 'telefonica' | 'online' | 'mista'
  tse_registration   text,                     -- registro PesqEle/TSE
  source_url         text,

  -- Resultados — escala 'rating' (ótimo/bom/regular/ruim/péssimo)
  pct_otimo          numeric(5,2),
  pct_bom            numeric(5,2),
  pct_regular        numeric(5,2),
  pct_ruim           numeric(5,2),
  pct_pessimo        numeric(5,2),

  -- Resultados — escala 'binary' (aprova/desaprova)
  pct_aprova         numeric(5,2),
  pct_desaprova      numeric(5,2),

  -- Resultados — escala 'rejection'
  pct_rejeita        numeric(5,2),

  pct_nsnr           numeric(5,2),             -- não sabe / não respondeu

  created_at         timestamptz not null default now(),

  -- Idempotência: mesmo instituto, mesmo sujeito, mesmo campo, mesma métrica não duplica
  unique (institute_name, subject_label, metric, fieldwork_end, scope)
);

create index if not exists approval_polls_subject_idx
  on approval_polls (subject_slug, metric, publication_date desc);
create index if not exists approval_polls_office_idx
  on approval_polls (office, scope, metric, publication_date desc);
create index if not exists approval_polls_metric_idx
  on approval_polls (metric, publication_date desc);

comment on table approval_polls is
  'Pesquisas de avaliacao de governo (rating/binary) e rejeicao de candidatos. Agregadas por src/lib/approval-data.ts. Tres metricas comparaveis, nunca misturadas.';

-- Leitura pública (dashboard e páginas SSR usam a anon key). Escrita só via service role.
grant select on approval_polls to anon, authenticated;
