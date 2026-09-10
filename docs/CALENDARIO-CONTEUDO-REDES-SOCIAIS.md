# Calendário de Conteúdo — ElectioLab
**Período:** 10/09/2026 a 02/11/2026 · **Canais:** X, Instagram, LinkedIn
**Baseado em:** [PLANO-DIVULGACAO-REDES-SOCIAIS.md](./PLANO-DIVULGACAO-REDES-SOCIAIS.md)

## Antes de postar qualquer coisa

Os números do PRESS-KIT.md são de 29/04/2026. Todo trecho marcado `[ATUALIZAR: ...]` precisa do dado fresco do banco antes de ir pro ar (quantidade de pesquisas indexadas, entrevistas acumuladas, institutos ativos). É rápido de puxar do Supabase, mas não posta o número de abril como se fosse de hoje.

Convenção usada abaixo:
- **Fixo** = copy pronta, só revisar e postar na data.
- **Reativo** = depende de evento do dia (pesquisa nova saiu, resultado de urna). Usa um dos templates do banco (seção final) no dia certo.
- Todo link vai com UTM: `?utm_source=[x|instagram|linkedin]&utm_medium=social&utm_campaign=eleicoes2026`

## Snapshot ao vivo (puxado do Supabase em 10/09/2026)

Usar como referência pros posts da Semana 1 e pra qualquer `[ATUALIZAR]` que precisar de número antes da próxima atualização. Válido só pra essa data, os cenários mudam a cada pesquisa nova.

- **298** candidatos com bio · **293** pesquisas presidenciais indexadas · **18** institutos cobrindo a presidencial · **669.166** entrevistas somadas (presidencial)
- **Base completa (todas as eleições):** 713 pesquisas, 25 institutos, 1.311.031 entrevistas
- **1º turno (média ponderada de hoje):** Lula 38,7% (54 pesquisas) · Flávio Bolsonaro 35,0% (53) · Augusto Cury 7,2% · Renan 3,8% · Caiado 3,5% · Marçal 2,3% · Zema 1,6%
- **2º turno (cenários):** Flávio x Lula segue empate técnico (44,7% x 44,4%, 14 pesquisas). Lula abre vantagem clara contra Zema (45,9% x 38,2%), Caiado (43,7% x 38,3%) e Renan Santos (44,3% x 33,7%)
- **Acurácia por instituto (confirmada, bate com os posts já escritos):** Datafolha 0,92 · Ipec 0,88 · Quaest 0,85 · PoderData 0,80 · Atlas Intel 0,78

---

## FASE 1 — Aquecimento (10/09 a 03/10)

### Semana 1 — 10 a 14/09

**Qui 10/09 — X (thread) — Fixo**
```
1/ Por que Datafolha, Quaest e Atlas Intel dão números diferentes pra mesma eleição? Não é porque um está "certo" e o outro "errado". É porque cada um tem um histórico de acurácia diferente contra o resultado real do TSE.

2/ A gente mediu isso: Datafolha acerta com desvio médio de 92% vs. resultado oficial. Quaest, 85%. Atlas Intel, 78%. Paraná Pesquisas, 70%.

3/ Isso não é opinião, é comparação direta com o que aconteceu nas urnas em eleições passadas.

4/ Por isso a gente não escolhe "qual pesquisa acreditar". A gente pondera todas pelo histórico de acurácia do instituto, recência e tamanho da amostra, e mostra a média resultante.

5/ Método completo e aberto, sem login: electiolab.com/metodologia [link com UTM]
```

**Qui 10/09 — LinkedIn — Fixo**
```
Faz uns anos que eu acompanho pesquisa eleitoral pelo mesmo lugar que todo mundo: manchete solta. "Datafolha aponta X", "Quaest mostra Y". Cada uma pega um instituto, ignora os outros, e quem lê sai mais confuso do que entrou.

Esse ano eu resolvi meu próprio problema. Construí o ElectioLab sozinho: um agregador que junta todas as pesquisas eleitorais brasileiras de 2026 numa média ponderada por recência, tamanho de amostra e acurácia histórica de cada instituto contra o resultado real do TSE.

Hoje tem cobertura de presidência, 27 governadores e 27 senadores. Dashboard público e média ponderada são gratuitos, sem login. Tem plano Pro pra quem quer histórico completo, API e alertas, mas o essencial pro leitor é de graça. Atualiza sozinho a cada 6h.

Não é uma empresa com investimento nem uma redação. É um projeto solo rodando em Next.js e Supabase, feito porque eu queria essa ferramenta e ela não existia.

Quem cobre política ou dados no trabalho, dá uma olhada: electiolab.com

O que você acha que falta numa cobertura de pesquisa eleitoral hoje?
```
*(Link vai no primeiro comentário, não no corpo.)*

