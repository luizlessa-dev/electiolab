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
Fonte: **amostras reais do simulado**, baixadas em 26/09/2026 (`amostras/`, gitignored): 12 arquivos EA11/12/14/15/20. Os PDFs de especificação **ainda não estão em `docs/specs/`** (www.tse.jus.br responde 403 a `curl`; Luiz baixa pelo navegador). Quando chegarem: reconciliar os campos **[?]**. Legenda: **[V]** = verificado nas amostras (estrutura ou aritmética), **[?]** = significado inferido, confirmar na spec.

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
- **Conselheiro Distrital: fora do escopo (decisão 26/09/2026).** No simulado o cargo 25 fica numa eleição própria (21274, `tp=3`); a config não traz UF. Entendimento do Luiz: é o Conselho Distrital de **Fernando de Noronha (PE)**, não do DF. O PROMPT_INICIAL foi corrigido.

### `mun-e021270-cm.json` (EA12) — `ele2026/21270/config/`  · 534 KB
`{dg,hg,idg,f, abr[]}` → `abr[].{cd, ds, mu[]}` → `mu[].{cd, cdi, nm, c, z[]}`
- `abr[].cd` = UF minúscula; **28 entradas = 27 UFs + `zz` (Exterior, 184 "municípios")**. **[V]**
- `mu[].cd` = **código TSE de 5 dígitos** (string, zeros à esquerda; `"01120"` = Acrelândia/AC; BH = `41238`, SP = `71072`, Brasília = `97012`); `cdi` = código **IBGE 7 dígitos**, **vazio no Exterior**; `c` = capital (`"s"`: 27 no total); `z[]` = zonas eleitorais. **5.755 municípios**, sem `cd` repetido. **[V]**
- O arquivo baixado é o de `21270`; `mun-e021272-cm.json` **não foi baixado** (a config de 21272 lista `cm` no mesmo padrão). Códigos de `cdabr` do EA15 batem com `mu[].cd` daqui (AC: 22).

### `br-e021270-ab.json` (EA14) — `ele2026/21270/dados/br/`  · 29 KB
`{ele,t,f,dg,hg,idg, abr[]}` → **29 abrangências: 1 `br` + 27 UFs + `zz`**. Cada uma:
- `and` (andamento; só `"f"` = final observado — outros valores **[?]**), `tpabr` (`br`/`uf`), `cdabr`, **`dt`/`ht`** (data/hora da última totalização daquela abrangência → gatilho para decidir se o EA20 mudou).
- `s{}` seções: `ts` total, `st` totalizadas, `snt` não totalizadas (`ts = st + snt` **[V]**), `si`/`sni` (instaladas / não instaladas **[?]**; `si + sni = ts` **[V]**), `sa`/`sna` **[?]**; cada uma com `p…` (%, 2 casas) e `p…n` (9 casas).
- `e{}` eleitorado: `te` total, `est`/`esnt` totalizado/não (`te = est + esnt` **[V]**), `esi/esni`, `esa/esna` **[?]**, `c` comparecimento, `a` abstenção (`c + a = esi`, **não** `= te`: no BR `esni=267` eleitores em seções não instaladas ficam fora **[V]**; `esi + esni = te` **[V]**) + percentuais.
- UF: `munnr`, `munpt`, `munf` (municípios com resultado: não recebido / parcial / final **[?]**) e percentuais.
- BR: `ufsnr`, `ufspt`, `ufsf` (idem, contando UFs; `ufsf=28` = todas final) e percentuais.
- **Mapeia para** `apuracao.acompanhamento` (draft): `secoes_totalizadas=s.st`, `secoes_total=s.ts`, `pct_totalizado=s.pstn`, `andamento=and`, `data_hora_total=dt+ht`. **[V]**
- EA14 é **por eleição** (`ele`): o do 21270 só cobre Presidente; o do estadual (21272) foi amostrado (ver abaixo).

