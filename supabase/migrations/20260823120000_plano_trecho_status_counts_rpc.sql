-- RPC de apoio pra etapa 4 (interface de revisão de planos_trecho) — conta
-- trechos por tema e status agregando no servidor, em vez de buscar todas as
-- linhas pro client só pra contar (plano_trecho já passa de 1000 linhas, o
-- limite padrão de uma linha de select() sem paginação no PostgREST).
--
-- Só service_role executa — a contagem inclui pendente, que não é público.

create or replace function public.get_plano_trecho_status_counts(p_status text default 'pendente')
returns table(tema_id uuid, total bigint)
language sql stable
set search_path = public
as $$
  select tema_id, count(*)::bigint
  from plano_trecho
  where status = p_status
  group by tema_id;
$$;

grant execute on function public.get_plano_trecho_status_counts(text) to service_role;
