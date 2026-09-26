-- Apuração ao vivo (Eleições Gerais 2026) — schema `apuracao`.
--
-- Fonte: arquivos JSON públicos do TSE (ele-c/EA11, EA12, EA14, EA15, EA20, EA10).
-- Base do desenho: apuracao-2026/docs/arquitetura.md ("Mapa de campos" e
-- "Consequências para a Fase 1"). Rascunho anterior: apuracao-2026/migrations/0001_apuracao.sql.
--
-- NÃO aplicar sem aprovação (CLAUDE.md, regra 9): Luiz aplica no SQL Editor do
-- Supabase antes do merge. Este arquivo é o registro do que foi aplicado.
--
-- Regras de dados (CLAUDE.md, regra 1):
--   * Números do TSE são gravados como vieram (inteiros exatos; percentuais a
--     partir das variantes `…n` de 9 casas, vírgula -> ponto, sem arredondar).
--   * Nada calculado pelo Electiolab entra numa coluna do TSE. Cálculos derivados
--     ficam em colunas próprias, com sufixo `_calc_electiolab`.
--
-- Política de retenção / série temporal (decisão de 26/09/2026):
--   * `totalizacao`: UMA LINHA POR VERSÃO (idg) de cada (eleição, cargo, abrangência).
--     É a série temporal da noite.
--   * `votacao_candidato`, `votacao_partido`, `votacao_agrupamento`,
--     `candidato_vinculado`: SÓ O ÚLTIMO SNAPSHOT por (eleição, cargo, abrangência),
--     via upsert (chave natural por disputa). Linhas que sumiram do arquivo mais
--     novo devem ser apagadas pelo coletor na mesma transação.
--   * `arquivo_bruto` (coluna `retencao`):
--       - majoritários (Presidente, Governador, Senador) em BR/UF: TODAS as versões ('completa');
--       - proporcionais (Dep. Federal/Estadual/Distrital): a versão final ('final', and='f')
--         mais um marco a cada ~10% de seções totalizadas ('marco'); a versão mais recente
--         fica como 'ultima' e é apagada quando a próxima chega, a menos que vire marco/final.
--     `totalizacao.arquivo_id` é anulável (on delete set null) por isso; a versão
--     continua registrada em `totalizacao` com url/idg/etag/coleta mesmo sem o bruto.

create schema if not exists apuracao;

-- ---------------------------------------------------------------------------
-- Referência
-- ---------------------------------------------------------------------------

-- Eleições (de ele-c.json, pl[].e[]). 1º e 2º turno são eleições separadas
-- (o 2º turno tem código próprio em `cdt2`).
create table if not exists apuracao.eleicao (
  id                  serial primary key,
  ambiente            text not null check (ambiente in ('simulado','oficial')),
  codigo_eleicao      integer not null,               -- e[].cd (ex.: 21270 / 6257)
  codigo_eleicao_2t   integer,                        -- e[].cdt2 (2º turno; null no municipal)
  codigo_pleito       integer not null,               -- pl[].cd (ex.: 17801 / 3220)
  sqele               text,                           -- e[].sqele
  ciclo               text,                           -- pl[].c (ex.: 'ele2026')
  turno               smallint not null,              -- e[].t
  tipo                smallint,                       -- e[].tp (8 federal, 1 estadual, 3 municipal)
  descricao           text,                           -- e[].nm
  data_pleito         date,                           -- pl[].dt (fictícia no simulado)
  bruto               jsonb,
  atualizado_em       timestamptz not null default now(),
  unique (ambiente, codigo_eleicao)
);

-- Cargos por eleição (ele-c.json, e[].abr[].cp[]).
create table if not exists apuracao.cargo (
  id            serial primary key,
  eleicao_id    integer not null references apuracao.eleicao(id),
  codigo        integer not null,                     -- cp.cd (1,3,5,6,7,8; 25 fora do escopo)
  nome          text not null,                        -- cp.ds
  tipo_disputa  text not null check (tipo_disputa in ('majoritario','proporcional')), -- cp.tp 1/2
  unique (eleicao_id, codigo)
);

