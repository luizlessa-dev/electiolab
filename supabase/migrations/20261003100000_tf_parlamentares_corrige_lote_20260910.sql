-- ⚠️  APLICAR NO PROJETO "transparencia-federal" (ref redggdtakzmsabwvjzhb),
--     NÃO no projeto ElectioLab (xoxztzologqeqbajlhya).
--     O arquivo mora aqui só como registro (regra do CLAUDE.md). Aplicação manual
--     pelo Luiz no SQL Editor do painel do Supabase do projeto TF. Não aplicada.
--
-- Corrige o lote de 90 deputados federais inseridos em `parlamentares` em
-- 2026-09-10 sem `casa_legislativa`, `legislatura` e `cpf` (ver
-- docs/BASTIDORES-POS-ELEICAO.md §2.2).
--
-- Estado verificado em 2026-10-03 (somente leitura):
--   • 90 linhas com casa_legislativa IS NULL; todas com id_camara, ativo = true
--     e mandato Deputado Federal / legislatura 57 em `mandatos`;
--   • `cam_parlamentar_risco.cpf` concorda com `parlamentares.cpf` em 553 de 553
--     deputados onde ambos existem (0 divergências), e tem CPF válido para 55
--     dos 90; os 55 passam no dígito verificador e nenhum colide com CPF já
--     usado por outra linha de `parlamentares`.
--
-- O que faz
--   1. casa_legislativa = 'camara' e legislatura = 57 nos 90: `id_camara` e o
--      mandato já provam os dois valores.
--   2. cpf nos 55 que têm CPF válido em `cam_parlamentar_risco`, ligando por
--      `id_camara` = `deputado_id` (nunca por nome), só onde hoje é nulo.
--
-- O que NÃO faz
--   • Não toca nos 35 sem CPF em nenhuma fonte interna; esses seguem pendentes
--     até scripts/backfill-cpf-camara.ts (consulta a API da Câmara por id_camara).
--   • Não altera nenhuma linha que já tenha casa_legislativa ou cpf.
--   • Não adiciona coluna nem tabela. Idempotente: rodar de novo não muda nada.
--
-- Esperado: passo 1 = 90 linhas; passo 2 = 55 linhas.

begin;

update parlamentares p
set casa_legislativa = 'camara',
    legislatura      = 57,
    updated_at       = now()
where p.casa_legislativa is null
  and p.id_camara is not null
  and exists (
    select 1
    from mandatos m
    where m.parlamentar_id = p.id
      and m.cargo = 'Deputado Federal'
      and m.legislatura = 57
  );

with fonte as (
  select p.id, r.cpf
  from parlamentares p
  join cam_parlamentar_risco r on r.deputado_id = p.id_camara
  where p.cpf is null
    and r.cpf ~ '^\d{11}$'
    and r.cpf !~ '^(\d)\1{10}$'
    -- dígitos verificadores
    and (select (sum(substr(r.cpf, i, 1)::int * (11 - i)) * 10 % 11) % 10
         from generate_series(1, 9) i) = substr(r.cpf, 10, 1)::int
    and (select (sum(substr(r.cpf, i, 1)::int * (12 - i)) * 10 % 11) % 10
         from generate_series(1, 10) i) = substr(r.cpf, 11, 1)::int
    -- nunca atribuir um CPF que já pertence a outra linha
    and not exists (
      select 1 from parlamentares x where x.cpf = r.cpf and x.id <> p.id
    )
)
update parlamentares p
set cpf        = f.cpf,
    updated_at = now()
from fonte f
where p.id = f.id;

commit;

-- Conferência (rodar depois; esperado: sem_casa = 0, sem_cpf = 35):
--   select count(*) filter (where casa_legislativa is null) sem_casa,
--          count(*) filter (where casa_legislativa = 'camara' and (cpf is null or cpf = '')) sem_cpf
--   from parlamentares;
