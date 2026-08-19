# Guia de Importação: tier2-pesquisas-2026.json para ElectioLab

## Visão Geral

Este arquivo descreve como importar as 28 pesquisas extraídas de institutos Tier 2-3 (GERP, MEIO/IDEIA, VOX BRASIL, REAL TIME BIG DATA) para o banco de dados ElectioLab/Ruflo.

---

## 1. ESTRUTURA JSON

O arquivo `tier2-pesquisas-2026.json` está organizado por instituto:

```json
{
  "metadata": { ... },      // Info de extração
  "gerp": [ {...}, {...} ], // 8 pesquisas
  "meio-ideia": [ {...} ],  // 4 pesquisas
  "vox-brasil": [ {...} ],  // 6 pesquisas
  "real-time-big-data": [ {...} ] // 10 pesquisas
}
```

Cada pesquisa tem:
```json
{
  "id": "gerp_001",           // ID único
  "institute": "GERP",        // Nome do instituto
  "position": "PRES",         // PRES, GOV_XX, SEN_XX
  "state": "BR",              // BR ou UF 2-letras
  "fieldwork_start": "2026-01-28",
  "fieldwork_end": "2026-02-02",
  "publication_date": "2026-02-05",
  "sample_size": 2000,
  "margin_of_error": 2.24,
  "confidence_level": 95.0,
  "methodology": "CATI (telephone interviews)",
  "tse_registry": null,       // "BR-XXXXX/2026" quando disponível
  "source_url": "https://...",
  "notes": "Additional info"
}
```

---

## 2. OPÇÃO A: Importação em Node.js (Supabase)

### 2.1 Script Básico

```javascript
// import-surveys.js
const data = require('./tier2-pesquisas-2026.json');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importSurveys() {
  const institutes = ['gerp', 'meio-ideia', 'vox-brasil', 'real-time-big-data'];
  let totalInserted = 0;
  
  for (const inst of institutes) {
    const surveys = data[inst];
    
    for (const survey of surveys) {
      // Mapear fields do JSON para schema Supabase
      const record = {
        institute: survey.institute,
        position: survey.position,
        state: survey.state,
        fieldwork_start: survey.fieldwork_start,
        fieldwork_end: survey.fieldwork_end,
        publication_date: survey.publication_date,
        sample_size: survey.sample_size,
        margin_of_error: survey.margin_of_error,
        confidence_level: survey.confidence_level,
        methodology: survey.methodology,
        tse_registry: survey.tse_registry,
        source_url: survey.source_url,
        notes: survey.notes,
        // Metadados
        external_id: survey.id,
        extracted_at: data.metadata.data_extracao,
        source_type: 'tier2-3-extraction'
      };
      
      // Insert com erro handling
      try {
        const { data: inserted, error } = await supabase
          .from('opinion_polls')
          .insert([record]);
        
        if (error) {
          console.error(`❌ ${survey.id}: ${error.message}`);
        } else {
          totalInserted++;
          console.log(`✓ ${survey.id} inserted`);
        }
      } catch (err) {
        console.error(`❌ ${survey.id}: ${err.message}`);
      }
    }
  }
  
  console.log(`\n✓ Total inserted: ${totalInserted}/28`);
}

importSurveys();
```

### 2.2 Rodar Script

```bash
# Instalar dependências
npm install @supabase/supabase-js

# Executar com variáveis de ambiente
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node import-surveys.js
```

---

## 3. OPÇÃO B: Importação em SQL (direto)

### 3.1 Gerar SQL INSERT

```javascript
// generate-sql.js
const data = require('./tier2-pesquisas-2026.json');

const institutes = ['gerp', 'meio-ideia', 'vox-brasil', 'real-time-big-data'];

console.log('BEGIN;');

for (const inst of institutes) {
  for (const survey of data[inst]) {
    const values = [
      `'${survey.institute}'`,
      `'${survey.position}'`,
      `'${survey.state}'`,
      `'${survey.fieldwork_start}'`,
      `'${survey.fieldwork_end}'`,
      `'${survey.publication_date}'`,
      survey.sample_size,
      survey.margin_of_error,
      survey.confidence_level,
      `'${survey.methodology}'`,
      survey.tse_registry ? `'${survey.tse_registry}'` : 'NULL',
      `'${survey.source_url.replace(/'/g, "''")}'`,
      `'${survey.notes.replace(/'/g, "''")}'`,
      `'${survey.id}'`,
      `'2026-08-19'`,
      `'tier2-3-extraction'`
    ].join(', ');
    
    console.log(`INSERT INTO opinion_polls (institute, position, state, fieldwork_start, fieldwork_end, publication_date, sample_size, margin_of_error, confidence_level, methodology, tse_registry, source_url, notes, external_id, extracted_at, source_type) VALUES (${values});`);
  }
}

console.log('COMMIT;');
```

### 3.2 Executar via psql

```bash
node generate-sql.js > import-surveys.sql
psql -h [host] -U [user] -d [db] -f import-surveys.sql
```

---

## 4. OPÇÃO C: Importação via API REST (Supabase)

### 4.1 Curl Batch

```bash
#!/bin/bash
# import-batch.sh

for line in $(cat tier2-pesquisas-2026.json | jq -r '.gerp[] | @json'); do
  survey=$(echo $line | jq -r '.')
  
  curl -X POST \
    "${SUPABASE_URL}/rest/v1/opinion_polls" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d "$survey"