### EA20 — `br-c0001-e021270-u` · `mg-c0003-e021272-u` · `ac-c0005/6/7-e021272-u` · `df-c0008-e021272-u`
Cabeçalho: `ele, t, f, sup` (`"n"` **[?]**), `tpabr`/`cdabr` (`br`/`br`, `uf`/`mg`), `dg,hg,idg`, `dt,ht` (totalização), `dv`, `tf` (`"s"` **[?]**), **`and`** (só `f` visto, inclusive em RR/AP/MA), **`esae`** e **`mnae`**: `esae="s"` = o TSE **não declara eleito** e `mnae[]` traz os motivos em texto. **[V]** no cenário do AP (governador sem eleito, `esae="s"`, 2 mensagens: "Candidata ou candidato com maior votação nominal anulada ou anulada sub judice." e "Votos anulados e anulados sub judice ultrapassam 50% da votação nominal, incluindo votos de seções anuladas."); nos demais `esae="n"`, `mnae=[]`. Todos os arquivos: 1 elemento em `carg[]`.
- `carg[]`: `cd` (código do cargo, **string**), `nmn`/`nmm`/`nmf` (neutro/masc./fem.: `Governador`/`Governadora`), **`nv` = nº de vagas** **[V]**: Presidente 1, Governador 1, **Senador 2**, Dep. Federal AC 8, Dep. Estadual AC 24, Dep. Distrital DF 28. Só nos proporcionais: **`qe`** (quociente eleitoral **fornecido pelo TSE**: AC federal 66697, AC estadual 25352, DF 61457; confere com `round(vv / nv)` — usar só como sanity check, nunca recalcular como dado oficial).
- `carg[].fed[]` federações: `n` (101/102…), `sg`, `nm`, `com`, `npar[]` (números dos partidos).
- Hierarquia real: **`agr[]` → `par[]` → `cand[]`**.
  - `agr`: `n` (id do agrupamento, 8 dígitos), `nm`, `com` (`"P 9984 / P 9992"`), **`tp`**: `i` partido isolado · `c` coligação (só majoritário) · `f` federação **[V]**. **`vag`** = vagas obtidas pelo agrupamento (proporcional): `Σ agr.vag = carg.nv` nos 3 arquivos proporcionais **[V]**; no Senado vem `0` em todos mesmo com 2 eleitos (não usar `vag` em majoritário). Totais só em `f`/`c` (e sempre no proporcional): `tvtn`, `tvan`, `tvtl`, `tval`; para federação valem a soma dos partidos **[V]**.
  - `par`: `n` (nº do partido), `sg`, `nm`, `nfed` (nº da federação ou `""`), `tvtn`, `tvan` e, no proporcional, `dvt` (`"Válido (legenda)"`), `tvtl`, `tval`.
  - `cand`: `n` (nº de urna), **`sqcand`** (sequencial; 8 dígitos no simulado), `nm`, `nmu`, `dt` (nascimento), **`dvt`** (`"Válido"`, `"Válido (legenda)"`, `"Anulado"`, `"Anulado sub judice"`), `seq` (posição na lista de resultado, única por arquivo; **majoritário: ordem decrescente de `vap`; proporcional: não é ordem pura de `vap`** **[V]**), `e` (`s`/`n`), `st`, **`vap`**, `pvap`/`pvapn`.
    - `st` observados: `Eleito` (majoritário), `Eleito por média` (proporcional, **todos** os eleitos do simulado), `2º turno`, `Suplente`, `Não eleito`. **Corrigido em 28/09/2026:** nem `e = "s"` ⇔ `st` começa com `Eleit`, nem o nº de `e="s"` = `nv`. As duas falham nas amostras: em BR/MA/MG há **2** candidatos com `e="s"` e `st="2º turno"` para `nv=1`, e no AP não há nenhum (`esae="s"`). Ou seja, `e="s"` significa "segue" (eleito **ou** classificado para o 2º turno), e a contagem de eleitos só fecha com `nv` num resultado definido sem 2º turno. Nenhuma das duas é usada como identidade no coletor. **Não observado**: `Eleito por QP` (ou equivalente) — confirmar na spec.
    - `vs[]` (opcional): majoritário `{tp:"v"}` = vice (Pres./Gov.); Senado `{tp:"s1"|"s2"}` = 1º/2º suplente. `subs[]` (opcional; Gov. MA, Sen. AC e Dep. Est. AC = exatamente os cenários de substituição do simulado): `{nm, nmu, sgp}`, **sem `sqcand` e sem votos**. No MA aparece no candidato 69 (`2º turno`), com nome **diferente** do vice (`vs` `v`), então não é o vice: é o **candidato que foi substituído por este** (lista, pode ter mais de um) **[V pelos cenários; direção da relação confirmar na spec]**. Guardado como `votacao_candidato.substituidos jsonb`.
    - Candidato com `dvt="Válido (legenda)"` (1 no Dep. Federal AC): seus votos contam como legenda do partido.
