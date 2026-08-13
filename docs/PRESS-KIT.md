# PRESS-KIT ElectioLab

> Material pronto para abordar veículos de imprensa. Use os trechos abaixo como base — adapte ao tom de cada jornalista.

---

## 1-line pitch

ElectioLab é um agregador de pesquisas eleitorais brasileiras com **média ponderada por acurácia histórica** do instituto, **295 candidatos com bio**, e **dados oficiais de propaganda digital** (Google Ads + Meta Ad Library) — tudo aberto e gratuito em https://electiolab.com.

## Pitch curto (3 frases)

A maioria dos brasileiros consome pesquisa eleitoral por manchete — "Lula 36%, Bolsonaro 30%" sem contexto. O ElectioLab agrega TODAS as pesquisas brasileiras de 2026 em uma média ponderada por recência, amostra e acurácia histórica do instituto (Datafolha 92%, Quaest 85%, Atlas Intel 78%). É 100% gratuito e tem cobertura completa: presidência, 27 governadores e 27 senadores, com transparência metodológica e dados oficiais de gastos digitais dos candidatos.

## Pitch longo (6 frases — para release de imprensa)

Em 2022, o brasileiro médio acompanhou a corrida presidencial via manchetes desencontradas: Datafolha mostrou X, Atlas mostrou Y, Quaest mostrou Z. Resultado: confusão e desinformação. O **ElectioLab** (electiolab.com) resolve isso com uma **média ponderada** que combina todas as pesquisas publicadas, com peso maior para institutos de melhor histórico de acurácia vs. resultado oficial do TSE. Em abril de 2026, a plataforma já indexou 26 pesquisas presidenciais de 13 institutos, totalizando 60.608 entrevistas, e produz um **relatório semanal** com a tendência ponderada. Cobre **295 candidatos com bio**, propaganda digital (R$ 28,6 mi gastos por Bolsonaro no Google Ads em 2022) e simulações de 2º turno (Lula × Flávio Bolsonaro, Caiado, Tarcísio). Toda a metodologia é aberta em /sobre, e a média se atualiza a cada 6h via cron Supabase. **Gratuita, sem login, sem paywall.**

---

## Ganchos jornalísticos (por ângulo)

### Ângulo "tecnologia + jornalismo de dados"
- ElectioLab combina dados oficiais TSE + Google Transparency Center + Meta Ad Library em uma plataforma open-source (Next.js + Supabase + Vercel).
- Ferramenta nasceu como projeto solo do desenvolvedor **Luiz Lessa** com filosofia "fast MVP, low complexity".
- API pública em /api para jornalistas consumirem as pesquisas com timestamp e weight.

### Ângulo "transparência eleitoral"
- Dataset completo de gastos em Google Ads e Meta por candidato presidencial.
- Score de acurácia por instituto baseado em desvio histórico vs. TSE (Datafolha 92%, Ipec 88%, Quaest 85%, Atlas Intel 78%, Paraná Pesquisas 70%).
- Ranking semanal de mudanças significativas (variação > margem de erro).

### Ângulo "polarização e segundo turno"
- Página dedicada simulando todos os cenários de 2º turno: https://electiolab.com/quem-vence-no-segundo-turno-presidencia-2026
- Lula vs Flávio Bolsonaro empate técnico em abril/2026; Lula bate Caiado com folga.

### Ângulo "regional"
- Cobertura completa dos 27 estados (governador) e 27 estados (senador).
- Páginas estado-por-estado tipo /eleicoes-governador-pr-2026, /eleicoes-governador-mg-2026, etc.

---

## Estatísticas-chave (para citação direta)

- **295** candidatos brasileiros indexados com bio completa
- **358** páginas SEO-otimizadas em sitemap
- **26+** pesquisas presidenciais indexadas (atualizado semanalmente)
- **13** institutos cobertos: Datafolha, Quaest, Ipec, Atlas Intel, PoderData, Paraná Pesquisas, MDA, Genial/Quaest, Real Time Big Data, AtlasIntel, FSB, Modalmais/Futura, CNT/MDA
- **60.608** entrevistas acumuladas em 2026 (via somatório de amostras das pesquisas indexadas)
- **R$ 28,6 mi** — gasto declarado por Jair Bolsonaro em Google Ads em 2022 (dado oficial Google Transparency Center)
- **6h** — frequência de recálculo da média ponderada
- **100% gratuito** — sem paywall, sem login obrigatório, dados abertos

