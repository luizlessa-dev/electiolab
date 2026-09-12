# Plano de Divulgação — Redes Sociais ElectioLab

**Início:** 13/09/2026 (domingo — ajustado em 12/09; início original era 10/09) · **1º turno:** 04/10/2026 (domingo) · **2º turno:** 25/10/2026 (domingo)
**Objetivo:** tráfego + autoridade no site durante o pico de interesse eleitoral (não é lançamento de produto — ElectioLab já está no ar desde abril/2026)
**Canais:** X (Twitter), Instagram, Facebook (espelha o Instagram), LinkedIn
**Capacidade:** fundador solo (Luiz Lessa)
**Meta:** maximizar sessões em electiolab.com e reconhecimento de marca até o fim do 2º turno; assinantes da newsletter e conversão Pro são efeito colateral bem-vindo, não o KPI principal desta campanha.

---

## Por que agora

Faltam ~3,5 semanas para o 1º turno. É a janela de maior volume de busca e conversa sobre pesquisas eleitorais do ano — e onde a manchete fragmentada ("Datafolha 36%, Quaest 30%") mais gera confusão, que é exatamente o problema que o ElectioLab resolve. O PRESS-KIT.md já tem pitch, estatísticas e ângulos prontos — este plano converte isso em cadência de posts.

## Pilares de conteúdo (reaproveitar do PRESS-KIT.md)

1. **Média ponderada / relatório semanal** — toda vez que sai pesquisa nova, contextualizar com a média ponderada por acurácia do instituto.
2. **Metodologia e transparência** — por que Datafolha pesa mais que Paraná Pesquisas (92% vs 70% de acurácia histórica vs. TSE).
3. **Segundo turno** — simulações de cenários (Lula × Flávio Bolsonaro, Caiado, Tarcísio).
4. **Propaganda digital** — gastos oficiais em Google Ads / Meta Ads por candidato (R$ 28,6 mi Bolsonaro 2022 é o gancho mais forte).
5. **Cobertura regional** — governador e senador nos 27 estados, puxando para as páginas de estado.
6. **Founder / indie builder** — Luiz construindo sozinho, "fast MVP, low complexity", open sobre a stack (Next.js + Supabase + Vercel).

## Tom por canal

- **X:** rápido, reativo, dado + contexto em 1 thread. Quote-tweet de pesquisas assim que saem. Engajar jornalistas e contas políticas.
- **Instagram:** cartão/carrossel visual com números e gráfico da média ponderada; stories de bastidor (print do dashboard, do cron rodando, do relatório saindo).
- **LinkedIn:** posts mais longos, ângulo founder + jornalismo de dados + arquitetura técnica. Público: jornalistas, parceiros, potencial imprensa.

---

## Fases e cadência

O dia a dia (posts-âncora, grade de rotação, bancos de template) vive só nos calendários por canal, pra não ter duas fontes de verdade desalinhando — ver **[índice dos calendários](./CALENDARIO-CONTEUDO-REDES-SOCIAIS.md)**. Aqui fica só o resumo estratégico de cada fase.

**Cadência:** X e Instagram/Facebook diários (grade de rotação por dia da semana) · LinkedIn 4-5x/semana.

### Fase 1 — Aquecimento (13/09 a 03/10, ~3 semanas)
Lançamento simultâneo em todos os canais no dia 13/09 (metodologia). Da semana de 15/09 em diante: reação em tempo real a pesquisa nova, destaque de arquitetura/transparência (17/09), gasto digital (19/09), simulação de 2º turno (24/09) e outreach de imprensa (26/09). Última semana (29/09-03/10): contagem regressiva diária + checar carga do site antes do Dia D.

### Fase 2 — 1º turno (04/10 domingo) e semana seguinte
Cobertura ao vivo da apuração comparando com a média ponderada — maior potencial de viralização do ano. Dias seguintes: prova social (acerto/erro da média) e virada de chave editorial pro 2º turno.

### Fase 3 — Entre turnos (05/10 a 24/10)
Mesma cadência da Fase 1, conteúdo migra pro confronto do 2º turno. Retomar outreach de imprensa com o número real de acerto do 1º turno como gancho. Contagem regressiva final na última semana.

### Fase 4 — 2º turno (25/10) e pós-eleição
Cobertura ao vivo igual à do 1º turno, seguida de retrospectiva da temporada (pesquisas indexadas, acurácia final por instituto vs. TSE) — melhor material de autoridade pro ano seguinte e reaproveitável em outreach pós-eleição. Decisão de manter ou reduzir cadência fica pra depois, com dado real de tráfego da campanha em mãos.

---

## Checklist de assets (antes de 15/09)

- [ ] Confirmar/criar handles oficiais @electiolab no X, Instagram, Facebook e LinkedIn (verificar se já existem)
- [ ] Template de carrossel Instagram (Canva ou Figma) com identidade visual do site
- [ ] Banco de 10-15 posts pré-escritos pros pilares 1, 2 e 4 (dado pronto, só plugar número da semana)
- [ ] Print/GIF do dashboard e do relatório semanal pra usar em stories/LinkedIn
- [ ] Lista de outreach do PRESS-KIT.md revisada e com contatos confirmados

## Métricas a acompanhar (semanal)

| Métrica | Onde olhar |
|---|---|
| Sessões em electiolab.com por origem social | GA4 / Vercel Analytics |
| Engajamento por post (curtidas, replies, shares) | nativo de cada plataforma |
| Cliques em link (bit.ly ou UTM) por canal | UTM em toda bio/post |
| Menções de imprensa geradas por outreach | busca manual + Google Alerts |
| Novos inscritos "Sinal Eleitoral" | Beehiiv (métrica secundária) |

## Riscos

1. **Capacidade solo** — cadência diária em 4 canais é pesada pra uma pessoa. Mitigação: Facebook replica o Instagram (cross-post, sem produção extra), banco de posts pré-escritos (checklist acima) e priorizar X > LinkedIn > Instagram/Facebook se faltar tempo.
2. **Pico de tráfego no dia da apuração derruba o site** — testar carga antes de 04/10 e 25/10.
3. **Dado errado postado ao vivo** — ter processo de checagem rápida antes de postar número de apuração parcial.