-- Tradução do código de cargo do TSE para `public.elections.type`.
-- Vínculo aprovado em 26/09/2026: (tipo, UF, ano, turno) — nunca por elections.tse_id (null em 2026).
create table if not exists apuracao.cargo_tipo (
  codigo_cargo     integer primary key,
  elections_type   text not null unique
);
insert into apuracao.cargo_tipo (codigo_cargo, elections_type) values
  (1, 'presidente'),
  (3, 'governador'),
  (5, 'senador'),
  (6, 'deputado_federal'),
  (7, 'deputado_estadual'),
  (8, 'deputado_distrital')
on conflict (codigo_cargo) do nothing;

-- Municípios (EA12). Exterior = uf 'zz' (184 "municípios", sem código IBGE).
create table if not exists apuracao.municipio (
  id            serial primary key,
  eleicao_id    integer not null references apuracao.eleicao(id),
  uf            text not null check (char_length(uf) = 2),
  codigo_tse    text not null check (codigo_tse ~ '^[0-9]{5}$'),  -- sempre 5 dígitos
  codigo_ibge   text check (codigo_ibge ~ '^[0-9]{7}$'),          -- null no Exterior (TSE manda '')
  nome          text not null,
  capital       boolean not null default false,
  unique (eleicao_id, codigo_tse)
);
create index if not exists idx_apuracao_municipio_uf on apuracao.municipio (eleicao_id, uf);

-- ---------------------------------------------------------------------------
-- Coleta (uso interno do coletor: sem leitura pública)
-- ---------------------------------------------------------------------------

-- Todo arquivo baixado com sucesso (200) que a política de retenção manda guardar.
create table if not exists apuracao.arquivo_bruto (
  id            bigserial primary key,
  url           text not null,
  tipo          text not null check (tipo in ('EA10','EA11','EA12','EA14','EA15','EA20')),
  idg           text not null,                        -- IDG do topo do arquivo
  etag          text,
  last_modified text,
  retencao      text not null default 'completa'
                check (retencao in ('completa','marco','final','ultima')),
  pct_secoes_totalizadas numeric(12,9),               -- s.pstn no momento (base do marco de ~10%)
  conteudo      jsonb not null,
  coletado_em   timestamptz not null default now(),
  unique (url, idg)
);
create index if not exists idx_apuracao_arquivo_bruto_url on apuracao.arquivo_bruto (url, coletado_em desc);
create index if not exists idx_apuracao_arquivo_bruto_ultima on apuracao.arquivo_bruto (url) where retencao = 'ultima';

-- Log de cada execução do coletor.
create table if not exists apuracao.coletor_execucao (
  id               bigserial primary key,
  iniciado_em      timestamptz not null default now(),
  finalizado_em    timestamptz,
  ambiente         text not null check (ambiente in ('simulado','oficial')),
  requisicoes      integer not null default 0,
  respostas_200    integer not null default 0,
  respostas_304    integer not null default 0,
  respostas_404    integer not null default 0,
  respostas_429    integer not null default 0,
  respostas_5xx    integer not null default 0,
  erros            integer not null default 0,
  mensagem         text
);
create index if not exists idx_apuracao_coletor_execucao_inicio on apuracao.coletor_execucao (iniciado_em desc);

-- Circuit breaker de 404 (CLAUDE.md, regra 3). O cron da Vercel é sem estado entre
-- execuções, então a quarentena precisa ser persistida: URL que deu 404 não é pedida
-- de novo até `liberada_em` (a config/acompanhamento passar a indicar que existe).
create table if not exists apuracao.url_quarentena (
  url             text primary key,
  status_http     smallint not null,
  primeira_vez    timestamptz not null default now(),
  ultima_vez      timestamptz not null default now(),
  tentativas      integer not null default 1,
  liberada_em     timestamptz
);

