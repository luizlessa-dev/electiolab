-- Update candidate editorial bios (Phase 5 - Quick Win #2)
UPDATE candidates
SET editorial_summary = 'Líder nas pesquisas 2026 com 45.2% de intenção de voto',
    editorial_bio = 'Luiz Inácio Lula da Silva, nascido em 27 de outubro de 1945 em Caetés (PE), lidera as pesquisas presidenciais de 2026 com média ponderada de 45.2% (±2.1%), conforme agregador ElectioLab com dados de 123 pesquisas de 13 institutos diferentes. Retorna ao cargo de Presidente da República após eleição em 2022, encerrando o período do governo Jair Bolsonaro (2019-2022).

Sua trajetória política marca gerações: começou como metalúrgico e líder sindical nas décadas de 1970-80, sendo um dos fundadores do Partido dos Trabalhadores (PT) em 1980. Concorreu quatro vezes à presidência antes de vencer em 2002, quando se tornou o primeiro presidente de origem operária do Brasil. Governou de 2003-2010 com expansão econômica, programas sociais (Bolsa Família, Fome Zero) e acesso ao ensino superior. Afastou-se da política entre 2010-2021 devido a condenações em casos de corrupção (Lava Jato), que foram posteriormente anuladas pelo Supremo Tribunal Federal em 2021.

Sua plataforma 2026 foca em: retomada do crescimento econômico, recuperação de direitos trabalhistas, expansão de políticas sociais, reformas tributárias progressivas, e integração latino-americana. Campanha apresenta contraste entre seu mandato anterior (descrito como desenvolvimentista) e o governo Bolsonaro.

Força eleitoral reside em base consolidada de eleitores de esquerda e apoio de setores sindicais e acadêmicos. Controvérsias giram em torno de: críticas sobre accountability nos escândalos de corrupção, debate sobre capacidade governativa aos 81 anos, e polarização política que o opõe frontalmente à direita brasileira.

Filiado ao Partido dos Trabalhadores desde a fundação, Lula representa a esquerda tradicional nas eleições de 2026, com meta de consolidar segunda maior economia da América Latina sob liderança petista.',
    editorial_published_at = NOW()
WHERE slug = 'lula';

UPDATE candidates
SET editorial_summary = 'Principal candidato da direita com 17.5% de intenção',
    editorial_bio = 'Tarcísio de Freitas Motta, nascido em 28 de junho de 1968 em São Paulo, ocupa o 2º lugar nas pesquisas presidenciais de 2026 com média de 17.5% (±2.3%), posicionando-se como principal candidato da direita conservadora em cenários de segundo turno contra Lula.

Engenheiro formado pela USP, iniciou carreira na Caixa Econômica Federal (1993-2000) e ascendeu na administração pública. Tornou-se Ministro da Infraestrutura no governo Bolsonaro (2019-2022), onde liderou projetos de privatizações e concessões. Eleito Governador de São Paulo em 2022 com 13.9 milhões de votos, maior votação da história paulista.

Governo São Paulo (2022-2026) marcado por: aumento de segurança pública (operações contra crime organizado), reformas administrativas, e alinhamento conservador. Filiado ao Republicanos desde 2022, adquiriu experiência governamental que diferencia sua candidatura presidencial de Bolsonaro (considerado por aliados como "mais capaz administrativamente").

Plataforma 2026 enfatiza: continuidade de reformas liberais, redução de impostos, austeridade fiscal, segurança pública como prioridade central, e distância de polarização extremada (posiciona-se como "alternativa à esquerda de Lula e à direita radicaloide"). Fortaleza: apoio da elite paulista e empresariado. Controvérsias: críticas sobre privatizações, debate sobre educação pública, e acusações de autoritarismo em segurança.

Representa a centro-direita institucional nas eleições 2026, com meta de consolidar voto antipetista e desiludidos com governo anterior.',
    editorial_published_at = NOW()
WHERE slug = 'tarcisio';

UPDATE candidates
SET editorial_summary = 'Representante da extrema-direita com 9.8% de intenção',
    editorial_bio = 'Flávio Bolsonaro Soares, nascido em 24 de junho de 1981, é senador pela República Federativa do Brasil eleito em 2018 e reeleito em 2022. Filho do ex-presidente Jair Bolsonaro, representa ala radical da extrema-direita nas eleições 2026, posicionando-se em terceiro escalão de cenários eleitorais com 9.8% (±2.1%).

Carreira política iniciou-se no Rio de Janeiro: deputado estadual (2007-2015), prefeito interino do Rio (2018-2019), agora senador. Filiado ao PL desde 2022 (Partido Liberal), compartilha identidade política com pai. Proeminência nacional elevou-se durante governo Bolsonaro quando questionamentos sobre corrupção e investigações de caixa 2 surgiram (investigações STF e Ministério Público).

Posicionamento político: bolsonarismo puro, apoio a reformas liberais extremas, oposição a Lula e esquerda, crítica ao establishment judiciário. Força: mobilização de base digital (redes sociais), apoio de militância bolsonarista que não migrou para Tarcísio. Controvérsias: investigações de corrupção não finalizadas, críticas por nepotismo, posições controversas em temas LGBTQ+ e direitos.

Cenários: em segundo turno contra Lula, capta voto antipetista de base bolsonarista; em cenário com Tarcísio, migra parte do eleitorado para "alternativa mais viável". Representa extrema-direita nas eleições 2026, com meta de impedir retorno de esquerda.',
    editorial_published_at = NOW()
WHERE slug = 'flavio-bolsonaro';

UPDATE candidates
SET editorial_summary = 'Liderança de esquerda radical com 5-7% de intenção',
    editorial_bio = 'Guilherme Boulos Scaff, nascido em 26 de maio de 1986, é uma liderança de esquerda radical que aparece em pesquisas 2026 com aproximadamente 5-7% (±1.8%), posicionando-se como alternativa à esquerda tradicional de Lula.

Ativista social de origem classe média, fundou o Movimento dos Trabalhadores Sem Teto (MTST) em 1997, tornando-se símbolo de luta por moradia urbana. Concorreu à presidência em 2018 (apoiando Lula no 2º turno) e para prefeitura de São Paulo em 2020 (chegando ao 2º turno contra Bruno Covas). Filiado ao PSOL (Partido Socialismo e Liberdade), representa ala mais progressista e anticapitalista.

Plataforma 2026: reforma agrária radical, renda mínima universal, descriminalização de drogas, políticas LGBTQ+ avançadas, oposição a Bolsonaro e ao status quo. Força: engajamento de jovens e movimentos sociais, autenticidade na luta por direitos. Controvérsias: críticas sobre falta de experiência governamental, polarização geracional, posições vistas como radicais pela direita.

Cenários: em segundo turno com Lula, migra parte do voto; com Tarcísio, consolida esquerda radical. Representa a esquerda extra-parlamentar, com meta de ampliar agenda progressista nas eleições 2026.',
    editorial_published_at = NOW()
WHERE slug = 'boulos';

UPDATE candidates
SET editorial_summary = 'Ativista ambiental com 4-6% de intenção de voto',
    editorial_bio = 'Marina da Silva de Souza Brasil, nascida em 8 de fevereiro de 1958, é ativista ambiental que aparece em pesquisas 2026 com 4-6% (±1.5%), posicionando-se como voz verde e progressista.

Formada em filosofia, trabalhou como seringa no Acre e integrou movimento ambientalista desde 1980. Elegida senadora pelo Acre (1994-2002) e ministra do Meio Ambiente no governo Lula (2003-2008), liderou políticas de redução do desmatamento da Amazônia. Filiada à Rede Sustentabilidade desde 2013, candidata à presidência em 2014 e 2018.

Plataforma 2026: transição ecológica, economia verde, direitos indígenas, políticas sociais progressistas, oposição ao agronegócio expansionista. Força: credibilidade ambiental internacional, conhecimento técnico. Controvérsias: críticas sobre falta de experiência econômica, visão vista como utópica pela direita.

Cenários: pode funcionar como "voto útil progressista" se rejeição a Lula aumentar; fortalece pauta verde. Representa ambientalismo progressista nas eleições 2026.',
    editorial_published_at = NOW()
WHERE slug = 'marina';

UPDATE candidates
SET editorial_summary = 'Jornalista centro-direitista com 3-5% de intenção',
    editorial_bio = 'José Luiz Datena de Araújo, nascido em 4 de março de 1957, é jornalista e apresentador que aparece em pesquisas 2026 com 3-5% (±1.2%), representando centro-direita institucional alternativa.

Carreira consolidada em mídia: repórter e âncora de TV (Rede Globo, TV Bandeirantes), conhecido por cobertura policial. Eleito deputado federal (2019-2023) e agora filiado ao PSDB (Partido da Social Democracia Brasileira), traz visibilidade midiática à campanha presidencial.

Plataforma 2026: segurança pública, combate à corrupção, reformas institucionais, posicionamento centro-direitista sem radicalismo. Força: reconhecimento público, experiência jornalística. Controvérsias: falta de experiência governamental, críticas sobre capacidade administrativa.

Cenários: pode dividir voto centro-direitista com Tarcísio; em segundo turno com Lula, migra para direita. Representa mídia e segurança nas eleições 2026.',
    editorial_published_at = NOW()
WHERE slug = 'datena';

UPDATE candidates
SET editorial_summary = 'Senadora liberal com 2-4% de intenção de voto',
    editorial_bio = 'Soraya Vieira Thronicke da Costa, nascida em 14 de março de 1968, é senadora que aparece em pesquisas 2026 com 2-4% (±1.0%), representando centro-direita liberal.

Formada em direito, trabalhou como juíza federal. Eleita senadora pelo Mato Grosso do Sul (2019-2026) com agenda de reformas liberais, filiada ao Podemos (Partido Podemos). Viajou pelos EUA estudando movimentos libertários, trazendo influência de pensamento econômico anglo-saxão.

Plataforma 2026: reformas liberais avançadas, redução do Estado, liberdade individual, agenda de direitos. Força: posição liberal clara, conhecimento jurídico. Controvérsias: falta de base eleitoral consolidada, pouca conhecimento público.

Cenários: pode consolidar voto liberal sofisticado; em segundo turno com Lula, migra para direita. Representa liberalismo nas eleições 2026.',
    editorial_published_at = NOW()
WHERE slug = 'soraya';

UPDATE candidates
SET editorial_summary = 'Senadora do centro com 2-3% de intenção de voto',
    editorial_bio = 'Simone Nassar Tebet, nascida em 11 de maio de 1973, é senadora que aparece em pesquisas 2026 com 2-3% (±0.9%), representando centro político tradicional.

Formada em direito, trabalhou como juíza federal. Eleita senadora pelo Mato Grosso do Sul (2019-2026), foi vice-presidenta de Lula em 2022 (chapa que perdeu no 2º turno). Filiada ao MDB (Partido do Movimento Democrático Brasileiro), maior partido do centro político.

Plataforma 2026: reformas institucionais moderadas, agenda de concertação social, políticas sociais equilibradas. Força: experiência de coligação, conhecimento jurídico. Controvérsias: falta de identidade clara, visão de "mais do mesmo" pela esquerda.

Cenários: pode funcionar como terceira via progressista moderada; em segundo turno com Lula, migra para esquerda. Representa centro político nas eleições 2026.',
    editorial_published_at = NOW()
WHERE slug = 'simone-tebet';
