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
_(preencher na Fase 0 a partir das amostras e das specs EA14/EA15/EA20/EA10)_

## Riscos
| Risco | Mitigação |
|---|---|
| Bloqueio de IP (rate/404) | Limitador global, circuit breaker, URLs só a partir da config |
| Cron da Vercel atrasar | Monitorar `coletor_execucao`; botão manual protegido para disparar coleta |
| Mudança de leiaute entre simulado e oficial | Ensaio 28–29/09; validação de schema com erro explícito, não silencioso |
| Pico de acesso no site | Páginas servidas por ISR, sem consulta ao TSE no request |