-- ---------------------------------------------------------------------------
-- Acompanhamento (EA14 Brasil / EA15 UF): SÓ O ESTADO ATUAL por (eleição, abrangência).
-- É o que o coletor compara (dt+ht, idg) para decidir quais EA20 baixar.
-- ---------------------------------------------------------------------------
create table if not exists apuracao.acompanhamento (
  id                   bigserial primary key,
  eleicao_id           integer not null references apuracao.eleicao(id),
  abrangencia          text not null,                 -- 'br' | uf ('mg','zz') | uf||mun5 ('mg41238')
  tipo_abrangencia     text not null check (tipo_abrangencia in ('br','uf','mun')),
  uf                   text,
  municipio_codigo     text,
  andamento            text,                          -- 'and' (só 'f' visto)
  data_hora_total      timestamptz,                   -- dt + ht (Brasília -> UTC)
  secoes_total         integer,                       -- s.ts
  secoes_totalizadas   integer,                       -- s.st
  secoes_nao_totalizadas integer,                     -- s.snt
  pct_secoes_totalizadas numeric(12,9),               -- s.pstn
  municipios_nao_recebidos integer,                   -- munnr   (só uf)
  municipios_parciais      integer,                   -- munpt   (só uf)
  municipios_finais        integer,                   -- munf    (só uf)
  ufs_nao_recebidas        integer,                   -- ufsnr   (só br)
  ufs_parciais             integer,                   -- ufspt   (só br)
  ufs_finais               integer,                   -- ufsf    (só br)
  idg                  text,                          -- IDG do arquivo EA14/EA15 de origem
  url_origem           text,
  etag                 text,
  arquivo_id           bigint references apuracao.arquivo_bruto(id) on delete set null,
  coletado_em          timestamptz not null default now(),
  unique (eleicao_id, abrangencia)
);

-- ---------------------------------------------------------------------------
-- Disputa = (eleição, cargo, abrangência). Âncora do "último snapshot".
-- ---------------------------------------------------------------------------
create table if not exists apuracao.disputa (
  id                   bigserial primary key,
  eleicao_id           integer not null references apuracao.eleicao(id),
  cargo_id             integer not null references apuracao.cargo(id),
  abrangencia          text not null,                 -- mesmo formato de acompanhamento.abrangencia
  tipo_abrangencia     text not null check (tipo_abrangencia in ('br','uf','mun')),
  uf                   text,
  municipio_codigo     text,
  vagas                smallint,                      -- carg.nv (Senado 2; Dep. Federal AC 8...)
  quociente_eleitoral  integer,                       -- carg.qe, valor OFICIAL do TSE (só proporcional); nunca recalculado
  election_id          uuid references public.elections(id) on delete set null,  -- (tipo, UF, ano, turno)
  criado_em            timestamptz not null default now(),
  unique (eleicao_id, cargo_id, abrangencia)
);
create index if not exists idx_apuracao_disputa_election on apuracao.disputa (election_id);

