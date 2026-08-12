-- RPC: update_pesqele_missing
-- ============================================================================
-- Chamada por Agent 1 (TSE Ingestão) após ingerir dados novos em pesqele_registry.
-- Retorna contagem de registros TSE que ainda não têm entrada em polls (fila editorial).

create or replace function update_pesqele_missing(year integer default 2026)
returns json
language plpgsql
security definer
as $$
declare
  missing_count integer;
  result json;
begin
  -- Conta pesquisas registradas no TSE que ainda não estão em polls
  select count(*)
  into missing_count
  from pesqele_registry r
  left join polls p on p.tse_registration = r.protocolo
  where r.ano = year
    and r.dt_fim is not null
    and p.id is null;

  result := json_build_object(
    'year', year,
    'missing_count', missing_count,
    'timestamp', now()
  );

  return result;
end;
$$;

comment on function update_pesqele_missing is
  'Retorna contagem de pesquisas TSE PesqEle sem correspondência em polls (fila editorial). Chamada por Agent 1 após ingestão.';

-- Permissão: service role apenas (agentes usam isso)
grant execute on function update_pesqele_missing(integer) to service_role;
