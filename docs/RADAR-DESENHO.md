# Pro Radar: desenho (proposta para revisão)

Status: **proposta**, nada implementado. Data: 2026-10-04 (dia do 1º turno; este documento não pede deploy).
Contexto: estratégia pós-eleição ("histórico verificável de cada político"), em
[`BASTIDORES-POS-ELEICAO.md`](BASTIDORES-POS-ELEICAO.md). O Radar é o produto recorrente que sucede o
relatório semanal de pesquisas depois de 25/10.

## 1. O que o Radar é, em uma frase

**Você escolhe quem acompanhar (políticos, partidos, UFs) e o ElectioLab avisa quando algo verificável
acontece**: votou, votou contra a bancada, gastou fora do padrão, mudou de situação, saiu pesquisa nova.

Por que recorrente: o relatório de pesquisas some quando a eleição acaba; um mandato gera eventos o ano
inteiro, e 2027 é o vale de demanda (a demanda municipal só esquenta a partir de meados de 2027).

## 2. O que já existe (verificado no banco em 2026-10-04)

| Peça | Estado |
|---|---|
| `user_alerts` + `/api/account/alerts` + `/dashboard/alertas` | Existe, **0 alertas criados**. Só alerta de **pesquisa** por candidato (`new_poll`, `movement`, `tse_change`) |
| `cron_check_user_alerts()` | Roda a cada 30 min |
| Entrega de e-mail | pg_cron → função plpgsql → `pg_net` → **Resend** (chave no Vault). Mesmo caminho do relatório Pro e do digest |
| Relatório Pro semanal | 3 assinantes, todos Stripe. **Entrega funciona**, mas o log marca falha (ver §7) |
| Usuários | 345 (223 com login nos últimos 30 dias, pico de eleição); newsletter 236 inscritos, **só 12 confirmados** |
| Dado de político | Pronto no TF: votos Câmara (454 mil) e Senado (72 mil), orientação de bancada (após #79), CEAP, situação de mandato, proposições. Ponte por CPF no ElectioLab (`politicians`, 20.117) |
| `watchlists` / `intelligence_alerts` no TF | Existem, **vazias**, presas ao auth do TF. Não usar |

Conclusão: **o motor de alerta e o canal de e-mail existem; falta o alvo "político" e os eventos de mandato.**
Não é um produto do zero.

## 3. Eventos (o que gera aviso), em ordem de valor e de custo

Só entra o que é **verificável em fonte oficial** e **calculável hoje**.

| # | Evento | Fonte | Custo | Observação editorial |
|---|---|---|---|---|
| 1 | Votou em votação nominal (e como) | `mv_votos_recentes_parlamentar` | baixo | Base de tudo |
| 2 | **Votou contra a orientação do partido** | Senado: `senado_dissidencia` (corrigida em #79); Câmara: `plen_orientacoes` | médio | É o evento de maior valor para jornalista. **Cobertura parcial** (25–64% das votações têm orientação): dizer sempre "em votação com orientação registrada" |
| 3 | Nova pesquisa / variação de média | existente (`new_poll`, `movement`) | zero | Já funciona; só falta o alvo político |
| 4 | Gasto de cota fora do padrão / fornecedor sancionado | `ceap_resumo_deputado` + CEIS (já cruzado na ficha) | médio | Linguagem factual: "R$ X em Y, Z% acima da mediana da bancada". Nunca adjetivo |
| 5 | Mudança de situação (suplência, licença, vacância) | `cam_deputado_situacao` | médio | Resolve o caso do suplente com janela de exercício desconhecida |
| 6 | Proposição nova do político | `cam_proposicoes`, `sen_proposicoes` | médio | Ruído alto; só no digest, nunca instantâneo |

**MVP: eventos 1, 2 e 3.** O 4 e o 5 entram na segunda rodada, quando houver base de usuários para medir ruído.

## 4. Arquitetura

Princípio: **separar detectar de notificar.** Quem produz o evento não sabe quem o receberá.

```
 TF (votos, CEAP, situação)              ElectioLab
 ┌────────────────────┐   leitura    ┌────────────────────────────────────────────┐
 │ mv_votos_recentes… │ ───────────► │ produtores (script diário, GitHub Actions) │
 │ senado_dissidencia │  (service)   │   └─► radar_events  (fluxo global, idempot.)│
 │ plen_orientacoes   │              │            │                               │
 └────────────────────┘              │   casador: radar_follows × radar_events    │
                                     │            └─► radar_deliveries (fila)     │
                                     │            └─► e-mail (digest) / webhook   │
                                     └────────────────────────────────────────────┘
```

### Tabelas novas (ElectioLab; RLS ligado, escrita só por service role)

- **`radar_events`**: `id`, `event_type`, `politician_id` (→ `politicians`), `occurred_at`, `payload jsonb`,
  `dedupe_key text unique` (ex.: `voto:camara:204503:v123`). O `unique` torna o produtor idempotente: rodar
  de novo não duplica.
- **`radar_follows`**: `user_id`, `target_type` (`politician` | `party` | `uf`), `target_id`, `event_types text[]`,
  `created_at`. `unique (user_id, target_type, target_id)`. RLS: o usuário só vê e altera as próprias linhas.
- **`radar_prefs`**: `user_id`, `frequency` (`instant` | `daily` | `weekly`), `channels`, `unsubscribed_at`.
- **`radar_deliveries`**: `user_id`, `event_id`, `channel`, `status`, `provider_message_id`, `sent_at`.
  `unique (user_id, event_id, channel)`: um aviso por evento por canal.

`user_alerts` **fica como está** (alertas de pesquisa) e é migrado depois, quando o Radar tiver uso. Reaproveitar
essa tabela agora misturaria dois alvos (candidato da eleição vs. pessoa) e travaria a identidade por CPF.

### Identidade
O alvo é sempre `politicians.id` (por CPF). **Nunca por nome nem por slug**, mesma regra do restante do trabalho
(os 384 slugs que cobrem mais de uma pessoa são o motivo). O botão "Seguir" da ficha resolve a pessoa pelo vínculo
`politician_links`, não pelo slug da URL.

### Envio
Sair do padrão `pg_net` + polling: ele é frágil (o log de falha falso do §7 vem daí) e não dá estado de entrega
por mensagem. Proposta: **o envio roda no app (script/rota) com o SDK do Resend**, grava `provider_message_id` e
recebe os eventos `delivered`/`bounced`/`complained` por **webhook do Resend**. Mantém o Resend e o domínio atual;
só troca quem chama. O digest agrupa por usuário (um e-mail com N eventos, não N e-mails).

### API (o ativo que concorrente não tem)
Os mesmos eventos expostos em `GET /api/v1/radar/events?politician=&type=&since=` (chave de API, tier B2B) e,
depois, webhook. É aqui que o produto vira infraestrutura para redação e consultoria, que é onde está a receita
de B2B definida na estratégia. Entra na fase 2.

## 5. Entrada do funil: a ficha é a vitrine

O botão **"Acompanhar este político"** na ficha (que já mostra votos e presença) é a superfície de aquisição:
tráfego orgânico das ~20 mil fichas → cadastro → Radar. Dois caminhos:

- **Com conta**: simples, já temos login (345 usuários).
- **Só e-mail** (sem conta): menos atrito, mas depende do **double opt-in**. Hoje só 12 de 236 inscritos da newsletter
  estão confirmados (5%): **antes de apostar nesse caminho é preciso entender por que**, porque o Radar herda o mesmo
  fluxo de confirmação.

## 6. Planos (hipótese; preço a validar nas conversas de novembro)

| | Grátis | Radar (R$ 29–49/mês) | Redação / B2B (R$ 500+/mês) |
|---|---|---|---|
| Seguir | até 3 políticos | até 50, mais partido e UF | ilimitado, por bancada |
| Frequência | digest semanal | diário + instantâneo para eventos 2 e 4 | instantâneo |
| Canais | e-mail | e-mail | e-mail, **API**, webhook, Slack |
| Eventos | 1 e 3 | 1 a 6 | 1 a 6 + exportação |

**Decisão de modelagem:** hoje `api_keys.tier` (`pro`/`business`/`enterprise`) mede **limite de requisições da API**,
não direito ao Radar. O direito ao Radar deve vir da assinatura (Stripe), não de `api_keys.tier`; senão "Pro" passa a
significar duas coisas. Sugestão: uma coluna `entitlements` derivada do webhook do Stripe.

## 7. Dívidas que o Radar herdaria (resolver antes de construir em cima)

1. **Log de entrega falso nos 4 crons de e-mail.** A resposta do Resend chega ~32,4 s depois do disparo e a função
   desiste aos 32 s: o e-mail sai, mas a linha de auditoria diz `0 sucessos / 3 falhas` desde 07/09. A correção
   (`20260928000000_fix_email_cron_http_poll_margin.sql`, janela de 90 s) **não está aplicada**: a função em produção ainda
   tem 8 × `pg_sleep(4)`. Efeito: ninguém deixa de receber, mas não dá para medir entrega, o que é pré-requisito de um
   produto de alerta. *Observação:* o histórico do `pg_net` já expirou, então a causa foi lida do comentário da migration
   e da definição da função, não reconfirmada contra o Resend agora.
2. **Confirmação de newsletter em 5%.** Ver §5.
3. **Escrita anônima**: o PR #81 fecha o que sobrou. As tabelas do Radar nascem com o default novo, mas devem ser criadas
   já com `revoke` explícito e RLS por `auth.uid()`.

## 8. Riscos

- **Acusação falsa.** "Votou contra o partido" depende de orientação com cobertura parcial e de identidade correta. O texto
  do aviso cita a base ("em votação com orientação registrada") e o link para a fonte oficial. Evento 4 sem adjetivo.
- **Ruído.** Alerta demais mata o produto. O digest agrupa, o instantâneo é só para 2 e 4, e há um teto por usuário/dia.
- **LGPD e envio.** Opt-in explícito, `List-Unsubscribe`, descadastro em um clique, retenção definida. CPF nunca vai para
  tabela legível pelo `anon` (continua só por service role).
- **Custo de envio.** Resend por volume; o digest agrupado mantém o custo previsível. Medir antes de abrir o plano grátis.
- **Dependência de dois projetos Supabase.** Se o TF mudar de schema, os produtores quebram. Teste de fumaça diário que
  consulta cada view usada, igual ao que já foi proposto para a ficha.

## 9. Validação antes de construir (barata, em ordem)

1. **Botão "Acompanhar" falso** na ficha (clique registra interesse, mostra "em breve"), atrás de flag. Mede demanda sem
   construir nada. Meta de partida a definir (por exemplo: cliques por mil visitas de ficha de senador).
2. **Radar manual** ("concierge"): um e-mail semanal escrito a partir dos eventos 1 e 2 para os 3 assinantes Pro e para as
   redações das conversas de novembro. Valida o conteúdo antes do código.
3. **Conversas** (já no plano): perguntar a 10 a 15 jornalistas e consultorias quais eventos pagariam e a que preço.

**Critério de parada:** se o botão falso e o Radar manual não mostrarem demanda até meados de dezembro, não construir a
fase de assinatura; manter só a ficha e a API.

## 10. Roadmap proposto

| Quando | Entrega |
|---|---|
| Até 25/10 | Segurar a operação do 2º turno. Aplicar a correção do log de e-mail. Entender os 5% de confirmação |
| Nov | Botão falso na ficha + conversas + Radar manual (eventos 1 e 2). Produtores em dry-run |
| Dez | **MVP**: `radar_*`, "Seguir" com conta, digest diário/semanal por e-mail, plano pago no Stripe |
| Jan–Fev 2027 | Janela de posse: eventos 4 e 5, "seguir por UF", primeiros contratos B2B |
| Mar 2027 | API de eventos e webhook; revisar números e decidir a camada municipal de 2028 |

## 11. Decisões que dependem de você

1. **Tabelas novas** (`radar_*`, recomendado) ou estender `user_alerts`?
2. **Seguir sem conta** (só e-mail, com double opt-in) já no MVP, ou exigir login?
3. **Envio**: sair do `pg_net` e mandar pelo app com webhook do Resend (recomendado), ou manter o padrão atual?
4. **Direito ao Radar**: por assinatura do Stripe (recomendado) ou reaproveitando `api_keys.tier`?
5. **Primeiros eventos**: confirmar 1, 2 e 3 como MVP?
6. **Preço**: a faixa de R$ 29–49 vale como hipótese, ou você já tem outra referência?
