-- RPCs de suporte pra /candidatos e /comparar depois da expansão pra Deputado
-- Federal/Estadual/Distrital (candidates 582 → 16.909). Antes, /candidatos e
-- /comparar carregavam TODOS os candidatos ativos numa query só e filtravam/
-- paginavam no client — funcionava com ~580 linhas, não com 17k. Essas duas
-- funções dão pra listagem paginada no servidor sem precisar buscar tudo só
-- pra montar contadores/dropdown de partido.

create or replace function public.get_candidate_type_counts(p_year int)
returns table(election_type text, total bigint)
language sql stable as $$
  select e.type, count(*)::bigint
  from candidates c
  join elections e on e.id = c.election_id
  where c.is_active and e.year = p_year
  group by e.type;
$$;

create or replace function public.get_active_parties(p_year int)
returns table(party text)
language sql stable as $$
  select distinct c.party
  from candidates c
  join elections e on e.id = c.election_id
  where c.is_active and e.year = p_year and c.party is not null
  order by c.party;
$$;

grant execute on function public.get_candidate_type_counts(int) to anon, authenticated;
grant execute on function public.get_active_parties(int) to anon, authenticated;
