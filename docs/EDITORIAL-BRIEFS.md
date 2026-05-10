# Pautas editoriais com apelo midiático — base ElectioLab

**Data:** 2026-05-09
**Objetivo:** transformar a infraestrutura técnica acumulada em **histórias citáveis** com gancho jornalístico. Cada pauta abaixo já tem dados disponíveis no banco; falta a edição e a verificação humana antes de publicar.

**Posicionamento de marca:**
> "ElectioLab combina dados oficiais (TSE, CEAP, CEIS, TF) com camada editorial responsável: disclaimers, fontes citáveis, metodologia pública."

---

## Templates de execução

Cada pauta segue o formato:

| Campo | Conteúdo |
|-------|----------|
| **Ângulo** | Frase de uma linha que vende a história. |
| **Dados que sustentam** | Query SQL ou rota da API. |
| **Verificação humana necessária** | O que precisa checar antes de publicar (porque os dados sozinhos não bastam). |
| **Disclaimer obrigatório** | O que não pode ser inferido. |
| **Canal sugerido** | Página landing + thread X + newsletter + pitch para imprensa. |

---

## Pauta 1 — "Os 50 fornecedores sancionados que faturaram com a Cota Parlamentar em 2025"

### Ângulo
Empresas com **sanção CEIS ativa** (impedidas de contratar com governo) recebem dinheiro de deputados via cota parlamentar — mesmo que a Cota Parlamentar não seja "contrato com governo" no sentido estrito, há **risco reputacional** evidente.

### Dados
- **19.609 entidades CEIS ativas** (2026-05-09): impedimento (15.996), suspensão (3.020), inidoneidade (582+11).
- Cruzamento `ceaps_brutas.cnpj_fornecedor` × `sanctioned_entities.cnpj_clean` (já implementado em `crossCeapWithCeis`).
- CEAP da legislatura ~ **R$ 1 bi/ano**; janela 24m citada chegou a R$ 14,71 mi para top gastadores.

```sql
-- Fornecedores CEAP que estão sancionados e ATIVOS
select c.deputado_nome, c.deputado_partido, c.deputado_uf,
       c.cnpj_fornecedor, s.nome as fornecedor_sancionado,
       s.tipo_sancao, s.orgao_sancionador,
       sum(c.valor_liquido) as total_pago_em_2025
from ceaps_brutas c
join sanctioned_entities s
  on c.cnpj_fornecedor = s.cnpj_clean
  and s.data_fim >= current_date
where c.ano_legislatura = 2025
group by 1,2,3,4,5,6,7
order by total_pago_em_2025 desc
limit 50;
```

### Verificação humana
- **Conferir CNPJ raiz vs filial:** sanção CEIS pode ser na filial específica, e a CEAP foi paga a outra filial.
- **Tipo de despesa:** alimentação não é o mesmo que contrato de serviço; ponderar relevância.
- **Validade da sanção:** garantir que `data_fim >= hoje` E `data_inicio <= data_pagamento`.
- **Direito de resposta:** contatar deputado E fornecedor antes de publicar.

### Disclaimer obrigatório
> "O cruzamento entre CEAP (gasto com cota parlamentar) e CEIS (lista de sancionados pelo poder público) NÃO implica que o deputado tenha cometido irregularidade. A natureza do gasto pode ser legítima e independente da sanção. O dado serve como **alerta de risco reputacional**, não como acusação."

### Canal sugerido
- **Landing dedicada:** `/sancoes/cota-parlamentar` (sub-rota da `/sancoes` existente).
- **Thread X** com top 10 (foto do deputado, valor, fornecedor sancionado, link para `/candidato/{slug}`).
- **Newsletter** "Sinal Eleitoral" do domingo com a história em destaque.
- **Pitch:** Folha (Painel da Política), Poder360, Metrópoles. Conversa prévia com Repórter Brasil ou Aos Fatos para co-publicação.

---

## Pauta 2 — "Patrimônio que cresceu 100%+ entre mandatos"

### Ângulo
Comparação patrimonial entre 2018 → 2022 → 2026 dos mesmos candidatos. Quem **multiplicou** o patrimônio durante o mandato? Sinaliza atenção (não acusação).

### Dados
- `prior_election_results` agora cobre **69.347** linhas (147 candidatos com histórico em ambos os anos).
- `candidates.net_worth` para 2026.
- **Necessário adicionar:** coluna `historic_net_worth` ou tabela `candidate_assets_history` (já existe em PR-3 como `candidate_assets`).

