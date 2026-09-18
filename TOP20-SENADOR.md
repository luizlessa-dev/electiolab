    # 🎯 TOP 20 Senador — Curadoria Prioritária

**Meta**: Senador 6% → ~18% (3x cobertura)
**Atualizado**: 2026-09-18

---

## ⭐⭐⭐ DATAFOLHA

### ✅ DF — CONCLUÍDO
- Protocolo: DF-06055/2026 · fieldwork 2026-09-08/11
- Status: **INSERIDO NO BANCO** (15 candidatos)

### ✅ Piauí — CONCLUÍDO (bônus, fora do escopo original)
- Protocolo: PI-03643/2026 · fieldwork 2026-09-14/17
- Status: **INSERIDO NO BANCO** (Governador 10/10 + Senador 14/14 candidatos)

### ✅ Presidencial 09-11 — CONCLUÍDO (fora do escopo Senador, mas resolvido no caminho)
- Protocolo: BR-01833/2026 · fieldwork 2026-09-08/10
- Status: **7 cenários inseridos** (1º turno com/sem Marçal + 5 simulações de 2º turno)

### 🔍 MG — PENDENTE (real, confirmado no banco)
- Protocolo: MG-01611/2026 · fieldwork 2026-09-08/11
- **Governador já está inserido** com esse protocolo — falta só a parte de Senador da mesma pesquisa
- Template pronto em `DATAFOLHA-MG-RJ-PE-TEMPLATES.ts`

### 🔍 RJ — PENDENTE (real, confirmado no banco)
- Protocolo: RJ-09217/2026 · fieldwork 2026-09-08/11
- Mesma situação: Governador inserido, falta Senado
- Template pronto em `DATAFOLHA-MG-RJ-PE-TEMPLATES.ts`

### 🔍 PE — PENDENTE (real, confirmado no banco)
- Protocolo: PE-04411/2026 · fieldwork 2026-09-08/11
- Mesma situação: Governador inserido, falta Senado
- Template pronto em `DATAFOLHA-MG-RJ-PE-TEMPLATES.ts`

### 🔍 Ceará — PENDENTE (divulgado 2026-09-18, ainda não indexado nas buscas)
- Protocolo: CE-01290/2026 · fieldwork 2026-09-14/17 · Governador + Senador
- Divulgação: 16h30 (Gov) / 18h (Senado) de 18/09 pelo O Povo
- Aguardando link da matéria ou dados enviados manualmente

---

## ⭐⭐ QUAEST + REAL TIME

Não verificado nesta rodada — rodar `npx tsx scripts/pending-polls.ts --days 20` pra
lista atualizada, ou `npx tsx scripts/curator-helper-full.ts` pro checklist completo.

---

## 🔄 FLUXO

1. **Buscar dados** — WebSearch/WebFetch nas matérias de imprensa (institutos são SPAs, scraping direto não funciona — ver histórico de tentativas nos commits removidos)
2. **Conferir nomes exatos** dos candidatos cadastrados no banco antes de preencher
   (nome de urna pode divergir do nome jornalístico — ex: "Renan" vs "Renan Santos" conforme a eleição)
3. **Preencher template** em `scripts/ingest-manual.ts`
4. **Rodar**: `npx tsx scripts/ingest-manual.ts`
5. **Validar candidatos não resolvidos** no output — BRANCO/NULO e NÃO SABE nunca resolvem (não são candidatos), mas qualquer outro nome não resolvido precisa de correção manual (poll_results direto ou correção do nome)
