# Página do ElectioLab no Facebook — texto e assets prontos

Gerado em 24/09/2026. Criar a Página em si só dá pra fazer logado na conta
Meta de vocês — isso aqui é o material pra colar direto nos campos.

## Assets

- `electiolab-facebook-avatar.jpg` (720×720) — selo "E", mesmo azul/gradiente
  das OG images do site. Facebook exibe circular; a composição já deixa
  margem, não corta o selo.
- `electiolab-facebook-capa.jpg` (820×312) — wordmark + tagline, mesma
  família visual. Facebook recorta de forma diferente em desktop/mobile; o
  editor de capa do próprio Facebook deixa reposicionar na hora de publicar.

Gerados por `scripts/social/gerar-perfil-facebook.py` — rodar de novo se a
identidade visual mudar (reusa as mesmas cores/fontes de `gerar-peca.py`,
não precisa editar em dois lugares).

## Texto pra colar

**Nome da Página:** ElectioLab

**Categoria sugerida:** Site de notícias / Empresa de mídia (a categoria
exata depende das opções que o Facebook oferecer no momento da criação —
qualquer uma da família "notícia/mídia/dados" serve).

**Nome de usuário (@):** `@electiolab` — conferir disponibilidade na hora,
não dá pra checar isso por aqui.

**Site:** electiolab.com

**Descrição curta (campo "Intro", limite ~255 caracteres):**
```
Agregador de pesquisas eleitorais brasileiras, com média ponderada por recência e acurácia histórica do instituto. 300 candidatos com bio, dados oficiais de gasto digital. Dashboard grátis, sem login. Eleições 2026.
```

**Sobre / Story (texto mais longo):**
```
A maioria dos brasileiros acompanha pesquisa eleitoral por manchete solta — um instituto mostra um número, outro mostra outro, e ninguém explica por quê.

O ElectioLab agrega todas as pesquisas eleitorais brasileiras de 2026 numa média ponderada por recência, amostra e acurácia histórica do instituto — quanto mais um instituto costuma acertar contra o resultado real do TSE, mais peso ele tem no cálculo.

300 candidatos com bio, cobertura de presidência, 27 governadores e 27 senadores, e dados oficiais de propaganda digital (Google Ads + Meta Ad Library) por candidato. O dashboard e a média ponderada são gratuitos, sem login. Metodologia aberta em electiolab.com/metodologia.
```
*(Número de candidatos conferido no banco em 24/09/2026 — recontar antes de publicar se for usar essa bio mais adiante na campanha.)*

**Link com UTM pra qualquer post que citar o site:**
```
electiolab.com/?utm_source=facebook&utm_medium=social&utm_campaign=eleicoes2026
```

## Depois de criar a Página

`docs/CALENDARIO-FACEBOOK.md` já resolveu o conteúdo: **não produz peça
própria pro Facebook**, cross-posta o mesmo carrossel/legenda do Instagram
via Meta Business Suite, cortando as hashtags do fim e trocando o UTM pra
`utm_source=facebook`. Conectar a Página ao Instagram do ElectioLab no
Business Suite é o que habilita esse cross-post — vale fazer isso logo
depois de criar a Página, antes do primeiro post sair.

## Passo a passo (você faz, login necessário)

1. `facebook.com/pages/create` (ou dentro do Meta Business Suite, se a
   conta business já existir).
2. Nome: `ElectioLab` · Categoria: ver acima.
3. Upload do avatar e da capa (arquivos desta pasta).
4. Colar a descrição curta no campo Intro/Bio.
5. Colar o texto de "Sobre" na seção Story/História da Página.
6. Adicionar o site (electiolab.com) no campo de link.
7. Business Suite → Configurações → contas conectadas → linkar o Instagram
   do ElectioLab, pra habilitar cross-post.
