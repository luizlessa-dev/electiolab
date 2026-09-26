# Fontes — electiolab-apuracao

Status: **verificada** (conferida na fonte oficial) · **a verificar** (precisa checar no código/arquivo real)
Página-mãe: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados (lida em 25/09/2026)

## Regras de acesso (verificada)
- Sem cadastro, autorização ou whitelist de IP para usar os arquivos.
- Limite: **100 req/s por IP**; estouro → bloqueio de 10 min, renovado se insistir.
- 404 repetidos podem bloquear o IP; não há listagem de arquivos; código de município com 5 dígitos.
- CDN suporta ETag e Last-Modified (304) — **304 conta no rate limit**.
- Não há arquivos de índice; usar EA14 (UFs) e EA15 (municípios da UF) para detectar o que mudou.
- EA10 (eleitos) só existe após a 1ª totalização final de uma UF; antes disso retorna 404. Não há EA10 de Presidente — usar EA20 abrangência BR.
- Base legal: Res. TSE nº 23.751/2026, arts. 264–269 — https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-751-de-26-de-fevereiro-de-2026

## Ambiente OFICIAL (verificada)
- URL: `https://resultados.tse.jus.br` · ambiente: `oficial`
- 04/10/2026 — Pleito **3220** (1º turno)
  - **6257** — Eleição Geral Federal (Presidente)
  - **6259** — Eleições Gerais Estaduais 2026 (Governador, Senador, Deputados)
  - **6261** — Eleição Conselho Distrital 2026 (**fora do escopo** — decisão 26/09/2026; Conselho Distrital de Fernando de Noronha)
- `[ciclo]`, `e<ELEICAO>` e `p<PLEITO>` devem ser lidos do `ele-c.json` oficial (a verificar na véspera).
- App web do TSE para conferência: https://resultados.tse.jus.br/oficial/app/index.html

## Ambiente SIMULADO (verificada)
- URL: `https://resultados-sim.tse.jus.br/simulado` · ambiente: `simulado2026`
- Pleito **17801**: 21270 (Federal) · 21272 (Estadual) · 21274 (Municipal)
- Simulado extra: **28 e 29/09/2026, 14h–16h** (arquivos evoluem de 0% a 100%, com eleitos no fim)
- Exemplos oficiais:
  - Config eleições: `https://resultados-sim.tse.jus.br/simulado/simulado2026/comum/config/ele-c.json`
  - Acompanhamento BR: `.../simulado2026/ele2026/21270/dados/br/br-e021270-ab.json`
  - Acompanhamento UF (AC): `.../simulado2026/ele2026/21270/dados/ac/ac-e021270-ab.json`
  - Presidente BR: `.../simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json`
  - Governador AC: `.../simulado2026/ele2026/21272/dados/ac/ac-c0003-e021272-u.json`
  - Senador por município (Acrelândia/AC): `.../simulado2026/ele2026/21272/dados/ac/ac01120-c0005-e021272-u.json`
  - Config municípios: `.../simulado2026/ele2026/21270/config/mun-e021270-cm.json`
  - App de conferência: https://resultados-sim.tse.jus.br/simulado/simulado2026/app/index.html
- Cenários especiais do simulado (úteis para testes): seções anuladas (inclui **Belo Horizonte**), candidatos substituídos (Gov MA, Sen AC, Dep Est AC), eleição matematicamente definida (Gov RR 1º turno), sem eleito (Gov AP; Senado AM, AP, DF, ES…).

## Especificações dos JSON (verificada — baixar PDFs na Fase 0)
- Instruções para download: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026
- EA10 eleitos: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea10-arquivo-de-resultado-de-eleitos
- EA11 config eleições: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea11-arquivo-de-configuracao-de-eleicoes
- EA12 config municípios: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea12-arquivo-de-configuracao-de-municipios
- EA14 acompanhamento Brasil: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea14-arquivo-de-acompanhamento-brasil
- EA15 acompanhamento UF: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea15-arquivo-de-acompanhamento-uf
- EA16 config seções: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea16-arquivo-de-configuracao-de-secoes-eleitorais
- EA18 auxiliar de seção: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea18-arquivo-auxiliar-de-secao
- EA20 resultado unificado: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado
- Manual de verificação JWS (assinatura dos arquivos): https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/manual-verificacao-jws
- Apresentação da audiência técnica (06/07/2026): https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/apresentacao-interessados-2026-pdf

