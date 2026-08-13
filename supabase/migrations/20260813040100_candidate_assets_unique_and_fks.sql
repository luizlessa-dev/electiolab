-- candidate_assets não tinha nenhuma constraint além do PK(id), então os upserts
-- de scripts/ingest-tse-extended.ts duplicavam bem a cada rerun. Fecha com a chave
-- natural do TSE (SQ_CANDIDATO implícito em candidate_id + ano + NR_ORDEM_BEM_CANDIDATO).
do $$ begin
  alter table candidate_assets
    add constraint candidate_assets_candidate_year_order_key
    unique (candidate_id, election_year, asset_order);
exception when duplicate_object then null; end $$;

-- Nenhuma das 5 tabelas de candidato tinha FK declarada pra candidates(id) — risco de
-- linha órfã silenciosa. Todas estão vazias agora (2026-08-13), é o único momento em
-- que dá pra adicionar sem risco de violação por dado já existente.
do $$ begin
  alter table candidate_assets
    add constraint candidate_assets_candidate_id_fkey
    foreign key (candidate_id) references candidates(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table candidate_fefc
    add constraint candidate_fefc_candidate_id_fkey
    foreign key (candidate_id) references candidates(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table candidate_social_media
    add constraint candidate_social_media_candidate_id_fkey
    foreign key (candidate_id) references candidates(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table prior_election_results
    add constraint prior_election_results_candidate_id_fkey
    foreign key (candidate_id) references candidates(id) on delete cascade;
exception when duplicate_object then null; end $$;
