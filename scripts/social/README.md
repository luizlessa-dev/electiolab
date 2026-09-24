# Peças de redes sociais — padrão do ElectioLab

**Definido em 23/09/2026.** Espelha o padrão do gastronomizae
(`scripts/social/gerar-peca.py` naquele repo) — script em vez de template de
Canva, porque a letra e a cor da peça nunca podem descolar do produto, e a
fonte da pesquisa nunca pode sumir. Aqui a pauta é número de pesquisa
eleitoral, não foto de prato: por isso não existe "foto de capa" — toda peça
é um cartão de dado, no espírito do `gerar-arte-dados.py` do gastronomizae.

## Como as redes do ElectioLab funcionam

Publicação **manual**: gerar as peças com este script → conferir o número
contra a fonte primária → escrever/ajustar a legenda → agendar em cada
plataforma (Meta Business Suite pro Instagram, nativo no X e no LinkedIn).

Este repo já tinha um calendário editorial completo em `docs/CALENDARIO-X.md`,
`docs/CALENDARIO-INSTAGRAM.md`, `docs/CALENDARIO-LINKEDIN.md` e
`docs/CALENDARIO-COMUM.md` — com copy, datas e números já escritos por sessão
anterior. Este script **não substitui esses documentos**, ele gera a peça
visual que acompanha o texto de lá. `scripts/social/outubro-2026/` traduz o
que já estava planejado nesses calendários para o formato de peça (JSON +
imagem), e reaproveita a legenda já escrita sempre que ela existia.

## Uso

```bash
python3 -m pip install pillow      # dependência, uma vez só

python3 scripts/social/gerar-peca.py scripts/social/exemplos/lancamento-comparacao.json
python3 scripts/social/gerar-peca.py minha-peca.json --saida ~/Downloads
python3 scripts/social/gerar-peca.py minha-peca.json --plataformas x,linkedin
```

Gera, para cada plataforma pedida (todas por padrão, ou as listadas em
`plataformas` no JSON):

| Plataforma | Arquivo | Tamanho |
|---|---|---|
| Instagram post | `<saida>-instagram-post.jpg` | 1080×1350 |
| Instagram story | `<saida>-instagram-story.jpg` | 1080×1920 |
| LinkedIn | `<saida>-linkedin.jpg` | 1080×1080 |
| X / Twitter | `<saida>-x.jpg` | 1600×900 |

## O JSON

```json
{
  "modo": "comparacao",
  "eyebrow": "Média ponderada de hoje",
  "titulo": "38,2% x 34,5%",
  "linha_fina": "Lula x Flávio Bolsonaro — ponderada por recência, amostra e acurácia histórica do instituto.",
  "campos": [["Base", "60 pesquisas presidenciais"], ["Institutos", "18 ativos na ponderação"]],
  "fonte": "Datafolha, Quaest, Nexus, Ipec e demais institutos ativos · média recalculada a cada 6h · electiolab.com/metodologia",
  "url": "https://electiolab.com",
  "plataformas": ["instagram-post", "instagram-story", "x"],
  "saida": "exemplo-lancamento"
}
```

