-- Insert audit data for TOP 10 institutes with highest gap (2026-09-12)
-- Run after applying migration 20260912191339_institute_reliability_audit.sql

-- First, verify institute_id for each institute (adjust if IDs differ)
select id, name, slug from institutes
where slug in (
  'verita', 'real-time-midia', 'atlas-intel', 'gazeta', 'sms-direct',
  'lais-cristina', parana-pesquisas', 'seta', '100-cidades', 'vox-brasil'
)
order by name;

-- Insert audit records (execute after verifying institute slugs above)
insert into institute_reliability_audit (
  institute_id,
  audit_date,
  audit_source,
  reliability_stars,
  suspensions_count,
  suspensions_states,
  fines_total_amount_brl,
  key_issues,
  media_criticism,
  recommendation,
  recommendation_reason,
  notes,
  created_by
)
-- 1. Verita - MUITO PROBLEMÁTICO
select
  i.id,
  '2026-09-12'::date,
  'judicial_records,media_analysis',
  1,
  18,
  array['PA', 'RO', 'BA', 'PB', 'SC', 'DF', 'ES', 'AM'],
  53200 + 50000,
  array[
    '18 estados com pesquisas suspensas',
    'Erros metodológicos: distorções em renda e educação',
    'Dados duplicados (62% em Amazonas)',
    'Concentração geográfica de entrevistas (42% em Vitória/ES com 8.89% eleitores)',
    'Questionários com candidatos fictícios',
    'Rank 72º em performance histórica'
  ],
  'Múltiplas reportagens em Metrópoles, Revista Oeste, blogs políticos descrevendo padrão de irregularidades metodológicas',
  'NÃO USAR - Grave',
  'Graves irregularidades documentadas em 18 estados. Potencial fraude com dados duplicados e concentração geográfica suspeita. Histórico de desempenho extremamente fraco.',
  'Instituto com padrão consistente de violações metodológicas. Rank 72º em performance histórica confirma falta de confiabilidade.',
  'claude-code'
from institutes i
where i.slug = 'verita'

union all

-- 2. Real Time Mídia - PROBLEMÁTICO
select
  i.id,
  '2026-09-12'::date,
  'judicial_records,media_analysis',
  2,
  4,
  array['AL', 'MA', 'PR', 'RN'],
  10000 + 50000,
  array[
    'Suspensões em Alagoas, Maranhão, Paraná e RN',
    '162 pesquisas auto-financiadas em 2026 (R$ 7.1M declarado, R$ 433k faturado)',
    'Falta de transparência sobre metodologia IA',
    'Exclusão de candidatos da listagem',
    'Conflitos entre dados de telefone e digital'
  ],
  'Múltiplas denúncias de blogs políticos sobre origem obscura de financiamento. Padrão de suspensões preocupante.',
  'NÃO USAR',
  'Padrão repetido de suspensões em múltiplos estados. Falta de transparência sobre financiamento e metodologia IA.',
  'Finanças suspeitas: declarou R$ 7.1M em pesquisas mas faturou apenas R$ 433k em 2025.',
  'claude-code'
from institutes i
where i.slug = 'real-time-midia'

union all

-- 3. Atlas Intel - MUITO CONFIÁVEL
select
  i.id,
  '2026-09-12'::date,
  'judicial_records,media_analysis',
  5,
  0,
  null,
  0,
  array[
    'Nenhuma suspensão ou multa em 2026',
    'Melhor previsão no 1º turno presidencial 2022 (48,3% Lula vs 48,43% real)',
    'Única a prever estabilização Bolsonaro acima de 40%',
    '102 eleições corretas em 7 anos globalmente',
    'Metodologia transparente e documentada'
  ],
  'Reportagens positivas em CartaCapital, CNN Brasil, Exame. Respondeu críticas com transparência metodológica.',
  'USAR - Recomendado',
  'Histórico impecável com acurácia comprovada. Melhor instituto entre os TOP 10 analisados.',
  'Instituto referência em confiabilidade. Metodologia transparente e histórico de acurácia excepcional.',
  'claude-code'
from institutes i
where i.slug = 'atlas-intel'

union all

-- 4. Gazeta (IGAPE) - RAZOÁVEL
select
  i.id,
  '2026-09-12'::date,
  'judicial_records,media_analysis',
  3,
  1,
  array['GO'],
  0,
  array[
    'Uma suspensão em Goiás (GO-03116/2026) em junho',
    'Problema: divergência entre plano amostral registrado (renda individual) vs questionário aplicado (renda familiar)',
    'Falta de informações sobre bairros/municípios',
    'Suspensão foi derrubada posteriormente pelo TRE-GO'
  ],
  'Mínima cobertura negativa. Problema parecer administrativo menor.',
  'USAR COM CAUTELA',
  'Problemas leves de documentação resolvidos. Instituto razoável com histórico aceitável.',
  'Suspensão derrubada pelo TRE após análise. Problemas parecem administrativos, não metodológicos.',
  'claude-code'
from institutes i
where i.slug = 'gazeta'

union all

