-- Taxonomia fechada de temas pra "Planos de governo". descricao_escopo é o
-- critério de classificação usado na etapa 3 (recorte por tema, palavras-chave
-- + LLM) — define literalmente o que entra e o que não entra em cada tema. Um
-- trecho pode pertencer a mais de um tema só se tratar explicitamente de
-- ambos. ordem é a ordem de exibição no índice público (/planos), agrupando
-- temas próximos (ex.: segurança pública, sistema prisional e drogas juntos)
-- — não é alfabética.

create table if not exists tema (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null,
  nome             text not null,
  descricao_escopo text not null,
  ordem            integer not null
);

create unique index if not exists tema_slug_key on tema (slug);

alter table tema enable row level security;
do $$ begin
  create policy "Public read tema" on tema for select using (true);
exception when duplicate_object then null; end $$;

insert into tema (slug, nome, descricao_escopo, ordem) values
  ('economia', 'Economia', 'Entra: crescimento, inflação, juros, política fiscal, dívida, gasto público, privatizações, crédito. Não entra: tributos (tributacao), emprego (trabalho-previdencia), transferência de renda (assistencia-social).', 1),
  ('tributacao', 'Tributação', 'Entra: reforma tributária, alíquotas, renúncia fiscal, imposto de renda, imposto sobre patrimônio e heranças. Não entra: gasto público (economia).', 2),
  ('saude', 'Saúde', 'Entra: SUS, financiamento, atenção básica, filas, vacinação, saúde mental, saneamento quando tratado como saúde. Não entra: política de drogas (drogas).', 3),
  ('educacao', 'Educação', 'Entra: educação básica, ensino superior, financiamento, alfabetização, ensino técnico, universidades, educação digital em escolas. Não entra: pesquisa e inovação (tecnologia).', 4),
  ('seguranca-publica', 'Segurança pública', 'Entra: polícias, forças de segurança, policiamento, crime organizado, homicídios, controle de armas, fronteiras, Guarda Nacional, operações contra tráfico. Não entra: presídios (sistema-prisional), política de drogas (drogas), cibersegurança (tecnologia).', 5),
  ('sistema-prisional', 'Sistema prisional', 'Entra: presídios, superlotação, privatização de unidades, ressocialização, penas alternativas, execução penal, facções dentro do sistema. Não entra: policiamento (seguranca-publica).', 6),
  ('drogas', 'Drogas', 'Entra: descriminalização, legalização, tráfico como política pública, tratamento de dependentes, comunidades terapêuticas, redução de danos. Não entra: operações policiais contra tráfico (seguranca-publica).', 7),
  ('meio-ambiente', 'Meio ambiente', 'Entra: desmatamento, Amazônia, clima, licenciamento ambiental, terras indígenas quando tratadas como preservação, biodiversidade. Não entra: matriz energética e transição energética (energia).', 8),
  ('energia', 'Energia', 'Entra: matriz energética, petróleo e gás, Petrobras, renováveis, transição energética, tarifas, hidrelétricas, nuclear, biocombustíveis, segurança energética. Não entra: licenciamento ambiental como regra geral (meio-ambiente).', 9),
  ('trabalho-previdencia', 'Trabalho e previdência', 'Entra: emprego, legislação trabalhista, salário mínimo, aposentadoria, INSS, trabalho por aplicativo, jornada. Não entra: transferência de renda (assistencia-social).', 10),
  ('assistencia-social', 'Assistência social', 'Entra: Bolsa Família e programas de transferência de renda, BPC, combate à fome, SUAS, CRAS, população em situação de rua. Não entra: previdência contributiva (trabalho-previdencia).', 11),
  ('infraestrutura', 'Infraestrutura', 'Entra: transporte, logística, rodovias, ferrovias, portos, concessões, habitação, saneamento como obra. Não entra: energia (energia), saneamento como saúde (saude).', 12),
  ('relacoes-exteriores', 'Relações exteriores', 'Entra: política externa, blocos, comércio internacional, Mercosul, BRICS, relação com EUA e China, defesa nacional. Não entra: fronteiras como segurança (seguranca-publica).', 13),
  ('reforma-politica', 'Reforma política e instituições', 'Entra: sistema eleitoral, Congresso, STF, Forças Armadas como instituição, anistia, foro privilegiado, reeleição, emendas parlamentares. Não entra: regulação de plataformas (tecnologia).', 14),
  ('tecnologia', 'Regulação de tecnologia, plataformas e IA', 'Entra: redes sociais, responsabilidade de plataformas, Marco Civil, IA, dados pessoais, cibersegurança, desinformação como regulação, pesquisa e inovação. Não entra: educação digital em escolas (educacao).', 15),
  ('cultura', 'Cultura', 'Entra: política cultural, Lei Rouanet, patrimônio, audiovisual, fomento, economia criativa. Não entra: educação artística em escolas (educacao).', 16),
  ('agricultura', 'Agricultura', 'Entra: agronegócio, agricultura familiar, crédito rural, reforma agrária, regularização fundiária, seguro rural. Não entra: desmatamento (meio-ambiente), biocombustíveis (energia).', 17)
on conflict (slug) do update set
  nome = excluded.nome,
  descricao_escopo = excluded.descricao_escopo,
  ordem = excluded.ordem;
