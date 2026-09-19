    # 🎯 TOP 20 Senador — Curadoria Prioritária

**Meta original**: Senador 6% → ~18% (3x cobertura)
**Atualizado**: 2026-09-18 — todas as Datafolha reputadas da rodada resolvidas

---

## ⭐⭐⭐ DATAFOLHA — TODAS CONCLUÍDAS ✅

| UF/Cargo | Protocolo | Fieldwork | Status |
|----------|-----------|-----------|--------|
| Senador DF | DF-06055/2026 | 08-11/09 | ✅ 15 candidatos |
| Governador + Senador PI | PI-03643/2026 | 14-17/09 | ✅ 10+14 candidatos |
| Senador MG | MG-01611/2026 | 08-10/09 | ✅ 16 candidatos |
| Senador RJ | RJ-09217/2026 | 08-10/09 | ✅ 15 candidatos |
| Senador PE | PE-04411/2026 | 08-10/09 | ✅ 12 candidatos |
| Governador + Senador CE | CE-01290/2026 | 14-17/09 | ✅ 8+8 candidatos |
| Presidencial (7 cenários) | BR-01833/2026 | 08-10/09 | ✅ 1º/2º turno completos |

**Pendência residual**: protocolo BR-03904/2026 (n=1.610, Presidencial 09-11) não foi
resolvido — não bate com nenhum cenário confirmado nas fontes primárias verificadas
(todos os cenários da pesquisa de 08-10/09 usam n=2.002). Não especulado de propósito.

---

## ⭐⭐ QUAEST + REAL TIME — próxima rodada

Fila atual (`npx tsx scripts/pending-polls.ts --days 20`) tem **142 pendências de
Senador** prontas pra buscar, majoritariamente:
- Instituto Verita (⚠️ qualidade contestada pela Justiça Eleitoral — avaliar antes de curar)
- Real Time Big Data (SP, MG, AC — n=1.600/2.000, sem ressalva)
- Índice Inteligência (PB, AL)

Rodar `npx tsx scripts/curator-helper-full.ts` pra checklist HTML atualizado com todas.

---

## 🔄 FLUXO (validado nesta rodada)

1. **Buscar dados** — WebSearch/WebFetch nas matérias de imprensa. Institutos são SPAs
   React — scraping direto não funciona (ver histórico de tentativas removido do repo:
   JSON-LD, regex, tabelas HTML, heurísticas, RSS, Wayback Machine, APIs não documentadas,
   jsdom — todas malsucedidas sem Playwright/Puppeteer real).
2. **Cuidado com pesquisas fragmentadas por protocolo**: uma mesma coleta de campo pode
   gerar VÁRIOS protocolos TSE (um por cenário/pergunta — ex. 1º turno com/sem
   candidato X, cada simulação de 2º turno). Nem sempre dá pra saber com certeza qual
   protocolo bate com qual cenário nas fontes públicas — quando incerto, não especular.
3. **Conferir nomes exatos** dos candidatos cadastrados no banco antes de preencher —
   nome de urna frequentemente diverge do nome jornalístico (acentos, nome completo vs.
   abreviado, ex.: "Renan" no 1º turno vs. "Renan Santos" no 2º turno da mesma eleição
   presidencial — são `elections` diferentes com candidatos cadastrados separadamente).
4. **Preencher template** em `scripts/ingest-manual.ts` e rodar
   `npx tsx scripts/ingest-manual.ts`.
5. **Candidatos não resolvidos** no output: BRANCO/NULO e NÃO SABE nunca resolvem (não
   são candidatos) — esperado. Qualquer outro nome não resolvido precisa de correção
   manual (ajustar o nome e rodar de novo, ou inserir o `poll_results` direto pro poll
   já criado, já que o dedup pula o poll inteiro na segunda tentativa).
