-- Expande a cobertura de candidaturas 2026 pra Deputado Federal/Estadual/Distrital
-- — decisão do produto: "candidatos famosos/celebridades" concorrendo a deputado
-- geram mais engajamento do que só as 55 corridas majoritárias (presidente/
-- governador/senador) já cobertas. Cria as 54 eleições que faltam:
--   Deputado Federal: 27 (26 estados + DF)
--   Deputado Estadual: 26 (todos os estados, exceto DF — que usa Distrital)
--   Deputado Distrital: 1 (só DF, câmara legislativa distrital)
--
-- elections nunca teve constraint além do PK(id) — adiciona UNIQUE antes de
-- inserir, pra deixar o insert idempotente (ON CONFLICT DO NOTHING) em reruns.
do $$ begin
  alter table elections
    add constraint elections_type_state_year_round_key
    unique (type, state, year, round);
exception when duplicate_object then null; end $$;

insert into elections (name, type, state, year, is_active)
select 'Deputado Federal ' || v.nome || ' 2026', 'deputado_federal', v.uf, 2026, true
from (values
  ('AC','Acre'), ('AL','Alagoas'), ('AM','Amazonas'), ('AP','Amapa'),
  ('BA','Bahia'), ('CE','Ceara'), ('DF','Distrito Federal'), ('ES','Espirito Santo'),
  ('GO','Goias'), ('MA','Maranhao'), ('MG','Minas Gerais'), ('MS','Mato Grosso do Sul'),
  ('MT','Mato Grosso'), ('PA','Para'), ('PB','Paraiba'), ('PE','Pernambuco'),
  ('PI','Piaui'), ('PR','Parana'), ('RJ','Rio de Janeiro'), ('RN','Rio Grande do Norte'),
  ('RO','Rondonia'), ('RR','Roraima'), ('RS','Rio Grande do Sul'), ('SC','Santa Catarina'),
  ('SE','Sergipe'), ('SP','Sao Paulo'), ('TO','Tocantins')
) as v(uf, nome)
on conflict (type, state, year, round) do nothing;

insert into elections (name, type, state, year, is_active)
select 'Deputado Estadual ' || v.nome || ' 2026', 'deputado_estadual', v.uf, 2026, true
from (values
  ('AC','Acre'), ('AL','Alagoas'), ('AM','Amazonas'), ('AP','Amapa'),
  ('BA','Bahia'), ('CE','Ceara'), ('ES','Espirito Santo'),
  ('GO','Goias'), ('MA','Maranhao'), ('MG','Minas Gerais'), ('MS','Mato Grosso do Sul'),
  ('MT','Mato Grosso'), ('PA','Para'), ('PB','Paraiba'), ('PE','Pernambuco'),
  ('PI','Piaui'), ('PR','Parana'), ('RJ','Rio de Janeiro'), ('RN','Rio Grande do Norte'),
  ('RO','Rondonia'), ('RR','Roraima'), ('RS','Rio Grande do Sul'), ('SC','Santa Catarina'),
  ('SE','Sergipe'), ('SP','Sao Paulo'), ('TO','Tocantins')
  -- sem DF — usa Deputado Distrital
) as v(uf, nome)
on conflict (type, state, year, round) do nothing;

insert into elections (name, type, state, year, is_active)
values ('Deputado Distrital Distrito Federal 2026', 'deputado_distrital', 'DF', 2026, true)
on conflict (type, state, year, round) do nothing;
