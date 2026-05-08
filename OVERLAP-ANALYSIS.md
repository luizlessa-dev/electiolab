# Análise de sobreposição — ElectioLab × Transparência Federal / Observatório Judiciário

**Data:** 28 de abril de 2026
**Autor:** Luiz Lessa (com assistência Claude)
**Status:** rascunho v1 — discussão aberta

---

## 1. Contexto das duas plataformas

| Plataforma | Domínio | Foco | Stack | Volume |
|---|---|---|---|---|
| **ElectioLab** | electiolab.com | Agregador de pesquisas eleitorais (presidente, governador, senador 2026) | Next.js 16 + Supabase + Stripe + Resend + Beehiiv | ~70 polls, 295 candidatos, 27 UFs governador, 27 UFs senador, 2 turnos presidente |
| **Observatório Judiciário** (Transparência Federal) | judiciario.transparenciafederal.org | Decisões judiciais, jurisprudência, monitoramento STF/STJ/TRFs | Next.js + Supabase | 210k+ decisões de 37 tribunais |

Os dois projetos pertencem ao mesmo solo founder (Luiz Lessa) e compartilham filosofia editorial (transparência, dados primários, ferramentas para jornalistas e cidadania).

---

## 2. Mapa de sobreposição

### Eixo A — Pessoas Públicas (ALTA sobreposição)

| Domínio | ElectioLab tem | Observatório Judiciário tem |
|---|---|---|
| Magistrados/juízes | — | Decisões assinadas por nome |
| Políticos eleitos | 295 candidatos com bio + TSE + foto + patrimônio | Aparições como parte (autor/réu) em processos |
| Casos famosos cruzando os dois | Sergio Moro (candidato + ex-juiz), Deltan Dallagnol, Wilson Witzel, Garotinho, Aécio Neves | Mesmas pessoas em decisões |

**Decisão recomendada:** **CONSUMIR VIA API**, não unificar.

- Não faz sentido fundir as bases — escopos diferentes.
- Mas o **ElectioLab pode chamar a API do Observatório** pra cada candidato em `/candidato/{slug}` e mostrar uma seção "Decisões judiciais" com link out pra cada decisão real.
- Hoje o ElectioLab tem 10 menções judiciais extraídas via regex de bios Wikipedia (texto livre). Trocar isso por queries reais ao Observatório é upgrade gigante.

**Ação concreta:** expor endpoint `/api/v1/decisions?cpf=...&nome=...` no Observatório, consumir do ElectioLab.

---

### Eixo B — Schema judicial (BAIXA sobreposição, mas convergente)

| Domínio | ElectioLab | Observatório |
|---|---|---|
| Tabela | `judicial_proceedings` (10 rows, stub) | `decisions` (210k rows reais) |
| Origem | Regex sobre bios | Crawler dos sites dos tribunais |
| Granularidade | "menção" textual | "decisão" jurídica completa |

**Decisão recomendada:** **DEPRECAR a tabela `judicial_proceedings` no ElectioLab** após Eixo A estar funcionando.

- Hoje só causa confusão (10 menções ≠ 210k decisões).
- Mover tudo pra "fonte única da verdade" no Observatório.
- ElectioLab fica com cache de short-list por candidato pra performance, atualizado por cron.

---

### Eixo C — Stack técnica (ALTA sobreposição)

| Componente | ElectioLab usa | Observatório usa |
|---|---|---|
| Frontend | Next.js 16 App Router | Next.js (provavelmente) |
| DB | Supabase | Supabase |
| Auth | Supabase Auth + Resend (magic link) | Supabase Auth (provável) |
| Pagamentos | Stripe (Pro/Business) | ? |
| Newsletter | Beehiiv + Resend (double opt-in) | ? |
| Error monitoring | Sentry + Vercel Analytics | ? |
| Cron infra | pg_cron + pg_net + Vault | ? |

**Decisão recomendada:** **EXTRAIR LIB COMUM** após estabilizar o ElectioLab.

Pacote interno `@luizlessa/civic-tools` com:
- Componentes UI (header, footer, theme-toggle, command-palette, OG image template)
- Utilitários Supabase (RLS helpers, cron wrappers, vault accessors)
- Auth flow (magic link + password)
- Stripe billing helpers (checkout, webhook handler, key generation)
- Resend templates de email
- Newsletter signup + double opt-in

Estimativa: 2-3 dias de extração + ajuste, depois economia de meses.

---

### Eixo D — Pipeline GovBR (MÉDIA sobreposição)

Skills GovBR existentes do user (segundo memory):
- `govbr-diario-oficial` — alto impacto
- `govbr-agencies` — médio impacto
- `govbr-interop` — baixo impacto