---

## Quotes do fundador (use ou parafraseie)

> "Pesquisa eleitoral no Brasil é noticiada de forma fragmentada. Cada manchete pega um instituto, ignora os outros, e o leitor sai mais confuso do que entrou. O ElectioLab agrega tudo numa média ponderada com base no histórico de acurácia de cada instituto vs. o que o TSE realmente apurou."
> — **Luiz Lessa**, fundador

> "O Google Ads Transparency Center mostra que Bolsonaro gastou R$ 28,6 milhões em 2022, mas esse número raramente aparece no debate público. A gente cruzou esses dados com a Meta Ad Library e botou tudo no perfil de cada candidato — assim qualquer pessoa pode ver quanto cada candidatura custa em propaganda digital."
> — **Luiz Lessa**, fundador

---

## Lista de jornalistas / pautas (target outreach)

### Veículos de tecnologia e jornalismo de dados
| Veículo | Pauteiro/jornalista | Editoria | Ângulo |
|---|---|---|---|
| **Núcleo Jornalismo** | Sérgio Spagnuolo | Jornalismo de dados / política | metodologia + transparência |
| **Folha de S.Paulo** | Vinicius Mota / Painel | Política | média ponderada como ferramenta de leitura |
| **Estadão** | Eduardo Gayer / Estadão Dados | Política | comparativo de acurácia institutos |
| **Poder360** | Fernando Rodrigues | Política / pesquisas | parceria de citação cruzada |
| **G1** | Equipe de política | Política | ferramenta gratuita p/ leitor |
| **Aos Fatos** | Tai Nalon | Checagem | uso da plataforma p/ verificar manchetes |
| **Tilt UOL** | Helton Simões Gomes | Tecnologia | indie devbuilder solo + open data |
| **Manual do Usuário** | Rodrigo Ghedin | Tecnologia / produto | review como produto |
| **Tecmundo** | redação | Tecnologia | indie maker brasileiro |
| **Olhar Digital** | redação | Tecnologia | indie maker brasileiro |

### Newsletters e podcasts
| Nome | Pessoa | Formato | Ângulo |
|---|---|---|---|
| **The Brief** | Caê Vasconcellos | Newsletter | gancho semanal de pesquisa |
| **Drops News** | Henrique Krigner | Podcast / News | ferramenta nova brasileira |
| **Café da Manhã (Folha)** | apresentadores | Podcast | corrida presidencial 2026 |
| **Foro de Teresina (Piauí)** | José Roberto de Toledo | Podcast | análise política |
| **Pingback (Manual do Usuário)** | Rodrigo Ghedin | Podcast | indie maker, produto solo |

---

## Template de e-mail de outreach

**Assunto:** ElectioLab — agregador de pesquisas com média ponderada por acurácia (gratuito)

> Oi [NOME],
>
> Lançamos uma plataforma que agrega TODAS as pesquisas eleitorais brasileiras de 2026 numa média ponderada por recência, amostra e acurácia histórica do instituto.
>
> Diferenciais:
> - Cobertura completa (presidência + 27 governadores + 27 senadores)
> - Score de acurácia por instituto baseado em erro histórico vs. TSE (Datafolha 92%, Quaest 85%, Atlas Intel 78%)
> - Dados oficiais de propaganda digital (Bolsonaro 2022 = R$ 28,6 mi em Google Ads)
> - Atualização a cada 6h, 100% gratuito
>
> Se útil pra alguma pauta, mando dataset, gráfico ou print que precisar. Acesso: https://electiolab.com
>
> Abs,
> Luiz Lessa — Fundador, ElectioLab
> luiz@electiolab.com · linkedin.com/in/luizlessa
> https://electiolab.com

---

## Recursos para jornalistas

- **Página de imprensa**: https://electiolab.com/imprensa
- **Relatório semanal último**: https://electiolab.com/relatorio/semana-17-2026
- **Metodologia completa**: https://electiolab.com/sobre#metodologia
- **API pública** (acesso pro): https://electiolab.com/precos
- **Imprensa**: imprensa@electiolab.com
- **Contato direto fundador**: luiz@electiolab.com

## Logo / OG image

- OG image dinâmica: https://electiolab.com/opengraph-image (1200×630)
- Twitter card: summary_large_image, mesma imagem

---

**Atualizado em:** 2026-04-29