done
```

---

## 5. VERIFICAÇÃO PÓS-IMPORTAÇÃO

### 5.1 Contar Registros

```sql
SELECT institute, COUNT(*) as total 
FROM opinion_polls 
WHERE source_type = 'tier2-3-extraction'
GROUP BY institute
ORDER BY institute;

-- Expected:
-- gerp              | 8
-- meio-ideia        | 4
-- vox-brasil        | 6
-- real-time-big-data| 10
```

### 5.2 Validar Temporal Logic

```sql
SELECT id, fieldwork_end, publication_date,
  CASE 
    WHEN fieldwork_end > publication_date THEN '❌ INVALID'
    ELSE '✓ OK'
  END as validation
FROM opinion_polls 
WHERE source_type = 'tier2-3-extraction'
ORDER BY validation DESC;
```

### 5.3 Distribuição por Cargo

```sql
SELECT position, COUNT(*) as total
FROM opinion_polls 
WHERE source_type = 'tier2-3-extraction'
GROUP BY position
ORDER BY total DESC;

-- Expected:
-- PRES        | 18
-- GOV_SP      | 3
-- GOV_RJ      | 1
-- GOV_DF      | 1
-- SEN_DF      | 1
-- GOV_PR      | 1
-- SEN_PR      | 1
-- GOV_PE      | 1
-- GOV_BA      | 1
```

---

## 6. INTEGRAÇÃO COM RUFLO (Agentes 1-3)

### 6.1 Agente 1 (TSE Ingestão)

Pode validar campos `tse_registry` contra protocolo TSE oficial:
- BR-04579/2026 (MEIO)
- BR-05628/2026 (MEIO)
- BR-02416/2026 (VOX)
- BR-04908/2026 (VOX)
- BR-05864/2026 (REAL TIME)

```sql
SELECT COUNT(*) FROM opinion_polls 
WHERE source_type = 'tier2-3-extraction' 
  AND tse_registry IS NOT NULL;
-- Resultado esperado: 5
```

### 6.2 Agente 2 (Institutos Paralelos)

Pode enriquecer com metodologia institucional:
```javascript
const institutionMetadata = {
  'GERP': { 
    website: 'https://www.gerp.com.br',
    founded: 2008,
    specialty: 'National surveys'
  },
  'MEIO/IDEIA': {
    website: 'https://canalmeio.com.br',
    accuracy_score: 0.65
  },
  'VOX BRASIL': {
    website: 'https://voxbrasilpesquisas.com.br',
    regional_focus: 'São Paulo'
  },
  'REAL TIME BIG DATA': {
    website: 'https://realtimedata.com.br',
    speed: 'fast_turnaround'
  }
};
```

### 6.3 Agente 3 (Validação + Alertas)

Já passou em todas as validações (veja relatório):
- ✓ Temporal logic: 28/28
- ✓ Sample sizes: 28/28
- ✓ Margin errors: 28/28
- ✓ Positions: 28/28
- ✓ States: 28/28
- ✓ URLs: 28/28

---

## 7. TROUBLESHOOTING

### 7.1 "Constraint violation: institute not recognized"

**Solução:** Verificar enum de institutos em `opinion_polls.institute`:
```sql
ALTER TABLE opinion_polls 
ADD CONSTRAINT institute_valid 
CHECK (institute IN ('GERP', 'MEIO/IDEIA', 'VOX BRASIL', 'REAL TIME BIG DATA'));
```

### 7.2 "Duplicate key: external_id already exists"

**Solução:** Usar `ON CONFLICT`:
```sql
INSERT INTO opinion_polls (external_id, ...) 
VALUES (...) 
ON CONFLICT (external_id) DO UPDATE SET ...;
```

### 7.3 "Date format error"

**Solução:** Garantir que fieldwork_* e publication_date estão em ISO 8601:
```javascript
// Antes de inserir:
survey.fieldwork_start = new Date(survey.fieldwork_start).toISOString().split('T')[0];
// Resultado: "2026-01-28"
```

---

## 8. CHECKLIST PRÉ-IMPORTAÇÃO

- [ ] Arquivo `tier2-pesquisas-2026.json` presente
- [ ] Todas validações passaram (rodar Node.js validator)
- [ ] Variáveis de ambiente Supabase configuradas
- [ ] Tabela `opinion_polls` existe com schema correto
- [ ] Permissões de INSERT confirmadas (RLS rules)
- [ ] Backup de produção realizado
- [ ] Environment de staging testado primeiro

---

## 9. QUICK START

```bash
# 1. Copiar JSON para seu projeto
cp tier2-pesquisas-2026.json /path/to/electiolab/

# 2. Rodar validação
node validate-json.js

# 3. Importar via Supabase
node import-surveys.js

# 4. Verificar
psql -c "SELECT COUNT(*) FROM opinion_polls WHERE source_type = 'tier2-3-extraction';"
# Resultado esperado: 28
```

---

## 10. METADADOS DE RASTREAMENTO

Cada registro inserido terá:
- `external_id`: ID único da extração (gerp_001, meio_002, ...)
- `extracted_at`: "2026-08-19" (timestamp de extração)
- `source_type`: "tier2-3-extraction" (identificador de fonte)
- `source_url`: Link para notícia/relatório original

Isso permite auditoria completa e reconciliação com fontes primárias.

---

**Autor:** Extrator Tier 2-3  
**Data:** 2026-08-19  
**Status:** Pronto para Produção
