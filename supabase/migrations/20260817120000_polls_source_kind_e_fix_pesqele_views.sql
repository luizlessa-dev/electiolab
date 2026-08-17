-- Proveniência em `polls` + correção das views de cobertura PesqEle.
--
-- Contexto: docs/ELECTIOLAB-AUDIT-2026-08.md, seção "Acompanhamento —
-- Verificação de cobertura PesqEle (TSE) × ElectioLab" (17/08/2026).
--
-- Três problemas resolvidos aqui:
--
-- 1. `polls` não tinha coluna de proveniência. O promote-approved-polls.ts
--    descartava `source_url`/`source_kind`/`tse_protocolo` do draft ao promover
--    (havia até um comentário no código dizendo que esses campos "são apenas em
--    poll_drafts"). Resultado: as 52 pesquisas promovidas de drafts da Wikipedia
--    em 30/07/2026 ficaram com source_url NULL — indistinguíveis, olhando só
--    para `polls`, de qualquer outra linha sem fonte. Uma busca por
--    `source_url ilike '%wikipedia%'` retornava zero.
--
-- 2. `pesqele_coverage` classificava cargo com CASE exclusivo sobre um campo
--    multi-valorado ("Governador, Senador, Deputado Federal" cai só em
--    governador), reportando base de 20 para senador quando a real é 999
--    (-98%) e 12 para deputado quando a real é 498 (-97,6%). Além disso usava
--    count(*) depois de LEFT JOIN, inflando total_tse com duplicatas de polls.
--
-- 3. O match de protocolo não reconhecia sufixo de cenário
--    (BR-03770/2026-2T-FLAVIO, SP-00378/2026-S1, BR-01075/2026-CEN2): a
--    normalização só removia não-alfanuméricos, preservando as letras do
--    sufixo. 40 de 45 polls "sem correspondência no TSE" eram falso positivo.

-- ── 1. Proveniência ──────────────────────────────────────────────────────────

alter table polls add column if not exists source_kind text;

comment on column polls.source_kind is
  'Proveniência do resultado: wikipedia | manual | tse | imprensa. NULL = lote legado sem proveniência registrada (lotes de abr/2026). Linhas com wikipedia NÃO devem circular como dado curado — ver docs/ELECTIOLAB-AUDIT-2026-08.md.';

create index if not exists polls_source_kind_idx on polls (source_kind)
  where source_kind is not null;

-- Backfill a partir do único vínculo que sobreviveu à promoção.
-- Só marca o que é demonstrável: nada de inferir proveniência do resto.
update polls p
set source_kind = d.source_kind
from poll_drafts d
where d.promoted_poll_id = p.id
  and d.source_kind is not null
  and p.source_kind is null;

-- ── 2. Helper de protocolo base ──────────────────────────────────────────────

-- Extrai o protocolo TSE canônico (UF + número + ano) ignorando sufixo
-- editorial de cenário. 'BR-03770/2026-2T-FLAVIO' → 'BR037702026'.
-- Volta ao strip simples quando o padrão não casa, preservando o
-- comportamento anterior para formatos inesperados.
create or replace function tse_protocolo_base(reg text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when reg is null then null
    when (regexp_match(upper(reg), '^([A-Z]{2})[^A-Z0-9]*([0-9]{4,5})[^A-Z0-9]*([0-9]{4})')) is not null
      then (regexp_match(upper(reg), '^([A-Z]{2})[^A-Z0-9]*([0-9]{4,5})[^A-Z0-9]*([0-9]{4})'))[1]
        || (regexp_match(upper(reg), '^([A-Z]{2})[^A-Z0-9]*([0-9]{4,5})[^A-Z0-9]*([0-9]{4})'))[2]
        || (regexp_match(upper(reg), '^([A-Z]{2})[^A-Z0-9]*([0-9]{4,5})[^A-Z0-9]*([0-9]{4})'))[3]
    else regexp_replace(upper(reg), '[^A-Z0-9]', '', 'g')
  end;
$$;

comment on function tse_protocolo_base(text) is
  'Protocolo TSE canônico a partir de polls.tse_registration, ignorando sufixo de cenário (-2T-X, -CEN2, -S1). Ver docs/ELECTIOLAB-AUDIT-2026-08.md §5.3.';

create index if not exists polls_tse_protocolo_base_idx
  on polls (tse_protocolo_base(tse_registration))
  where tse_registration is not null;

-- ── 3. Views corrigidas ──────────────────────────────────────────────────────

-- Pesquisas registradas no TSE sem resultado curado. Passa a casar por
-- protocolo base e a ignorar linhas de proveniência Wikipedia (que não contam
-- como cobertura curada).
create or replace view pesqele_missing as
select
  r.protocolo,
  r.ano,
  r.uf,
  r.cargos,
  r.nome_empresa as instituto,
  r.dt_fim as fieldwork_end,
  r.dt_divulgacao as publication_date,
  r.qt_entrevistados as sample_size,
  current_date - r.dt_fim as days_since_fieldwork
from pesqele_registry r
where r.dt_fim is not null
  and not exists (
    select 1 from polls p
    where tse_protocolo_base(p.tse_registration) = r.protocolo
      and (p.source_kind is null or p.source_kind <> 'wikipedia')
  )
order by r.dt_fim desc;

comment on view pesqele_missing is
  'Registros TSE PesqEle sem resultado curado em polls — fila editorial. Casa por protocolo base (ignora sufixo de cenário) e desconsidera linhas de proveniência Wikipedia.';

-- Cobertura por UF/cargo. Cargo agora é multi-valorado (um registro conta em
-- todos os cargos que menciona) e a contagem é sobre protocolos distintos.
-- DROP explícito: a view ganha a coluna com_fonte_primaria no meio, e
-- `create or replace view` não permite alterar a posição/nome de colunas.
-- Único consumidor é scripts/ingest-pesqele.ts, que faz select("*").
drop view if exists pesqele_coverage;

create view pesqele_coverage as
with expandido as (
  select
    r.uf,
    r.protocolo,
    c.cargo,
    exists (
      select 1 from polls p
      where tse_protocolo_base(p.tse_registration) = r.protocolo
        and (p.source_kind is null or p.source_kind <> 'wikipedia')
    ) as coberto,
    exists (
      select 1 from polls p
      where tse_protocolo_base(p.tse_registration) = r.protocolo
        and (p.source_kind is null or p.source_kind <> 'wikipedia')
        and p.source_url is not null
    ) as coberto_com_fonte
  from pesqele_registry r
  cross join lateral (
    values ('presidente'), ('governador'), ('senador'), ('deputado')
  ) as c(cargo)
  where r.ano = 2026
    and r.cargos ilike '%' || c.cargo || '%'
)
select
  uf,
  cargo,
  count(distinct protocolo) as total_tse,
  count(distinct protocolo) filter (where coberto) as on_electiolab,
  count(distinct protocolo) filter (where coberto_com_fonte) as com_fonte_primaria,
  round(
    100.0 * count(distinct protocolo) filter (where coberto)
    / nullif(count(distinct protocolo), 0),
    1
  ) as coverage_pct
from expandido
group by uf, cargo
order by coverage_pct nulls first, uf, cargo;

comment on view pesqele_coverage is
  'Cobertura por UF+cargo sobre protocolos distintos. Cargo é multi-valorado: um registro que cobre governador+senador conta nos dois. com_fonte_primaria = tem source_url (critério estrito de auditabilidade).';
