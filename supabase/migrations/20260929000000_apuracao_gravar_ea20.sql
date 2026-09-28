-- apuracao.gravar_ea20(jsonb) — grava um EA20 numa única transação/chamada.
--
-- NÃO aplicar sem aprovação (CLAUDE.md, regra 9): Luiz aplica no SQL Editor do
-- Supabase antes do merge. Este arquivo é o registro do que foi aplicado.
--
-- Por quê: o coletor de hoje (src/lib/apuracao/resultados.ts, repositorio.ts) faz
-- ~7-10 idas ao PostgREST por EA20 (upsert de disputa, totalizacao, votacao_agrupamento,
-- votacao_partido, votacao_candidato em lotes de 500, candidato_vinculado, 3 deletes de
-- limpeza). Medido em 28/09/2026 contra o simulado: um ciclo com todos os cargos e escrita
-- real leva 115,1s — quase o dobro do maxDuration de 60s da rota da Vercel
-- (apuracao-2026/docs/arquitetura.md, Fase 2 — onda 2). Esta função substitui a parte de
-- votação (totalizacao + votacao_agrupamento/partido/candidato + candidato_vinculado + a
-- limpeza do que saiu) por 1 chamada. upsertDisputa (vagas/qe/election_id) e
-- salvarArquivoBruto continuam fora — ficam no coletor.
--
-- NÃO troca o coletor para usar esta função ainda (decisão de 28/09/2026): a troca de
-- resultados.ts/repositorio.ts fica para depois do ensaio de hoje. Esta migration só
-- adianta a função e os testes locais contra Postgres puro (Docker), sem tocar no
-- coletor em uso nem aplicar no Supabase.
--
-- Espelha exatamente a lógica de:
--   * src/lib/apuracao/valores.ts       -> apuracao._tse_inteiro/_tse_percentual/_tse_texto/_tse_flag/_tse_data_hora_utc
--   * src/lib/apuracao/resultados.ts    -> linhaTotalizacao() e normalizarHierarquia()
--   * src/lib/apuracao/repositorio.ts   -> RepositorioApuracao.substituirVotacao()
-- Regra 1 do CLAUDE.md: nada é recalculado aqui — só reformatado (string -> tipo do banco).

-- ---------------------------------------------------------------------------
-- Conversão dos valores do TSE (espelha src/lib/apuracao/valores.ts)
-- ---------------------------------------------------------------------------

create or replace function apuracao._tse_inteiro(valor text)
returns bigint
language plpgsql
immutable
as $$
declare
  t text;
begin
  if valor is null then return null; end if;
  t := trim(valor);
  if t = '' then return null; end if;
  if t !~ '^-?[0-9]+$' then
    raise exception 'Valor inteiro inesperado do TSE: %', valor;
  end if;
  return t::bigint;
end;
$$;

create or replace function apuracao._tse_percentual(valor text)
returns numeric
language plpgsql
immutable
as $$
declare
  t text;
  norm text;
begin
  if valor is null then return null; end if;
  t := trim(valor);
  if t = '' then return null; end if;
  norm := replace(t, ',', '.');
  if norm !~ '^-?[0-9]+(\.[0-9]+)?$' then
    raise exception 'Percentual inesperado do TSE: %', valor;
  end if;
  return norm::numeric;
end;
$$;

create or replace function apuracao._tse_texto(valor text)
returns text
language sql
immutable
as $$
  select case when valor is null or trim(valor) = '' then null else trim(valor) end;
$$;

create or replace function apuracao._tse_flag(valor text)
returns boolean
language sql
immutable
as $$
  select lower(trim(coalesce(valor, ''))) = 's';
$$;

/** `dd/mm/aaaa` + `hh:mm:ss` (Brasília, sem fuso no arquivo) -> timestamptz (UTC). */
create or replace function apuracao._tse_data_hora_utc(data text, hora text)
returns timestamptz
language plpgsql
immutable
as $$
declare
  d text := apuracao._tse_texto(data);
  h text := apuracao._tse_texto(hora);
  dia text; mes text; ano text; hh text; mm text; ss text;