-- Série temporal: uma linha por versão (idg) de cada disputa.
create table if not exists apuracao.totalizacao (
  id                        bigserial primary key,
  disputa_id                bigint not null references apuracao.disputa(id) on delete cascade,
  arquivo_id                bigint references apuracao.arquivo_bruto(id) on delete set null, -- ver política de retenção
  url_origem                text not null,
  idg                       text not null,
  etag                      text,
  last_modified             text,
  gerado_em                 timestamptz,              -- dg + hg (geração do arquivo)
  data_hora_total           timestamptz,              -- dt + ht (totalização)
  coletado_em               timestamptz not null default now(),
  -- andamento e "sem eleito"
  andamento                 text,                     -- and
  sem_eleito_tse            boolean,                  -- esae = 's' (TSE não declara eleito; motivos em mensagens_sem_eleito)
  mensagens_sem_eleito      text[],                   -- mnae
  -- seções (s)
  secoes_total              integer,                  -- ts
  secoes_totalizadas        integer,                  -- st
  secoes_nao_totalizadas    integer,                  -- snt   (ts = st + snt)
  secoes_instaladas         integer,                  -- si    [inferido]
  secoes_nao_instaladas     integer,                  -- sni   [inferido]
  secoes_sa                 integer,                  -- sa    [significado a confirmar na spec]
  secoes_sna                integer,                  -- sna   [significado a confirmar na spec]
  pct_secoes_totalizadas    numeric(12,9),            -- pstn
  -- eleitorado (e)
  eleitorado_total          bigint,                   -- te
  eleitorado_totalizado     bigint,                   -- est
  eleitorado_nao_totalizado bigint,                   -- esnt
  eleitorado_instalado      bigint,                   -- esi
  eleitorado_nao_instalado  bigint,                   -- esni
  eleitorado_sa             bigint,                   -- esa   [a confirmar]
  eleitorado_sna            bigint,                   -- esna  [a confirmar]
  comparecimento            bigint,                   -- c    (c + a = esi)
  abstencao                 bigint,                   -- a
  -- votos (v) — colunas explícitas: o TSE tem vv, vvc e tv (não confundir)
  total_votos               bigint,                   -- tv
  votos_validos_com_anulados bigint,                  -- vvc  (= vv + van + vansj)
  votos_validos             bigint,                   -- vv
  votos_nominais            bigint,                   -- vnom
  votos_legenda             bigint,                   -- vl   (só proporcional; vv = vnom + vl)
  anulados                  bigint,                   -- van
  anulados_sub_judice       bigint,                   -- vansj
  votos_sem_candidato       bigint,                   -- vsan (parcela de van sem candidato listado)
  brancos                   bigint,                   -- vb
  nulos                     bigint,                   -- tvn  (= vn + vnt)
  nulos_diretos             bigint,                   -- vn
  nulos_tecnicos            bigint,                   -- vnt
  vscv                      bigint,                   -- vscv [significado a confirmar; sempre 0 nas amostras]
  unique (disputa_id, idg)
);
create index if not exists idx_apuracao_totalizacao_disputa on apuracao.totalizacao (disputa_id, coletado_em desc, id desc);

-- Último snapshot por disputa: agrupamentos (partido isolado / coligação / federação).
create table if not exists apuracao.votacao_agrupamento (
  id                bigserial primary key,
  disputa_id        bigint not null references apuracao.disputa(id) on delete cascade,
  totalizacao_id    bigint references apuracao.totalizacao(id) on delete set null, -- versão a que se refere
  numero            text not null,                    -- agr.n (id de 8 dígitos)
  tipo              text not null check (tipo in ('i','c','f')),  -- partido isolado / coligação / federação
  nome              text,
  composicao        text,                             -- agr.com
  vagas_obtidas     smallint,                         -- agr.vag (proporcional; Σ = disputa.vagas. Sem sentido em majoritário)
  votos_nominais_validos bigint,                      -- tvtn
  votos_apurados_nominais bigint,                     -- tvan
  votos_legenda_total    bigint,                      -- tvtl (proporcional)
  votos_legenda_pura     bigint,                      -- tval (proporcional; tvtl - tval = votos de candidatos com dvt 'Válido (legenda)')
  atualizado_em     timestamptz not null default now(),
  unique (disputa_id, numero)
);

-- Último snapshot por disputa: partidos (votos nominais + legenda nos proporcionais).
create table if not exists apuracao.votacao_partido (
  id                bigserial primary key,
  disputa_id        bigint not null references apuracao.disputa(id) on delete cascade,
  totalizacao_id    bigint references apuracao.totalizacao(id) on delete set null,
  numero            integer not null,                 -- par.n
  sigla             text not null,                    -- par.sg
  nome              text,                             -- par.nm
  agrupamento_numero text,                            -- agr.n do agrupamento a que pertence
  agrupamento_tipo  text check (agrupamento_tipo in ('i','c','f')),
  federacao_numero  text,                             -- par.nfed ('' -> null)
  destinacao        text,                             -- par.dvt (ex.: 'Válido (legenda)')
  votos_nominais_validos bigint,                      -- tvtn
  votos_apurados_nominais bigint,                     -- tvan (= Σ cand.vap do partido)
  votos_legenda_total    bigint,                      -- tvtl
  votos_legenda_pura     bigint,                      -- tval
  atualizado_em     timestamptz not null default now(),
  unique (disputa_id, numero)
);