- `s{}` e `e{}`: mesma estrutura do EA14, por cargo/abrangência.
- `v{}` votos — **identidades que valem nos 9 EA20 amostrados [V aritmético]** (base para a validação de schema do coletor; se falhar, erro explícito):
  - `tv = vvc + vb + tvn` · `tvn = vn + vnt`
  - **`tv = e.c × nv` no majoritário · `tv = e.c` no proporcional** — corrigido em 28/09/2026. A redação anterior (`e.c = v.tv`) só valia por acidente, para cargo de 1 vaga: **falha no Senador**, onde cada eleitor deposita 2 votos (AC: `tv` 1.224.356 = 2 × `c` 612.178). No proporcional é sempre 1 voto por eleitor, independentemente de `nv` (Dep. Federal AC, `nv=8`: `tv` = `c` = 612.178). Conferido nas 9 amostras EA20.
  - `vvc = vv + van + vansj`
  - majoritário: `vv = vnom`. **Proporcional (tem `vl`, `pvl`, `pvln`): `vv = vnom + vl`.**
  - `Σ par.tvtn = vnom` · `Σ par.tvtl = vl` · `tvtl − tval` = votos de candidatos com `dvt="Válido (legenda)"` · `par.tvan = Σ cand.vap` do partido.
  - `vvc = Σ cand.vap + Σ par.tval + vsan` (nos 9 arquivos; `vsan` = parcela de `van` sem candidato listado: 143.627 no Presidente, `= van` no MG, 0 nos demais).
  - **`cand.pvap = 100 · vap / (vvc − vsan)`** (erro < 1e-9 nos 9 arquivos). **O denominador do TSE NÃO é `vv`** (votos válidos): inclui anulados (e, no proporcional, legenda). Ex.: Presidente, cand. 60 = 9.075.260 / 120.560.949 = 7,5275%; Dep. Federal AC, cand. 6202 = 2.939 / 605.918 (`vvc`) = 0,485%.
  - `pvv = vv/vvc`, `pvvc = vvc/tv`, `pvb = vb/tv` (percentuais globais).
  - Significados: `tv` total, `vvc` válidos+anulados, `vv` válidos, `vnom` nominais, `vl` legenda, `van` anulados, `vansj` anulados sub judice, `vb` brancos, `tvn` nulos (`vn` + `vnt` **técnicos** — `vnt` = 1.264 no Dep. Estadual AC), `vscv` **[?]** (sempre 0).

### EA15 — `ac-e021270-ab.json` · `ac-e021272-ab.json`  · 19 KB
Mesmo envelope do EA14 (`ele,t,f,dg,hg,idg,abr[]`). Para o AC: **23 abrangências = 22 `mun` + 1 `uf`** (22 = nº de municípios do AC no EA12 ✓). Entrada `mun`: `and`, `tpabr:"mun"`, `cdabr` = **código TSE de 5 dígitos**, `dt`/`ht`, `s{}`, `e{}` (sem `munnr…`). Entrada `uf`: idem + `munnr/munpt/munf`. **Um EA15 por eleição e por UF**: os do 21270 e 21272 têm `idg` e `ht` diferentes (mesmo município, `ht` 14:00:33 vs 14:00:09). **[V]**

### EA14 estadual — `br-e021272-ab.json`  · 28 KB
**28 abrangências = `br` + 27 UFs, sem `zz`** (o exterior só aparece na eleição federal) **[V]**; só `and="f"`. Estrutura igual ao EA14 federal.

### Tamanho / cadência **[V]**
- Majoritários: 9–17 KB (12–24 candidatos). Proporcionais (AC): Dep. Federal **51 KB** (176 cand.), Dep. Estadual **117 KB** (455), Dep. Distrital (DF) **184 KB** (728) → ~0,26 KB/candidato. Extrapolação para 2026 (20.238 candidatos): ~5,3 MB por varredura completa dos EA20 de candidatos. EA14 ≈ 28–29 KB, EA15 (AC) ≈ 19 KB, EA12 ≈ 534 KB.
- `cache-control: max-age` de 21–55 s por arquivo (CDN Akamai), `ETag` + `Last-Modified` presentes; **304 confirmado** em teste condicional (`If-None-Match` em `ele-c.json`). Polling < ~20 s não traz dado novo.
- Os headers do CDN anunciam `x-ratelimit-limit: 2000, 2000;w=1` — 2.000/s, contra os **100/s** da documentação. **Decisão 26/09/2026: seguir o documentado; nosso teto continua em 5 req/s.**

