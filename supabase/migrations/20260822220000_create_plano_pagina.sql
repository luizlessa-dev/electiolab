-- Texto extraído por página de cada plano_governo (etapa 2). É a fonte que a
-- etapa 3 (recorte por tema) vai indexar/classificar.
--
-- metodo indica se o texto veio de extração nativa do PDF (padrão, exato) ou
-- de OCR (fallback quando a página é imagem escaneada — texto aproximado,
-- pode ter erro de reconhecimento). Relevante pra quem revisa recorte na
-- etapa 4 saber se está olhando texto exato ou uma leitura de máquina.

create table if not exists plano_pagina (
  id       uuid primary key default gen_random_uuid(),
  plano_id uuid not null references plano_governo(id) on delete cascade,
  numero   integer not null,
  texto    text not null,
  metodo   text not null default 'nativo' check (metodo in ('nativo', 'ocr'))
);

create unique index if not exists plano_pagina_plano_numero_key
  on plano_pagina (plano_id, numero);

alter table plano_pagina enable row level security;
do $$ begin
  create policy "Public read plano_pagina" on plano_pagina for select using (true);
exception when duplicate_object then null; end $$;
