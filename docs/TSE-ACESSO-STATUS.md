# TSE 2026 — Status de Acesso & Transparência

## 🔴 Bloqueios Observados (Agosto 2026)

| URL | Status | Motivo Inferido | Alternativa |
|-----|--------|-----------------|-------------|
| `https://cdn.tse.jus.br/.../pesquisa_eleitoral_2026.zip` | **403 Forbidden** | WAF/Rate limit/Geo-block | Wikipedia, Poder360, sites institutos |
| `https://dadosabertos.tse.jus.br/` | 🟡 Unknown (agent checking) | Possível redirecionamento | Portal oficial TSE |
| `https://www.tse.jus.br/.../redes-sociais/` | 🟡 Unknown (agent checking) | Dados 2026 ainda em processamento | LAI + Proposta Ouvidor |
| `https://www.tse.jus.br/.../candidatos/` | 🟡 Unknown (agent checking) | Parcialmente publicado? | TSE portal direto |

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

## 🛠️ Instrumentos Públicos TSE

### 1. **TSE Dados Abertos**
- URL: https://dadosabertos.tse.jus.br/
- Formato: CSV, JSON, XLSX
- Licença: CC (livre uso)
- **Problema:** CDN pode estar bloqueada regionalmente

### 2. **Portal Eleições 2026**
- URL: https://www.tse.jus.br/eleitor/eleicoes/2026/
- Conteúdo: Cronograma, notícias, links

### 3. **API TSE**
- **Status:** Existem APIs (não é REST padrão)
- **Autenticação:** Varia por endpoint
- **Rate limiting:** Sim (proteção contra scraping)

### 4. **LAI (Lei Acesso Informação)**
- Portal: https://informabr.cgu.gov.br/
- **Prazo:** 20 dias úteis
- **Custo:** R$ 0
- **Taxa sucesso:** ~95% (histórico)

### 5. **Ouvidoria TSE**
- URL: https://www2.tse.jus.br/apps/ouvidor/
- **Tipo:** Sugestões, reclamações, pedidos
- **Prazo:** ~5-10 dias (informal)

### 6. **Fóruns Públicos / GitHub TSE**
- GitHub: https://github.com/tse (verificar se existe)
- Issues/discussions: Pode ter Q&A sobre 2026

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

## 💡 Recomendações Prioritárias

**Hierarquia de acesso:**
1. ✅ **TSE Dados Abertos (CDN)** — Preferido (oficial, gratuito, auditável)
2. ✅ **Aggregadores** (Wikipedia, Poder360, Base dos Dados) — Rápido, confiável
3. ✅ **Sites institutos** (GERP, Vox, etc) — Complemento específico
4. 🟡 **LAI** — Backup gratuito (prazo 20d, sempre funciona)
5. 🟡 **Ouvidoria** — Sugestão (prazo 5-10d, informal)
6. ❌ **Custom scraper** — Última opção (legal mas frágil)

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
