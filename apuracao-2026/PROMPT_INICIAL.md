# PROMPT_INICIAL — apuração ao vivo no Electiolab

Leia `apuracao-2026/CLAUDE.md`, `apuracao-2026/docs/arquitetura.md` e `apuracao-2026/docs/fontes.md` antes de qualquer coisa. O código vai no app do Electiolab (`src/`), não nesta pasta.
Trabalhe em fases. **Ao fim de cada fase, pare, mostre o que fez e espere aprovação.**

Prazo real: 1º turno em **4/10/2026**. Simulado extra do TSE (arquivos mudando ao vivo) em **28 e 29/09, das 14h às 16h** — as Fases 1–3 precisam estar prontas até lá para testar contra carga real.

---

## Fase 0 — Inspeção (sem escrever código)
1. Baixar UMA vez do simulado: `comum/config/ele-c.json`, `ele2026/21270/config/mun-e021270-cm.json`, `ele2026/21270/dados/br/br-e021270-ab.json`, `ele2026/21270/dados/br/br-c0001-e021270-u.json`, `ele2026/21272/dados/mg/mg-c0003-e021272-u.json`. Salvar em `apuracao-2026/amostras/` (gitignored).
2. Baixar os PDFs de especificação (EA10, EA11, EA12, EA14, EA15, EA20 e "Instruções para download") listados em `docs/fontes.md` para `apuracao-2026/docs/specs/`.
3. Mapear campos reais das amostras contra as specs. Registrar em `docs/arquitetura.md` (seção "Mapa de campos"): chaves de totalização (`and`, `snt`, `vag`, `st`, `pst`…), estrutura de candidatos, votos válidos/brancos/nulos, IDG.
4. Confirmar o padrão de URL de cada tipo de arquivo e o formato do código de cargo (`c0001` presidente, `c0003` governador, `c0005` senador, `c0006` dep. federal, `c0007` dep. estadual, `c0008` dep. distrital — **validar contra ele-c.json**).
5. Atualizar status em `docs/fontes.md` (a verificar → verificada).
6. Inspecionar no Electiolab: `candidates`/`elections` (como `tse_id` casa com o número/sequencial do TSE nos JSON), `polls` e `institute_accuracy_observations` (o que já mede de acerto de institutos). Registrar em `docs/arquitetura.md`.

**Parar. Mostrar o mapa de campos e as dúvidas.**

## Fase 1 — Schema
1. Revisar `apuracao-2026/migrations/0001_apuracao.sql` (rascunho) à luz do mapa de campos. Ajustar, incluindo FK opcional de `votacao_candidato` para `public.candidates` via `tse_id`.
2. Gerar `supabase/migrations/20260927xxxxxx_apuracao_schema.sql` e me mostrar. Não aplicar sozinho.

**Parar.**

## Fase 2 — Coletor
1. `src/lib/apuracao/tse-cliente.ts`: fetch com requisição condicional, timeout, limitador de taxa (fila com teto global configurável, padrão 5 req/s), backoff em 429/5xx, **circuit breaker em 404** (parar de pedir uma URL após 1 × 404 até a config dizer que ela existe).
2. `src/lib/apuracao/config.ts`: lê `ele-c.json` → preenche `apuracao.eleicao` e `apuracao.cargo`; lê config de municípios → `apuracao.municipio`.
3. `src/lib/apuracao/acompanhamento.ts`: lê EA14 (Brasil) e EA15 (por UF); decide quais EA20 mudaram (datas/horas de totalização).
4. `src/lib/apuracao/resultados.ts`: baixa só os EA20 que mudaram. Escopo do 1º turno — **todos os cargos em disputa na abrangência UF**:
   - Presidente (BR + 27 UFs)
   - Governador (27 UFs)
   - Senador (27 UFs; 2 vagas em 2026 — um cargo com `vag=2`)
   - **Deputado Federal (27 UFs)**
   - **Deputado Estadual (26 UFs) e Deputado Distrital (DF)**
   - Conselheiro Distrital (DF, eleição 6261) — validar na Fase 0 se entra.
   Resultados por **município** ficam para depois (só presidente/governador de BH e capitais, se sobrar tempo).
   Deputados são eleição **proporcional**: arquivos grandes (centenas de candidatos por UF), votos de legenda, federações e destinações "válido (legenda)" / "anulado sub judice". **Não calcular quociente eleitoral nem distribuição de vagas por conta própria na noite** — eleitos vêm do TSE (situação no EA20 e EA10). Qualquer projeção de bancada é "cálculo Electiolab", separada e rotulada.
5. Grava snapshot bruto (`apuracao.arquivo_bruto`) e normalizado (`apuracao.totalizacao`, `apuracao.votacao_candidato`).
6. EA10 só depois de totalização final em alguma UF.
7. Rota `src/app/api/cron/apuracao/route.ts` protegida por `CRON_SECRET`, cabendo em 60s (limite do `vercel.json`); registro de cada execução em `apuracao.coletor_execucao`. Entrada nova no `vercel.json` a cada minuto — só ativar no dia (flag `APURACAO_ATIVA`).
8. Script `scripts/apuracao-coletar.ts` (rodar com `npx tsx`) com `--ambiente=simulado --uma-vez` para testes locais.

**Parar. Rodar contra o simulado e mostrar números batendo com o app do simulado (resultados-sim.tse.jus.br/simulado/simulado2026/app/index.html).**

## Fase 3 — Páginas
1. `src/app/apuracao/page.tsx` (`/apuracao`) — painel Brasil: presidente (barras + % de seções totalizadas + hora), mapa/tabela por UF, governadores e senadores por UF com status (em andamento / matematicamente definida / eleito / 2º turno).
2. `/apuracao/[uf]` — detalhe da UF: governador, senado, **deputados federais e estaduais/distritais** (lista de eleitos quando houver, mais votados, votação por partido/federação).
3. `/apuracao/camara` — composição da nova Câmara conforme eleitos por UF forem saindo (bancada por partido/federação, contagem de 513 vagas preenchidas).
4. Revalidação curta (ISR 30–60s) lendo do Supabase; nunca do TSE direto no request do usuário.
5. Rodapé obrigatório: "Fonte: TSE — dados oficiais sem alteração".

**Parar.**

## Fase 4 — Pesquisas × resultado (diferencial)
1. Ligar `apuracao.votacao_candidato` a `polls` via `candidates.tse_id` (última pesquisa registrada de cada instituto antes de 4/10). Reaproveitar/estender `institute_accuracy_observations` em vez de criar métrica paralela.
2. Calcular erro por instituto/cargo/UF sobre votos válidos — **só com 100% totalizado** na abrangência; antes disso mostrar "provisório".
3. Página `/apuracao/pesquisas` com ranking de erro (cálculo Electiolab, metodologia explicada na página).

**Parar.**

## Fase 5 — Ensaio geral e noite da eleição
1. Ensaio no simulado extra de 28–29/09 (14h–16h): coletor rodando, medir requisições/s, latência TSE → página.
2. Checklist de virada para `TSE_AMBIENTE=oficial` (códigos 6257/6259/6261 conferidos contra `ele-c.json` oficial).
3. Runbook da noite: quem olha o quê, como pausar o coletor, como reagir a bloqueio de IP.
