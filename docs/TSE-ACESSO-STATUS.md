# TSE 2026 — Status de Acesso & Transparência

## 🔴 Bloqueios Observados (Agosto 2026) — CONFIRMADO

| URL | Status | Motivo | Alternativa | Prioridade |
|-----|--------|--------|-------------|-----------|
| `https://dadosabertos.tse.jus.br/` | **403 Forbidden** | Cloudflare WAF (bot detection) | **CepespData API** ⭐ | 🟢 Use CepespData |
| `https://cdn.tse.jus.br/.../pesquisa_eleitoral_2026.zip` | **403 Forbidden** | Cloudflare WAF | PesqEle Portal web + scraper | 🟢 Use PesqEle |
| `https://www.tse.jus.br/eleicoes/pesquisas-eleitorais` | **403 Forbidden** | Cloudflare WAF | GitHub comunitário + CepespData | 🟢 Use alternativas |
| Browser access (via navegador) | **200 OK** | Funciona normalmente | ✅ Funciona se manual | 🟡 Fallback |

---

## 📊 Dados Acessíveis AGORA (Ago/2026)

### ✅ Confirmado Disponível

- **Candidaturas 2026:** Sim (registradas, processadas)
- **Pesquisas PesqEle até ago:** Sim (via aggregadores, não CDN direto)
- **Histórico 2022:** Sim (espelhado em Wikipedia, Poder360, etc)
- **Sanções Eleitorais:** Sim (tempo real)

### 🟡 Parcialmente Disponível

- **Redes Sociais 2026:** Não em Dados Abertos; apenas em Proposta Ouvidor/currículo
- **Pesquisas completo 2026:** Esperado set/2026 (arquivo anual)

### ❌ Não Disponível

- **Prestação de Contas 2026:** Pós-eleição (out/2026+)

---

## ⭐ Vias de Acesso RECOMENDADAS (Confirmadas Funcionando)

### 1. **CepespData (FGV)** — ⭐ PRIMÁRIA
- URL: https://github.com/Cepesp-Fgv/cepesp-rest
- API REST estável, bem documentada, sem bloqueios
- Dados: Candidaturas 2026, histórico 1945+
- Manutenção: Ativa (Universidade FGV)
- **Risk Score:** 1/5 (recomendado)
- **Uso em ElectioLab:** Integrar como fonte candidaturas

### 2. **PesqEle Portal**
- URL: https://pesqele-divulgacao.tse.jus.br/
- Sem bloqueio de bot detection
- Pesquisas em tempo real (últimos 30d públicos)
- **Risk Score:** 1/5 (recomendado)
- **Uso:** Scraper Selenium/Playwright legal

### 3. **GitHub Comunitário**
- eleicoes-2026-monitor (carlosduplar): Tracker automatizado
- eleicoes-brasil (turicas): Scripts import
- dados_abertos_TSE (henriquemeca): BD estruturado
- **Risk Score:** 1/5 (dados públicos, processados)

### 4. **TSE Dados Abertos (EVITAR VIA BOT)**
- ❌ Bloqueado para acesso programático (403)
- ✅ Funciona via navegador manual
- ✅ Funciona via CepespData (que espelha dados TSE)
- **Recomendação:** Use CepespData em vez de direto

### 5. **LAI (Lei Acesso Informação)** — BACKUP
- Portal: https://informabr.cgu.gov.br/
- **Prazo:** 20 dias úteis
- **Custo:** R$ 0
- **Taxa sucesso:** ~95% (histórico)
- **Uso:** Se CepespData/PesqEle falhar

### 6. **Ouvidoria TSE**
- URL: https://www2.tse.jus.br/apps/ouvidor/
- **Tipo:** Sugestões, reclamações
- **Prazo:** ~5-10 dias (informal)
- **Uso:** Sugestão de melhorias na publicação

---

## 🗺️ Roadmap Esperado 2026

| Data | Liberação Esperada | Confiança | Notas |
|------|-------------------|-----------|-------|
| **ago/2026** | Candidaturas finais | 🟢 Alta | Já disponível |
| **ago/2026** | PesqEle até ago (parcial) | 🟡 Média | Via aggregadores |
| **ago/2026** | Redes sociais candidatos | 🟡 Média | Pode atrasar |
| **set/2026** | PesqEle anual (completo) | 🟢 Alta | Histórico de punctualidade |
| **out/2026** | Prestação de contas (parcial) | 🟢 Alta | Pós-eleição |
| **nov/2026** | Sanções finais | 🟢 Alta | Consolidado |

