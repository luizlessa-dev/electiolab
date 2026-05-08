# Médias ponderadas de pesquisas eleitorais

**Fonte canónica:** Edge Function `recalculate-averages` no projeto Supabase **xoxztzologqeqbajlhya** (versão 3, atualizada 2026-04-28).
**Tabela alvo:** `weighted_averages` (uma linha por par `election_id × candidate_id` em modo *snapshot*).

Este documento descreve **exatamente** como o ElectioLab calcula as médias ponderadas exibidas no dashboard, comparador e páginas SEO. Está versionado para que jornalistas, analistas e o próprio time possam auditar a metodologia sem precisar ler o código da Edge Function.

---

## 1. Visão geral

Cada média ponderada combina pesquisas elegíveis de uma mesma eleição usando quatro pesos multiplicativos **por pesquisa**:

```
peso_pesquisa = recência × tamanho_amostra × metodologia × confiabilidade_instituto
```

Para cada candidato:

```
média_ponderada = Σ (percentual × peso_pesquisa) / Σ peso_pesquisa
desvio_padrão  = √( Σ peso_pesquisa × (percentual − média_ponderada)² / Σ peso_pesquisa )
IC 95%         = [ média − 1.96 × σ ; média + 1.96 × σ ]    (truncado a [0, 100])
```

Os valores armazenados são arredondados para **uma casa decimal**.

---

## 2. Os quatro pesos

### 2.1 Recência — meia-vida exponencial

```ts
recencyWeight = 0.5 ^ ( max(0, daysOld) / halfLifeDays )
halfLifeDays  = 10  // padrão
```

`daysOld` é a diferença, em dias, entre `fieldwork_end` da pesquisa e a `referenceDate` da eleição (ver §4). Pesquisas no futuro recebem peso = 1 (clip em zero).

| Idade do *fieldwork end* | Peso de recência |
|--------------------------|-----------------:|
| 0 dias                   | 1.00             |
| 5 dias                   | 0.71             |
| 10 dias (1 meia-vida)    | 0.50             |
| 20 dias                  | 0.25             |
| 30 dias                  | 0.13             |

Na prática: **uma pesquisa de 30 dias atrás vale ≈ 1/8 de uma pesquisa de hoje.**

### 2.2 Tamanho da amostra — raiz quadrada normalizada

```ts
sampleWeight = √( sample_size / 1000 )
```

| Amostra | Peso |
|--------:|-----:|
|     500 | 0.71 |
|   1.000 | 1.00 |
|   2.000 | 1.41 |
|   4.000 | 2.00 |

Crescimento sublinear evita que pesquisas com amostras gigantes dominem o cálculo.

### 2.3 Metodologia — pesos fixos

| `methodology` | Peso |
|---------------|-----:|
| `presencial`  | 1.00 |
| `telefonica`  | 0.85 |
| `mista`       | 0.75 |
| `online`      | 0.60 |
| Outro / nulo  | 0.50 |

### 2.4 Confiabilidade do instituto

```ts
instituteWeight = institutes.reliability_score ?? 0.7
```

`reliability_score` é uma coluna em `institutes` (escala 0–1). Pesquisas sem instituto registado caem no fallback **0.70**.

---

## 3. Saída por candidato

Cada linha em `weighted_averages` contém:

| Campo                       | Significado                                             |
|-----------------------------|---------------------------------------------------------|
| `weighted_average`          | Média ponderada, 1 decimal                              |
| `confidence_interval_low`   | `max(0, média − 1.96σ)`, 1 decimal                      |
| `confidence_interval_high`  | `min(100, média + 1.96σ)`, 1 decimal                    |
| `polls_included`            | Número de pesquisas que tinham resultado p/ o candidato |
| `total_sample_size`         | Soma das amostras das pesquisas incluídas               |
| `calculation_params`        | `{ half_life: 10, reference_date: ISO }`                |
| `calculated_at`             | Timestamp da execução                                   |

---