**Sex 11/09 — Instagram (carrossel, 6 slides) — Fixo**

Slide 1 (capa): "Nem toda pesquisa eleitoral acerta igual. Aqui está o placar."
Slide 2: "Datafolha — 92% de acurácia histórica vs. resultado oficial do TSE"
Slide 3: "Quaest — 85%"
Slide 4: "Ipec — 88%"
Slide 5: "Atlas Intel — 78% · Paraná Pesquisas — 70%"
Slide 6 (fecho): "A gente usa esse histórico pra dar peso maior a quem mais acerta. Método completo no link da bio."

**Legenda:**
```
Toda semana sai pesquisa nova e a manchete trata todas como se pesassem igual.

Não pesam. A gente comparou o resultado de cada instituto com o que realmente aconteceu nas urnas em eleições passadas, e monta uma média ponderada com esse histórico.

Quanto mais um instituto costuma acertar, mais peso ele tem na média. Simples assim, e 100% aberto.

Dashboard gratuito, sem login. Site na bio.

.
.
.
#eleicoes2026 #pesquisaeleitoral #datafolha #quaest #eleicoesbrasil #politicabrasil #jornalismodedados
```

**Sáb-Dom 13-14/09 — X — Reativo**
Usar **Template B (recap de fim de semana)** do banco. Se sair pesquisa nova no fim de semana, usar **Template A** em vez disso.

---

### Semana 2 — 15 a 21/09

**Cadência diária X:** usar Template A sempre que sair pesquisa nova (Datafolha/Quaest/Atlas costumam publicar nessa janela pré-1º-turno).

**Qua 17/09 — LinkedIn — Fixo**
```
Uma pergunta que recebo direto: "como um projeto solo consegue dado oficial de gasto de campanha em Google Ads e Meta?"

Resposta chata: não tem segredo, é público. Google Transparency Center e Meta Ad Library publicam gasto por anunciante político, e ninguém cruza isso com o perfil de cada candidato.

O ElectioLab faz esse cruzamento automaticamente. Em 2022, Bolsonaro declarou R$ 28,6 milhões em Google Ads. Esse número existe há anos num relatório público que quase ninguém lê. A gente só botou no perfil do candidato pra qualquer pessoa ver.

A stack toda é simples de propósito: Next.js, Supabase, Vercel, cron rodando a cada 6h. Não tem nada de complexo escondido, o difícil foi decidir cruzar essas três fontes de dado público que ninguém tinha juntado antes.

Trabalha com dado aberto ou jornalismo de dados? Curioso pra saber que outras fontes públicas estão subaproveitadas assim.
```

**Sex 19/09 — Instagram (carrossel, 5 slides) — Fixo**

Slide 1 (capa): "R$ 28,6 milhões. É quanto Bolsonaro declarou em Google Ads só em 2022."
Slide 2: "Esse dado é público desde sempre, no Google Transparency Center."
Slide 3: "A gente cruzou com a Meta Ad Library e colocou no perfil de cada candidato."
Slide 4: "Assim dá pra ver quanto cada candidatura de 2026 está gastando em propaganda digital, atualizado."
Slide 5 (fecho): "Confere o perfil do seu candidato. Link na bio."

**Legenda:**
```
Isso é dado público. Sempre foi.

Google Transparency Center e Meta Ad Library publicam quanto cada anunciante político gasta. O problema é que ninguém organiza isso por candidato de um jeito fácil de olhar.

A gente organizou. Cada perfil de candidato no ElectioLab mostra o histórico de gasto em propaganda digital, com fonte oficial.

Quer saber quanto o candidato do seu estado está investindo em anúncio? Link na bio, sem login.

.
.
.
#eleicoes2026 #googleads #metaads #transparencia #politicabrasil #propagandaeleitoral #dadosabertos
```

---

### Semana 3 — 22 a 28/09

**Ter 22/09 — X (post único, 267 caracteres) — Fixo**
```
Faltam 12 dias pro 1º turno.

A média ponderada de hoje, considerando todas as pesquisas indexadas e o histórico de acurácia de cada instituto: [ATUALIZAR: puxar número atual da média presidencial]

Acompanha de graça, sem login: electiolab.com [UTM]
```

**Qui 24/09 — Instagram + LinkedIn — Fixo (mesmo tema, copy diferente por canal)**