| campo | o que é |
|---|---|
| `modo` | `comparacao` (número grande "X% x Y%", o padrão do post de lançamento) · `numero` (1-3 colunas de dado, tipo "instituto em foco") · `contagem` (número grande + "DIAS", pra contagem regressiva) · `citacao` (frase/opinião longa, pro tom de founder do LinkedIn) |
| `eyebrow` | antetítulo curto, caixa alta, azul de marca |
| `titulo` | conteúdo principal — obrigatório em todo modo exceto `numero` |
| `numeros` | só no modo `numero`: lista de `[rótulo, valor, descrição]`, 1 a 3 entradas |
| `linha_fina` | frase de contexto abaixo do número. Opcional só no modo `citacao` (a atribuição já cumpre esse papel) |
| `campos` | pares rótulo/valor do bloco de serviço (instituto, campo, amostra, margem de erro). Não aparece no X — a peça 1600×900 não tem altura pra isso, o dado fica só na legenda |
| `fonte` | **sempre obrigatório.** Instituto + data de campo + protocolo TSE quando houver, ou "ElectioLab · metodologia" pra peça institucional. Ver regra editorial abaixo |
| `url` | link de referência (não entra na imagem, é só pra quem for montar a legenda) |
| `plataformas` | quais das 4 saídas gerar. Se ausente, gera todas |
| `precisa_dado_fresco` | `true`/`false` — sinaliza pro humano que o valor no JSON é placeholder ou está desatualizado e precisa de checagem antes de virar imagem final (ver regra editorial) |
| `nota_checagem` | só quando `precisa_dado_fresco: true` — o que exatamente puxar e de onde, antes de publicar |
| `legenda` | texto pronto pra legenda/post, quando já existia no calendário original |
| `publicar_em` | data ISO planejada (documentação — `gerar-peca.py` não usa esse campo; `exportar-para-downloads.mjs` usa) |
| `repetir_em` | lista de datas ISO adicionais, quando a mesma peça (mesma imagem, mesma legenda) vale pra vários dias — ex.: a âncora "virada de chave pro 2º turno" vale de 07 a 10/10, mas só existe um JSON (`07-out-virada-segundo-turno.json`) com `publicar_em: "2026-10-07"` e `repetir_em: ["2026-10-08", "2026-10-09", "2026-10-10"]`. Só `exportar-para-downloads.mjs` lê esse campo, `gerar-peca.py` ignora |
| `saida` | prefixo dos arquivos gerados |

## Por que script e não template de Canva

- Usa as **fontes reais do site**: Geist e Geist Mono, exatamente as que
  `next/font/google` serve em electiolab.com (`src/app/layout.tsx`). O site
  baixa esses TTFs do Google Fonts em build time — não ficam em
  `node_modules` pra ler direto como no gastronomizae — por isso estão
  vendorizados em `assets/fonts/` (ver seção Fontes abaixo).
- Usa o **gradiente e as cores reais** do produto: o mesmo
  `linear-gradient(135deg,#0b1220,#0f172a,#111827)` que já roda em
  `src/app/opengraph-image.tsx` e em toda OG image do site (candidato,
  instituto, partido, estado), mais o azul de marca `#3b82f6`. A peça de
  social é visualmente a mesma família das OG images que o site já gera.
- A **fonte da pesquisa é gravada na imagem**, não só na legenda — igual ao
  crédito de foto do gastronomizae. Aqui o motivo é mais sério que
  atribuição: sem instituto + data de campo visíveis, um print da peça vira
  número solto sem como checar. O script recusa gerar sem o campo `fonte`.
- Respeita a **área segura do story** do Instagram (os ~200px de baixo).

## Regra editorial — não negociável

Conteúdo eleitoral pede neutralidade e rigor de fonte, do mesmo jeito que o
gastronomizae exige "nunca ilustre com imagem gerada por IA" nas resenhas.
Aqui as regras equivalentes são:

**Toda peça com número de pesquisa cita instituto + data de campo + margem de
erro (quando disponível).** É o campo `fonte`, obrigatório — sem ele o script
para. Protocolo TSE também, quando existir (ver `docs/CALENDARIO-COMUM.md` e
`TOP20-SENADOR.md` pro padrão de citação já em uso neste repo).

**Nenhuma peça carrega opinião sobre candidato — só dado e método.** Isso já
está no checklist de `docs/CALENDARIO-COMUM.md` e vale igual aqui.

**Número de pesquisa nunca é inventado, nunca é estimado "de cabeça".** Toda
peça cujo valor real ainda não existe (porque depende de um resultado futuro
— apuração de turno, pesquisa que ainda vai sair, média que muda a cada 6h)
sai com `[ATUALIZAR]` no lugar do número e `precisa_dado_fresco: true` no
JSON. **Não gerar a imagem final nem publicar enquanto o placeholder não for
trocado por um valor conferido na fonte primária** (dashboard/Supabase do
ElectioLab, ou apuração oficial do TSE). O JSON com placeholder serve pra ter
a peça pronta de estrutura — texto, layout, citação — faltando só o número no
dia certo.

**"Sem paywall" ou "tudo grátis" nunca de forma absoluta.** O dashboard e a
média ponderada são gratuitos; os planos Pro/Business/Enterprise são pagos
(`electiolab.com/precos`). Regra já documentada em `docs/CALENDARIO-COMUM.md`,
repetida aqui porque a imagem também precisa respeitar.

## Fontes (Geist / Geist Mono)

