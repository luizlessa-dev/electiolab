# Reliability score dos institutos de pesquisa

**Coluna:** `institutes.reliability_score` (escala `0.0` – `1.0`).
**Uso direto:** entra como `instituteWeight` no cálculo de `weighted_averages` (ver [WEIGHTED-AVERAGES.md](./WEIGHTED-AVERAGES.md), §2.4). Pesa multiplicativamente cada pesquisa daquele instituto. Fallback: **0.7** se nulo.

Este documento existe para **encerrar um gap de transparência editorial**: a fórmula da média ponderada está auditável, mas dependia de um score cuja origem não estava documentada. Manter o score sem doc é risco reputacional ("ElectioLab puxou um número do nada para favorecer o instituto X").

---

## 1. Estado atual — o que o score é hoje

**É uma avaliação editorial, não um indicador estatístico calculado automaticamente.** Os valores foram atribuídos manualmente com base em três sinais qualitativos, em ordem decrescente de peso:

1. **Histórico publicado de erro vs resultado real** em eleições anteriores (2018, 2020, 2022). Exemplos públicos: análises do Poder360 e do PoliGraph sobre acurácia comparada.
2. **Maturidade metodológica**: registo no CONRE/Abraqua, divulgação aberta de questionário, tamanho típico de amostra, controle de cotas.
3. **Reputação institucional**: tempo de existência, presença em mídia consolidada (Datafolha/Folha, Ipec/Globo), ausência de polémicas recentes de viés.

**Não inclui:**
- Cálculo automático de erro médio quadrático contra resultado oficial.
- Ajuste por tipo de pergunta (estimulada × espontânea), eleição (presidencial × estadual) ou janela temporal.
- *House effect* explícito (viés sistemático de instituto detectado por *meta-analysis*).

---

## 2. Distribuição atual

Snapshot em 2026-05-08 (`SELECT name, reliability_score FROM institutes ORDER BY reliability_score DESC`):

| Faixa            | Score | Institutos representativos                                  |
|------------------|------:|-------------------------------------------------------------|
| **Topo (≥0.85)** | 0.85–1.00 | Datafolha (0.92), Ipec (0.88), Quaest (0.85)             |
| **Alta (0.75–0.84)** | 0.75–0.84 | Genial/Quaest, PoderData, Atlas Intel, Ipespe, MDA/CNT |
| **Média (0.65–0.74)** | 0.65–0.74 | FSB, Veritá, Real Time Big Data, Paraná Pesquisas, Futura |
| **Baixa (<0.65)**     | <0.65   | Vox Brasil, Séculus, Instituto Índice                  |
| **Outliers**          | 1.00    | Neokemp, Nexus — institutos novos com poucas observações; score precisa revisão |

**Regra de bolso:** a maioria dos institutos sérios cai entre **0.70 e 0.95**. Score `1.00` provavelmente é placeholder de cadastro recente — deve ser revisitado quando houver pelo menos 3 pesquisas comparáveis ao resultado oficial.

---

## 3. Roadmap para um score auditável

O objetivo é migrar de "editorial" para **"calculado e auditável"** sem mudar a interface (`reliability_score` continua sendo um número 0–1 consumido por `recalculate-averages`).

### Fase 1 — *Tracking* histórico (não muda o score, só observa)

Tabela `institute_accuracy_observations`:

```sql
create table institute_accuracy_observations (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid references institutes(id),
  election_id uuid references elections(id),
  candidate_id uuid references candidates(id),
  poll_published_pct numeric,        -- % no relatório do instituto
  actual_pct numeric,                 -- % no resultado oficial
  fieldwork_end_days_before int,     -- dias entre fieldwork_end e a eleição
  observed_at timestamptz default now(),
  unique (institute_id, election_id, candidate_id, fieldwork_end_days_before)
);
```

Job pós-eleição: para cada poll do instituto cujo `fieldwork_end` é até **N dias** antes do dia do pleito, registar `(predicted, actual)` por candidato.

### Fase 2 — Métrica derivada

Para cada instituto, calcular **MAE** (Mean Absolute Error) na janela de 7 dias antes da eleição, ponderado por relevância (top 2 candidatos contam mais que cauda):

```
MAE_7d = mean( |poll_pct − actual_pct| )  filtrado em fieldwork_end ≤ 7 dias
```

Mapear `MAE_7d` → `reliability_score`:

```
reliability_score = clamp( 1 − (MAE_7d / 8) , 0 , 1 )
```

Justificativa do divisor 8: erro médio agregado de pesquisas brasileiras em 1º turno fica historicamente entre 2 e 5 pp; usar 8 como limite de "score zero" é conservador.

### Fase 3 — Composto e versionado

`reliability_score` final = média ponderada entre:
- 70 % MAE histórico (Fase 2).
- 20 % cobertura (n eleições observadas; institutos novos com <3 observações ficam em fallback 0.7).
- 10 % bônus editorial (transparência metodológica, registo CONRE).

Versionar a fórmula: cada execução grava `score_version` em `institute_accuracy_observations` e em `institutes`.

---

## 4. Itens imediatos (independentes do roadmap)

- [ ] **Revisar Neokemp e Nexus** que estão em 1.00 — provavelmente placeholder de cadastro.
- [ ] **Adicionar coluna `reliability_score_basis`** em `institutes` com texto curto explicando a base (ex.: "MAE 3.2pp em 4 eleições" ou "Editorial — sem histórico ainda").
- [ ] **Expor o critério na página `/institutos`** — adicionar tooltip ou seção "Como calculamos" linkando para este documento.
- [ ] **Adicionar página `/sobre/metodologia`** consolidando WEIGHTED-AVERAGES + RELIABILITY-SCORE para citação de imprensa.

---

## 5. FAQ jornalístico (use isto se questionarem)

**P: Como vocês definem que o Datafolha vale mais que o Vox Brasil?**
R: Hoje, é avaliação editorial baseada em histórico público de acurácia, maturidade metodológica e reputação institucional. Estamos construindo (ver §3) métrica auditável a partir de comparação automática entre pesquisa pré-eleição e resultado oficial.

**P: O score muda?**
R: Sim. Cada nova eleição adiciona observações. Fase 2 (acima) recalcula automaticamente; até lá, ajustes são editoriais e versionados via `git log` do *seed*.

**P: E se um instituto contestar o score?**
R: Canal de correção via `oi@electiolab.com`. Pedidos com base em **erros factuais documentáveis** (ex.: "vocês citaram pesquisa errada") são revistos em até 5 dias úteis.

---

## 6. Versão & changelog

- **v1 (2026-05-08)**: documentação inicial do estado editorial e roadmap para auditabilidade.

Atualizar este documento sempre que:
- Os critérios da §1 mudarem.
- Algum item do roadmap (§3) avançar.
- Houver mudança em massa nos scores de mais de 3 institutos.