*Instagram — carrossel "e se for pro 2º turno?"*
Slide 1 (capa): "Se o 1º turno terminar assim, quem ganha no 2º?"
Slides 2-4: cenários de confronto (usar dados atuais da página `/quem-vence-no-segundo-turno-presidencia-2026`)
Slide 5 (fecho): "A gente simula todos os cenários possíveis, atualizado. Link na bio."

**Legenda:**
```
O 1º turno decide quem disputa, mas o 2º turno é outro jogo.

A gente simula os principais confrontos possíveis com os dados de hoje. Alguns são empate técnico, outros têm folga clara.

Site tem todos os cenários atualizados, sem esperar boato de WhatsApp. Link na bio.

.
.
.
#eleicoes2026 #segundoturno #eleicoespresidenciais #politicabrasil
```

*LinkedIn:*
```
Uma coisa que reparei construindo o simulador de 2º turno: o resultado do 1º turno muda completamente quem sobra pra disputar, mas a cobertura de pesquisa raramente atualiza o cenário com a mesma velocidade.

O ElectioLab recalcula os principais confrontos de 2º turno a cada atualização de pesquisa, com a mesma média ponderada por acurácia histórica do instituto.

Faltam [ATUALIZAR: X] dias pro 1º turno. Depois de domingo, essa página vira a mais importante do site.

electiolab.com/quem-vence-no-segundo-turno-presidencia-2026 no primeiro comentário.

Curioso: quem você acha que sobra no 2º turno esse ano?
```

**Sex 26/09 — Outreach direto (não é post público)**
Enviar via e-mail/DM pra 5-10 contatos da lista do PRESS-KIT.md (Núcleo Jornalismo, Tilt UOL, Manual do Usuário são os de maior fit pra esse momento pré-1º-turno). Usar o **Template de outreach** já pronto no PRESS-KIT.md, seção "Template de e-mail de outreach", adaptando a linha de abertura para mencionar a proximidade do 1º turno.

---

### Semana 4 — 29/09 a 03/10 (véspera)

**Seg 29/09 a Sex 03/10 — X (post único diário) — Fixo, contagem regressiva**

D-5 (29/09):
```
5 dias pro 1º turno.

A média ponderada de hoje: [ATUALIZAR]

Atualiza sozinha a cada 6h, com peso maior pra quem mais acerta historicamente. electiolab.com [UTM]
```

D-4 (30/09):
```
4 dias.

[ATUALIZAR: destaque de alguma mudança relevante na média da semana, se houver]

Acompanha em tempo real, de graça: electiolab.com [UTM]
```

D-3 (01/10):
```
3 dias pro 1º turno.

Enquanto isso, [ATUALIZAR: gancho do dia, ex.: instituto X publicou pesquisa nova hoje].

Contexto completo: electiolab.com [UTM]
```

D-2 (02/10):
```
2 dias.

Domingo a gente cobre a apuração ao vivo aqui, comparando o resultado real com o que a média ponderada projetava.

Segue pra não perder: electiolab.com [UTM]
```

D-1 (03/10 — véspera):
```
Amanhã é o dia.

A gente vai comentar a apuração em tempo real, comparando com a média ponderada que rodou a campanha inteira.

Até amanhã: electiolab.com [UTM]
```

**Tarefa técnica, não é post:** testar carga do site antes de domingo (tráfego de apuração costuma ser o pico do ano).

---

## FASE 2 — 1º turno (04/10) e semana seguinte

**Dom 04/10 — X ao vivo — Roteiro (preencher conforme apuração)**

```
[Abertura, ~10h antes da apuração]
Hoje é dia de 1º turno. A média ponderada final antes da apuração: [ATUALIZAR].
Vamos comparar com o resultado real conforme a apuração avança. 🧵

[A cada corte relevante de apuração, ex. 50%, 75%, 90%, final]
Com X% das urnas apuradas: [candidato] em Y%. A média ponderada projetava Z%.
[diferença em pontos percentuais e comentário curto, sem opinião política]

[Fechamento, resultado oficial]
Apuração encerrada. Comparação final entre média ponderada e resultado real, por candidato: [ATUALIZAR tabela/thread]
Detalhe completo: electiolab.com/relatorio/[semana atual] [UTM]
```

**Dom 04/10 — Instagram/LinkedIn (assim que houver resultado oficial) — Fixo (esqueleto)**
```
1º turno apurado.

A média ponderada projetava [ATUALIZAR]. O resultado oficial foi [ATUALIZAR].

Diferença: [ATUALIZAR — se pequena, é a prova de que ponderar por acurácia funciona; se grande, ser direto sobre isso também]

Relatório completo com detalhe por instituto: electiolab.com/relatorio/[semana] [UTM]
```

