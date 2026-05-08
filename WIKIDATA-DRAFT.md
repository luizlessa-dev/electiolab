# Wikidata — Entrada para ElectioLab

Documento de referência para criar o item Wikidata da ElectioLab. A criação efetiva é feita em https://www.wikidata.org/wiki/Special:NewItem (login com conta Wikipédia).

---

## Item principal: ElectioLab

| Propriedade | Valor | Notas |
|---|---|---|
| **Label (pt)** | ElectioLab | |
| **Label (en)** | ElectioLab | |
| **Description (pt)** | agregador brasileiro de pesquisas eleitorais | curta, sem capitalização |
| **Description (en)** | Brazilian electoral polling aggregator | |
| **Aliases (pt)** | electiolab.com; ElectioLab — Terminal de Inteligência Eleitoral | |

## Statements (claims)

| Property (P) | Valor | Fonte (S854 reference URL) |
|---|---|---|
| **P31** instance of | Q35127 (website) | https://electiolab.com/sobre |
| **P31** instance of | Q23824574 (data aggregator) | |
| **P856** official website | https://electiolab.com | |
| **P17** country | Q155 (Brasil) | |
| **P407** language of work | Q750553 (português brasileiro) | |
| **P137** operator | Q-luiz-lessa (criar item separado) | |
| **P571** inception | 2026-01-01 | https://electiolab.com/sobre |
| **P1476** title | "ElectioLab — Pesquisas eleitorais Brasil 2026" | |
| **P921** main subject | Q1043527 (pesquisa eleitoral) | |
| **P921** main subject | Q15880590 (eleições gerais no Brasil em 2026) | |
| **P2700** stack | Next.js, Supabase, Vercel | (informativo, opcional) |
| **P2671** Google Knowledge Graph ID | (preencher após indexação) | |

## Item secundário (operador): Luiz Lessa

| Propriedade | Valor |
|---|---|
| Label (pt) | Luiz Lessa |
| Description (pt) | desenvolvedor brasileiro, fundador da ElectioLab |
| **P31** instance of | Q5 (ser humano) |
| **P27** country of citizenship | Q155 (Brasil) |
| **P106** occupation | Q33231 (programador) |
| **P2003** Instagram username | luizlessa (se aplicável) |
| **P6634** LinkedIn personal | luizlessa |
| **P2037** GitHub username | luizlessa |
| **P800** notable work | Q-electiolab |

## Sitelinks (depois)

- Wikipédia pt: criar página `ElectioLab` quando houver 2-3 menções em veículos consolidados (Folha, G1, Estadão, Poder360) — Wikipédia exige notabilidade comprovada por **fontes secundárias independentes**.

## Próximos passos

1. **Criar item Luiz Lessa primeiro** (operador), salvar QID.
2. **Criar item ElectioLab** referenciando o QID acima em P137.
3. Aguardar 24-72h para o Google indexar a relação.
4. Confirmar que o Knowledge Panel aparece em buscas tipo "ElectioLab" no google.com.br.
5. Preencher P2671 (Google Knowledge Graph ID) quando aparecer.

## Por que isso importa

- **AI Overviews**: Google e Perplexity usam Wikidata como fonte canônica de "what is X?". Sem entrada, ElectioLab não vira entidade reconhecida.
- **Knowledge Graph**: link Wikidata → Knowledge Panel no Google → CTR substancialmente maior em buscas de marca.
- **Citações de terceiros**: jornalistas que checam fonte na Wikipédia/Wikidata têm mais facilidade de citar como referência.

---

**Custo:** R$ 0 · **Tempo:** 30-45 min · **ROI:** entidade reconhecida por LLMs e Google Knowledge Graph.
