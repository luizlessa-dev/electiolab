# Beehiiv Setup — Newsletter "Sinal Eleitoral"

Guia para configurar a newsletter via Beehiiv integrada ao ElectioLab.

## Por que Beehiiv?

| | Beehiiv | Substack | Resend custom |
|--|---------|----------|---------------|
| Free tier | 2.500 subs grátis | Ilimitado (10% taxa se cobrar) | $0-20/mês |
| Customização | Alta | Baixa | Total |
| Domínio próprio | ✅ Plano pago | ❌ substack.com | ✅ |
| Analytics | Excelente | Bom | DIY |
| Monetização | Built-in (paid newsletter, ads) | Built-in | DIY |
| Branding | Light "powered by" | "Substack" forte | Zero |

## 1. Criar publication no Beehiiv

1. https://app.beehiiv.com/signup — criar conta com `contato@electiolab.com`
2. **Create publication**:
   - Name: `Sinal Eleitoral`
   - URL slug: `sinal-eleitoral`
   - Description: "A análise semanal sobre as pesquisas eleitorais do Brasil. Por ElectioLab."
   - Category: News & Politics
   - Frequency: Weekly
3. Configurar:
   - **Settings → Branding** — logo, cores (primary `#3b82f6`, accent `#22c55e`)
   - **Settings → Customization** — header, footer com link para electiolab.com
   - **Settings → Custom domain** (depois de upgrade): `newsletter.electiolab.com` ou `sinal.electiolab.com`

## 2. Pegar API key

1. Beehiiv → **Settings → Integrations → API**
2. Generate API key
3. Adicionar no `.env.local` e Vercel:

```bash
BEEHIIV_API_KEY=...
BEEHIIV_PUBLICATION_ID=pub_...
```

## 3. Embed signup form no ElectioLab

Já criamos um componente que envia para a API do Beehiiv:

```tsx
// src/components/newsletter/signup-form.tsx
import { NewsletterSignup } from "@/components/newsletter/signup-form";

<NewsletterSignup variant="inline" />  // landing page
<NewsletterSignup variant="card" />     // dashboard
<NewsletterSignup variant="footer" />   // rodapé
```

A submissão chama `/api/newsletter/subscribe` que:
1. Valida email
2. Cria subscriber no Beehiiv via API
3. Salva referência local em `newsletter_subscribers` (Supabase) para segmentação futura

## 4. Tipos de email — automações

### a) Welcome email (automático)

Configurar no Beehiiv: **Automations → Welcome email**

Conteúdo sugerido:
> "Bem-vindo ao Sinal Eleitoral. Toda segunda você recebe a média ponderada da semana, ranking de institutos e insights cruzados. Por enquanto, dê uma olhada no [terminal completo](https://electiolab.com)."

### b) Digest semanal (manual ou via API)

Toda segunda-feira de manhã, gerar um snapshot dos dados e publicar:

**Opção 1 — Manual:** copy-paste do dashboard pro editor Beehiiv

**Opção 2 — Automatizado:** via API, ver `/scripts/generate-weekly-digest.ts` que:
1. Busca dados via Supabase
2. Renderiza markdown via React Email
3. Cria draft no Beehiiv via API
4. Te avisa por email pra revisar e publicar

## 5. Estrutura do email semanal

```
🇧🇷 Sinal Eleitoral — Semana #X
[data]

→ MÉDIA PONDERADA — PRESIDENTE 2026
   Lula 39.0% (↑0.4) | Flávio 35.6% (↓0.2) | Caiado 4.5% | Zema 3.2%

→ DESTAQUE DA SEMANA
   [análise editorial gerada — pode ser manual no início]

→ NOVAS PESQUISAS (3)
   • Datafolha PE — João Campos (PSB) 50% × Raquel Lyra (PSD) 38%
   • AtlasIntel SC — Jorginho Mello (PL) 49.4%
   • Quaest AM — Omar Aziz (PSD) 33%

→ MOVIMENTOS NO MAPA
   [mudanças de tendência por UF]

→ RANKING DE INSTITUTOS
   Top 3 mais precisos: Datafolha (A+), AtlasIntel (A), Quaest (A-)

→ ANÚNCIOS DIGITAIS (Meta Ads)
   Lula gastou R$X | Flávio R$Y na última semana

[Ver dashboard completo →]
[Compartilhar no WhatsApp →]

—
ElectioLab · electiolab.com
Você se inscreveu em [data]. [Cancelar]
```

## 6. Segmentação

Criar tags no Beehiiv:
- `interest:presidencial`
- `interest:governador-{UF}`
- `interest:senador-{UF}`
- `tier:free` / `tier:pro` (sincronizado com Stripe via webhook)

Cada tag permite segmentar campanhas específicas.

## 7. Monetização (futuro)

- **Free tier**: digest semanal padrão
- **Premium tier (R$ 19/mês)**:
  - Newsletter daily
  - Análises exclusivas
  - Acesso prioritário a relatórios
- **Sponsors**: oferecer espaço de patrocínio para consultorias políticas, escritórios de advocacia, casas de análise

## 8. Custos

| Plano | Subs | Custo |
|-------|------|-------|
| Launch (free) | até 2.500 | R$ 0 |
| Grow ($39/mês) | até 10.000 | ~R$ 195 |
| Scale ($79/mês) | até 100k | ~R$ 395 |

Recomendação: começar no Launch, migrar quando atingir 2k subs.

## 9. Variáveis de ambiente — checklist

```bash
BEEHIIV_API_KEY=...
BEEHIIV_PUBLICATION_ID=pub_...
NEWSLETTER_FROM_EMAIL="Sinal Eleitoral <sinal@electiolab.com>"
```

## 10. Próximos passos depois deste setup

1. Configurar Sender domain (DKIM/SPF) no Beehiiv → autenticação de email
2. Criar primeiro post manual (data piece + link pro dashboard)
3. Promover assinatura via:
   - Banner discreto no topo do dashboard
   - CTA no footer da landing
   - Pop-up exit-intent (Beehiiv tem nativo)
4. Newsletter Promotion Boost — Beehiiv tem programa de cross-promotion
