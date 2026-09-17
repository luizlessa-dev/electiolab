# Calendário de Conteúdo — LinkedIn
**Período:** 17/09/2026 a 02/11/2026 · **Cadência:** 4-5x/semana · **Perfil:** pessoal do Luiz, não company page
**Comum a todos os canais (checklist, snapshot de dados, outreach):** [CALENDARIO-COMUM.md](./CALENDARIO-COMUM.md)
**Outros canais:** [X](./CALENDARIO-X.md) · [Instagram](./CALENDARIO-INSTAGRAM.md) · [Facebook](./CALENDARIO-FACEBOOK.md)

Regra geral: nas datas da tabela de exceções no fim deste arquivo já existe post-âncora fixo — não rodar a rotação semanal nesse dia, usar o âncora. Link sempre no primeiro comentário, nunca no corpo do post.

**3ª data de início (10/09 → 13/09 → 17/09):** o post de apresentação (antes em 13/09) virou o lançamento de hoje. O post de arquitetura (antes em 17/09) foi remarcado pra 23/09, já que hoje agora é o lançamento.

---

## Grade semanal — rotação de base

**Segunda — founder/bastidor** · **Quarta — arquitetura/dado/metodologia** · **Sexta — opinião/ponto de vista sobre cobertura eleitoral.** Reaproveitar o tom do post de 17/09 já escrito como referência de voz (primeira pessoa, história pessoal, fecha com pergunta aberta); cada semana troca só o ângulo específico.

### Parâmetros por semana (ângulo específico, além dos posts-âncora já escritos)

| Semana | Segunda (founder/bastidor) | Quarta (arquitetura/dado) | Sexta (opinião) |
|---|---|---|---|
| 15-19/09 | — (17/09 já é o âncora de lançamento) | — (17/09 já é o âncora de lançamento) | Por que "empate técnico" é a palavra mais mal-empregada da cobertura eleitoral |
| 21-25/09 | Como decido qual pesquisa entra na média (critério de inclusão/exclusão) | 23/09 âncora (arquitetura, remarcado de 17/09) | 24/09 âncora (2º turno) |
| 28/09-02/10 | Por que não uso casas decimais além da 1ª no indicador de erro | Como o site aguenta o pico de tráfego do dia da apuração (ou não) | O que uma pesquisa de 2.000 pessoas realmente representa num país de 150 milhões de eleitores |
| 05-09/10 | 05/10 âncora (acerto da média) | Comparando o erro do ElectioLab com o erro médio das pesquisas individuais | 07/10 âncora (virada pro 2º turno) |
| 12-16/10 | Por que ninguém cobre o Senado com a mesma intensidade da Presidência | Como a média ponderada recalcula sozinha quando um instituto para de publicar | O 2º turno é mais previsível que o 1º? O que os dados mostram |
| 19-23/10 | O que muda no ElectioLab depois que a eleição acaba (spoiler: quase nada, o cron não sabe que é dezembro) | Revisando os pesos de acurácia com o resultado real do 1º turno | 19/10 âncora (contagem regressiva) |
| 26-30/10 | 26/10 âncora (retrospectiva) | Os números que eu não esperava ver no fim da temporada | O que eu mudaria se fosse fazer de novo |

---

## FASE 1 — Aquecimento (17/09 a 03/10)

**Qui 17/09 (hoje) — Lançamento simultâneo (X + Instagram + Facebook + LinkedIn) — Fixo**
```
Faz uns anos que eu acompanho pesquisa eleitoral pelo mesmo lugar que todo mundo: manchete solta. "Datafolha aponta X", "Quaest mostra Y". Cada uma pega um instituto, ignora os outros, e quem lê sai mais confuso do que entrou.

Esse ano eu resolvi meu próprio problema. Construí o ElectioLab sozinho: um agregador que junta todas as pesquisas eleitorais brasileiras de 2026 numa média ponderada por recência, tamanho de amostra e acurácia histórica de cada instituto contra o resultado real do TSE.

Hoje tem cobertura de presidência, 27 governadores e 27 senadores. Dashboard público e média ponderada são gratuitos, sem login. Tem plano Pro pra quem quer histórico completo, API e alertas, mas o essencial pro leitor é de graça. Atualiza sozinho a cada 6h.

Não é uma empresa com investimento nem uma redação. É um projeto solo rodando em Next.js e Supabase, feito porque eu queria essa ferramenta e ela não existia.

Quem cobre política ou dados no trabalho, dá uma olhada: electiolab.com

O que você acha que falta numa cobertura de pesquisa eleitoral hoje?
```
*(Link vai no primeiro comentário, não no corpo.)*

**Qua 23/09 — Fixo (arquitetura/gasto digital, remarcado de 17/09)**
```
Uma pergunta que recebo direto: "como um projeto solo consegue dado oficial de gasto de campanha em Google Ads e Meta?"

Resposta chata: não tem segredo, é público. Google Transparency Center e Meta Ad Library publicam gasto por anunciante político, e ninguém cruza isso com o perfil de cada candidato.

O ElectioLab faz esse cruzamento automaticamente. Em 2022, Bolsonaro declarou R$ 28,6 milhões em Google Ads. Esse número existe há anos num relatório público que quase ninguém lê. A gente só botou no perfil do candidato pra qualquer pessoa ver.

A stack toda é simples de propósito: Next.js, Supabase, Vercel, cron rodando a cada 6h. Não tem nada de complexo escondido, o difícil foi decidir cruzar essas três fontes de dado público que ninguém tinha juntado antes.

Trabalha com dado aberto ou jornalismo de dados? Curioso pra saber que outras fontes públicas estão subaproveitadas assim.
```

