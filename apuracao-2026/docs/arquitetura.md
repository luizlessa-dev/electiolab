# Arquitetura — electiolab-apuracao

## Fluxo
```
TSE CDN (JSON)                          Supabase Electiolab (schema apuracao)            Electiolab (Next.js)
─────────────                           ──────────────────────────            ────────────────────
ele-c.json / mun-cm.json ──(1x/dia)──►  eleicao, cargo, municipio
EA14 br-…-ab.json ──(a cada ciclo)──►   acompanhamento ──┐
EA15 uf-…-ab.json ──(a cada ciclo)──►   acompanhamento   │ decide o que mudou
                                                          ▼
EA20 …-u.json (só os que mudaram) ──►  arquivo_bruto → totalizacao,           /apuracao (ISR 30–60s)
                                        votacao_candidato                     /apuracao/[uf]
EA10 …-e.json (após 1ª final) ─────►   eleito                                 /apuracao/pesquisas
                                        coletor_execucao (log)
```

## Coletor
- Cron Vercel a cada 1 minuto (`src/app/api/cron/apuracao`). `maxDuration` atual do projeto é 60s: 1 ciclo por execução. Se o ciclo não couber, dividir por eleição (federal / estadual) em execuções alternadas.
- Por ciclo, no pior caso: 1 EA14 + 27 EA15 (×2 eleições) + EA20 alterados. Arquivos por UF em jogo: presidente, governador, senador, dep. federal, dep. estadual/distrital → até ~135 EA20 + 1 BR. Estimativa de pico: < 200 requisições por ciclo → com limitador em 5 req/s, ~40s. Se ficar lento, subir para 10 req/s (ainda 10× abaixo do teto do TSE).
- Arquivos de deputados são os maiores (centenas de candidatos por UF): gravar bruto comprimido (jsonb já comprime via TOAST) e normalizar em lote.
- Requisições condicionais sempre; 304 = nada a gravar.
- Circuit breaker de 404: URL que deu 404 entra em quarentena até a config/acompanhamento indicar que existe.
- Todos os IPs da Vercel podem ser compartilhados com outros clientes — mais um motivo para taxa baixa.

## Por que não GitHub Actions
Intervalo mínimo de 5 min e atraso sob carga. Serve para o Radar FAB (diário), não para apuração.

## Idempotência
- `arquivo_bruto` único por (url, idg). Se o IDG não mudou, não reprocessa.
- Normalização reprocessável a partir do bruto.

## Mapa de campos
Fonte: **amostras reais do simulado**, baixadas em 26/09/2026 (`amostras/`, gitignored). Os PDFs de especificação **não foram obtidos** (www.tse.jus.br responde 403 Akamai a `curl`; ver "Fase 0 — status"). Portanto, abaixo: **[V]** = verificado nas amostras (estrutura ou aritmética), **[?]** = significado inferido, confirmar na spec.

Convenções gerais **[V]**
- Todo valor é **string**, inclusive números (`"528951"`). Percentuais vêm com vírgula decimal: `"7,53"` (2 casas) e a variante `…n` com 9 casas (`"7,527528669"`, também com vírgula). Ao normalizar: vírgula→ponto, sem arredondar; guardar o bruto intacto (regra 1 do CLAUDE.md).
- Datas `dd/mm/aaaa`, horas `hh:mm:ss`, **sem fuso** (assumir Brasília, UTC−3 fixo) → converter para UTC no banco.
- Todo arquivo tem no topo `dg`/`hg` (data/hora de **geração** do arquivo) e `idg` (id de geração, string numérica de 9 dígitos), mais `f` (`"s"`). O IDG é o campo de idempotência (`arquivo_bruto` único por url+idg). `dg/hg` ≠ `dt/ht` (totalização) — no simulado `ht` de uma abrangência pode ser **posterior** a `hg` do arquivo (BR em 25/09 06:45 dentro de arquivo gerado em 24/09 16:12), então **não comparar datas para saber "o que é mais novo"; usar igualdade de IDG/ETag**.
- Colisão de nomes: `s.st` (seções totalizadas, número) ≠ `cand.st` (situação, texto: `"Não eleito"`, `"2º turno"`); `e` no topo é o **eleitorado** (dict), `cand.e` é a flag **eleito** (`"s"`/`"n"`). Ler sempre por caminho, nunca por nome solto.
- Arquivo vem com `\n` inicial e espaçamento livre; JSON válido em UTF-8 (sem BOM).