-- Último snapshot por disputa: candidatos.
create table if not exists apuracao.votacao_candidato (
  id                bigserial primary key,
  disputa_id        bigint not null references apuracao.disputa(id) on delete cascade,
  totalizacao_id    bigint references apuracao.totalizacao(id) on delete set null,
  sqcand            text not null,                    -- cand.sqcand (8 dígitos no simulado; 12 no oficial)
  numero            integer not null,                 -- cand.n (número de urna)
  nome              text,                             -- cand.nm
  nome_urna         text not null,                    -- cand.nmu
  partido_numero    integer,                          -- par.n
  partido_sigla     text,                             -- par.sg
  agrupamento_numero text,                            -- agr.n
  agrupamento_tipo  text check (agrupamento_tipo in ('i','c','f')),
  posicao           integer,                          -- cand.seq (majoritário: ordem decrescente de votos; NÃO é o sequencial do candidato)
  votos_apurados    bigint not null,                  -- cand.vap
  pct_tse           numeric(12,9),                    -- cand.pvapn, como veio (denominador do TSE = vvc - vsan, NÃO votos válidos)
  destinacao        text,                             -- cand.dvt: 'Válido' | 'Válido (legenda)' | 'Anulado' | 'Anulado sub judice'
  situacao          text,                             -- cand.st, como veio: 'Eleito' | 'Eleito por média' | '2º turno' | 'Suplente' | 'Não eleito'
  eleito            boolean not null default false,   -- cand.e = 's' (inclui '2º turno' nos majoritários)
  substituidos      jsonb,                            -- cand.subs[] ({nm,nmu,sgp}, sem sqcand): candidatos substituídos por este
  -- Cálculo Electiolab (NÃO é dado do TSE). Preenchido só na Fase 4, sobre votos válidos,
  -- e só com a abrangência 100% totalizada. Sempre rotulado "cálculo Electiolab" na UI.
  pct_validos_calc_electiolab numeric(12,9),
  -- Ligação opcional com o cadastro do Electiolab. Casamento (número + UF + cargo) na
  -- Fase 2, contra o oficial; no simulado sqcand não casa com candidates.tse_id.
  candidate_id      uuid references public.candidates(id) on delete set null,
  atualizado_em     timestamptz not null default now(),
  unique (disputa_id, sqcand)
);
create index if not exists idx_apuracao_votacao_candidato_rank on apuracao.votacao_candidato (disputa_id, posicao);
create index if not exists idx_apuracao_votacao_candidato_candidate on apuracao.votacao_candidato (candidate_id) where candidate_id is not null;

-- Vice (Presidente/Governador: 'v') e suplentes (Senado: 's1','s2') de cada candidato.
create table if not exists apuracao.candidato_vinculado (
  id                    bigserial primary key,
  votacao_candidato_id  bigint not null references apuracao.votacao_candidato(id) on delete cascade,
  papel                 text not null check (papel in ('vice','suplente_1','suplente_2')), -- vs[].tp: v, s1, s2
  sqcand                text,
  nome                  text,
  nome_urna             text,
  partido_sigla         text,                         -- vs[].sgp
  unique (votacao_candidato_id, papel)
);

-- Eleitos (EA10). PROVISÓRIA: sem amostra do EA10 (só existe após a 1ª totalização final,
-- e a spec em PDF ainda não foi reconciliada). O que a spec mudar entra em migration de ajuste.
create table if not exists apuracao.eleito (
  id            bigserial primary key,
  disputa_id    bigint not null references apuracao.disputa(id) on delete cascade,
  numero        integer not null,
  sqcand        text,
  nome_urna     text,
  partido_sigla text,
  situacao      text,
  bruto         jsonb,                                -- item do EA10 como veio
  arquivo_id    bigint references apuracao.arquivo_bruto(id) on delete set null,
  coletado_em   timestamptz not null default now(),
  unique (disputa_id, numero)
);

-- ---------------------------------------------------------------------------
-- Views de conveniência (security_invoker: respeitam a RLS de quem consulta)
-- ---------------------------------------------------------------------------

-- Versão mais recente de cada disputa.
create or replace view apuracao.v_totalizacao_atual
with (security_invoker = true) as
select distinct on (disputa_id) *
from apuracao.totalizacao
order by disputa_id, coletado_em desc, id desc;