### Padrão de URL (item 4) — ver `docs/fontes.md`
`{base}/{ambiente}/{ciclo}/comum/config/ele-c.json` · `…/{ciclo}/{ele}/config/mun-e0{ele}-cm.json` · `…/{ciclo}/{ele}/dados/{uf}/{uf}-e0{ele}-ab.json` (EA14 com `uf=br`; EA15 com UF) · `…/dados/{uf}/{uf}-c{cargo:04d}-e0{ele}-u.json` (EA20 UF/BR) · `…/dados/{uf}/{uf}{mun5}-c{cargo:04d}-e0{ele}-u.json` (EA20 município). O nome usa o código da eleição com **zero à esquerda** (`e021270`).

**Confirmados com 200** (todos construídos a partir de `ele-c.json`/EA12; nenhum 404): ele-c, mun-e021270-cm, `br-e021270-ab`, `br-e021272-ab`, `ac-e021270-ab`, `ac-e021272-ab`, `br-c0001-e021270-u`, `mg-c0003-e021272-u`, `ac-c0005/c0006/c0007-e021272-u`, `df-c0008-e021272-u`. A abrangência de `ab` é `br` ou UF (`ac`); o `<uf>` do diretório e do nome é o mesmo. **Ainda sem GET**: EA20 por município (`ac01120-c0005-…`, só exemplo de `fontes.md`), EA10 (`tp:"e"`; nome do arquivo não documentado nos materiais que tenho — esperar a spec e a 1ª totalização final antes de pedir, regra 4).

### Consequências para a Fase 1 (o que o rascunho `0001_apuracao.sql` não cobre)
1. **`sqcand` × `candidates.tse_id` — decisão 26/09/2026: FK anulável; casamento na Fase 2, contra o oficial.** No simulado `sqcand` tem 8 dígitos (`41592494`) e os candidatos são fictícios (`CANDIDATO 9995`), contra 12 dígitos no cadastro (`280002539826`). Na Fase 1: `votacao_candidato.candidate_id uuid null references public.candidates(id)` (ou o tipo real da PK) **sem** constraint de casamento; guardar `sqcand text` sempre. A lógica de casamento (número + UF + cargo, item 6.5) só é validada quando houver `ele-c`/EA20 oficiais.
2. `votacao_candidato` precisa de: `sqcand text`, `posicao` (`seq`), `agrupamento_n` + `agrupamento_tipo` (`i/c/f`), `partido_n`, `votos_apurados` (`vap`), `pvap` (bruto, ver 4), `destinacao` (`dvt`: `Válido`, `Válido (legenda)`, `Anulado`, `Anulado sub judice`), `situacao` (`st`) e `eleito boolean` (`e`). Mais uma tabela filha para **vice / suplentes** (`vs[]`: `tp` = `v`, `s1`, `s2`) e outra (ou jsonb) para **substituídos** (`subs[]`: só `nm/nmu/sgp`, sem `sqcand`).
3. `votacao_partido`: além de `tvtn` (nominais válidos) e `tvtl` (legenda total), guardar `tval` (legenda pura) e `tvan` (apurados nominais); e o mesmo por agrupamento/federação (`agr.tvtn/tvtl/tval/tvan/vag`). `vag` (vagas obtidas) só é significativo em proporcional.
4. **pvap — decisão 26/09/2026:** guardar `pvap`/`pvapn` **como vieram do TSE** (coluna `pct_tse` `numeric(12,9)` a partir de `pvapn`; `pvap` texto fica no bruto). O denominador do TSE é `vvc − vsan` (ver identidades), **não** os votos válidos (`vv`). Para a Fase 4 (erro de pesquisa sobre votos válidos) calcular em **coluna/tabela separada**, `pct_validos_calc_electiolab`, sempre rotulada "cálculo Electiolab" na UI. Nunca sobrescrever a coluna do TSE. O `pct_validos numeric(7,4)` do rascunho sai.
5. `totalizacao.votos_validos` é ambíguo (TSE tem `vv`, `vvc`, `tv`). Colunas explícitas: `total_votos` (`tv`), `votos_validos_com_anulados` (`vvc`), `votos_validos` (`vv`), `votos_nominais` (`vnom`), `votos_legenda` (`vl`, só proporcional), `anulados` (`van`), `anulados_sub_judice` (`vansj`), `votos_sem_candidato` (`vsan`), `brancos` (`vb`), `nulos` (`tvn`), `nulos_diretos` (`vn`), `nulos_tecnicos` (`vnt`), `vscv`. Em `cargo`/`totalizacao`: `vagas` (`nv`) e **`quociente_eleitoral` (`carg.qe`, valor oficial do TSE; só proporcional; guardar como veio, regra 8)**.
6. **`matematicamente_definida` — resolvida em 26/09/2026 com RR/AP/MA: não existe campo dedicado; a coluna boolean do rascunho sai.** RR (definido no 1º turno, 66,18%): `and=f`, `esae=n`, candidato 57 com `e=s` e `st="Eleito"`. AP (sem eleito): `and=f`, `esae=s`, `mnae` com os motivos, nenhum `e=s`. MA: 2 candidatos `e=s` com `st="2º turno"`. Ou seja, o estado vem dos **rótulos do TSE por candidato** (`st`/`e`) e de `esae`/`mnae`; `and` só distingue final × não. Modelo: `totalizacao.sem_eleito_tse` (`esae`), `totalizacao.mensagens_sem_eleito` (`mnae`), `votacao_candidato.situacao`/`eleito`, e a view `apuracao.v_disputa_situacao` (`sem_eleito` | `eleito` | `segundo_turno` | `em_apuracao`), derivada só de rótulos, sem calcular número. **Ressalva**: as três amostras estão em 100% (`and=f`); só o simulado de 28–29/09 mostra se o TSE rotula `Eleito` antes de 100% e quais valores de `and` existem antes do final. Se a spec/ensaio trouxer algo novo, entra como migration de ajuste.
7. `acompanhamento`: guardar `dt`+`ht` **por abrangência** e por eleição, mais `munnr/munpt/munf` (UF) e `ufsnr/ufspt/ufsf` (BR); EA15 tem também abrangência `mun` (`cdabr` de 5 dígitos). `municipio.codigo_ibge` deve ser `null` (não `''`) no Exterior; `uf` precisa aceitar `zz`.
8. Idempotência: `arquivo_bruto` único por (url, idg) ✓ (etag já existe). **Volume**: ~0,26 KB/candidato em proporcional → os 20.238 candidatos de 2026 ≈ 5,3 MB por varredura completa. **Decidido em 26/09/2026 (ver "Fase 1 — schema e política de retenção")**: `votacao_candidato`/`votacao_partido` guardam só o último snapshot por (eleição, cargo, abrangência) via upsert (~20 mil linhas, não crescem por ciclo); a série temporal fica em `totalizacao` (uma linha por versão); o bruto segue a política de retenção. Em 304 não se grava nada.
9. `eleicao`: `codigo_pleito` ✓, adicionar `codigo_eleicao_2t` (`cdt2`), `tipo` (`tp`), `sqele`. `cargo.codigo` `integer` vindo de string; adicionar `tipo` (majoritário/proporcional, de `cp.tp`) e `vagas`. Conselheiro Distrital (cargo 25) **fora do escopo** (decisão 26/09/2026).

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