### `ele-c.json` (EA11) — `comum/config/ele-c.json`  · 1,8 KB
`{dg,hg,f,idg, arq[], pl[]}`
- `arq[]`: **templates de diretório** por tipo de arquivo (`tp`): `ft` fotos, `cm` config de municípios, `e` eleitos, `cs` config de seções, `t` (totalização, não usado ainda), `ab` acompanhamento, `u` resultado unificado, `aux` auxiliar de seção. Placeholders: `<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>` (ab, u, e, t), `…/<cd_eleicao>/config` (cm), `…/arquivo-urna/<cd_pleito>/…` (cs, aux). **[V]**
- `pl[]` (pleitos): `cd` (17801), `cdpr` (14575, pleito anterior?) **[?]**, `c` = ciclo (`"ele2026"`), `dt` (26/04/2026 no simulado — data fictícia), `dtlim` (18/10/2026) **[?]**, `e[]`.
- `pl[].e[]` (eleições): `cd` (código da eleição), `cdt2` (código da eleição do **2º turno**; vazio no municipal), `sqele`, `nm`, `t` (turno), `tp` (`8` federal, `1` estadual, `3` municipal) **[V]**, `abr[]` → `{cd:"br", cp:[{cd,ds,tp}]}` com a lista de **cargos** (`cp.tp`: `1` majoritário, `2` proporcional).
- **Simulado**: 21270 Federal (cargo 1 Presidente) · 21272 Estadual (3 Governador, 5 Senador, 6 Dep. Federal, 7 Dep. Estadual, 8 Dep. Distrital) · 21274 Municipal (cargo 25 Conselheiro Distrital). 2º turno: 21271 / 21273. **[V]**
- **Confirma o item 4**: cargos = `1,3,5,6,7,8` (+ `25` Conselheiro Distrital) e o arquivo usa `c` + código com 4 dígitos (`c0001`, `c0003`). **Sem UF na config**: `abr` traz só `br`; as UFs vêm de EA12/EA14.
- **Atenção ao PROMPT_INICIAL**: ele diz "Conselheiro Distrital (DF, eleição 6261)". No simulado o cargo 25 fica numa eleição própria (21274, `tp=3`) e a config não diz UF. Meu entendimento (não verificado) é que o Conselho Distrital é o de **Fernando de Noronha (PE)**, não do DF. Fora do escopo do coletor até decisão sua.

### `mun-e021270-cm.json` (EA12) — `ele2026/21270/config/`  · 534 KB
`{dg,hg,idg,f, abr[]}` → `abr[].{cd, ds, mu[]}` → `mu[].{cd, cdi, nm, c, z[]}`
- `abr[].cd` = UF minúscula; **28 entradas = 27 UFs + `zz` (Exterior, 184 "municípios")**. **[V]**
- `mu[].cd` = **código TSE de 5 dígitos** (string, zeros à esquerda; `"01120"` = Acrelândia/AC; BH = `41238`, SP = `71072`, Brasília = `97012`); `cdi` = código **IBGE 7 dígitos**, **vazio no Exterior**; `c` = capital (`"s"`: 27 no total); `z[]` = zonas eleitorais. **5.755 municípios**, sem `cd` repetido. **[V]**
- O mesmo arquivo serve federal e estadual (config de municípios do 21270; conferir se 21272 tem o seu — **não baixado**).

