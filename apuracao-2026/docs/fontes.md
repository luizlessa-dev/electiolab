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
  - **6261** — Eleição Conselho Distrital 2026
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

## A verificar
- Códigos de cargo (`c0001`, `c0003`, `c0005`…) contra `ele-c.json` 2026.
- Nome e posição do IDG em cada arquivo.
- Intervalo de polling recomendado (TSE disse que definiria após os simulados).
- Pós-eleição: BU/RDV e Portal de Dados Abertos (https://dadosabertos.tse.jus.br/) — fora do escopo da noite.

## Suporte TSE
Formulário: https://30308800.tse.jus.br/ — assunto "Resultados - Divulgação".
