-- Corrige os comentários das tabelas de identidade (20261003110000_politicians_identity.sql).
--
-- APLICAR NO PROJETO ElectioLab (ref xoxztzologqeqbajlhya). Aplicação manual pelo Luiz
-- no SQL Editor, antes do merge (regra do CLAUDE.md). Não aplicada.
--
-- Por que existe: a 1a aplicação foi copiada com o clipboard sem locale UTF-8 e os
-- comentários ficaram com os acentos corrompidos ("d√≠gitos"). É só cosmético (dados e
-- constraints não têm acento), mas o comentário é a documentação da tabela no painel.
-- Copiar com: LC_ALL=en_US.UTF-8 pbcopy < arquivo.sql
-- Idempotente.

comment on table politicians is
  'Uma linha por pessoa, chave natural = CPF (11 dígitos). slug é por pessoa, não por candidatura. Leitura pública só de id, slug e display_name.';

comment on table politician_links is
  'Chaves externas de cada pessoa. confidence só aceita exact_cpf, exact_tse_id ou manual (com verified_by); não existe vínculo por nome.';

comment on table politician_link_conflicts is
  'Fila de revisão humana. Conflito de identidade (mesmo CPF com nomes que divergem, mesmo tse_id com CPFs diferentes, CPF inválido, chave externa já ligada a outra pessoa) fica aqui até alguém resolver; nada é fundido automaticamente.';

comment on table ingest_runs is
  'Uma linha por execução de ingestão. Base do painel de frescura em /admin: última execução ok por source, e alerta quando passa do esperado.';