### `br-e021270-ab.json` (EA14) — `ele2026/21270/dados/br/`  · 29 KB
`{ele,t,f,dg,hg,idg, abr[]}` → **29 abrangências: 1 `br` + 27 UFs + `zz`**. Cada uma:
- `and` (andamento; só `"f"` = final observado — outros valores **[?]**), `tpabr` (`br`/`uf`), `cdabr`, **`dt`/`ht`** (data/hora da última totalização daquela abrangência → gatilho para decidir se o EA20 mudou).
- `s{}` seções: `ts` total, `st` totalizadas, `snt` não totalizadas (`ts = st + snt` **[V]**), `si`/`sni` (instaladas / não instaladas **[?]**; `si + sni = ts` **[V]**), `sa`/`sna` **[?]**; cada uma com `p…` (%, 2 casas) e `p…n` (9 casas).
- `e{}` eleitorado: `te` total, `est`/`esnt` totalizado/não (`te = est + esnt` **[V]**), `esi/esni`, `esa/esna` **[?]**, `c` comparecimento, `a` abstenção (`c + a = esi`, **não** `= te`: no BR `esni=267` eleitores em seções não instaladas ficam fora **[V]**; `esi + esni = te` **[V]**) + percentuais.
- UF: `munnr`, `munpt`, `munf` (municípios com resultado: não recebido / parcial / final **[?]**) e percentuais.
- BR: `ufsnr`, `ufspt`, `ufsf` (idem, contando UFs; `ufsf=28` = todas final) e percentuais.
- **Mapeia para** `apuracao.acompanhamento` (draft): `secoes_totalizadas=s.st`, `secoes_total=s.ts`, `pct_totalizado=s.pstn`, `andamento=and`, `data_hora_total=dt+ht`. **[V]**
- EA14 é **por eleição** (`ele`): o do 21270 só cobre Presidente. O do estadual (`br-e021272-ab.json`, mesmo padrão) **não foi baixado**.

### `br-c0001-e021270-u.json` / `mg-c0003-e021272-u.json` (EA20) — `dados/<uf>/`  · ~10 KB cada
Cabeçalho: `ele, t, f, sup` (`"n"` **[?]**), `tpabr`/`cdabr` (`br`/`br`, `uf`/`mg`), `dg,hg,idg`, `dt,ht` (totalização), `dv`, `tf` (`"s"` **[?]**), **`and`**, `esae` (`"n"`), `mnae` (`[]`) **[?]**.
- `carg[]` (1 por arquivo; o array existe porque o formato é genérico): `cd` (código do cargo, **string** `"1"`), `nmn`/`nmm`/`nmf` (nome neutro/masc./fem.: `"Governador"`/`"Governadora"`), **`nv` = nº de vagas** (`"1"`). **[V]** O PROMPT cita "`vag=2`" para senador: no arquivo, as vagas do cargo estão em **`carg.nv`**; `agr[].vag` (só no MG, `"0"`) parece ser **vagas obtidas pelo agrupamento** **[?]** — confirmar com o EA20 de Senador/Dep. Federal.
- `carg[].fed[]` federações: `n` (101/102…), `sg`, `nm`, `com`, `npar[]` (números dos partidos).
- `carg[].agr[]` **agrupamentos** (hierarquia real): `agr` → `par[]` → `cand[]`.
  - `agr`: `n` (id do agrupamento, 8 dígitos), `nm`, `com` (composição: `"P 9984 / P 9992"`), **`tp`**: `i` partido isolado · `c` coligação · `f` federação **[V]**; `tvtn`, `tvan` **[?]**; `vag` (às vezes).
  - `par`: `n` (nº do partido, 2 dígitos), `sg`, `nm`, `nfed` (nº da federação, `""` se não), `tvtn`, `tvan`.
  - `cand`: `n` (nº de urna), **`sqcand`** (sequencial), `nm`, `nmu` (nome de urna), `dt` (nascimento), **`dvt`** (destinação do voto: `"Válido"`, `"Anulado"`, `"Anulado sub judice"`), `seq` (**posição/ordem de votação**: 1 = mais votado; **não** é o sequencial do candidato), `e` (`s`/`n`), `st` (situação: `"Não eleito"`, `"2º turno"`; valor de eleito **não observado**), **`vap`** (votos apurados do candidato), `pvap`/`pvapn` (%), `vs[]` (**vice**: `{tp:"v", sqcand, nm, nmu, sgp}`; para senador espera-se suplentes **[?]**).
