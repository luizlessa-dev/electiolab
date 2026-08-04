# 🇧🇷 Plano de Integração com APIs Oficiais do TSE

## Status: 403 Bloqueio WAF

A API `divulgacandcontas.tse.jus.br` está bloqueando acesso (403 Forbidden).

### Opções Disponíveis:

#### **Opção 1: CEPESPData (FGV) — RECOMENDADO** ✅
- **URL:** `https://api.cepesp.io/`
- **Dados:** Histórico 1998-2022 (completo e documentado)
- **Taxa:** Sem rate limit documentado
- **CORS:** Suportado (requisições diretas do browser)
- **Status:** Testável agora
- **Impacto:** Enriquecer candidatos com dados históricos

**Exemplo:**
```bash
curl "https://api.cepesp.io/candidate?year=2022&state=SP&position=president"
```

#### **Opção 2: TSE Portal Dados Abertos** ⏳
- **URL:** `https://dadosabertos.tse.jus.br/api/3/action/`
- **Formato:** CKAN (datastore_search)
- **Dados:** Candidatos 2024+, datasets abertos
- **Status:** Acesso público documentado
- **CORS:** Pode ter restrições

#### **Opção 3: TSE Resultados (2026)** 🚀
- **URL:** `https://resultados.tse.jus.br/`
- **Dados:** Apuração em tempo real (JSON)
- **Ativação:** Eleição 2026 (27 de setembro)
- **Status:** Specs técnicas disponíveis, testes em set/2026

---

## 📋 Roadmap Ajustado

### **Quick Win #6.1 — CEPESPData Integration** (2-3 horas)
Integrar dados históricos de candidatos (2018, 2022)

```typescript
// apps/pipeline/lib/tse/cepesp-client.ts
- buscarCandidatos(ano, estado, cargo)
- buscarResultados(ano, estado, cargo)
- enrichCandidateProfile(slug) — Add historical data
```

**Impacto:**
- `/candidato/[slug]` mostra histórico eleitoral
- Links para CEPESPData oficial
- SEO + conteúdo enriquecido

### **Quick Win #6.2 — TSE Resultados Live (2026)** (Post-eleição)
Apuração em tempo real no dia 27 de setembro 2026

```typescript
// apps/pipeline/api/tse/resultados-live.ts
- Stream JSON do TSE
- Auto-update de polls
- Dashboard de apuração
```

### **Quick Win #6.3 — DivulgaCandContas (Via Proxy)** (4-5 horas)
Contornar WAF com proxy backend + caching

```typescript
// apps/pipeline/api/tse/proxy-divulgacandcontas.ts
- Proxy para DivulgaCandContas via IP Brasil
- Cache agressivo (24h)
- Fallback para CEPESPData
```

---

## ✅ Próximas Ações

1. **Testar CEPESPData** — Validar que API funciona
2. **Implementar CEPESPClient** — Client TypeScript
3. **Enriquecer candidato profile** — Add dados históricos
4. **Commit** — Quick Win #6.1 pronto

---

## 📚 Referências

- CEPESPData: https://github.com/Cepesp-Fgv/cepesp-rest
- TSE Dados Abertos: https://dadosabertos.tse.jus.br/
- TSE Resultados 2026: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados
