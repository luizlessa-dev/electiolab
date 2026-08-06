# Instituto Integration Map — 65 Institutos Brasileiros

## Status: Mapeamento de APIs e Fontes

### Tier 1: APIs Públicas (Top 10)
Institutos com APIs ou endpoints públicos documentados.

| Instituto | Score | API Type | Endpoint | Auth | Status |
|-----------|-------|----------|----------|------|--------|
| Datafolha | 9.2 | Web Scrape | `datafolha.folha.uol.com.br` | None | ✅ Ready |
| Ipec | 8.8 | Web Scrape | `ictouch.com.br/pesquisa` | None | 📋 TODO |
| Quaest | 8.5 | Web Scrape | `quaest.com.br/pesquisas` | None | 📋 TODO |
| Genial/Quaest | 8.4 | Web Scrape | `genial.com.br` | None | 📋 TODO |
| PoderData | 8.0 | Web Scrape | `poderdata.com.br` | None | 📋 TODO |
| Atlas Intel | 7.8 | Web Scrape | `atlasintel.com.br` | None | 📋 TODO |
| Ipespe | 7.7 | Web Scrape | `ipespe.com.br` | None | 📋 TODO |
| MDA/CNT | 7.5 | Web Scrape | `mda.com.br` | None | 📋 TODO |
| FSB Pesquisa | 7.4 | Web Scrape | `fsb.com.br` | None | 📋 TODO |
| Real Time Big Data | 7.2 | Web Scrape | `realtimebigdata.com` | None | 📋 TODO |

### Tier 2: Institutos Médios (11-35)
Score: 0.70 (7.0/10) — Fontes secundárias, web scraping

- Ipsus/Ipec
- Paraná Pesquisas
- TML Pesquisa
- Futura/Apex
- Fiems/Instituto Opinião
- Opinar Pesquisa
- TDL Pesquisa
- Qualitá Consultoria
- IPA Research
- Vox Brasil Pesquisas
- Nexus Inteligência
- Neokemp Pesquisa
- Action Pesquisa
- Affare Consultoria
- Agorasei Pesquisas
- Ampla Pesquisa
- Brasmarket Research
- Comunidados Pesquisas
- Data Census
- Data Ranking
- DataTrends
- Delta Pesquisas
- Doxa Research
- Eficaz Consultoria
- Exatus Pesquisa

### Tier 3: Institutos Menores (36-65)
Score: 0.60-0.68 — Dados agregados, menos frequentes

- Futura Inteligência
- Instituto Veritá
- Meio/Ideia
- Vox Brasil
- Vetor/Arrow
- Instituto Índice Inteligência
- Gerp Consultoria
- Séculus Pesquisa
- (+ 26 others)

---

## Estratégia de Integração

### Phase 1: Arquitetura Base (2h)
```typescript
// Abstract base class para todos os institutos
abstract class InstituteClient {
  abstract fetch(): Promise<Poll[]>
  abstract parse(): Promise<Poll[]>
  normalizeData(): Poll[]
}
```

### Phase 2: Top 10 (2h)
Implementar clientes para Datafolha, Ipec, Quaest, etc.

### Phase 3: Bulk Integration (2h)
Scraper genérico para institutos Tier 2 e 3

---

## Fonte de Dados Prioritárias

1. **APIs Oficiais** → Quando disponível (0% hoje)
2. **Web Scraping** → Google Trends, Wayback Machine, news archives
3. **TSE Official** → Resultados verificados
4. **Agregadores** → Real Time Big Data, Politica em Dados

---

## Próximos Passos

- [ ] Implementar `InstituteClient` base abstrata
- [ ] Criar adapters para Datafolha, Ipec, Quaest
- [ ] Testar scraping com Puppeteer/Cheerio
- [ ] Setup CI/CD para monitorar mudanças nas fontes
- [ ] API genérica: `POST /api/institutes/sync-all`

