# Instruções para Claude neste repositório

## Supabase

- O MCP do Supabase conectado a este projeto é **somente leitura**: usar
  apenas para inspecionar schema/dados/logs/advisors (`list_tables`,
  `execute_sql` com `SELECT`, `list_migrations`, `get_advisors`, etc.).
  **Nunca** rodar `INSERT`/`UPDATE`/`DELETE`/DDL via `execute_sql`, nem
  chamar `apply_migration` — mesmo que a tool esteja disponível.
- Migrations: gerar o arquivo `.sql` em `supabase/migrations/` e **parar**.
  Luiz aplica manualmente no SQL Editor do painel do Supabase, antes do
  merge do PR. O arquivo no repo é o registro do que foi aplicado, não o
  mecanismo que aplica — não existe integração automática (Vercel/GitHub
  Actions) que rode migrations neste projeto.
