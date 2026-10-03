# 📋 Guia: Adicionar Pesquisas de Deputado Federal do Poder360

## 🎯 Objetivo

Adicionar pesquisas reais de Deputado Federal do Poder360 ao banco de dados de forma manual e confiável.

---

## 🔍 Onde Procurar

1. **Poder360 Pesquisas:**
   - https://www.poder360.com.br/poder-pesquisas-hoje/
   - https://www.poder360.com.br/poder-eleicoes/

2. **Buscar por:** "Deputado Federal", "Câmara", "Deputies"

3. **Verificar:** 
   - Instituto reputado? (Datafolha, Ipsos, AtlasIntel, etc.)
   - Tem amostra e margem de erro?
   - Tem data de coleta?

---

## 📝 Template de Captura

Quando encontrar uma pesquisa, preencha:

```
Instituto:           [ex: Datafolha]
Estado/Scope:        [ex: SP, RJ, ou BR para nacional]
Fieldwork Start:     [YYYY-MM-DD]
Fieldwork End:       [YYYY-MM-DD]
Publication Date:    [YYYY-MM-DD]
Amostra:             [ex: 1610]
Margem de erro:      [ex: 2.44]
Candidatos/Votos:    [PT 40%, PL 35%, etc]
URL:                 [link direto da reportagem]
```

---

## ✍️ Como Adicionar

### Step 1: Preparar Dados

Copie os dados do Poder360 no formato acima.

**Exemplo:**
```
Instituto: Datafolha
Estado: SP
Fieldwork Start: 2026-10-01
Fieldwork End: 2026-10-05
Publication Date: 2026-10-08
Amostra: 1500
Margem de erro: 2.58
Candidatos: PT 42%, PL 38%, Ciro 8%, Outros 12%
URL: https://www.poder360.com.br/...
```

### Step 2: Editar `scripts/ingest-manual.ts`

Abra `scripts/ingest-manual.ts` e encontre a seção:

```typescript
const DEPUTADO_FEDERAL_MANUAL = [
  // Adicione aqui
];
```

Adicione um novo objeto:

```typescript
{
  institute: "Datafolha",
  state: "SP",
  office: "deputado",
  fieldwork_start: "2026-10-01",
  fieldwork_end: "2026-10-05",
  publication_date: "2026-10-08",
  sample_size: 1500,
  margin_of_error: 2.58,
  notes: "PT 42%, PL 38%, Ciro 8%, Outros 12%",
  source_url: "https://www.poder360.com.br/...",
  source_kind: "poder360-manual"
}
```

### Step 3: Validar e Aplicar

```bash
# Validar (dry-run)
npx tsx scripts/ingest-manual.ts --dry-run

# Aplicar (se tudo certo)
npx tsx scripts/ingest-manual.ts --apply
```

---

## ⚠️ Checklist de Validação

Antes de adicionar, verifique:

- [ ] Instituto é reputado (Tier 1)?
- [ ] Tem amostra (N >= 1000)?
- [ ] Tem margem de erro?
- [ ] Tem data de coleta?
- [ ] Candidatos somam ~100%?
- [ ] URL é válida?
- [ ] Estado é válido (SP, RJ, etc)?
- [ ] Data é válida (YYYY-MM-DD)?

---

## 🔗 Formato dos Candidatos (notes)

O campo `notes` segue este padrão:

```
[Candidato/Coligação] [X]%, [Candidato/Coligação] [Y]%
```

**Exemplos válidos:**
- `PT 42%, PL 38%, Outros 20%`
- `Lula 42%, Bolsonaro 38%, Branco 12%, Nulo 8%`
- `PT-Aliados 42%, PL-Aliados 38%, Centro 20%`

---

## 🐛 Troubleshooting

### Erro: "Institute not found"
```
Solução: Verificar se instituto existe no banco
→ Adicionar institute primeiro em admin panel ou via:
  INSERT INTO institutes (name, tier) VALUES ('NovoInstituto', 1);
```

### Erro: "Duplicate poll"
```
Solução: Mesma pesquisa já existe
→ Verificar com:
  SELECT * FROM poll_drafts 
  WHERE institute_name = 'Datafolha' 
  AND scope = 'SP' 
  AND fieldwork_end = '2026-10-05';
```

### Erro: "Invalid date format"
```
Solução: Data deve ser YYYY-MM-DD
→ Corrigir para: "2026-10-08" (não "08/10/2026")
```

---

## 📊 Frequência Recomendada

- **Semanal**: Rodar monitor (`npx tsx scripts/monitor-poder360-deputado.ts`)
- **Mensal**: Pelo menos 1-2 pesquisas adicionadas
- **Trimestral**: Review de cobertura por estado

---

## 🎯 Objetivo

Após seguir este guia, você terá:

✅ Pesquisa real de Deputado Federal no banco  
✅ Rastreada como `source_kind='poder360-manual'`  
✅ Com todos os metadados (amostra, margem, data)  
✅ Visível no frontend com label "Poder360"

---

## 📞 Suporte

**Dúvida sobre o processo?**
- Ler comentários em `scripts/ingest-manual.ts`
- Verificar exemplos em `data/pesqele_deputado_import.json`

**Problema técnico?**
- Checar seção Troubleshooting acima
- Verificar logs: `npx tsx scripts/ingest-manual.ts --dry-run`