-- 6. Laís Cristina - PEQUENO INSTITUTO, FALTA HISTÓRICO
select
  i.id,
  '2026-09-12'::date,
  'media_analysis',
  3,
  0,
  null,
  0,
  array[
    'Pequeno instituto SP (SP040032026)',
    'Apenas 1 pesquisa registrada em maio/2026',
    'Amostra pequena (400 respondentes)',
    'Pesquisa para governador e deputado estadual',
    'Histórico limitado - falta de precedentes para avaliar'
  ],
  'Nenhuma cobertura mediática. Instituto com baixa visibilidade.',
  'USAR COM CAUTELA',
  'Falta histórico para avaliação completa. Amostra pequena sugere uso complementar apenas.',
  'Instituto muito pequeno. Usar apenas para complementar análises com institutos maiores.',
  'claude-code'
from institutes i
where i.slug = 'lais-cristina'

union all

-- 7. Paraná Pesquisas - CONFIÁVEL
select
  i.id,
  '2026-09-12'::date,
  'judicial_records,media_analysis',
  4,
  0,
  null,
  0,
  array[
    'Fundado em 1990 - histórico estabelecido',
    'Acurado em 2022: dentro margem de erro (50,90% Lula vs 50,4% pesquisado)',
    'Metodologia sólida: 2.400 entrevistas, erro 2pp, confiança 95%',
    'Nenhuma suspensão registrada em 2026',
    'Um dos institutos mais confiáveis do Brasil'
  ],
  'Cobertura positiva. Mencionado como confiável em análises de confiabilidade de institutos.',
  'USAR',
  'Instituto consolidado com histórico sólido de precisão. Segundo melhor entre os TOP 10.',
  'Está entre os institutos mais confiáveis do mercado. Metodologia estabelecida desde 1990.',
  'claude-code'
from institutes i
where i.slug = 'parana-pesquisas'

union all

-- 8. Seta - MUITO PROBLEMÁTICO
select
  i.id,
  '2026-09-12'::date,
  'judicial_records,media_analysis',
  1,
  2,
  array['PB', 'RN'],
  5000 + 53200,
  array[
    'Suspensão em Paraíba (PB-04436/2026) - multa R$ 5k/dia',
    'Suspensão definitiva em RN - multa R$ 53.200',
    'Ocultação de financiamento - graves irregularidades',
    'Omissão de metodologia clara',
    'Padrão de falta de transparência'
  ],
  'Reportagens em Termômetro da Política e blogs locais sobre suspeita de fraude.',
  'NÃO USAR',
  'Ocultação de financiamento é red flag crítica. Graves irregularidades documentadas. Potencial fraude.',
  'Ocultação de financiamento é violação grave da regulação eleitoral brasileira.',
  'claude-code'
from institutes i
where i.slug = 'seta'

union all

-- 9. 100% Cidades - PROBLEMÁTICO
select
  i.id,
  '2026-09-12'::date,
  'judicial_records,media_analysis',
  2,
  1,
  array['SC'],
  53205,
  array[
    'Suspensão definitiva em SC (junho 2026)',
    'Omissão de informações geográficas obrigatórias (bairros não informados)',
    'Violação TSE Resolution 23.600/2019',
    'Falta de transparência no mapeamento amostral',
    'Parceria Futura Consultoria também multada'
  ],
  'Cobertura em blogs políticos sobre omissões de dados obrigatórios.',
  'NÃO USAR',
  'Suspensão definitiva. Falta de transparência em informações obrigatórias por lei.',
  'Violação clara de regulação TSE. Omissão de dados obrigatórios é padrão de falta de transparência.',
  'claude-code'
from institutes i
where i.slug = '100-cidades'

union all

-- 10. Vox Brasil - PROBLEMÁTICO
select
  i.id,
  '2026-09-12'::date,
  'judicial_records,media_analysis',
  2,
  1,
  array['PR'],
  50000,
  array[
    'Suspensão em Paraná (PR-08220/2026)',
    'Críticas sobre confiabilidade em redes sociais',
    'Múltiplas representações contra fraude e favorecimento',
    'Suspeitas que favorece candidatos que contratam pesquisas',
    '35 anos de operação mas com padrão de problemas em 2026'
  ],
  'Críticas no Twitter/X de analistas políticos sobre falta de confiabilidade.',
  'NÃO USAR',
  'Múltiplas representações por fraude. Suspeita documentada de favorecimento político.',
  'Padrão de conflito de interesse: institutos contratados por candidatos tendem a favorecer clientes.',
  'claude-code'
from institutes i
where i.slug = 'vox-brasil'

on conflict (institute_id, audit_date) do update set
  reliability_stars = excluded.reliability_stars,
  suspensions_count = excluded.suspensions_count,
  suspensions_states = excluded.suspensions_states,
  fines_total_amount_brl = excluded.fines_total_amount_brl,
  key_issues = excluded.key_issues,
  media_criticism = excluded.media_criticism,
  recommendation = excluded.recommendation,
  recommendation_reason = excluded.recommendation_reason,
  notes = excluded.notes,
  updated_at = now();