**Seg-Ter 05-06/10 — X (thread) + LinkedIn — Fixo (esqueleto de "prova social")**

*X:*
```
1/ A média ponderada do ElectioLab errou por [ATUALIZAR: X] pontos percentuais em relação ao resultado oficial do 1º turno.

2/ Pra comparar: [ATUALIZAR: erro médio das pesquisas individuais, se disponível] ponto(s) percentual(is).

3/ Isso é o que dá pra esperar de um método que pondera pelo histórico de acurácia em vez de tratar toda pesquisa como igual.

4/ Detalhe completo, instituto por instituto: electiolab.com/relatorio/[semana] [UTM]
```

*LinkedIn:*
```
Passei a campanha inteira defendendo que ponderar pesquisa pelo histórico de acurácia do instituto dá um retrato mais confiável do que olhar cada pesquisa isolada.

Domingo foi o teste real. A média ponderada do ElectioLab ficou a [ATUALIZAR: X] pontos percentuais do resultado oficial do TSE.

[ATUALIZAR: adicionar contexto, comparação com pesquisas individuais se fizer sentido]

Relatório completo, com erro calculado por instituto, no primeiro comentário.

Isso muda como eu vou tratar a média pro 2º turno: mais peso ainda pra quem mais acertou agora.
```

**Qua-Sex 07-10/10 — todos os canais — Fixo (virada de chave pro 2º turno)**
```
[X] O 1º turno acabou. A partir de agora, o ElectioLab foca no 2º turno: [ATUALIZAR candidatos remanescentes]. Média ponderada atualizada a cada 6h: electiolab.com [UTM]

[Instagram — carrossel] Slide 1: "2º turno definido: [candidato A] x [candidato B]". Slides seguintes: histórico de pesquisa entre os dois, gasto declarado em propaganda digital de cada um, página de simulação atualizada.

[LinkedIn] Post curto anunciando a virada de foco editorial pro 2º turno, reforçando que a metodologia (peso por acurácia histórica) continua a mesma, só os candidatos mudam.
```

---

## FASE 3 — Entre turnos (05/10 a 24/10)

**Semana de 05/10 — Outreach de imprensa pós-1º-turno**
Reenviar aos contatos do PRESS-KIT.md citando o erro real da média ponderada vs. resultado oficial (é a prova concreta que faltava antes do 1º turno). Adaptar o "Template de e-mail de outreach" do press kit trocando o parágrafo de diferenciais por: *"No 1º turno de domingo, nossa média ponderada errou por só [X] pontos percentuais do resultado oficial do TSE. Método completo e dataset disponíveis se for útil pra alguma pauta."*

**Semana de 12/10 — Retomar cadência reativa diária**
Usar Templates A, C e D do banco (seção final) conforme pesquisas do 2º turno forem saindo. Sem posts fixos adicionais essa semana; o volume vem do banco de templates.

**Semana de 19/10 — Contagem regressiva final — Fixo**

D-5 a D-1 (19 a 24/10), mesmo formato da Semana 4 da Fase 1, adaptado pro 2º turno:
```
[X dias] pro 2º turno.

Confronto: [ATUALIZAR candidatos]. Média ponderada de hoje: [ATUALIZAR].

electiolab.com [UTM]
```

---

## FASE 4 — 2º turno (25/10) e pós-eleição

**Dom 25/10 — X ao vivo — mesmo roteiro da Fase 2 (04/10), adaptado pro confronto de 2 candidatos.**

**Seg 26/10 a Sex 30/10 — Retrospectiva da temporada — Fixo (esqueleto, preencher números finais)**

*X (thread):*
```
1/ A temporada eleitoral de 2026 no ElectioLab acabou. Um resumo do que rolou:

2/ [ATUALIZAR: X] pesquisas indexadas de [ATUALIZAR: Y] institutos, [ATUALIZAR: Z] entrevistas somadas.

3/ A média ponderada errou por [ATUALIZAR] pontos no 1º turno e [ATUALIZAR] pontos no 2º turno, em relação ao resultado oficial.

4/ O instituto mais acurado da temporada, medido contra o resultado real: [ATUALIZAR].

5/ O dashboard e a média ponderada ficaram de graça o ano inteiro. Metodologia continua aberta em electiolab.com/metodologia [UTM]

6/ Se serviu pra alguma coisa nesse período, é só isso que eu queria construir. Obrigado por acompanhar.
```