## Fase 0 — status (26/09/2026, atualizado após aprovação)
| Item | Estado |
|---|---|
| 1. Amostras do simulado | feito — 5 arquivos pedidos + 7 autorizados (EA20 AC senador/dep. federal/dep. estadual, DF dep. distrital, EA15 AC ×2, EA14 estadual BR), em `amostras/` com `*.headers.txt`. 1 GET por URL, 1 s entre pedidos, todos 200, 0 × 404 |
| 2. PDFs de especificação | **pendente com o Luiz**: baixar no navegador para `docs/specs/`. Depois: reconciliar os campos **[?]** do mapa |
| 3. Mapa de campos | feito com as 12 amostras; **[?]** = depende dos PDFs |
| 4. Padrão de URL e códigos de cargo | confirmado por GET (ver mapa) |
| 5. Status em `fontes.md` | atualizado |
| 6. Integração Electiolab | feito (seção abaixo) |

Decisões de 26/09/2026: (a) `pvap` guardado como veio; % sobre votos válidos = coluna separada "cálculo Electiolab" (Fase 4); (b) FK `sqcand`→`candidates.tse_id` anulável, casamento na Fase 2 contra o oficial; (c) vagas em `carg[].nv`; Conselheiro Distrital fora do escopo; (d) rate limit documentado (100 req/s), teto nosso 5 req/s; (e) vínculo `apuracao.eleicao` ↔ `elections` por (tipo, UF, ano, turno); (f) retenção: `votacao_*` só último snapshot por (eleição, cargo, abrangência) via upsert, série temporal em `totalizacao`, política de `arquivo_bruto` abaixo.