-- Situação da disputa, DERIVADA dos rótulos do próprio TSE (nenhum número é calculado):
--   sem_eleito    -> esae = 's' (TSE informa que não há eleito; motivos em mensagens_sem_eleito)
--   eleito        -> algum candidato com situacao 'Eleito%' (inclui 'Eleito por média')
--   segundo_turno -> algum candidato com situacao '2º turno'
--   em_apuracao   -> nenhum dos anteriores
-- "Matematicamente definida" NÃO tem campo próprio no TSE: nas amostras (RR, AP, MA, MG) o
-- arquivo só traz `and`='f', `esae`/`mnae` e o rótulo por candidato. Se o TSE rotular 'Eleito'
-- antes de 100% das seções, é isso que esta view mostra; o ensaio de 28–29/09 confirma.
create or replace view apuracao.v_disputa_situacao
with (security_invoker = true) as
select
  d.id as disputa_id,
  t.id as totalizacao_id,
  t.andamento,
  t.pct_secoes_totalizadas,
  case
    when t.sem_eleito_tse is true then 'sem_eleito'
    when exists (select 1 from apuracao.votacao_candidato c
                 where c.disputa_id = d.id and c.situacao like 'Eleito%') then 'eleito'
    when exists (select 1 from apuracao.votacao_candidato c
                 where c.disputa_id = d.id and c.situacao = '2º turno') then 'segundo_turno'
    else 'em_apuracao'
  end as situacao_tse_derivada
from apuracao.disputa d
left join apuracao.v_totalizacao_atual t on t.disputa_id = d.id;

-- ---------------------------------------------------------------------------
-- Permissões e RLS
-- ---------------------------------------------------------------------------
-- Tabelas de EXIBIÇÃO: leitura pública (anon/authenticated). Escrita só pelo coletor
-- (service_role, que ignora RLS). Tabelas internas (arquivo_bruto, coletor_execucao,
-- url_quarentena): RLS ligada e nenhuma policy -> só service_role.

grant usage on schema apuracao to anon, authenticated, service_role;
grant all on all tables in schema apuracao to service_role;
grant all on all sequences in schema apuracao to service_role;

alter table apuracao.eleicao               enable row level security;
alter table apuracao.cargo                 enable row level security;
alter table apuracao.cargo_tipo            enable row level security;
alter table apuracao.municipio             enable row level security;
alter table apuracao.acompanhamento        enable row level security;
alter table apuracao.disputa               enable row level security;
alter table apuracao.totalizacao           enable row level security;
alter table apuracao.votacao_agrupamento   enable row level security;
alter table apuracao.votacao_partido       enable row level security;
alter table apuracao.votacao_candidato     enable row level security;
alter table apuracao.candidato_vinculado   enable row level security;
alter table apuracao.eleito                enable row level security;
alter table apuracao.arquivo_bruto         enable row level security;
alter table apuracao.coletor_execucao      enable row level security;
alter table apuracao.url_quarentena        enable row level security;

grant select on
  apuracao.eleicao, apuracao.cargo, apuracao.cargo_tipo, apuracao.municipio,
  apuracao.acompanhamento, apuracao.disputa, apuracao.totalizacao,
  apuracao.votacao_agrupamento, apuracao.votacao_partido, apuracao.votacao_candidato,
  apuracao.candidato_vinculado, apuracao.eleito,
  apuracao.v_totalizacao_atual, apuracao.v_disputa_situacao
to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'eleicao','cargo','cargo_tipo','municipio','acompanhamento','disputa','totalizacao',
    'votacao_agrupamento','votacao_partido','votacao_candidato','candidato_vinculado','eleito'
  ] loop
    begin
      execute format('create policy "Public read %1$s" on apuracao.%1$I for select using (true)', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Exposição do schema `apuracao` na API (PostgREST)
-- ---------------------------------------------------------------------------
-- NÃO é feita por SQL. Depois de aplicar esta migration, o Luiz expõe o schema pelo
-- painel: Settings > API > Exposed schemas (adicionar `apuracao`, mantendo os atuais).
-- Sem isso, o schema existe e as policies valem, mas a API REST/supabase-js não o enxerga.
