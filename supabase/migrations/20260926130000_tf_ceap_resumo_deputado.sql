-- ⚠️  APLICAR NO PROJETO "transparencia-federal" (ref redggdtakzmsabwvjzhb),
--     NÃO no projeto ElectioLab (xoxztzologqeqbajlhya).
--     O arquivo mora aqui só como registro (regra do CLAUDE.md). Aplicação manual
--     pelo Luiz no SQL Editor do painel do Supabase do projeto TF. Não aplicada.
--
-- Auditoria pré-eleição 2026-09, item P1: seção "Cota Parlamentar (CEAP)" em
-- branco em produção.
--
-- Problema
--   src/lib/tf-data.ts consulta `ceaps_brutas` (1,4 mi linhas, 1,1 GB) com a
--   TF_SUPABASE_ANON_KEY. A tabela tem RLS ligado e ZERO policies, então o
--   PostgREST devolve 200 com `[]`, sem erro. `getCeapByCamaraId()` vê array
--   vazio → retorna null → a seção some do /candidato/[slug]. 824/824
--   requisições em 24h voltaram vazias.
--
-- Decisão
--   NÃO abrir `ceaps_brutas` ao anon (linhas cruas incluem CPF de fornecedor
--   pessoa física, url do documento, jsonb `dados`). Publicar apenas o resumo
--   que a página exibe, em uma view MATERIALIZADA agregada por deputado.
--
-- Por que materializada (e não view comum, nem RPC SECURITY DEFINER)
--   • view comum security_invoker: o anon precisaria de SELECT na tabela crua
--     (o que se quer evitar);
--   • view comum SECURITY DEFINER: contorna o RLS (advisor ERROR
--     `security_definer_view`) e, sem filtro, agrega 1,4 mi de linhas por
--     requisição — medido: ~4,2 s só o SUM por deputado na janela de 24 meses
--     (seq scan de ~305 mil linhas), acima do que se quer em noite de eleição;
--   • RPC SECURITY DEFINER: funciona, mas é exatamente o padrão que a auditoria
--     mandou revogar do anon (P0-2 do ElectioLab).
--   Materializada: leitura de 1 linha por índice único (ms), sem RLS a
--   contornar, e o conteúdo é 100% agregado (~540 linhas). MV não suporta RLS
--   nem security_invoker; a proteção é o conteúdo (só colunas de resumo) +
--   GRANT SELECT explícito. O advisor `materialized_view_in_api` vai listá-la
--   como WARN: é esperado e aceito aqui.
--
-- O que a página usa (src/app/candidato/[slug]/candidate-view.tsx:851–925)
--   total, totalRecente (12 m), byType (top 10: tipo/total/count),
--   topFornecedores (top 10: fornecedor/cnpj/total/count; o CEIS cruza os 10,
--   a tela mostra 5). `recent` (20 despesas com url_documento) é calculado
--   em tf-data.ts mas NÃO é renderizado por nenhuma página → não é publicado.
--
-- Semântica
--   • Janela: documentos com data_documento nos últimos 24 meses, contados a
--     partir do dia do REFRESH. É o que o rótulo da tela já diz ("últimos 24
--     meses"); o código antigo pegava as 2.000 linhas mais recentes, que para
--     os deputados de maior volume (≈2.900 docs em 24 m) truncava o total.
--   • Valores: soma de `valor_liquido` como está (inclui estornos negativos,
--     4.563 linhas na janela), igual ao cálculo antigo.
--   • Fornecedor: agrupado por CNPJ quando existe, senão por nome (antes: só
--     por nome). O nome exibido é o alfabeticamente maior do grupo (estável).
--   • PRIVACIDADE: só publica o documento do fornecedor se for CNPJ (14
--     dígitos). CPF de pessoa física (11 dígitos, 2.749 linhas na janela,
--     armazenado sem máscara) vira NULL. Efeito colateral: o cruzamento
--     CEAP × CEIS deixa de casar fornecedores pessoa física.
--     Se preferir manter o CPF, remova o `case` em `cnpj` abaixo.
--
-- Rollback
--   select cron.unschedule('refresh-ceap-resumo');
--   drop materialized view public.ceap_resumo_deputado;

begin;

create materialized view if not exists public.ceap_resumo_deputado as
with base as (
  select
    c.deputado_id_externo,
    coalesce(nullif(btrim(c.tipo_despesa), ''), 'OUTROS')          as tipo,
    coalesce(nullif(btrim(c.nome_fornecedor), ''), 'DESCONHECIDO') as fornecedor,
    case when regexp_replace(coalesce(c.cnpj_cpf_fornecedor, ''), '\D', '', 'g') ~ '^\d{14}$'
         then regexp_replace(c.cnpj_cpf_fornecedor, '\D', '', 'g')
    end                                                             as cnpj,
    c.valor_liquido,
    c.data_documento
  from public.ceaps_brutas c
  where c.data_documento >= (current_date - interval '24 months')
),
tot as (
  select
    deputado_id_externo,
    round(sum(valor_liquido), 2)::numeric(14,2) as total_24m,
    round(coalesce(sum(valor_liquido) filter (
      where data_documento >= (current_date - interval '12 months')), 0), 2)::numeric(14,2) as total_12m,
    count(*)::int as docs_24m
  from base
  group by deputado_id_externo
),
tipos as (
  select deputado_id_externo, tipo, sum(valor_liquido) as total, count(*) as n,
         row_number() over (partition by deputado_id_externo
                            order by sum(valor_liquido) desc, tipo) as rn
  from base
  group by deputado_id_externo, tipo
),
tipos_json as (
  select deputado_id_externo,
         jsonb_agg(jsonb_build_object('tipo', tipo,
                                      'total', round(total, 2),
                                      'count', n) order by rn) as por_tipo
  from tipos
  where rn <= 10
  group by deputado_id_externo
),
forns as (
  select deputado_id_externo,
         max(fornecedor) as fornecedor,
         max(cnpj)       as cnpj,
         sum(valor_liquido) as total,
         count(*)        as n,
         row_number() over (partition by deputado_id_externo
                            order by sum(valor_liquido) desc, coalesce(max(cnpj), max(fornecedor))) as rn
  from base
  group by deputado_id_externo, coalesce(cnpj, upper(fornecedor))
),
forns_json as (
  select deputado_id_externo,
         jsonb_agg(jsonb_build_object('fornecedor', fornecedor,
                                      'cnpj', cnpj,
                                      'total', round(total, 2),
                                      'count', n) order by rn) as top_fornecedores
  from forns
  where rn <= 10
  group by deputado_id_externo
)
select
  t.deputado_id_externo,
  t.total_24m,
  t.total_12m,
  t.docs_24m,
  coalesce(tj.por_tipo, '[]'::jsonb)          as por_tipo,
  coalesce(fj.top_fornecedores, '[]'::jsonb)  as top_fornecedores,
  (current_date - interval '24 months')::date as janela_inicio,
  now()                                       as atualizado_em
from tot t
left join tipos_json tj using (deputado_id_externo)
left join forns_json fj using (deputado_id_externo)
with no data;

-- Índice único: acesso por deputado (a query do site é `deputado_id_externo=eq.N`)
-- e pré-requisito do REFRESH ... CONCURRENTLY.
create unique index if not exists ceap_resumo_deputado_pk
  on public.ceap_resumo_deputado (deputado_id_externo);

-- Grants: o Supabase concede ALL a anon/authenticated por default em `public`.
-- Zerar e conceder só SELECT.
revoke all on public.ceap_resumo_deputado from public, anon, authenticated;
grant select on public.ceap_resumo_deputado to anon, authenticated;

comment on materialized view public.ceap_resumo_deputado is
  'Resumo público da CEAP por deputado (janela 24 m a partir do último refresh). '
  'Só colunas agregadas; CPF de fornecedor pessoa física omitido. Fonte: ceaps_brutas. '
  'Consumido por electiolab/src/lib/tf-data.ts (getCeapByCamaraId). Refresh diário via pg_cron.';

-- Primeira carga (não concorrente: a MV foi criada WITH NO DATA). ~10 s.
-- Se o SQL Editor estourar o tempo, rode esta linha sozinha depois do commit.
refresh materialized view public.ceap_resumo_deputado;

commit;

-- Refresh diário. 09:30 UTC = 06:30 em Brasília: depois da ingestão diária
-- da manhã e antes do tráfego. AJUSTAR se a ingestão da CEAP rodar em outro
-- horário (não localizei o agendador da ingestão de `ceaps_brutas`).
-- CONCURRENTLY não bloqueia leitura; exige o índice único acima.
select cron.unschedule('refresh-ceap-resumo')
 where exists (select 1 from cron.job where jobname = 'refresh-ceap-resumo');

select cron.schedule(
  'refresh-ceap-resumo',
  '30 9 * * *',
  $$refresh materialized view concurrently public.ceap_resumo_deputado$$
);

-- ─────────────────────────────────────────────────────────────────────────
-- Verificação depois de aplicar (rodar no SQL Editor do projeto TF)
--
-- 1) Contagem e frescor (esperado: ~540 linhas; atualizado_em = agora)
--    select count(*), max(atualizado_em), min(janela_inicio) from public.ceap_resumo_deputado;
--
-- 2) Confere contra a tabela crua para um deputado (os dois totais devem bater)
--    select total_24m, docs_24m from public.ceap_resumo_deputado where deputado_id_externo = '220554';
--    select round(sum(valor_liquido),2), count(*) from public.ceaps_brutas
--     where deputado_id_externo = '220554' and data_documento >= current_date - interval '24 months';
--
-- 3) Confere o total geral (bate com a soma da MV; referência em 26/09: 415.527.004)
--    select round(sum(total_24m)) from public.ceap_resumo_deputado;
--
-- 4) Como anon (é o que o site faz; esperado: 1 linha)
--    curl "https://redggdtakzmsabwvjzhb.supabase.co/rest/v1/ceap_resumo_deputado?deputado_id_externo=eq.220554&select=total_24m,por_tipo" \
--      -H "apikey: $TF_SUPABASE_ANON_KEY"
--
-- 5) Confirma que a tabela crua continua fechada (esperado: [])
--    curl ".../rest/v1/ceaps_brutas?select=id&limit=1" -H "apikey: $TF_SUPABASE_ANON_KEY"