- `s{}` e `e{}`: mesma estrutura do EA14, agora por cargo/abrangência.
- `v{}` votos **[V aritmético]** — identidades que valem nas duas amostras (bom para a validação de schema do coletor):
  - `tv = vvc + vb + tvn` (total de votos)
  - `vvc = vv + van + vansj` · `tvn = vn + vnt` (nulos) · `e.c = v.tv` (comparecimento = total de votos)
  - `vv = vnom` (só nominais; em proporcional deve aparecer legenda — **não observado**)
  - `Σ cand.vap = vv + vansj + (van − vsan)` (`vsan` = parcela de `van` sem candidato listado; no MG `van = vsan`)
  - `pvv = vv/vvc`, `pvvc = vvc/tv`, `pvb = vb/tv`, e **`cand.pvap = vap / Σ cand.vap`** — **o denominador do % do candidato NÃO é `vv`** (votos válidos): inclui anulados. Ex.: candidato 60 = 9.075.260 / 120.560.949 = 7,5275%.
  - Significados: `tv` total, `vvc` válidos+anulados, `vv` válidos, `vnom` nominais, `van` anulados, `vansj` anulados sub judice, `vb` brancos, `tvn`/`vn`/`vnt` nulos (`vnt` **[?]**), `vscv` **[?]**; percentuais `p…`/`p…n`.

### Estimativa de tamanho / cadência **[V]**
- Amostras majoritárias: 9–10 KB (12–13 candidatos). Deputados: **não amostrado**.
- `cache-control: max-age` de 21–55 s por arquivo (CDN Akamai), `ETag` + `Last-Modified` presentes; **304 confirmado** em teste condicional (`If-None-Match` em `ele-c.json`). Polling < ~20 s não traz dado novo.
- Os headers do CDN anunciam `x-ratelimit-limit: 2000, 2000;w=1` — **2.000/s**, contra os **100/s** da documentação. Seguir o número documentado (e o padrão de 5 req/s).

### Padrão de URL (item 4) — ver `docs/fontes.md`
`{base}/{ambiente}/{ciclo}/comum/config/ele-c.json` · `…/{ciclo}/{ele}/config/mun-e0{ele}-cm.json` · `…/{ciclo}/{ele}/dados/{uf}/{uf}-e0{ele}-ab.json` (EA14/15) · `…/dados/{uf}/{uf}-c{cargo:04d}-e0{ele}-u.json` (EA20 UF/BR) · `…/dados/{uf}/{uf}{mun5}-c{cargo:04d}-e0{ele}-u.json` (EA20 município). O nome usa o código da eleição com **zero à esquerda** (`e021270`). Baixados com sucesso (200): ele-c, mun-cm, `br-…-ab`, `br-c0001-…-u`, `mg-c0003-…-u`. **Não verificados por GET** (só pelos exemplos de `fontes.md`/templates): EA15 (`ac-e021270-ab`), `c0005`–`c0008`, EA10 (`tp:"e"`; nome do arquivo não documentado nos materiais que tenho).