**Qui 24/09 — Fixo**
```
Uma coisa que reparei construindo o simulador de 2º turno: o resultado do 1º turno muda completamente quem sobra pra disputar, mas a cobertura de pesquisa raramente atualiza o cenário com a mesma velocidade.

O ElectioLab recalcula os principais confrontos de 2º turno a cada atualização de pesquisa, com a mesma média ponderada por acurácia histórica do instituto.

Faltam [ATUALIZAR: X] dias pro 1º turno. Depois de domingo, essa página vira a mais importante do site.

electiolab.com/quem-vence-no-segundo-turno-presidencia-2026 no primeiro comentário.

Curioso: quem você acha que sobra no 2º turno esse ano?
```

---

## FASE 2 — 1º turno (04/10) e semana seguinte

**Dom 04/10 — Assim que houver resultado oficial — Fixo (esqueleto)**
```
1º turno apurado.

A média ponderada projetava [ATUALIZAR]. O resultado oficial foi [ATUALIZAR].

Diferença: [ATUALIZAR — se pequena, é a prova de que ponderar por acurácia funciona; se grande, ser direto sobre isso também]

Relatório completo com detalhe por instituto: electiolab.com/relatorio/[semana] [UTM, primeiro comentário]
```

**Seg-Ter 05-06/10 — Fixo (prova social)**
```
Passei a campanha inteira defendendo que ponderar pesquisa pelo histórico de acurácia do instituto dá um retrato mais confiável do que olhar cada pesquisa isolada.

Domingo foi o teste real. A média ponderada do ElectioLab ficou a [ATUALIZAR: X] pontos percentuais do resultado oficial do TSE.

[ATUALIZAR: adicionar contexto, comparação com pesquisas individuais se fizer sentido]

Relatório completo, com erro calculado por instituto, no primeiro comentário.

Isso muda como eu vou tratar a média pro 2º turno: mais peso ainda pra quem mais acertou agora.
```

**Qua-Sex 07-10/10 — Fixo (virada de chave pro 2º turno)**
Post curto anunciando a virada de foco editorial pro 2º turno, reforçando que a metodologia (peso por acurácia histórica) continua a mesma, só os candidatos mudam.

---

## FASE 3 — Entre turnos (05/10 a 24/10)

**Semana de 12/10 — Retomar cadência**
Usar Template D do banco abaixo conforme pesquisas do 2º turno forem saindo, além da grade semanal normal (Segunda/Quarta/Sexta).

---

## FASE 4 — 2º turno (25/10) e pós-eleição

**Dom 25/10 — Assim que houver resultado oficial** — mesmo esqueleto da Fase 2 (04/10), adaptado pro confronto de 2 candidatos.

**Seg 26/10 a Sex 30/10 — Fixo (retrospectiva da temporada)**
```
A eleição de 2026 acabou. Um balanço de quem construiu o ElectioLab sozinho durante a campanha inteira:

[ATUALIZAR: X] pesquisas indexadas, [ATUALIZAR: Y] institutos cobertos, [ATUALIZAR: Z] entrevistas somadas ao longo do ano.

A média ponderada por acurácia histórica errou por [ATUALIZAR] pontos percentuais no 1º turno e [ATUALIZAR] no 2º, sempre comparado ao resultado oficial do TSE.

O instituto que mais acertou a temporada inteira: [ATUALIZAR].

Não teve investimento, não teve equipe. Foi um projeto solo pra resolver um problema que eu tinha como leitor de notícia política.

Se você cobriu ou acompanhou eleição esse ano, queria saber: o que faltou numa cobertura de pesquisa que ainda não existe?
```

---

## Banco de templates reutilizáveis

### Template D — Post curto — pesquisa nova com destaque
```
[Instituto] publicou pesquisa hoje. Sozinha, ela mostra [X]%.

Ponderada pelo histórico de acurácia desse instituto e cruzada com as demais pesquisas recentes, a média do ElectioLab fica em [Y]%.

É essa a diferença entre ler uma pesquisa e ler o cenário.

Detalhe no primeiro comentário.
```

---

## Exceções — dias que já têm post-âncora fixo (não duplicar a rotação)

| Data | O que já está escrito |
|---|---|
| 17/09 | Apresentação do projeto (lançamento simultâneo) |
| 23/09 | Arquitetura / gasto digital (remarcado de 17/09) |
| 24/09 | 2º turno em destaque |
| 04/10 | Resultado 1º turno |
| 05-06/10 | Acerto/erro da média |
| 07-10/10 | Virada de chave pro 2º turno |
| 25/10 | Resultado 2º turno |
| 26-30/10 | Retrospectiva da temporada |

Checklist final antes de postar: [CALENDARIO-COMUM.md](./CALENDARIO-COMUM.md).
