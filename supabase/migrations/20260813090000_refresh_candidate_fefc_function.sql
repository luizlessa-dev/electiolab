-- scripts/refresh-candidate-fefc.ts fazia a agregação paginando linhas cruas
-- via PostgREST (.range() em lotes de 1000) e somando no Node. Contra
-- candidate_revenue com ~662k linhas de 2022, a query com
-- `fonte_receita ilike '%FUNDO ESPECIAL%'` faz sequential scan (~10s,
-- confirmado via EXPLAIN ANALYZE) — e paginar client-side multiplica esse
-- custo por ~663 páginas, além de estourar o statement_timeout padrão do
-- PostgREST (~8s) já na primeira chamada.
--
-- Move a agregação inteira pra uma única função SQL server-side, chamada via
-- RPC — 1 query agregada em vez de centenas de queries paginadas, e
-- `set statement_timeout` próprio evita o limite da API pra essa operação
-- batch (não é um endpoint latency-sensitive, roda 1x por execução do cron).
create or replace function refresh_candidate_fefc(p_year integer)
returns integer
language plpgsql
security definer
set search_path = public
set statement_timeout = '120s'
as $$
declare
  v_count integer;
begin
  with fefc_receitas as (
    select candidate_id, sum(value_brl) as received, min(party_acronym) as party
    from candidate_revenue
    where election_year = p_year
      and candidate_id is not null
      and fonte_receita ilike '%FUNDO ESPECIAL%'
    group by candidate_id
  ),
  fefc_despesas as (
    select candidate_id, sum(value_brl) as spent
    from candidate_expense_paid
    where election_year = p_year
      and candidate_id is not null
    group by candidate_id
  ),
  merged as (
    select coalesce(r.candidate_id, d.candidate_id) as candidate_id,
           coalesce(r.received, 0) as received,
           coalesce(d.spent, 0) as spent,
           r.party
    from fefc_receitas r
    full outer join fefc_despesas d using (candidate_id)
  ),
  upserted as (
    insert into candidate_fefc (candidate_id, cpf, party_acronym, election_year, amount_received, amount_spent, source)
    select m.candidate_id, c.cpf, m.party, p_year, m.received, m.spent, 'TSE'
    from merged m
    join candidates c on c.id = m.candidate_id
    on conflict (candidate_id, election_year) do update
      set amount_received = excluded.amount_received,
          amount_spent = excluded.amount_spent,
          party_acronym = coalesce(excluded.party_acronym, candidate_fefc.party_acronym),
          fetched_at = now()
    returning 1
  )
  select count(*) into v_count from upserted;

  return v_count;
end;
$$;

comment on function refresh_candidate_fefc(integer) is
  'Recalcula candidate_fefc como agregado de candidate_revenue (FEFC)/candidate_expense_paid pro ano dado. Chamada por scripts/refresh-candidate-fefc.ts via RPC.';