| Plataforma | Como usaria |
|---|---|
| **ElectioLab** | Diário Oficial → detectar nomeações, exonerações, registros TSE de candidatos |
| **Observatório** | Diário Oficial → publicações de acórdãos, sentenças, súmulas |

**Decisão recomendada:** **SKILL COMPARTILHADA**.

Uma única skill `govbr-diario-oficial` consumida pelos dois projetos via:
1. Filtros configuráveis (`partido in [...]` pra ElectioLab, `tribunal in [...]` pra Observatório)
2. Webhooks pra cada projeto receber só o que importa
3. Cache compartilhado pra evitar re-download

---

### Eixo E — Newsletter & distribuição (MÉDIA sobreposição)

| Plataforma | Newsletter | Volume potencial |
|---|---|---|
| ElectioLab | Sinal Eleitoral (semanal) | Foco político-pesquisa |
| Observatório | (a definir) | Foco jurídico-jurisprudencial |

**Decisão recomendada:** **MESMA INFRA, MARCAS SEPARADAS**.

- Beehiiv permite múltiplas publications na mesma conta. Compartilhar conta = economia de assinatura ($39/mo cobre as duas).
- Templates de email comuns extraídos pra `civic-tools`.
- Cross-promotion: rodapé da Sinal Eleitoral menciona "Para acompanhar STF/STJ, assine [Newsletter Judiciária]".

---

### Eixo F — API pública (ALTA convergência)

Hoje:
- ElectioLab acabou de implementar `/api/v1/*` autenticada com Bearer + rate limit + tier (anonymous/pro/business).
- Observatório provavelmente tem endpoints próprios.

**Decisão recomendada:** **PADRÃO ÚNICO** de auth + tier + rate limit + headers.

Implementação compartilhada:
```ts
import { authenticate, applyRateLimitHeaders } from "@luizlessa/civic-tools/api-auth";
```

Próximo passo: descrever spec OpenAPI única que cobre os dois domínios, com endpoints prefixados (`/elections/*` no ElectioLab, `/decisions/*` no Observatório).

---

## 3. Resumo das decisões

| Eixo | Decisão | Prazo |
|---|---|---|
| A — Pessoas públicas | Consumir via API: ElectioLab → Observatório | 60 dias |
| B — Schema judicial | Deprecar `judicial_proceedings`; mover pra Observatório | Após Eixo A |
| C — Stack técnica | Extrair `civic-tools` lib comum | 90 dias |
| D — GovBR pipeline | Compartilhar skill `govbr-diario-oficial` | 30 dias |
| E — Newsletter | Beehiiv conta compartilhada, marcas separadas | 30 dias |
| F — API pública | Padronizar auth/rate limit/tier | 60 dias |

---

## 4. Riscos

1. **Vendor lock-in cruzado** — se um projeto morrer, o outro herda dependência. Mitigação: APIs com versionamento (deprecation 6 meses).
2. **Complexidade de deploy** — múltiplos projetos × múltiplos ambientes. Mitigação: monorepo com Turborepo OU repos separados com CI compartilhado.
3. **Disputa de prioridade** — ElectioLab pico 2026, Observatório uso constante. Mitigação: timeboxes claros, sem "vou fazer pros dois ao mesmo tempo".
4. **Confusão de marca** — usuário pensa que é o mesmo produto. Mitigação: branding distinto, mas `Powered by Transparência Federal` rodapé comum.

---

## 5. Próximas ações concretas (priorizadas)

1. **[ElectioLab]** Endpoint público `/api/v1/decisions/by-candidate/{slug}` que consulta Observatório e retorna decisões — **bloqueado por Observatório expor API por nome/CPF**.
2. **[Observatório]** Expor `/api/v1/decisions?nome=...&cpf=...` com auth Bearer.
3. **[Compartilhado]** Criar repo `civic-tools` privado, inicial com `api-auth.ts` + `email-templates/`.
4. **[Skill]** Generalizar `govbr-diario-oficial` pra suportar configuração via YAML por projeto.
5. **[Newsletter]** Beehiiv: criar segunda publication "Boletim Judiciário" sob mesma conta.

---

## 6. Aberto pra discussão

- Vale criar uma marca-mãe ("Transparência Federal") como guarda-chuva visual que une ElectioLab + Observatório? Ou mantemos como projetos independentes?
- Cobrar pela API premium do Observatório do mesmo CPF que paga o ElectioLab Pro? Bundle compartilhado?
- Faz sentido contratar 1 designer pra padronizar visual (cores, tipografia, OG templates) entre os dois?

— fim —