```sql
-- Candidatos com perfil ativo cuja net_worth dobrou entre eleições
select c.name, c.slug, c.party,
       max(case when ca.election_year = 2018 then ca.value_brl end) as patrimonio_2018,
       max(case when ca.election_year = 2022 then ca.value_brl end) as patrimonio_2022,
       c.net_worth as patrimonio_2026
from candidates c
left join candidate_assets ca on ca.candidate_id = c.id
where c.is_active = true
group by c.id, c.name, c.slug, c.party, c.net_worth
having coalesce(c.net_worth, 0) > 2 * coalesce(max(case when ca.election_year = 2018 then ca.value_brl end), 0)
   and coalesce(max(case when ca.election_year = 2018 then ca.value_brl end), 0) > 100000
order by (c.net_worth - coalesce(max(case when ca.election_year = 2018 then ca.value_brl end), 0)) desc
limit 30;
```

### Verificação humana
- **Inflação:** comparação nominal vs real. Patrimônio em 2018 não comparável diretamente a 2026 sem ajuste IPCA.
- **Origem do crescimento:** herança? venda de imóvel? só checar publicamente se tem fonte (entrevista, declaração à RF).
- **Mudança de regime patrimonial:** casamento/divórcio.

### Disclaimer obrigatório
> "Crescimento patrimonial entre mandatos NÃO implica enriquecimento ilícito. As declarações são feitas ao TSE e são públicas. Variações podem refletir herança, valorização imobiliária, partilha conjugal, atividade empresarial paralela ao mandato, ou outras causas legítimas."

### Canal sugerido
- **Landing `/patrimonio`** (já existe — adicionar seção "Crescimento entre mandatos").
- Co-publicação com **Aos Fatos** ou **Agência Pública** para reforço de credibilidade.

---

## Pauta 3 — "Os 'fenômenos' das urnas: candidatos que vieram do nada e elegeram-se em 2022"

### Ângulo
Candidatos com **zero histórico eleitoral antes de 2022** que se elegeram em 2022 com >100k votos. Quem foram? De onde vieram?

### Dados
- `prior_election_results` para 2022 com `result_status='eleito'`.
- Filtrar quem NÃO tem linha para 2018.
- Foco: deputado federal (gargalo mais relevante).

```sql
select c.name, c.slug, c.party, p.state,
       p.total_votes as votos_2022, p.election_type
from candidates c
join prior_election_results p on p.candidate_id = c.id
where p.year = 2022
  and p.result_status = 'eleito'
  and p.election_type in ('deputado_federal', 'governador', 'senador')
  and not exists (
    select 1 from prior_election_results p18
    where p18.candidate_id = c.id and p18.year = 2018
  )
  and p.total_votes > 100000
order by p.total_votes desc
limit 20;
```

### Verificação humana
- "Veio do nada" pode ser falso: pode ter disputado **vereador 2020** (que não está no nosso ingest porque é municipal) ou **deputado estadual 2018** (que pode não ter linha no nosso `prior_election_results` por filtro de cargo).
- Cobertura do TSE 2018 incompleta: só ingerimos algumas categorias.

### Disclaimer obrigatório
> "Ausência de histórico em nossa base não significa que o candidato seja inexperiente politicamente. Mandatos municipais (vereador, prefeito) podem não estar consolidados em nossa cobertura atual."

### Canal sugerido
- Notícia investigativa de fundo, não thread.
- **Newsletter de aniversário do mandato** (jan 2027): "Onde estão os 'fenômenos' de 2022 dois anos depois?"

---

## Pauta 4 — "Institutos com erro acima da margem em 2022 e que ainda têm bons números em 2026"

### Ângulo
Comparar erro de cada instituto em 2022 (pesquisa pré vs resultado oficial) com seu `reliability_score` editorial atual. Inconsistências = **alerta para o eleitor**.

### Dados
- **Bloqueado:** Fase 1 do `reliability_score` (PR-12) só popula `institute_accuracy_observations` quando há `prior_election_results` para o cargo. Como nosso ingest TSE não tem `presidente`, e as polls 2022 são presidenciais, a tabela está vazia.
- **Workaround:** ingerir manualmente resultados oficiais 1T 2022 para presidente (10 pares Lula/Bolsonaro/Ciro/Tebet em 27 UFs = ~270 linhas). Editorial.

### Verificação humana
- Construir `presidente_1t_2022_results` table com dados públicos do TSE.
- Rodar `scripts/backfill-institute-accuracy.ts`.
- Rodar `scripts/apply-reliability-phase2.ts --apply --force`.
- Cruzar com `institutes.reliability_score_basis` (PR-18).

### Disclaimer obrigatório
> "Erro absoluto entre uma pesquisa e o resultado oficial pode estar dentro da margem declarada pelo instituto. Acertar o ranking dos primeiros é mais relevante que o percentual exato. Veja `/docs/weighted-averages` e `/docs/reliability-score` para metodologia."

### Canal sugerido
- **Landing `/instituto-mais-acurado-eleicoes-brasil`** já existe — atualizar com dados reais Phase 2.
- Pitch para **Poder360** (vertical "Pesquisas") e **Veja** (Política).

---

## Pauta 5 — "Drift gigante: candidatos que perderam X pontos entre pesquisas consecutivas"

