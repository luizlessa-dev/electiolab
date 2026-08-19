# TSE 2026 — Status de Acesso & Transparência

## ✅ Resolvido: Candidaturas 2026 já ingeridas via pipeline existente

**Não é necessário CepespData, LAI, ou scraping alternativo.** ElectioLab já tem um
pipeline funcional que baixa direto do TSE:

- Script: [scripts/ingest-tse-candidaturas.ts](../scripts/ingest-tse-candidaturas.ts)
- Cron: [.github/workflows/ingest-tse-candidaturas.yml](../.github/workflows/ingest-tse-candidaturas.yml)
  (diário, 11:30 UTC)
- Fonte: `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip`
- Estado (19/ago/2026): **16.735 candidatos 2026** no banco (`candidates` onde
  `tse_last_situation_year = 2026`), últimas 5 execuções do cron com sucesso.

### O que causou confusão nesta investigação

Testes manuais via `curl`/`fetch` direto do terminal local retornaram **403
Forbidden (Akamai)** repetidamente em `cdn.tse.jus.br`, `dadosabertos.tse.jus.br`,
`cepesp.io` e `api.basedosdados.org`. Isso levou a concluir (erroneamente) que o
acesso programático ao TSE estava bloqueado por completo.

**Não estava.** Dois fatos desfazem essa conclusão:

1. O cron do GitHub Actions (`ingest-tse-candidaturas.yml`) roda esse mesmo
   `fetch()` contra a mesma URL **todo dia com sucesso** — a pipeline nunca
   parou de funcionar.
2. Testando manualmente via navegador real (Chrome do usuário, não headless
   sandboxed), o download de `consulta_cand_2026.zip` funcionou na primeira
   tentativa (3MB, 20.608 candidatos).

O 403 nos testes locais foi provavelmente um bloqueio transitório de reputação
de IP (Akamai Client Reputation), disparado pelo volume de requisições
repetidas em pouco tempo durante a própria investigação — não uma política
permanente contra a rede/ASN do usuário (IP residencial confirmado, BH/Claro)
nem contra automação em geral (o cron do GH Actions prova isso).

**Lição:** antes de investigar "TSE bloqueou X", checar primeiro se já existe
um script/cron no repo fazendo isso — `find . -iname "*candidat*"` ou
`grep -r "cdn.tse.jus.br"` levam direto ao pipeline existente.

---

## Pesquisas Eleitorais — também resolvido

124 pesquisas em produção (Tier 1-2, ~50%+ cobertura). Ver
`scripts/import-pesqele-batch.ts` e `scripts/import-tier2-institutos.ts`.

---

## Pendências reais (não relacionadas a bloqueio de acesso)

| Item | Status | Quando |
|------|--------|--------|
| Redes sociais 2026 | Não publicado pelo TSE ainda | Monitor diário via `.github/workflows/monitor-tse-daily.yml` |
| Prestação de contas parcial | Não publicado | Esperado a partir de 15/set/2026 |
| Prestação de contas final | Não publicado | Esperado nov/2026 |
| Bens de candidatos (`bem_candidato_2026.zip`) | Endpoint incluído no script mas não confirmado ativo | Verificar próxima execução do cron |

Quando esses datasets forem publicados pelo TSE, criar ingestor seguindo o
mesmo padrão de `ingest-tse-candidaturas.ts` (fetch direto + cache local +
upsert por `tse_id`/chave natural) — não é necessário CepespData/LAI/scraper
a menos que uma tentativa real de fetch direto falhe de forma persistente
(múltiplos dias seguidos de cron falhando, não um teste manual isolado).

---

**Atualizado:** 2026-08-19 (correção pós-investigação — versão anterior deste
arquivo concluiu, incorretamente, que TSE estava bloqueado; ver histórico git
para o conteúdo anterior)
