# Calendário de Conteúdo — Comum a todos os canais
**Período:** 17/09/2026 a 02/11/2026 (3º início — 10/09 e 13/09 não saíram do papel; hoje é pra valer)
**Arquivos por rede:** [X](./CALENDARIO-X.md) · [Instagram](./CALENDARIO-INSTAGRAM.md) · [Facebook](./CALENDARIO-FACEBOOK.md) · [LinkedIn](./CALENDARIO-LINKEDIN.md)
**Baseado em:** [PLANO-DIVULGACAO-REDES-SOCIAIS.md](./PLANO-DIVULGACAO-REDES-SOCIAIS.md)

## Antes de postar qualquer coisa

Os números do PRESS-KIT.md são de 29/04/2026. Todo trecho marcado `[ATUALIZAR: ...]` precisa do dado fresco do banco antes de ir pro ar (quantidade de pesquisas indexadas, entrevistas acumuladas, institutos ativos). É rápido de puxar do Supabase, mas não posta o número de abril como se fosse de hoje.

Convenção usada nos três calendários:
- **Fixo** = copy pronta, só revisar e postar na data.
- **Reativo** = depende de evento do dia (pesquisa nova saiu, resultado de urna). Usa um dos templates do banco daquele canal no dia certo.
- Todo link vai com UTM: `?utm_source=[x|instagram|linkedin]&utm_medium=social&utm_campaign=eleicoes2026`

## Snapshot ao vivo (puxado do Supabase em 17/09/2026, pós-correção do cron)

Usar como referência pro post de lançamento de hoje e pra qualquer `[ATUALIZAR]` que precisar de número antes da próxima atualização. Válido só pra essa data, os cenários mudam a cada pesquisa nova.

**Nota:** o cron de recálculo da média ponderada estava travado desde 12/09 (bug de `INSERT` colidindo com índice único — ver commit `55d6b31`). Corrigido hoje às 13h52; os números abaixo já são pós-fix, recalculados na hora.

- **300** candidatos com bio · **317** pesquisas presidenciais indexadas · **18** institutos cobrindo a presidencial · **713.550** entrevistas somadas (presidencial)
- **Base completa (todas as eleições):** 759 pesquisas, 25 institutos, 1.390.540 entrevistas
- **1º turno (média ponderada de hoje):** Lula 38,2% (60 pesquisas) · Flávio Bolsonaro 34,5% (60) · Augusto Cury 7,4% · Caiado 3,8% · Renan 3,4% · Zema ~1,5%
- **2º turno (cenários):** Flávio x Lula segue empate técnico (44,5% x 43,6%, 30 pesquisas). Lula abre vantagem clara contra Zema (45,9% x 38,2%), Caiado (43,7% x 38,3%) e Renan Santos (44,3% x 33,7%)
- **Última pesquisa publicada (14/09):** Nexus — Lula 42% x Flávio 37% (gap 5). Quaest, mesmo dia — Lula 37% x Flávio 29% (gap 8). Bom exemplo de "cruzamento" pra post: dois institutos, mesma semana, gaps bem diferentes.
- **Acurácia por instituto (confirmada, bate com os posts já escritos):** Datafolha 0,92 · Ipec 0,88 · Quaest 0,85 · PoderData 0,80 · Atlas Intel 0,78 · Nexus 0,70 (estimado, ainda sem histórico medido — não citar como "comprovado")

## Outreach direto (não é post público em nenhum canal)

**Sáb 26/09 — 1ª rodada, pré-1º-turno**
Enviar via e-mail/DM pra 5-10 contatos da lista do PRESS-KIT.md (Núcleo Jornalismo, Tilt UOL, Manual do Usuário são os de maior fit pra esse momento). Usar o **Template de outreach** já pronto no PRESS-KIT.md, seção "Template de e-mail de outreach", adaptando a linha de abertura para mencionar a proximidade do 1º turno.

**Semana de 05/10 — 2ª rodada, pós-1º-turno**
Reenviar aos mesmos contatos citando o erro real da média ponderada vs. resultado oficial (é a prova concreta que faltava antes do 1º turno). Adaptar o template trocando o parágrafo de diferenciais por: *"No 1º turno de domingo, nossa média ponderada errou por só [X] pontos percentuais do resultado oficial do TSE. Método completo e dataset disponíveis se for útil pra alguma pauta."*

**Template F — DM/e-mail curto de outreach**
```
Oi [nome],

Vi que você cobre [tema]. O ElectioLab agrega todas as pesquisas eleitorais brasileiras numa média ponderada por acurácia histórica do instituto, atualizada a cada 6h, de graça.

Se for útil pra alguma pauta essa semana, mando print, gráfico ou dataset do que precisar.

electiolab.com
```

## Tarefa técnica (não é post)

Testar a carga do site antes de 03/10 e 24/10 — o tráfego do dia de apuração (04/10 e 25/10) costuma ser o pico do ano.

## Checklist antes de qualquer post ir ao ar, em qualquer canal

- [ ] Todo `[ATUALIZAR]` foi substituído por número real e conferido no banco
- [ ] Link tem UTM correto pro canal
- [ ] LinkedIn: link está no primeiro comentário, não no corpo
- [ ] Nenhum post traz opinião sobre candidato, só dado e método
- [ ] Nenhum post diz "sem paywall" ou "tudo grátis" de forma absoluta — o dashboard e a média ponderada são gratuitos, mas existem planos Pro/Business/Enterprise pagos em electiolab.com/precos
- [ ] Print/gráfico de apoio pronto quando o post citar número (Instagram principalmente)
