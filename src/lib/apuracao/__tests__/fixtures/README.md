# Fixtures — arquivos reais do simulado do TSE

Amostras baixadas do simulado (`resultados-sim.tse.jus.br/simulado/simulado2026`) em
26/09/2026, copiadas de `apuracao-2026/amostras/` (que é gitignored) para que
`npm test` funcione num clone limpo, sem rede.

São dados públicos da Justiça Eleitoral, gravados **como vieram** — nenhum valor foi
editado (regra 1 do `apuracao-2026/CLAUDE.md`). Não editar à mão: se precisar de outra
amostra, baixe do simulado e copie aqui.

| Arquivo | Tipo | Cenário que cobre |
|---|---|---|
| `ele-c.json` | EA11 | templates de diretório, 3 eleições, cargos 1/3/5/6/7/8/25 |
| `br-e021270-ab.json` | EA14 | Brasil + 27 UFs + `zz` (eleição federal) |
| `ac-e021272-ab.json` | EA15 | 22 municípios do AC + a própria UF |
| `br-c0001-e021270-u.json` | EA20 | Presidente, BR, 2º turno (2 candidatos `e='s'`), `vsan` > 0, vice |
| `mg-c0003-e021272-u.json` | EA20 | Governador MG, 2º turno, `vsan = van` |
| `ac-c0005-e021272-u.json` | EA20 | Senador, **2 vagas** (`tv = 2 × comparecimento`), suplentes `s1`/`s2`, `subs[]` |
| `ac-c0006-e021272-u.json` | EA20 | Dep. Federal AC — proporcional: `vl`, `qe`, `Válido (legenda)` |
| `ap-c0003-e021272-u.json` | EA20 | Governador AP **sem eleito** (`esae='s'`, `mnae[]` com 2 motivos) |
| `ma-c0003-e021272-u.json` | EA20 | Governador MA — 2º turno com `subs[]` (candidato substituído) |
| `rr-c0003-e021272-u.json` | EA20 | Governador RR — eleito no 1º turno (`st='Eleito'`) |