Requisições ao host de resultados (rodadas 1+2): 18 GETs (17 × 200 + 1 × 304), 0 × 404. Ao www.tse.jus.br: 7 GETs + 1 HEAD, todos 403.

## Fase 1 — schema e política de retenção (26/09/2026)
Migration: `supabase/migrations/20260927120000_apuracao_schema.sql` (**não aplicada**; Luiz aplica no SQL Editor). Testada em Postgres local (PGlite) só para sintaxe, idempotência, carga das amostras reais (Dep. Federal AC e Gov. MA) e RLS; **nunca** rodou contra o Supabase do Electiolab. O rascunho `migrations/0001_apuracao.sql` desta pasta fica como histórico.

### Modelo
`eleicao` → `cargo` (+ `cargo_tipo`: código TSE → `elections.type`) → **`disputa`** = (eleição, cargo, abrangência), com `vagas` (`nv`), `quociente_eleitoral` (`qe`, oficial) e `election_id` (FK anulável a `public.elections`, ligado por (tipo, UF, ano, turno)). Por disputa: `totalizacao` (uma linha por versão/idg) e o último snapshot em `votacao_agrupamento`, `votacao_partido`, `votacao_candidato` (+ `candidato_vinculado` para vice/suplentes). `votacao_candidato.candidate_id` → `public.candidates` é **anulável**; o casamento é da Fase 2, contra o oficial.
Internas (sem leitura pública): `arquivo_bruto`, `coletor_execucao`, `url_quarentena`. Exibição (leitura pública `anon`/`authenticated`): as demais + views `v_totalizacao_atual` e `v_disputa_situacao`.

### Regra de retenção (decisão 26/09/2026)
| Dado | Regra |
|---|---|
| `totalizacao` | **uma linha por versão (idg)** de cada disputa: é a série temporal da noite |
| `votacao_candidato`, `votacao_partido`, `votacao_agrupamento`, `candidato_vinculado` | **só o último snapshot** por (eleição, cargo, abrangência), via upsert (`unique (disputa_id, sqcand)` / `(disputa_id, numero)`); o coletor apaga linhas que não estão no arquivo mais novo, na mesma transação |
| `arquivo_bruto`, majoritários (Presidente, Governador, Senador) BR/UF | **todas as versões** (`retencao='completa'`) |
| `arquivo_bruto`, proporcionais (Dep. Federal/Estadual/Distrital) | versão **final** (`'final'`, `and='f'`) + **marco a cada ~10% de seções totalizadas** (`'marco'`, decidido por `pct_secoes_totalizadas`: 10%, 20%…); a versão mais recente fica como `'ultima'` e é apagada quando a próxima chega, a menos que vire marco/final |
| `totalizacao.arquivo_id` | anulável (`on delete set null`): a versão continua registrada com `url_origem`, `idg`, `etag`, `coletado_em` mesmo sem o bruto (convenção do CLAUDE.md) |
| `acompanhamento` (EA14/EA15) | **só o estado atual** por (eleição, abrangência) — escolha minha, não estava nas decisões: guarda `dt+ht`/idg vistos para o coletor decidir o que baixar; histórico de EA15 (5.700 municípios × ciclos) não agrega valor |
Volume esperado: 20.238 candidatos → `votacao_candidato` estável em ~20 mil linhas (upsert, não cresce por ciclo); `totalizacao` cresce por versão (ordem de milhares de linhas na noite); bruto proporcional limitado a ~11 versões por arquivo.

### Escolhas de desenho fora das lacunas 1–9 (para você revisar)
- `url_quarentena` (nova): o cron é sem estado entre execuções, então o circuit breaker de 404 (regra 3) precisa de tabela.
- Data de nascimento (`cand.dt`) **não** é normalizada (só no bruto): não é necessária para exibição.
- `pct_validos_calc_electiolab` existe em `votacao_candidato` (nula; só a Fase 4 preenche, sobre votos válidos e com abrangência 100% totalizada).
- `eleito` (EA10) é **provisória**: sem amostra nem spec; o que mudar entra como migration de ajuste.
- **Exposição do schema: pelo painel, não por SQL** (decisão 26/09/2026). Depois de aplicar a migration, adicionar `apuracao` em Settings → API → Exposed schemas, mantendo os schemas já listados. A migration só deixa um comentário sobre isso.
- **Grants em migrations futuras:** o `grant all on all tables/sequences in schema apuracao to service_role` da migration de 27/09 cobre **só as tabelas e sequences que existiam naquele momento**. Toda migration futura que criar tabela (ou sequence) em `apuracao` precisa repetir o grant ao `service_role` e, se for tabela de exibição, `enable row level security` + policy de leitura + `grant select ... to anon, authenticated`. Sem o grant o coletor falha com `permission denied`.