*LinkedIn:*
```
A eleição de 2026 acabou. Um balanço de quem construiu o ElectioLab sozinho durante a campanha inteira:

[ATUALIZAR: X] pesquisas indexadas, [ATUALIZAR: Y] institutos cobertos, [ATUALIZAR: Z] entrevistas somadas ao longo do ano.

A média ponderada por acurácia histórica errou por [ATUALIZAR] pontos percentuais no 1º turno e [ATUALIZAR] no 2º, sempre comparado ao resultado oficial do TSE.

O instituto que mais acertou a temporada inteira: [ATUALIZAR].

Não teve investimento, não teve equipe. Foi um projeto solo pra resolver um problema que eu tinha como leitor de notícia política.

Se você cobriu ou acompanhou eleição esse ano, queria saber: o que faltou numa cobertura de pesquisa que ainda não existe?
```

*Instagram (carrossel de fechamento):*
Slide 1 (capa): "A temporada eleitoral de 2026 acabou. Como foi o placar da média ponderada?"
Slides 2-4: números-chave da temporada (pesquisas, institutos, erro no 1º e 2º turno)
Slide 5 (fecho): "O essencial ficou de graça o ano inteiro. Obrigado por acompanhar. Método completo na bio."

---

## Banco de templates reutilizáveis

Usar sempre que o evento do dia não tiver post fixo programado acima.

### Template A — X (thread curta) — pesquisa nova saiu
```
1/ [Instituto] publicou pesquisa hoje: [candidato/tema] em [X]%.

2/ Com o histórico de acurácia do [Instituto] ([Y]% vs. TSE) e as demais pesquisas recentes, a média ponderada do ElectioLab está em [Z]%.

3/ Atualiza sozinha a cada 6h: electiolab.com [UTM]
```

### Template B — X (post único) — recap de fim de semana / sem novidade
```
Fim de semana sem pesquisa nova. A média ponderada segue em [X]%, com [Y] pesquisas indexadas na base.

Assim que sair pesquisa nova, atualiza sozinho: electiolab.com [UTM]
```

### Template C — Instagram (carrossel curto, 3 slides) — pesquisa nova saiu
Slide 1: "[Instituto] publicou hoje: [resultado]"
Slide 2: "Com o histórico de acurácia desse instituto, a média ponderada agora é [X]%"
Slide 3: "Atualiza sozinho, grátis, sem login. Link na bio."

**Legenda:**
```
Saiu pesquisa nova do [Instituto].

A gente já incorporou na média ponderada, com o peso que o histórico de acurácia desse instituto merece.

Resultado atualizado sempre no site, de graça.

.
.
.
#eleicoes2026 #[instituto] #pesquisaeleitoral #politicabrasil
```

### Template D — LinkedIn (curto) — pesquisa nova com destaque
```
[Instituto] publicou pesquisa hoje. Sozinha, ela mostra [X]%.

Ponderada pelo histórico de acurácia desse instituto e cruzada com as demais pesquisas recentes, a média do ElectioLab fica em [Y]%.

É essa a diferença entre ler uma pesquisa e ler o cenário.

Detalhe no primeiro comentário.
```

### Template E — X (quote-tweet de veículo de imprensa)
```
[Instituto] confirma [tendência]. A gente já tinha isso na média ponderada há [X] dias, puxado pelas pesquisas anteriores do mesmo instituto e dos concorrentes.

electiolab.com [UTM]
```

### Template F — DM/e-mail curto de outreach (fora do calendário de posts públicos)
```
Oi [nome],

Vi que você cobre [tema]. O ElectioLab agrega todas as pesquisas eleitorais brasileiras numa média ponderada por acurácia histórica do instituto, atualizada a cada 6h, de graça.

Se for útil pra alguma pauta essa semana, mando print, gráfico ou dataset do que precisar.

electiolab.com
```

---

## Hashtags padrão (reciclar, não repetir todas em todo post)

`#eleicoes2026` `#pesquisaeleitoral` `#politicabrasil` `#jornalismodedados` `#dadosabertos` `#segundoturno` `#eleicoesbrasil` + nome do instituto quando relevante (`#datafolha` `#quaest` `#atlasintel` `#ipec`)

## Checklist antes de qualquer post ir ao ar

- [ ] Todo `[ATUALIZAR]` foi substituído por número real e conferido no banco
- [ ] Link tem UTM correto pro canal
- [ ] LinkedIn: link está no primeiro comentário, não no corpo
- [ ] Nenhum post traz opinião sobre candidato, só dado e método
- [ ] Nenhum post diz "sem paywall" ou "tudo grátis" de forma absoluta — o dashboard e a média ponderada são gratuitos, mas existem planos Pro/Business/Enterprise pagos em electiolab.com/precos
- [ ] Print/gráfico de apoio pronto quando o post citar número (Instagram principalmente)