Os 5 TTFs em `assets/fonts/` (`Geist-400.ttf`, `Geist-600.ttf`,
`Geist-700.ttf`, `GeistMono-400.ttf`, `GeistMono-600.ttf`) foram baixados
direto do Google Fonts, os mesmos arquivos que `next/font/google` serve pro
site (conferido batendo hash com o cache de build em `.next/server/edge/assets`).
Ficam versionados aqui porque o Next não guarda esses arquivos em
`node_modules` — busca da CDN do Google em build time. Se o site trocar de
peso/fonte em algum momento, baixar de novo com:

```bash
curl -s "https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap" -A Mozilla/5.0
curl -s "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;600&display=swap" -A Mozilla/5.0
# pegar as URLs .ttf da resposta e baixar pra assets/fonts/
```

## O calendário de outubro/2026

`outubro-2026/` tem 27 peças cobrindo o mês inteiro — Instagram (post +
story), LinkedIn e X, conforme o campo `plataformas` de cada JSON. Outubro é
o mês mais quente do produto: **1º turno em 04/10/2026, 2º turno em
25/10/2026** (calendário eleitoral do TSE, já confirmado em
`docs/tse-transparencia-achados.md`). A cadência segue a lógica que já
estava em `docs/CALENDARIO-*.md`:

- **01–03/10** — cauda da contagem regressiva pro 1º turno (fixo, todo dia).
- **04/10** — resultado do 1º turno. **Não dá pra preencher agora** —
  depende da apuração oficial de domingo.
- **05–10/10** — prova social (erro da média vs. resultado real) e virada de
  chave pro 2º turno. A rotação normal de Instagul/X (instituto em foco,
  estado em foco) volta a rodar nos dias 05 e 06, porque só o X estava em
  modo âncora nessa janela — Instagram não tinha post fixo cobrindo esse
  ângulo (ver a lógica dos asteriscos em `docs/CALENDARIO-INSTAGRAM.md`).
- **12–18/10** — a única semana 100% de cadência normal do mês (entre a
  virada de chave e a contagem final): instituto, estado, gasto digital,
  mito/verdade, arquitetura no LinkedIn, cenário de 2º turno, recap.
- **19–24/10** — contagem regressiva final pro 2º turno, um post por dia.
- **25/10** — resultado do 2º turno. Mesma ressalva do 1º turno.
- **26/10** — retrospectiva da temporada (números finais, também pendentes
  do resultado de 25/10).

**Nem toda peça de outubro tem número final hoje — e não deveria ter.**
Recontado em 23/09/2026: são 20 das 27 JSONs (as com `precisa_dado_fresco:
true`) que dependem de dado que só vai existir no dia — resultado de urna,
pesquisa que ainda não saiu, média que se recalcula a cada 6h, ou índice de
acurácia de instituto que só se recalcula de verdade depois de um resultado
oficial de 2026. Essas saem com `[ATUALIZAR]` no lugar do número — ver a
regra editorial acima. As outras 7 já têm número real e conferido hoje
(datas do calendário eleitoral, explicadores de metodologia) e podem ser
geradas e revisadas desde já.

Peças que **já têm número real, sem placeholder**: as datas oficiais do 1º e
2º turno e os quatro explicadores evergreen (estimulada vs. espontânea,
tamanho de amostra, pesquisas são confiáveis, recálculo quando um instituto
some).

As duas peças de acurácia de instituto (Atlas Intel 78%, PoderData 80%)
foram reclassificadas em 23/09/2026: conferido direto no banco (Supabase,
`institutes.reliability_score`) que o valor bate com o de
`docs/PRESS-KIT.md` (abril/2026), mas a tabela que recalcula esse score a
partir de resultado real (`institute_accuracy_observations`) está zerada —
nenhuma eleição de 2026 apurada ainda. Ou seja, não é um número errado, é um
número que só passa a ser "de 2026" depois do resultado de 04/10. Ambas
levaram `precisa_dado_fresco: true` por isso.

## O que falta revisar antes de rodar de verdade

- **Todo `[ATUALIZAR]`** — são 20 peças (recontado 23/09/2026; incluindo as
  duas de acurácia de instituto, reclassificadas nessa data). Cada uma tem
  `nota_checagem` explicando o que puxar e de onde. Nenhuma vai ao ar sem
  esse passo.