### Consequências para a Fase 1 (o que o rascunho `0001_apuracao.sql` não cobre)
1. **`sqcand` não casa com `candidates.tse_id`** no simulado: 8 dígitos (`41592494`) e candidatos fictícios (`CANDIDATO 9995`), contra 12 dígitos no cadastro (`280002539826`). O FK opcional por `tse_id` **só é testável no oficial**; no simulado só dá para testar a lógica do casamento por número+UF+cargo (item 6.5).
2. `votacao_candidato` precisa de: `sqcand text`, `posicao` (`seq`), `agrupamento_n`/`tipo_agrupamento` (`i/c/f`), `votos_apurados` (vap) e **`destinacao` estruturada** (`dvt`); e uma tabela/coluna para **vice/suplentes** (`vs[]`).
3. `totalizacao.votos_validos` é ambíguo: TSE tem `vv`, `vvc` e `tv`. Criar colunas explícitas (`votos_validos`, `votos_validos_com_anulados`, `anulados`, `anulados_sub_judice`, `votos_sem_candidato`, `nulos`, `nulos_tecnicos`, `brancos`, `total_votos`). Faltam `vansj`/`van`/`vsan`.
4. `pct_validos numeric(7,4)` no rascunho passa a impressão de "% sobre válidos", mas o `pvap` do TSE tem outro denominador. Guardar `pvapn` como veio (`pct_tse_apurados`, numeric(12,9)) e, se formos mostrar % sobre válidos, calcular à parte e rotular "cálculo Electiolab" (relevante para o erro de pesquisa da Fase 4).
5. `matematicamente_definida boolean` **não tem campo de origem visto**; provavelmente sai de `and` (valor ainda não observado) e/ou `cand.st`. Decidir depois de ler a spec do EA20 / ver `and ≠ f` no ensaio.
6. `acompanhamento` ok, mas falta guardar `dt`+`ht` **por abrangência** (já previsto) e `munf/munpt/munnr`, `ufsf…`. `municipio.codigo_ibge` deve ser `null` (não `''`) no Exterior; `uf` precisa aceitar `zz`.
7. Chave de idempotência: `arquivo_bruto` único por (url, idg) ✓; guardar também `etag` ✓ (já existe) e o header `cache-control` não é necessário.
8. `eleicao`: `codigo_pleito` ✓, adicionar `codigo_eleicao_2t` (`cdt2`), `tipo` (`tp`), `sqele`. `cargo.codigo` deve ser `integer` vindo de string; adicionar `tipo` (majoritário/proporcional) e `vagas` (`nv`).

### Integração com o Electiolab (item 6, verificado via Supabase MCP em 26/09/2026)
Projeto Supabase: **ElectioLab** (`xoxztzologqeqbajlhya`).

- **`candidates`** (20.245 linhas): `tse_id text` é o **sequencial do candidato** (12 dígitos, ex.: `280002539826`), não o número de urna (`number`). Para 2026: 20.238 candidatos, 20.109 com `tse_id` preenchido (99,4%). 100% em deputado federal/estadual/distrital; um pouco menor em governador (229/279), senador (341/409) e presidente (22/33) — checar esses casos sem `tse_id` antes de confiar no FK opcional da Fase 1.
- **`elections`** (112 linhas): uma linha por (tipo de cargo × UF × ano), ex. `deputado_federal`/`MG`/2026. Coluna `tse_id text` existe mas está **null em todas as linhas de 2026** — hoje não há nenhum código do TSE (pleito/eleição) gravado aqui. A ligação `apuracao.eleicao` ↔ `elections` do Electiolab vai precisar ser por (tipo, UF, ano, turno), não por `tse_id`, a menos que decidamos populá-lo.
- **`polls`**: liga a `elections` (não a `candidates` — candidato é texto livre + `candidate_slug`). Tem `tse_registration` apontando para `pesqele_registry.protocolo`.
- **`institute_accuracy_observations`** (0 linhas): já tem exatamente o formato que a Fase 4 precisa — `poll_published_pct` vs `actual_pct`, `abs_error_pct` gerada, `fieldwork_end_days_before`, FK para `institutes`/`polls`/`elections`/`candidates`. Confirma o plano do CLAUDE.md de reaproveitar em vez de criar métrica paralela.
- **Tabelas órfãs `tse_apuracao` / `tse_apuracao_candidatos` — decisão registrada em 26/09/2026: não usar, não apagar.** Limpeza só depois da eleição. Schema `public` (não `apuracao`), sem migration commitada no repo (mesmo padrão "remote_schema" de `20260813040000_document_candidates_schema_retroactive.sql`). `tse_apuracao`: `election_id`, `cargo`, `estado`, `turno`, `data_apuracao`, `percentual_apuracao`, `secoes_apuradas`, `secoes_totais`. `tse_apuracao_candidatos`: `apuracao_id`, `candidate_id`, `numero_candidato`, `nome_candidato`, `sigla_partido`, `votos_nominais`, `votos_legenda`, `percentual`. Ambas com **0 linhas** no banco.
  Resultado do grep no repo inteiro por `tse_apuracao`/`tse_apuracao_candidatos` (26/09/2026):
  ```
  src/types/database.types.ts:3206:      tse_apuracao: {
  src/types/database.types.ts:3256:      tse_apuracao_candidatos: {
  src/types/database.types.ts:3295:            foreignKeyName: "tse_apuracao_candidatos_apuracao_id_fkey"
  src/types/database.types.ts:3298:            referencedRelation: "tse_apuracao"
  src/types/database.types.ts:3302:            foreignKeyName: "tse_apuracao_candidatos_candidate_id_fkey"
  apps/pipeline/api/tse/sync/resultados.ts:3   (comentário: sincroniza para tse_apuracao)
  apps/pipeline/api/tse/sync/resultados.ts:70,99,157,179,207,230  (.from('tse_apuracao') / .from('tse_apuracao_candidatos'))
  docs/ENDPOINTS_ADAPTED.md:15,235,264-265,297,320,323  (documentação de /api/tse/sync/resultados)
  docs/archive/WAVE2_COMPLETE.md:144  (menção no changelog da wave 2)
  ```
  `src/types/database.types.ts` é gerado (reflete o schema do banco, não é uso). O único código de aplicação que referencia as tabelas é `apps/pipeline/api/tse/sync/resultados.ts` — mas `apps/pipeline/` **não está** em `package.json`, `vercel.json`, `next.config.ts` nem `tsconfig.json` do repo: não é buildado nem deployado com o app principal, não tem cron próprio. Último commit que tocou o arquivo: `41abe49` (13/09/2026), antes desta sessão. Ou seja: código morto, não rota viva — confirma o status de órfã. Este projeto (apuracao-2026) não vai ler nem escrever em `tse_apuracao`/`tse_apuracao_candidatos`, nem em `apps/pipeline/`.
