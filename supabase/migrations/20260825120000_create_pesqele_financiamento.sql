-- Financiamento de pesquisas eleitorais (TSE PesqEle — dados abertos).
--
-- Fonte: os zips irmãos de pesquisa_eleitoral_{ano}.zip no CDN do TSE:
--   pesquisa_contratante_{ano}.zip  → quem encomendou a pesquisa e quanto pagou
--   pesquisa_pagante_{ano}.zip      → quem efetivamente pagou (pode diferir do contratante)
--
-- Junta com pesqele_registry por `protocolo` (mesmo formato normalizado, ex.: BR062552026).
-- Sem FK rígida de propósito: o registro de contratante pode chegar antes do
-- registro da pesquisa no nosso espelho, e não queremos perder a linha por ordem de ingestão.

create table if not exists public.pesqele_contratante (
  protocolo        text    not null,
  ano              integer not null,
  cd_contratante   bigint  not null,
  cpf_cnpj         text,
  nome             text    not null,
  vr_pago          numeric,
  is_pagante       boolean,
  origem_recurso   text,
  ingested_at      timestamptz not null default now(),
  primary key (protocolo, cd_contratante)
);

create index if not exists pesqele_contratante_cpf_cnpj_idx on public.pesqele_contratante (cpf_cnpj);
create index if not exists pesqele_contratante_nome_idx      on public.pesqele_contratante (nome);
create index if not exists pesqele_contratante_ano_idx       on public.pesqele_contratante (ano);

create table if not exists public.pesqele_pagante (
  protocolo        text    not null,
  ano              integer not null,
  cd_contratante   bigint  not null,
  cpf_cnpj         text    not null,
  nome             text    not null,
  origem_recurso   text,
  ingested_at      timestamptz not null default now(),
  primary key (protocolo, cd_contratante, cpf_cnpj)
);

create index if not exists pesqele_pagante_cpf_cnpj_idx on public.pesqele_pagante (cpf_cnpj);
create index if not exists pesqele_pagante_nome_idx     on public.pesqele_pagante (nome);
create index if not exists pesqele_pagante_ano_idx      on public.pesqele_pagante (ano);

-- Dados públicos do TSE: leitura liberada, escrita só via service_role.
alter table public.pesqele_contratante enable row level security;
alter table public.pesqele_pagante     enable row level security;

drop policy if exists "pesqele_contratante_public_read" on public.pesqele_contratante;
create policy "pesqele_contratante_public_read"
  on public.pesqele_contratante for select using (true);

drop policy if exists "pesqele_pagante_public_read" on public.pesqele_pagante;
create policy "pesqele_pagante_public_read"
  on public.pesqele_pagante for select using (true);

-- Visão de leitura: uma linha por (pesquisa × contratante), já cruzada com o
-- registro da pesquisa. É a porta de entrada pra pauta "quem banca qual pesquisa".
create or replace view public.pesqele_financiamento as
select
  c.protocolo,
  c.ano,
  r.uf,
  r.cargos,
  r.nome_empresa            as instituto,
  r.cnpj_empresa            as instituto_cnpj,
  r.dt_divulgacao,
  r.qt_entrevistados,
  r.vr_pesquisa             as valor_total_pesquisa,
  c.nome                    as contratante,
  c.cpf_cnpj                as contratante_cpf_cnpj,
  c.vr_pago                 as contratante_valor_pago,
  c.origem_recurso          as contratante_origem_recurso,
  c.is_pagante,
  p.nome                    as pagante,
  p.cpf_cnpj                as pagante_cpf_cnpj
from public.pesqele_contratante c
left join public.pesqele_registry r on r.protocolo = c.protocolo
left join public.pesqele_pagante  p on p.protocolo = c.protocolo
                                   and p.cd_contratante = c.cd_contratante;
