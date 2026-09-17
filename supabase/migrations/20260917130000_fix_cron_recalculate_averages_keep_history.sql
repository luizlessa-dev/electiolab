-- O cron a cada 6h (jobid 3, cron_recalculate_averages) chamava a Edge Function
-- com keep_history=true, que faz INSERT puro em weighted_averages. Em 12/09 foi
-- criado o índice único weighted_averages_current_key (election_id, candidate_id,
-- scenario_label), incompatível com esse modo: toda chamada após a primeira falha
-- com "duplicate key value violates unique constraint", silenciosamente (a Edge
-- Function responde HTTP 200 mesmo com elections_failed alto, e o pg_cron só
-- confere se a chamada HTTP foi disparada, não o resultado).
--
-- A própria Edge Function já documenta "keepHistory=false (padrão, usado pelo
-- cron)" e usa a RPC recalc_replace_weighted_averages (DELETE+INSERT atômico,
-- construída em 04/09) nesse modo, compatível com a constraint. Esse fix só
-- alinha a chamada do cron com o que o código já esperava.
create or replace function public.cron_recalculate_averages()
returns bigint
language plpgsql
security definer
set search_path to 'public', 'vault', 'net', 'extensions'
as $function$
declare
  v_url   text;
  v_token text;
  v_req_id bigint;
begin
  select decrypted_secret into v_url   from vault.decrypted_secrets where name = 'project_url'      limit 1;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if v_url is null or v_token is null then
    raise exception 'Secrets project_url/service_role_key não encontrados no vault';
  end if;

  select net.http_post(
    url := v_url || '/functions/v1/recalculate-averages?all=true&keep_history=false',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_token,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) into v_req_id;

  return v_req_id;
end;
$function$;