## Regras de `and=f` (andamento final) — verificada (FAQ TSE)
- Presidente (eleição federal): município `and=f` quando `snt=0`; UF quando `snt=0`; Brasil quando houver totalização final.
- Governador/Senador/Deputados (eleição estadual): município quando `snt=0`; UF quando houver totalização final; Brasil quando todas as UFs tiverem totalização final.

## Verificada em 26/09/2026 contra amostras reais do simulado
- **Códigos de cargo** em `ele-c.json`: 1 Presidente, 3 Governador, 5 Senador, 6 Dep. Federal, 7 Dep. Estadual, 8 Dep. Distrital (eleição estadual 21272) e 25 Conselheiro Distrital (eleição própria 21274, `tp=3`). Nos arquivos: `c` + código com 4 dígitos (`c0001`, `c0003` baixados com 200; `c0005`–`c0008` seguem a mesma regra, sem GET).
- **IDG**: campo `idg` no topo de todos os arquivos (ele-c, mun-cm, EA14, EA20), string de 9 dígitos, junto de `dg`/`hg` (geração).
- **Padrão de URL** confirmado (200) para: `ele-c`, `mun-e021270-cm`, EA14 (`br-e021270-ab`, `br-e021272-ab`), EA15 (`ac-e021270-ab`, `ac-e021272-ab`), EA20 (`br-c0001-e021270-u`, `mg-c0003-e021272-u`, `ac-c0005/c0006/c0007-e021272-u`, `df-c0008-e021272-u`). Nome do arquivo usa a eleição com zero à esquerda (`e021270`). Códigos de cargo 5–8 confirmados por GET.
- **Estrutura proporcional** (Dep. Federal/Estadual/Distrital) amostrada: votos de legenda (`vl`, `tvtl`, `tval`), federações, `qe` (quociente eleitoral oficial do TSE), `vag` por agrupamento. Senador: `nv=2`, suplentes `s1/s2`.
- Exterior (`zz`) só na eleição **federal** (EA14 21270); o EA14 estadual tem `br` + 27 UFs.
- **ETag/Last-Modified/304** funcionam (304 confirmado em `ele-c.json`). `cache-control: max-age` entre 21 e 55 s. Headers do CDN anunciam `x-ratelimit-limit: 2000/s` — a documentação diz 100/s; seguimos o documentado.
- Exterior existe como UF **`zz`** no EA12 (184 "municípios") e no EA14 federal.
- Detalhes em `docs/arquitetura.md` → "Mapa de campos".

## A verificar
- **Specs em PDF (EA10/11/12/14/15/20 e "Instruções para download")**: www.tse.jus.br responde 403 Akamai a `curl` (26/09/2026); o Luiz baixa pelo navegador e salva em `docs/specs/` (gitignored). Depois, reconciliar os **[?]** do mapa. Sem elas, os campos marcados **[?]** no mapa ficam sem confirmação.
- EA10 (nome do arquivo e estrutura): **sem amostra** (só após 1ª totalização final; não pedir antes). EA20 por município e `mun-e021272-cm.json`: sem GET.
- Valor de `st` para eleito por quociente partidário (só vimos `Eleito` e `Eleito por média`).
- Valores de `and` além de `f`; campos `sup`, `dv`, `tf`, `esae`, `mnae`, `sa/sna`, `vscv`, `subs[]`, `cdpr`, `dtlim`.
- Códigos de eleição do ambiente oficial (`6257/6259/6261`) contra o `ele-c.json` oficial (na véspera).
- Intervalo de polling recomendado (TSE disse que definiria após os simulados).
- Pós-eleição: BU/RDV e Portal de Dados Abertos (https://dadosabertos.tse.jus.br/) — fora do escopo da noite.

## Suporte TSE
Formulário: https://30308800.tse.jus.br/ — assunto "Resultados - Divulgação".