## Fase 2 — coletor, onda 1 (28/09/2026)

Onda 1 = **Presidente (BR + 27 UFs + Exterior), Governador e Senador (27 UFs)** → cargos 1, 3, 5.
Onda 2 (Dep. Federal/Estadual/Distrital) usa os mesmos módulos, trocando `--cargos`.

### Módulos (`src/lib/apuracao/`)
| Arquivo | Papel |
|---|---|
| `tipos.ts` | interfaces dos JSON do TSE (tudo string, como vem) |
| `valores.ts` | string→número/data; vírgula→ponto sem arredondar; Brasília→UTC |
| `urls.ts` | URLs **só** a partir dos templates de `arq[].dir`; falha se sobrar placeholder |
| `tse-cliente.ts` | condicional (ETag/If-Modified-Since), timeout, limitador global, backoff 429/5xx, circuit breaker de 404 |
| `identidades.ts` | validação aritmética por EA20, separada em bloqueante × aviso |
| `repositorio.ts` | escrita no schema `apuracao` (service_role) |
| `config.ts` | `ele-c.json` → `eleicao`/`cargo`; `mun-cm` → `municipio` |
| `acompanhamento.ts` | EA14/EA15 → `acompanhamento`; monta a lista de alvos EA20 |
| `resultados.ts` | EA20 → `arquivo_bruto` + `totalizacao` + `votacao_*` |
| `coletor.ts` | um ciclo, com log em `coletor_execucao` |
| `scripts/apuracao-coletar.ts` | CLI (`--uma-vez`, `--loop=N`, `--cargos`, `--sem-ea15`) |

### Decisões desta fase
1. **Escopo por código de cargo, nunca por código de eleição.** Os códigos de eleição mudam entre simulado (21270/21272) e oficial (6257/6259) e saem do `ele-c.json`; o coletor só descarta a eleição que não tem nenhum cargo da onda (evita pedir o EA14 da municipal do simulado).
2. **Nome do arquivo: `e` + código da eleição preenchido até 6 dígitos** (`21270` → `e021270`, `6257` → `e006257`). Regra generalizada a partir do padrão do simulado; **reconferir contra o `ele-c.json` oficial** no checklist da Fase 5.
3. **O que mudou se decide por ETag/idg, jamais por data.** A requisição condicional responde 304 (nada a fazer) ou 200; no 200, `idg` igual ao já gravado também dispensa normalização. `dt`/`ht` continuam gravados, mas só para exibição — o mapa de campos já registra que `ht` pode ser posterior a `hg`.
4. **`idg`/`etag` de uma abrangência de UF pertencem ao arquivo que a identifica.** A UF aparece no EA14 e no EA15; se os dois gravassem `etag` na mesma linha, um apagaria o ETag do outro e a requisição condicional do ciclo seguinte viria completa. O EA14 grava `etag`/`idg` só na linha `br`, o EA15 só na linha da própria UF; as demais entram sem essas colunas.
5. **Identidades bloqueantes × avisos.** Bloqueiam a normalização as decomposições internas dos blocos `v`/`s`/`e` e as somas de `agr → par → cand` (valem em qualquer percentual). Ficam como aviso `e.c + e.a = e.esi` (não sabemos o comportamento de `esi` abaixo de 100% — todas as amostras estão em `and='f'`), `cand.pvapn` (depende de uma escolha de denominador do TSE, e o valor é gravado como veio de todo modo) e `Σ agr.vag = nv` (propriedade de resultado fechado). Numa falha bloqueante o **bruto é guardado como prova** e a normalização é pulada.
6. **Atomicidade do "último snapshot".** O PostgREST não dá transação entre chamadas. Em vez de apagar por lista de chaves, cada linha de `votacao_*` leva o `totalizacao_id` da versão; grava-se com a marca nova e depois apaga-se, na disputa, tudo que não tem essa marca. Leitor que filtra pela versão corrente não vê mistura. **Pendência para a rota da Vercel:** uma função `apuracao.gravar_ea20(jsonb)` que faça isso numa transação e numa só ida ao banco — hoje são ~7 chamadas por EA20, o que também é o principal risco de estourar os 60s do `maxDuration`.
7. **Fixtures versionadas.** `apuracao-2026/amostras/` é gitignored, então as 10 amostras usadas nos testes foram copiadas para `src/lib/apuracao/__tests__/fixtures/` (180 KB, dados públicos, sem edição). `npm test` roda sem rede e sem banco.