begin
  if d is null or h is null then return null; end if;
  if d !~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' or h !~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$' then
    raise exception 'Data/hora inesperada do TSE: % %', d, h;
  end if;
  dia := substring(d from 1 for 2);
  mes := substring(d from 4 for 2);
  ano := substring(d from 7 for 4);
  hh := substring(h from 1 for 2);
  mm := substring(h from 4 for 2);
  ss := case when length(h) > 5 then substring(h from 7 for 2) else '00' end;
  -- Casting direto com o offset no literal (não `AT TIME ZONE`, que inverte o sinal do
  -- offset numérico: testado localmente, '... AT TIME ZONE ''-03:00''' dá o resultado
  -- 6h errado). Isto casa exatamente com o `new Date(iso)` do TS (valores.ts).
  return (ano || '-' || mes || '-' || dia || ' ' || hh || ':' || mm || ':' || ss || '-03:00')::timestamptz;
end;
$$;

-- ---------------------------------------------------------------------------
-- apuracao.gravar_ea20(jsonb)
-- ---------------------------------------------------------------------------
-- payload esperado: {
--   "disputa_id": bigint,           -- já existe (upsertDisputa continua no coletor)
--   "url_origem": text,
--   "etag": text | null,
--   "last_modified": text | null,
--   "arquivo_id": bigint | null,     -- id em apuracao.arquivo_bruto, se já gravado
--   "arquivo": { ... EA20 como veio do TSE, ArquivoResultado ... }
-- }
-- devolve: {"totalizacao_id": bigint, "candidatos": int, "removidos": int}
--
-- Não recalcula identidades (isso é `identidades.ts`, roda antes, no coletor). Assume que
-- o payload já passou pela validação de esquema — replica a gravação, não a validação.
create or replace function apuracao.gravar_ea20(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = apuracao, pg_temp
as $$
declare
  v_disputa_id      bigint  := (payload->>'disputa_id')::bigint;
  v_url             text    := payload->>'url_origem';
  v_etag            text    := payload->>'etag';
  v_last_modified   text    := payload->>'last_modified';
  v_arquivo_id      bigint  := (payload->>'arquivo_id')::bigint;
  v_arquivo         jsonb   := payload->'arquivo';
  v_cargo           jsonb   := v_arquivo->'carg'->0;
  v_s               jsonb   := v_arquivo->'s';
  v_e               jsonb   := v_arquivo->'e';
  v_v               jsonb   := v_arquivo->'v';
  v_totalizacao_id  bigint;
  v_candidatos      int     := 0;
  v_removidos       int     := 0;
  v_n               int;
begin
  if v_disputa_id is null then
    raise exception 'gravar_ea20: disputa_id ausente no payload';
  end if;
  if v_arquivo is null or v_cargo is null then
    raise exception 'gravar_ea20: payload sem arquivo/carg[0]';
  end if;

  -- 1) totalizacao — uma linha por versão (idg). Espelha linhaTotalizacao() de resultados.ts.
  insert into apuracao.totalizacao (
    disputa_id, arquivo_id, url_origem, idg, etag, last_modified,
    gerado_em, data_hora_total, coletado_em,
    andamento, sem_eleito_tse, mensagens_sem_eleito,
    secoes_total, secoes_totalizadas, secoes_nao_totalizadas,
    secoes_instaladas, secoes_nao_instaladas, secoes_sa, secoes_sna,
    pct_secoes_totalizadas,
    eleitorado_total, eleitorado_totalizado, eleitorado_nao_totalizado,
    eleitorado_instalado, eleitorado_nao_instalado, eleitorado_sa, eleitorado_sna,
    comparecimento, abstencao,
    total_votos, votos_validos_com_anulados, votos_validos, votos_nominais, votos_legenda,
    anulados, anulados_sub_judice, votos_sem_candidato, brancos, nulos, nulos_diretos,
    nulos_tecnicos, vscv
  ) values (
    v_disputa_id, v_arquivo_id, v_url, v_arquivo->>'idg', v_etag, v_last_modified,
    apuracao._tse_data_hora_utc(v_arquivo->>'dg', v_arquivo->>'hg'),
    apuracao._tse_data_hora_utc(v_arquivo->>'dt', v_arquivo->>'ht'),
    now(),
    apuracao._tse_texto(v_arquivo->>'and'),
    apuracao._tse_flag(v_arquivo->>'esae'),
    (select coalesce(array_agg(x), array[]::text[])
       from jsonb_array_elements_text(coalesce(v_arquivo->'mnae', '[]'::jsonb)) x),
    apuracao._tse_inteiro(v_s->>'ts'), apuracao._tse_inteiro(v_s->>'st'), apuracao._tse_inteiro(v_s->>'snt'),
    apuracao._tse_inteiro(v_s->>'si'), apuracao._tse_inteiro(v_s->>'sni'),
    apuracao._tse_inteiro(v_s->>'sa'), apuracao._tse_inteiro(v_s->>'sna'),
    apuracao._tse_percentual(v_s->>'pstn'),
    apuracao._tse_inteiro(v_e->>'te'), apuracao._tse_inteiro(v_e->>'est'), apuracao._tse_inteiro(v_e->>'esnt'),
    apuracao._tse_inteiro(v_e->>'esi'), apuracao._tse_inteiro(v_e->>'esni'),
    apuracao._tse_inteiro(v_e->>'esa'), apuracao._tse_inteiro(v_e->>'esna'),
    apuracao._tse_inteiro(v_e->>'c'), apuracao._tse_inteiro(v_e->>'a'),
    apuracao._tse_inteiro(v_v->>'tv'), apuracao._tse_inteiro(v_v->>'vvc'),
    apuracao._tse_inteiro(v_v->>'vv'), apuracao._tse_inteiro(v_v->>'vnom'), apuracao._tse_inteiro(v_v->>'vl'),
    apuracao._tse_inteiro(v_v->>'van'), apuracao._tse_inteiro(v_v->>'vansj'),
    apuracao._tse_inteiro(v_v->>'vsan'), apuracao._tse_inteiro(v_v->>'vb'),
    apuracao._tse_inteiro(v_v->>'tvn'), apuracao._tse_inteiro(v_v->>'vn'),
    apuracao._tse_inteiro(v_v->>'vnt'), apuracao._tse_inteiro(v_v->>'vscv')
  )
  on conflict (disputa_id, idg) do update set
    arquivo_id = excluded.arquivo_id,
    url_origem = excluded.url_origem,
    etag = excluded.etag,
    last_modified = excluded.last_modified,
    gerado_em = excluded.gerado_em,
    data_hora_total = excluded.data_hora_total,
    coletado_em = excluded.coletado_em,
    andamento = excluded.andamento,
    sem_eleito_tse = excluded.sem_eleito_tse,
    mensagens_sem_eleito = excluded.mensagens_sem_eleito,
    secoes_total = excluded.secoes_total,
    secoes_totalizadas = excluded.secoes_totalizadas,
    secoes_nao_totalizadas = excluded.secoes_nao_totalizadas,
    secoes_instaladas = excluded.secoes_instaladas,
    secoes_nao_instaladas = excluded.secoes_nao_instaladas,
    secoes_sa = excluded.secoes_sa,
    secoes_sna = excluded.secoes_sna,
    pct_secoes_totalizadas = excluded.pct_secoes_totalizadas,
    eleitorado_total = excluded.eleitorado_total,
    eleitorado_totalizado = excluded.eleitorado_totalizado,
    eleitorado_nao_totalizado = excluded.eleitorado_nao_totalizado,
    eleitorado_instalado = excluded.eleitorado_instalado,
    eleitorado_nao_instalado = excluded.eleitorado_nao_instalado,
    eleitorado_sa = excluded.eleitorado_sa,
    eleitorado_sna = excluded.eleitorado_sna,
    comparecimento = excluded.comparecimento,
    abstencao = excluded.abstencao,
    total_votos = excluded.total_votos,
    votos_validos_com_anulados = excluded.votos_validos_com_anulados,
    votos_validos = excluded.votos_validos,
    votos_nominais = excluded.votos_nominais,
    votos_legenda = excluded.votos_legenda,
    anulados = excluded.anulados,
    anulados_sub_judice = excluded.anulados_sub_judice,
    votos_sem_candidato = excluded.votos_sem_candidato,
    brancos = excluded.brancos,
    nulos = excluded.nulos,
    nulos_diretos = excluded.nulos_diretos,
    nulos_tecnicos = excluded.nulos_tecnicos,
    vscv = excluded.vscv
  returning id into v_totalizacao_id;

  -- 2) votacao_agrupamento — espelha normalizarHierarquia(): agr[] -> linha.
  insert into apuracao.votacao_agrupamento (
    disputa_id, totalizacao_id, numero, tipo, nome, composicao,
    vagas_obtidas, votos_nominais_validos, votos_apurados_nominais,
    votos_legenda_total, votos_legenda_pura, atualizado_em
  )
  select
    v_disputa_id, v_totalizacao_id,
    agr->>'n', agr->>'tp', apuracao._tse_texto(agr->>'nm'), apuracao._tse_texto(agr->>'com'),
    apuracao._tse_inteiro(agr->>'vag'), apuracao._tse_inteiro(agr->>'tvtn'), apuracao._tse_inteiro(agr->>'tvan'),
    apuracao._tse_inteiro(agr->>'tvtl'), apuracao._tse_inteiro(agr->>'tval'), now()
  from jsonb_array_elements(coalesce(v_cargo->'agr', '[]'::jsonb)) agr
  on conflict (disputa_id, numero) do update set
    totalizacao_id = excluded.totalizacao_id,
    tipo = excluded.tipo,
    nome = excluded.nome,
    composicao = excluded.composicao,
    vagas_obtidas = excluded.vagas_obtidas,
    votos_nominais_validos = excluded.votos_nominais_validos,
    votos_apurados_nominais = excluded.votos_apurados_nominais,
    votos_legenda_total = excluded.votos_legenda_total,
    votos_legenda_pura = excluded.votos_legenda_pura,
    atualizado_em = excluded.atualizado_em;

  -- 3) votacao_partido — agr[] -> par[] -> linha.
  insert into apuracao.votacao_partido (
    disputa_id, totalizacao_id, numero, sigla, nome,
    agrupamento_numero, agrupamento_tipo, federacao_numero, destinacao,
    votos_nominais_validos, votos_apurados_nominais, votos_legenda_total, votos_legenda_pura,
    atualizado_em
  )
  select
    v_disputa_id, v_totalizacao_id,
    apuracao._tse_inteiro(par->>'n'), par->>'sg', apuracao._tse_texto(par->>'nm'),
    agr->>'n', agr->>'tp', apuracao._tse_texto(par->>'nfed'), apuracao._tse_texto(par->>'dvt'),
    apuracao._tse_inteiro(par->>'tvtn'), apuracao._tse_inteiro(par->>'tvan'),
    apuracao._tse_inteiro(par->>'tvtl'), apuracao._tse_inteiro(par->>'tval'), now()
  from jsonb_array_elements(coalesce(v_cargo->'agr', '[]'::jsonb)) agr
  cross join lateral jsonb_array_elements(coalesce(agr->'par', '[]'::jsonb)) par
  on conflict (disputa_id, numero) do update set
    totalizacao_id = excluded.totalizacao_id,
    sigla = excluded.sigla,
    nome = excluded.nome,
    agrupamento_numero = excluded.agrupamento_numero,
    agrupamento_tipo = excluded.agrupamento_tipo,
    federacao_numero = excluded.federacao_numero,
    destinacao = excluded.destinacao,
    votos_nominais_validos = excluded.votos_nominais_validos,
    votos_apurados_nominais = excluded.votos_apurados_nominais,
    votos_legenda_total = excluded.votos_legenda_total,
    votos_legenda_pura = excluded.votos_legenda_pura,
    atualizado_em = excluded.atualizado_em;

  -- 4) votacao_candidato — agr[] -> par[] -> cand[] -> linha.
  insert into apuracao.votacao_candidato (
    disputa_id, totalizacao_id, sqcand, numero, nome, nome_urna,
    partido_numero, partido_sigla, agrupamento_numero, agrupamento_tipo,
    posicao, votos_apurados, pct_tse, destinacao, situacao, eleito, substituidos, atualizado_em
  )
  select
    v_disputa_id, v_totalizacao_id,
    cand->>'sqcand', apuracao._tse_inteiro(cand->>'n'), apuracao._tse_texto(cand->>'nm'), cand->>'nmu',
    apuracao._tse_inteiro(par->>'n'), par->>'sg', agr->>'n', agr->>'tp',
    apuracao._tse_inteiro(cand->>'seq'), apuracao._tse_inteiro(cand->>'vap'), apuracao._tse_percentual(cand->>'pvapn'),
    apuracao._tse_texto(cand->>'dvt'), apuracao._tse_texto(cand->>'st'), apuracao._tse_flag(cand->>'e'),
    case when jsonb_array_length(coalesce(cand->'subs', '[]'::jsonb)) > 0 then cand->'subs' else null end,
    now()
  from jsonb_array_elements(coalesce(v_cargo->'agr', '[]'::jsonb)) agr
  cross join lateral jsonb_array_elements(coalesce(agr->'par', '[]'::jsonb)) par
  cross join lateral jsonb_array_elements(coalesce(par->'cand', '[]'::jsonb)) cand
  on conflict (disputa_id, sqcand) do update set
    totalizacao_id = excluded.totalizacao_id,
    numero = excluded.numero,
    nome = excluded.nome,
    nome_urna = excluded.nome_urna,
    partido_numero = excluded.partido_numero,
    partido_sigla = excluded.partido_sigla,
    agrupamento_numero = excluded.agrupamento_numero,
    agrupamento_tipo = excluded.agrupamento_tipo,
    posicao = excluded.posicao,
    votos_apurados = excluded.votos_apurados,
    pct_tse = excluded.pct_tse,
    destinacao = excluded.destinacao,
    situacao = excluded.situacao,
    eleito = excluded.eleito,
    substituidos = excluded.substituidos,
    atualizado_em = excluded.atualizado_em;
  -- (candidate_id e pct_validos_calc_electiolab ficam de fora do payload de propósito —
  -- não são dados do TSE; o upsert do PostgREST hoje também só escreve as colunas
  -- presentes, então o comportamento aqui é o mesmo.)

  get diagnostics v_candidatos = row_count;

  -- 5) candidato_vinculado (vice/suplentes) — cand.vs[] -> linha, por sqcand do candidato.
  insert into apuracao.candidato_vinculado (
    votacao_candidato_id, papel, sqcand, nome, nome_urna, partido_sigla
  )
  select
    vc.id,
    case vs->>'tp' when 'v' then 'vice' when 's1' then 'suplente_1' when 's2' then 'suplente_2' end,
    apuracao._tse_texto(vs->>'sqcand'), apuracao._tse_texto(vs->>'nm'),
    apuracao._tse_texto(vs->>'nmu'), apuracao._tse_texto(vs->>'sgp')
  from jsonb_array_elements(coalesce(v_cargo->'agr', '[]'::jsonb)) agr
  cross join lateral jsonb_array_elements(coalesce(agr->'par', '[]'::jsonb)) par
  cross join lateral jsonb_array_elements(coalesce(par->'cand', '[]'::jsonb)) cand
  cross join lateral jsonb_array_elements(coalesce(cand->'vs', '[]'::jsonb)) vs
  join apuracao.votacao_candidato vc
    on vc.disputa_id = v_disputa_id and vc.sqcand = cand->>'sqcand'
  where vs->>'tp' in ('v', 's1', 's2')
  on conflict (votacao_candidato_id, papel) do update set
    sqcand = excluded.sqcand,
    nome = excluded.nome,
    nome_urna = excluded.nome_urna,
    partido_sigla = excluded.partido_sigla;

  -- 6) remove o que saiu do arquivo novo (mesma regra de repositorio.substituirVotacao:
  -- ficou com totalizacao_id nulo ou de versão anterior). candidato_vinculado cai junto
  -- por on delete cascade (votacao_candidato_id) — repositorio.ts também não o limpa à
  -- parte, só por cascade do banco.
  delete from apuracao.votacao_candidato
   where disputa_id = v_disputa_id
     and (totalizacao_id is null or totalizacao_id <> v_totalizacao_id);
  get diagnostics v_n = row_count; v_removidos := v_removidos + v_n;

  delete from apuracao.votacao_partido
   where disputa_id = v_disputa_id
     and (totalizacao_id is null or totalizacao_id <> v_totalizacao_id);
  get diagnostics v_n = row_count; v_removidos := v_removidos + v_n;

  delete from apuracao.votacao_agrupamento
   where disputa_id = v_disputa_id
     and (totalizacao_id is null or totalizacao_id <> v_totalizacao_id);
  get diagnostics v_n = row_count; v_removidos := v_removidos + v_n;

  return jsonb_build_object(
    'totalizacao_id', v_totalizacao_id,
    'candidatos', v_candidatos,
    'removidos', v_removidos
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões — só o coletor (service_role) chama isto; ninguém mais.
-- ---------------------------------------------------------------------------
revoke all on function apuracao._tse_inteiro(text) from public;
revoke all on function apuracao._tse_percentual(text) from public;
revoke all on function apuracao._tse_texto(text) from public;
revoke all on function apuracao._tse_flag(text) from public;
revoke all on function apuracao._tse_data_hora_utc(text, text) from public;
revoke all on function apuracao.gravar_ea20(jsonb) from public;

grant execute on function apuracao._tse_inteiro(text) to service_role;
grant execute on function apuracao._tse_percentual(text) to service_role;
grant execute on function apuracao._tse_texto(text) to service_role;
grant execute on function apuracao._tse_flag(text) to service_role;
grant execute on function apuracao._tse_data_hora_utc(text, text) to service_role;
grant execute on function apuracao.gravar_ea20(jsonb) to service_role;