- **Os números "de referência" datados de 17/09/2026** (ex.: `38,2% x
  34,5%` no exemplo de lançamento, `44,3% x 33,7%` no cenário Lula x Renan
  Santos) — são reais e citam a fonte, mas **envelhecem rápido** numa
  campanha que recalcula a cada 6h. Tratar como ponto de partida, não como
  valor de publicação.
- **Acurácia por instituto** (`docs/PRESS-KIT.md`) está datada de abril de
  2026. Checado em 23/09/2026 contra o banco: ainda é o valor vigente
  (`institute_accuracy_observations` zerada, sem eleição de 2026 apurada) —
  mas confirmar de novo depois de 04/10, quando o recálculo passa a ter dado
  real pra rodar em cima.
- **17/10** usa o cenário "Lula x Renan Santos" citado em
  `docs/CALENDARIO-INSTAGRAM.md`; o X do mesmo dia, no calendário original,
  cita "Lula x Caiado". Mantive Renan Santos (o ângulo mais específico) nas
  três plataformas — conferir se ainda é o confronto relevante depois do
  resultado do 1º turno, porque o 2º turno pode nem ter Renan Santos.
  Registrado em `nota_checagem` daquela peça.
- **13/10 (estado BA) e 06/10 (estado RS)** — não achei dado de pesquisa
  regional pronto no repo durante a exploração; ambos saem com
  `precisa_dado_fresco: true` esperando um pull do dashboard regional.
- **A pasta não escreve `outubro-2026/` sozinha nem publica nada.** Rodar
  `gerar-peca.py` em cada JSON gera a imagem; a legenda de cada peça (campo
  `legenda`) precisa ser copiada manualmente pro agendador de cada rede.

## O calendário de 24-30/09/2026

Adicionado em 24/09/2026 pra fechar o furo entre o lançamento (17/09) e o
início de `outubro-2026/`: `docs/CALENDARIO-*.md` já tinha copy escrita pra
essa janela (X e Instagram são "todo dia" por desenho desde o início — só
não tinha virado JSON/imagem ainda). `setembro-2026/` tem 13 peças cobrindo
24 a 30/09 — X e Instagram ficam com peça todo dia nessa janela; LinkedIn
segue 3-4x/semana por desenho do canal (não é gap).

**23/09 ficou sem peça** — já tinha passado quando essa pasta foi criada,
não dá pra postar retroativo.

**3 decisões editoriais tomadas em 23-24/09/2026, sem respaldo direto nos
`.md` originais** (docs tinham lacuna ou ambiguidade nesses pontos):
- **24/09 no X** — o `CALENDARIO-X.md` original diz que o dia "tem âncora"
  mas nunca escreveu o texto. Decisão: espelhar o ângulo "2º turno, e se
  fosse hoje?" que Instagram e LinkedIn já tinham prontos, em vez da rotação
  normal de mito/verdade de quinta.
- **LinkedIn 25/09** — a tabela original põe o post de "opinião" da semana
  no dia 24 (quinta) em vez do 25 (sexta) programado pela grade semanal.
  Decisão: sem post extra em 25/09, LinkedIn segue com o que já saiu em
  21/09 (segunda) e 23-24/09.
- **28/09 e 30/09 no LinkedIn** (`28-set-linkedin-decimais.json`,
  `30-set-linkedin-trafego.json`) — o calendário original só tinha o TEMA
  definido pra esses dias ("por que não uso casas decimais...", "como o
  site aguenta o pico de tráfego..."), sem copy escrita. **Texto integral
  redigido nesta sessão, não é reaproveitamento de copy existente** — revisar
  com mais atenção que as demais peças antes de publicar. A de 30/09 também
  depende de confirmar se a tarefa técnica "testar carga do site antes de
  03/10" (`CALENDARIO-COMUM.md`) já rodou, porque o texto assume que não.

**08-10/10 (virada de chave):** decisão registrada em 23/09/2026 — não gera
peça nova por dia, reaproveita `outubro-2026/07-out-virada-segundo-turno.json`
nos 3 dias (mesma âncora, já coberta).

**27-30/10 (retrospectiva):** decisão registrada em 24/09/2026 — o
thread/carrossel de retrospectiva vai inteiro em 26/10 (já existe em
`outubro-2026/26-out-retrospectiva-*.json`), não fatiado dia a dia. 27-30/10
ficam sem peça própria por desenho, não por esquecimento.