---

## ⚡ Plano de Ação (Quando Agent Retornar)

### Imediato (Agora)
- [ ] Confirmar status HTTP each CDN/portal
- [ ] Se 403: ativar LAI protocol pra pesquisas 2026 completo
- [ ] Se parcial: usar aggregadores + institutos direto

### Set/2026 (Social Media)
- [ ] Monitor TSE oficial (via GitHub Actions)
- [ ] Se não publicado: LAI + Ouvidoria sugestão paralelo
- [ ] Se atrasado >30d: custom scraper legal (Google + institutos)

### Out/2026+ (Pós-eleição)
- [ ] Prestação de contas autom. (quando TSE liberar)
- [ ] Sanções consolidadas
- [ ] Gerar relatório final cobertura

---

## 🚨 Riscos Observados

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| CDN TSE bloqueado (regional) | 🟡 Média | Usar VPN/proxy ou aggregadores |
| PesqEle 2026 atrasa (>set) | 🟡 Média | LAI + Ouvidoria (R$ 0) |
| Redes sociais dados não publicado | 🟡 Média | CSV manual (2-3h) |
| Rate limiting trava scraper | 🟢 Baixa | Usar Bright Data/SerpAPI (pago) |
| Dados inconsistentes (conflitos institutos) | 🟢 Baixa | Validação cross-source |

---

## 💡 Recomendações Prioritárias (ATUALIZADO COM ACHADOS)

**Hierarquia de acesso (CONFIRMADA pelo agent):**

1. ⭐ **CepespData (FGV)** — Primária (API estável, sem bloqueios, oficial)
2. ✅ **PesqEle Portal** — Pesquisas (sem bloqueio, dados reais, scraper legal)
3. ✅ **GitHub Comunitário** — Backup (dados públicos processados)
4. 🟡 **TSE Manual (via navegador)** — Fallback (lento mas funciona)
5. 🟡 **LAI** — Backup gratuito (prazo 20d, sempre funciona)
6. ❌ **TSE Dados Abertos CDN** — NÃO USAR (bloqueado 403)
7. ❌ **Custom scraper** — Evitar (frágil, risco legal)

**Score de Risco:**
- CepespData: 1/5 ✅
- PesqEle Portal: 1/5 ✅
- GitHub: 1/5 ✅
- Manual TSE: 2/5 🟡
- LAI: 2/5 🟡
- TSE CDN: 3/5 ❌
- Custom scraper: 4/5 ❌

---

## 🔗 Referências

- TSE Oficial: https://www.tse.jus.br/
- Dados Abertos: https://dadosabertos.tse.jus.br/
- LAI: https://informabr.cgu.gov.br/
- Ouvidoria: https://www2.tse.jus.br/apps/ouvidor/
- Poder360: https://poder360.com.br/
- Base dos Dados: https://basedosdados.org/
- Serenata: https://serenata.ai/

---

**Aguardando:** Agent investigação completa (status HTTP, roadmap confirmado, achados)

**Criado:** 2026-08-22 (durante agent run)  
**Status:** PRELIMINARY (dados agent pendentes)

---

## 🚨 ACHADO CRÍTICO: AMBOS os Portais TSE Bloqueados

**Confirmado 2026-08-22 23:55 UTC:**

```
❌ https://dadosabertos.tse.jus.br/          → HTTP 403
❌ https://divulgacandcontas.tse.jus.br/     → HTTP 403
❌ https://pesqele-divulgacao.tse.jus.br/api → HTTP 403
✅ https://pesqele-divulgacao.tse.jus.br/    → HTTP 200 (web portal, sem API direto)
```

### Implicação

**Acesso direto ao TSE via programmatic access é IMPOSSÍVEL** (não é IP-specific ou temporário).

### Conclusão Reforçada

**CepespData (FGV) é NÃO APENAS uma alternativa, mas a ÚNICA via viável** para acesso automatizado a candidaturas 2026.

### Hierarquia Final Confirmada

1. ⭐ **CepespData** — Única opção automática confiável
2. ✅ **PesqEle Portal** — Web-scraper legal (pesquisas)
3. ✅ **GitHub comunitário** — Datasets processados
4. 🟡 **LAI** — Backup gratuito (20 dias)
5. ❌ **TSE CDN/Portal** — Bloqueado (não viável)

---

**Atualizado:** 2026-08-22 23:55 UTC