### Bugs achados na coleta real (e o que eles ensinam)
Os dois só apareceram **no 2º ciclo** — um ciclo isolado passava limpo. Vale rodar `--loop` por alguns ciclos antes de confiar.
1. **Lista de abrangências truncada pelo PostgREST.** `acompanhamento` guarda também os municípios (que vêm de carona no EA15): ~5.700 linhas por eleição. As consultas não filtravam por tipo e o PostgREST corta em 1.000 linhas, devolvendo uma amostra quase toda `mun`. Como é dessa lista que sai a lista de alvos quando o EA14 responde 304, o 2º ciclo montou **28 alvos em vez de 83, sem erro nenhum** — e as UFs que sobraram vieram sem ETag. Corrigido com `tipo_abrangencia in ('br','uf')` nas duas consultas. **Quando o resultado municipal entrar no escopo, a lista de alvos de município precisa de consulta paginada própria.**
2. **`vagas`/`quociente_eleitoral` apagados a cada ciclo.** O ciclo grava a disputa antes de ler o EA20 (precisa do id para achar o ETag) e mandava essas duas colunas como `null`, apagando o que o ciclo anterior havia gravado. Corrigido deixando-as **fora do payload** quando o valor ainda não é conhecido — o upsert do PostgREST só escreve as colunas presentes.

Daí saiu `--reprocessar`: depois de corrigir a normalização, o arquivo do TSE pode não mudar por horas e o dado errado ficaria no banco até a próxima versão. A flag ignora o ETag/idg guardados dos EA20 e normaliza de novo, mantendo o limitador e uma única requisição por URL. Entra no runbook da Fase 5.

### Medições reais (28/09/2026, manhã, simulado estático)
| Ciclo | Requisições | 200 | 304 | 404 | Duração |
|---|---|---|---|---|---|
| 1º (banco vazio, com EA12) | 143 | 143 | 0 | 0 | 101,3 s |
| 2º (tudo já coletado) | 141 | 0 | 141 | 0 | 43,0 s |
| 3º (`--reprocessar`) | 141 | 83 | 58 | 0 | 85,4 s |

Zero 404 em **todos** os ciclos (`url_quarentena` vazia). O ciclo em regime (só 304) fica em **43 s**, contra ~28 s de piso do limitador a 5 req/s: o resto é ida e volta ao Supabase. O 1º ciclo a 101 s mostra o custo de escrever — ~7 chamadas ao PostgREST por EA20. **Isso é o que precisa cair antes da rota da Vercel** (`maxDuration` 60 s): a função `apuracao.gravar_ea20(jsonb)` da decisão 6.

Conferência banco × arquivo bruto, nas 83 disputas: **1.216 candidatos, zero divergência** em votos, percentual (`pvapn` de 9 casas), nome de urna, número, destinação, situação, eleito, posição, partido, tipo de agrupamento, nº de vinculados e versão. Nenhum órfão nas duas direções, e as 83 `totalizacao` passam nas identidades reconferidas em SQL. Situação derivada: 20 eleito · 54 segundo_turno · 9 sem_eleito.

### URLs confirmadas nesta fase (28/09/2026, 1 GET cada, todas 200, **zero 404**)
`mg-c0001-e021270-u` (Presidente por UF) · `zz-c0001-e021270-u` e `zz-e021270-ab` (Exterior tem EA20 e EA15) · `df-c0003-e021272-u` (DF elege Governador) · `sp-c0005-e021272-u` · `mun-e021272-cm` (EA12 da estadual).
Com isso a onda 1 tem **140 requisições por ciclo**: 2 EA14 + 55 EA15 (27 UFs × 2 eleições + `zz`) + 83 EA20 (29 Presidente + 27 Governador + 27 Senador). A ~5 req/s dá ~28 s de ciclo.

## Riscos
| Risco | Mitigação |
|---|---|
| Bloqueio de IP (rate/404) | Limitador global, circuit breaker, URLs só a partir da config |
| Cron da Vercel atrasar | Monitorar `coletor_execucao`; botão manual protegido para disparar coleta |
| Mudança de leiaute entre simulado e oficial | Ensaio 28–29/09; validação de schema com erro explícito, não silencioso |
| Pico de acesso no site | Páginas servidas por ISR, sem consulta ao TSE no request |