## 4. `referenceDate` — âncora da recência

```
referenceDate = election.election_date ?? now()
```

Quando a eleição já tem data publicada (ex.: 2026-10-04), as pesquisas envelhecem **em relação à data da eleição**, não à data atual. Isto faz com que as médias **convirjam** ao se aproximar do pleito — pesquisas antigas perdem peso na mesma proporção independentemente de quando o recálculo é executado.

---

## 5. Modos de execução

A função aceita três modos por query string:

```
POST /functions/v1/recalculate-averages?election_id=UUID
POST /functions/v1/recalculate-averages?all=true
POST /functions/v1/recalculate-averages?election_id=UUID&keep_history=true
```

| Parâmetro       | Comportamento                                                   |
|-----------------|------------------------------------------------------------------|
| `election_id`   | Recalcula uma eleição                                            |
| `all=true`      | Recalcula todas as eleições com ≥ 1 poll                         |
| `keep_history`  | **Não** apaga linhas anteriores antes de inserir (modo histórico) |

**Padrão é *snapshot***: cada chamada **apaga** as linhas anteriores daquela `election_id` em `weighted_averages` e insere o novo cálculo. Isto evita poluição da tabela com duplicatas (problema corrigido na v3 — antes o `upsert` usava `calculated_at` como conflict target, mas como esse campo é sempre `now()` nunca colidia).

---

## 6. Critérios de inclusão

Uma pesquisa é considerada para uma eleição se:

1. `polls.election_id` = a eleição em questão.
2. Existe ao menos uma linha em `poll_results` ligando a pesquisa ao candidato.
3. (Implícito) `polls.fieldwork_end` é uma data válida.

Candidatos só entram no cálculo se `is_active = true` em `candidates`.

Não há filtro explícito por **janela temporal** — pesquisas muito antigas continuam entrando, mas o peso de recência (§2.1) tipicamente as torna negligíveis.

---

## 7. Limitações conhecidas / pontos de transparência

- **Sem ajuste por *house effect***: o sistema não corrige vieses sistemáticos por instituto além do `reliability_score`. Se o Datafolha consistentemente subestima o candidato X em 2 pp, isso não é compensado.
- **Sem agrupamento por tipo de pergunta**: estimulada vs espontânea, primeiro turno vs segundo turno são tratadas no mesmo pool se compartilharem `election_id`. A separação depende de como `polls` foi populada — documentar a convenção é responsabilidade do *seed*.
- **Empate técnico**: o IC 95% é calculado por candidato isoladamente; a página/UI deve usar a sobreposição de ICs entre candidatos para sinalizar empate técnico.
- **Pesos fixos por metodologia** (§2.3): não há literatura *peer-reviewed* anexada à escolha desses números. São coeficientes pragmáticos do produto, abertos a revisão.
- **`reliability_score` é editorial**: vem de avaliação interna, não de tracking automático de erro vs resultado real. Documentar a metodologia desse score é um *follow-up*.

---

## 8. Reproduzir manualmente

```sql
-- Pesquisas elegíveis para uma eleição
select p.id, p.fieldwork_end, p.sample_size, p.methodology,
       i.reliability_score, pr.candidate_id, pr.percentage
from polls p
left join institutes i on i.id = p.institute_id
join poll_results pr on pr.poll_id = p.id
where p.election_id = '<UUID>'
order by p.fieldwork_end desc;
```

Aplique os pesos do §2 sobre cada linha, agregue por `candidate_id` e compare com:

```sql
select * from weighted_averages where election_id = '<UUID>';
```

---

## 9. Versão & changelog

- **v3 (2026-04-28)**: snapshot mode como padrão (delete antes do insert), parâmetro `keep_history` para preservar histórico.
- **v2 (2026-04-12)**: refactor para suportar `?all=true`.
- **v1**: implementação inicial com fórmula descrita acima.

Atualizar este documento sempre que **qualquer constante** de §2 mudar (meia-vida, pesos de metodologia, fallbacks).
