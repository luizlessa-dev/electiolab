# apuracao-2026 (dentro do Electiolab)

Apuração ao vivo das Eleições Gerais 2026 no Electiolab, a partir dos arquivos JSON públicos do TSE.

- 1º turno: 4/10/2026 · 2º turno eventual: 25/10/2026
- Ensaio contra o simulado extra do TSE: 28 e 29/09/2026, 14h–16h
- Escopo do 1º turno: Presidente, Governador, Senador (2 vagas), Deputado Federal, Deputado Estadual e Deputado Distrital

## Estrutura
```
CLAUDE.md            regras permanentes
PROMPT_INICIAL.md    plano em fases (parar para aprovação a cada fase)
docs/arquitetura.md  fluxo, coletor, riscos, mapa de campos
docs/fontes.md       endpoints e regras do TSE (verificada / a verificar)
migrations/0001_apuracao.sql   rascunho do schema `apuracao`
amostras/            JSON baixados do simulado (fora do git)
Código: src/lib/apuracao/, src/app/apuracao/, src/app/api/cron/apuracao/ (no app do Electiolab)
```

## Como começar
1. Adicionar ao `.env.local` do Electiolab as variáveis de `apuracao-2026/.env.example`.
2. Abrir `~/electiolab` no Claude Code e pedir: "leia apuracao-2026/PROMPT_INICIAL.md e execute a Fase 0".