### Ângulo
Quem teve **maior queda** em pesquisas (>5pp) em janela de 30 dias? Sinaliza desgaste real ou erro estatístico?

### Dados
- API `/api/v1/drift?candidate_id=<uuid>&days=30` já implementada.
- Cruzar `weighted_averages` antigas com atuais via histórico.

```sql
-- Comparação de weighted_average entre snapshot mais recente e há 30d
with current as (
  select candidate_id, weighted_average from weighted_averages
  where calculated_at = (select max(calculated_at) from weighted_averages)
),
old as (
  select distinct on (candidate_id) candidate_id, weighted_average
  from weighted_averages
  where calculated_at < now() - interval '30 days'
  order by candidate_id, calculated_at desc
)
select c.name, c.slug, old.weighted_average as media_30d_atras,
       current.weighted_average as media_atual,
       (current.weighted_average - old.weighted_average) as delta
from current
join old on old.candidate_id = current.candidate_id
join candidates c on c.id = current.candidate_id
where abs(current.weighted_average - old.weighted_average) >= 5
order by abs(current.weighted_average - old.weighted_average) desc;
```

### Verificação humana
- Mudança pode ser por **mudança de pool de pesquisas** (instituto novo entrou, outro saiu) → não é desgaste real.
- Conferir se houve evento crítico no período (escândalo, debate, indicação).
- IC 95% — se as bandas se sobrepõem, a queda pode não ser estatisticamente significativa.

### Disclaimer obrigatório
> "Queda em média ponderada não implica queda real de intenção de voto. Pode refletir mudança no pool de institutos, ajuste metodológico, ou ruído estatístico dentro da margem."

### Canal sugerido
- **Bot X** (item 7 da nossa lista) — alerta automático quando |Δ| > 2pp em 7d. Já no roadmap.
- **Newsletter** com top 5 movimentos da semana.

---

## Pauta 6 — "FEFC vs urnas: quem investiu mais e perdeu" (post-eleição 2026)

### Ângulo
**Para outubro 2026.** Ranking de candidatos que mais receberam FEFC e menos votos por real gasto. "R$ X gastos por voto."

### Dados
- `campaign_finances.fund_especial` (FEFC) por candidato.
- `prior_election_results` 2026 (após eleição).
- Cálculo: `fund_especial / total_votes`.

### Verificação humana
- Esta pauta só existe em outubro/novembro 2026. Mantida no documento como prep.

### Disclaimer obrigatório
> "Razão R$/voto é métrica simplificada. Ela não captura: estados grandes vs pequenos (custo de campanha varia), competitividade do distrito, FEFC vs financiamento privado."

### Canal sugerido
- **Pós-eleição:** matéria âncora para imprensa. Co-publicação com **Estadão Dados**.

---

## Pauta 7 — "27 corridas para governador 2026: o painel completo"

### Ângulo
**Já está executado** — temos as 27 páginas SEO `/eleicoes-governador-{uf}-2026`. Falta o **rollup nacional** com o estado de cada corrida.

### Dados
- `verify-governador-2026.ts` já mostra: 158 candidatos, 89 polls, 153 wa em 27 UFs.
- AP com subcobertura (2 candidatos só).

### Verificação humana
- Atualizar mensalmente os dados.
- Cobrir UFs em mudança de cenário (ex.: candidato desistiu).

### Canal sugerido
- **Landing `/eleicoes-governador-2026`** (rollup) — não existe ainda; vale criar.
- **Newsletter** mensal "Pulse Governador 2026" no formato status (verde/amarelo/vermelho por UF baseado em IC sobreposto).

---

## Calendário sugerido (próximos 90 dias)

| Mês | Pauta primária | Pauta secundária |
|-----|----------------|-------------------|
| **Mai 2026** | **Pauta 1 (CEIS×CEAP)** — pivot midiático | Pauta 7 (rollup governador) |
| **Jun 2026** | Pauta 5 (drift) — semanal | Pauta 4 (institutos) — preparação |
| **Jul 2026** | Pauta 4 (acurácia institutos) | Pauta 2 (patrimônio) |
| **Ago 2026** | Pauta 3 (fenômenos 2022) | Pauta 5 (drift) — automação X bot |

---

## Operacional — checklist por pauta

Antes de publicar qualquer uma:

- [ ] Query rodada e exportada para CSV (review humano dos top 10-50 casos).
- [ ] Direito de resposta solicitado aos envolvidos (mínimo 48h).
- [ ] Disclaimer redigido e revisado.
- [ ] Landing/thread/newsletter draft pronto.
- [ ] Sanity check com pelo menos 1 fonte externa (jornalista sênior, analista político).
- [ ] Pre-agendar **revalidate** da rota afetada após publicação.
- [ ] **Monitor pós-publicação:** Sentry erros, comentários, pedidos de retificação.

---

*Fim. Atualizar este documento sempre que uma pauta for executada (mover para arquivo "concluídas") ou quando novos cruzamentos de dados ficarem disponíveis.*