- `prior_election_results` (2.881.843 linhas) e `election_results` (0 linhas) existem mas são de eleições passadas / resultado final consolidado — fora do escopo da apuração ao vivo, mencionados aqui só por completude.
- **Vínculo `apuracao.eleicao` ↔ `elections` — aprovado em 26/09/2026**: por `(tipo, UF, ano, turno)`, não por `tse_id` (que está null em todas as linhas de 2026). Detalhar na Fase 1 o mapeamento de `apuracao.cargo.codigo` (numérico, do TSE) para `elections.type` (texto: `presidente`, `governador`, `senador`, `deputado_federal`, `deputado_estadual`, `deputado_distrital`).

## Fase 0 — status (26/09/2026)
| Item | Estado |
|---|---|
| 1. Amostras do simulado (5 arquivos) | feito — `amostras/` (+ `*.headers.txt` com ETag/Last-Modified), 1 GET por URL, 1 s entre pedidos, todos 200 |
| 2. PDFs de especificação | **bloqueado** — 403 Akamai em www.tse.jus.br; nada salvo em `docs/specs/` |
| 3. Mapa de campos | feito com as amostras; itens **[?]** dependem dos PDFs ou de amostras adicionais |
| 4. Padrão de URL e códigos de cargo | confirmado contra `ele-c.json` (ver mapa) |
| 5. Status em `fontes.md` | atualizado |
| 6. Integração Electiolab | feito antes (seção acima) |

Requisições feitas ao TSE nesta rodada: 6 no host de resultados (5 GETs + 1 GET condicional → 304), 0 × 404; 7 GETs + 1 HEAD ao www.tse.jus.br (todos 403).

## Riscos
| Risco | Mitigação |
|---|---|
| Bloqueio de IP (rate/404) | Limitador global, circuit breaker, URLs só a partir da config |
| Cron da Vercel atrasar | Monitorar `coletor_execucao`; botão manual protegido para disparar coleta |
| Mudança de leiaute entre simulado e oficial | Ensaio 28–29/09; validação de schema com erro explícito, não silencioso |
| Pico de acesso no site | Páginas servidas por ISR, sem consulta ao TSE no request |
