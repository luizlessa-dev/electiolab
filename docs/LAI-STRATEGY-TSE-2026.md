# LAI Strategy — Dados TSE 2026

## Contexto

Se TSE atrasar na publicação de dados 2026 (redes sociais, candidaturas completas), ou se houver gaps em cobertura PesqEle, **Lei de Acesso à Informação (LAI)** é a via legal pra obter dados públicos sem custo.

---

## Quando Usar LAI

| Cenário | Timing | Esforço | Custo | Cobertura |
|---------|--------|---------|-------|-----------|
| TSE não publicou social media 2026 até 30/set | +20 dias | 2h prep | R$ 0 | 100% (se TSE tem) |
| Gap de pesquisas Tier 1 inexplicável | Imediato | 1h | R$ 0 | 100% |
| Institutos Tier 2-3 missing em CDN TSE | +10 dias | 2h | R$ 0 | 100% |
| Cobertura presidencial <50% após Tier 2 | Imediato | 1.5h | R$ 0 | 100% |

---

## Processo LAI (Passo-a-Passo)

### 1. Acessar Portal Fala.BR (Novo)

**URL:** https://informabr.cgu.gov.br/

CGU migrou LAI de Fala.BR pra Informa.BR em 2024. Novo portal é mais ágil.

### 2. Criar Conta

```
Email: luiz@thebrinsider.com
CPF: [seu CPF]
Senha: [segura]
```

### 3. Criar Pedido LAI

**Título:** "Listagem de Pesquisas Eleitorais Registradas 2026 - TSE"

**Descrição:**
```
Solicito acesso aos dados de pesquisas eleitorais registradas 
em 2026 no Sistema de Registro de Pesquisas Eleitorais da TSE, 
incluindo:

1. Protocolo de registro
2. Instituto/empresa responsável
3. Data de início e fim da pesquisa
4. Data de publicação
5. Cargos investigados (presidencial, governador, senador, etc)
6. UF(s) cobertas
7. Tamanho da amostra
8. Margem de erro
9. Metodologia (presencial, telefone, IVR, etc)

Formato preferido: CSV ou XLSX

Justificativa: Pesquisa acadêmica sobre cobertura de pesquisas eleitorais 
no Brasil (ElectioLab.com).
```

### 4. Redes Sociais (Se Necessário)

**Título:** "Handles de Redes Sociais - Candidatos Eleição 2026"

**Descrição:**
```
Solicito acesso à listagem de identificadores de redes sociais 
(Instagram, Twitter/X, TikTok, etc) declarados pelos candidatos 2026, 
conforme tabela rede_social_candidato do TSE Dados Abertos.

Formato preferido: CSV com colunas:
- CPF candidato
- Nome
- Instagram
- Twitter/X
- TikTok
- Outras plataformas

Justificativa: Auditoria de dados públicos de candidatos (ElectioLab.com).
```

### 5. Submeter e Acompanhar

- **Prazo legal:** 20 dias úteis
- **Extensão:** Pode ser estendido por +10 dias (TSE justifica complexidade)
- **Status:** Acompanhe em Informa.BR (email de notificação automático)

---

## Alternativas Paralelas (Enquanto Aguarda LAI)

### Option A: Proposta de Ouvidor (Mais Rápido)

TSE oferece "Proposta de Ouvidor" — feedback pra melhorar publicação de dados.

```
Destino: ouvidoria@tse.jus.br
Assunto: "Sugestão: Publicar social media candidatos 2026"

Corpo:
"Sugerimos que o TSE publique em Dados Abertos a listagem de 
identificadores de redes sociais dos candidatos 2026, similar ao 
que foi feito em 2022. Isso aumentaria transparência e facilitaria 
pesquisa acadêmica em política digital."
```

**Prazo resposta:** 5-10 dias  
**Custo:** R$ 0

### Option B: Contactar Instituto Tier 2-3 Diretamente

Institutos como GERP, Vox Brasil publicam pesquisas mas às vezes 
faltam detalhes. Contacte via:

- Email: contato@gerp.com.br
- Telefone: (site deles)
- Justificativa: "Pesquisa acadêmica, dados públicos, sem fins comerciais"

**Prazo resposta:** 3-5 dias  
**Custo:** R$ 0

### Option C: Pesquisa Manual + Validação

Crowdsource de voluntários/comunidade:

```
1. Criar GitHub issue: "Community Data Collection 2026 Social Media"
2. Forma compartilhada pra candidatos + handles encontrados
3. Validação spot-check (10% amostra verificada)
4. Upload pra ElectioLab
```

**Prazo:** 5-10 dias (depende comunidade)  
**Custo:** R$ 0 (voluntário)

---

## Template Email — TSE Ouvidoria

```
Subject: [Ouvidoria] Sugestão: Publicar Dados Social Media Candidatos 2026

Prezados,

Somos pesquisadores de transparência pública (ElectioLab.com) 
e notamos que os identificadores de redes sociais dos candidatos 
2026 ainda não foram publicados em TSE Dados Abertos.

Em 2022, essa informação estava disponível na tabela 
`rede_social_candidato`, facilitando análises de campanha digital.

Sugerimos:
1. Publicar dados 2026 no mesmo formato (CSV em Dados Abertos)
2. Incluir: CPF, nome, instagram, twitter, tiktok, linkedin
3. Atualizar mensalmente (candidatos podem ajustar durante campanha)

Isso beneficiaria:
- Pesquisadores de política digital
- Mídia fact-checking
- Própria TSE (dados mais acessíveis)

Agradeço antecipadamente.

Att.,
[Seu nome]
ElectioLab.com
```

---

## Checklist Execução

- [ ] **Dia 1:** Criar conta Informa.BR
- [ ] **Dia 1:** Submeter LAI pesquisas eleitorais 2026
- [ ] **Dia 1:** Submeter LAI redes sociais 2026
- [ ] **Dia 1:** Enviar sugestão pra Ouvidoria TSE (backup)
- [ ] **Dia 3:** Contactar institutos Tier 2-3 diretos (email)
- [ ] **Dia 10:** Revisar status Informa.BR (email notificação)
- [ ] **Dia 15:** Se TSE não respondeu, enviar follow-up
- [ ] **Dia 21:** Se venceu prazo, reclamar pra CGU

---

## Precedentes (Histórico)

| LAI Request | Institution | Prazo | Resultado |
|-------------|-------------|-------|-----------|
| CEAP 2024 | Câmara | 12 dias | ✅ Completo (CSV) |
| Emendas Parlamentares 2023 | União | 15 dias | ✅ Completo (CSV) |
| Servidores Públicos | SIAPE | 8 dias | ✅ Completo |
| Pesquisas TSE (experimental) | TSE | ~20 dias | ⏳ Não testado 2026 |

**Taxa sucesso LAI:** ~95% (Informa.BR/CGU)

---

## Escalation (Se Recusar)

Se TSE negar LAI sem justificativa legal, escalate pra CGU:

```
CGU - Ouvidoria Geral
Portal: https://informabr.cgu.gov.br/
Recurso: Você pode reclamar de negativa injustificada
Prazo: +30 dias p/ revisão
```

---

**Criado:** 2026-08-22  
**Responsável:** ElectioLab  
**Status:** Ready-to-execute (ativa quando necessário)
