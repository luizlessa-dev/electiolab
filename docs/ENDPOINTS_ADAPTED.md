# 🚀 Endpoints Adaptados - TSE Integration

**Status:** ✅ Pronto para usar  
**Data:** 2026-08-05

---

## 📋 RESUMO

Os 2 endpoints foram adaptados para fazer **INSERT real** nas tabelas:

| Endpoint | Método | Função | Tabelas |
|----------|--------|--------|---------|
| `/api/tse/sync/candidatos` | POST | Sincronizar candidatos | `candidates` |
| `/api/tse/sync/resultados` | GET/POST | Sincronizar apuração | `tse_apuracao`, `tse_apuracao_candidatos` |

---

## 1️⃣ ENDPOINT: Sincronizar Candidatos

### `POST /api/tse/sync/candidatos`

**Sincroniza candidatos do TSE para a tabela `candidates`**

#### Request

```bash
curl -X POST http://localhost:3000/api/tse/sync/candidatos \
  -H "Content-Type: application/json" \
  -d '{
    "ano": 2026,
    "estado": "SP",
    "cargo": "governador",
    "election_id": "2a8761ab-9dc0-4436-8682-4095c0b7f014"
  }'
```

#### Body Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-----------|-----------|
| `ano` | number | ✅ | Ano da eleição (ex: 2026) |
| `estado` | string | ❌ | UF (SP, RJ, etc). Se omitido, sincroniza todos os 27 |
| `cargo` | string | ❌ | Cargo: `presidente`, `governador`, `senador`, `deputado` (padrão: governador) |
| `election_id` | string (UUID) | ✅ | ID da eleição no banco (para vincular candidatos) |

#### Response

```json
{
  "success": true,
  "resumo": {
    "ano": 2026,
    "cargo": "governador",
    "election_id": "2a8761ab-9dc0-4436-8682-4095c0b7f014",
    "estadosSolicitados": ["AC", "AL", "AM", ...],
    "totalInseridos": 2847,
    "totalErros": 0,
    "erros": null
  },
  "timestamp": "2026-08-05T14:30:00Z"
}
```

#### O que é inserido

Cada candidato é mapeado assim:

```
TSE (DivulgaCandContas)  →  Supabase (candidates)
─────────────────────────────────────────────────
nome                    →  name
nomeCompleto            →  full_name
partido                 →  party
numero                  →  number
sequencial              →  tse_id
situacao='APTO'         →  is_active=true
(+ election_id vinculado)
```

#### Exemplo Prático

```bash
# Sincronizar todos os governadores de SP
curl -X POST http://localhost:3000/api/tse/sync/candidatos \
  -H "Content-Type: application/json" \
  -d '{
    "ano": 2026,
    "estado": "SP",
    "cargo": "governador",
    "election_id": "2a8761ab-9dc0-4436-8682-4095c0b7f014"
  }'

# Resposta: ~500 candidatos de SP inseridos
```

---

## 2️⃣ ENDPOINT: Sincronizar Resultados

### `GET /api/tse/sync/resultados` (Buscar 1 resultado)

**Busca resultado de votação em tempo real**

#### Request

```bash
curl "http://localhost:3000/api/tse/sync/resultados?cargo=presidente&turno=1&ano=2026&election_id=2a8761ab-9dc0-4436-8682-4095c0b7f014"
```

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-----------|-----------|
| `cargo` | string | ❌ | `presidente` ou `governador` (padrão: presidente) |
| `estado` | string | ✅ se cargo=governador | UF para governador |
| `turno` | number | ❌ | 1 ou 2 (padrão: 1) |
| `ano` | number | ❌ | Ano (padrão: 2026) |
| `election_id` | string (UUID) | ❌ | Se fornecido, salva resultado no banco |

#### Response

```json
{
  "success": true,
  "data": {
    "cargo": "presidente",
    "turno": 1,
    "ano": 2026,
    "dataApuracao": "2026-10-02T22:45:30Z",
    "percentualApuração": 95.2,
    "seçõesApuradas": 285600,
    "seçõesTotais": 300000,
    "candidatos": [
      {
        "numeroCandidata": "13",
        "nomeCandidata": "CANDIDATO A",
        "siglaPartido": "PT",
        "votosNominais": 25000000,
        "percentual": 32.5
      },
      {
        "numeroCandidata": "22",
        "nomeCandidata": "CANDIDATO B",
        "siglaPartido": "PL",
        "votosNominais": 23000000,
        "percentual": 30.1
      }
    ]
  },
  "salvo": true,
  "timestamp": "2026-10-02T22:45:30Z"
}
```

#### Exemplos

```bash
# Buscar resultados presidenciais (sem salvar)
curl "http://localhost:3000/api/tse/sync/resultados?cargo=presidente"

# Buscar governador de SP e salvar no banco
curl "http://localhost:3000/api/tse/sync/resultados?cargo=governador&estado=SP&election_id=2a8761ab-9dc0-4436-8682-4095c0b7f014"

# Buscar 2º turno
curl "http://localhost:3000/api/tse/sync/resultados?cargo=presidente&turno=2&election_id=2a8761ab-9dc0-4436-8682-4095c0b7f014"
```

---

### `POST /api/tse/sync/resultados` (Sincronizar tudo)

**Sincroniza resultados de TODOS os cargos/estados**

#### Request

```bash
curl -X POST http://localhost:3000/api/tse/sync/resultados \
  -H "Content-Type: application/json" \
  -d '{
    "ano": 2026,
    "turno": 1,
    "election_id": "2a8761ab-9dc0-4436-8682-4095c0b7f014"
  }'
```

#### Body Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-----------|-----------|
| `ano` | number | ❌ | Ano (padrão: 2026) |
| `turno` | number | ❌ | 1 ou 2 (padrão: 1) |
| `election_id` | string (UUID) | ✅ | ID da eleição |

#### Response

```json
{
  "success": true,
  "resumo": {
    "ano": 2026,
    "turno": 1,
    "election_id": "2a8761ab-9dc0-4436-8682-4095c0b7f014",
    "totalInseridos": 28,
    "totalErros": 0,
    "erros": null
  },
  "resultados": [
    {
      "cargo": "presidente",
      "candidatos": 12,
      "apuração": 95.2
    },
    {
      "estado": "AC",
      "candidatos": 8,
      "apuração": 87.5
    },
    {
      "estado": "AL",
      "candidatos": 10,
      "apuração": 91.3
    },
    // ... 25 mais governadores
  ],
  "timestamp": "2026-10-02T22:50:00Z"
}
```

#### O que é sincronizado

- ✅ 1 resultado presidencial
- ✅ 27 resultados de governadores (um por estado)
- ✅ Todos os candidatos para cada resultado
- ✅ Inserido em `tse_apuracao` + `tse_apuracao_candidatos`

---

## 📊 FLUXO DE DADOS

### Candidatos

```
TSE API (DivulgaCandContas)
    ↓
[divulgaCandContasClient.buscarCandidatos()]
    ↓
POST /api/tse/sync/candidatos
    ↓
Supabase: INSERT INTO candidates
    ↓
✅ Candidatos salvos no banco
```

### Resultados

```
TSE API (TSE Resultados)
    ↓
[tseResultadosClient.buscarResultados*()]
    ↓
GET|POST /api/tse/sync/resultados
    ↓
Supabase: INSERT INTO tse_apuracao
        + INSERT INTO tse_apuracao_candidatos
    ↓
✅ Apuração + candidatos salvos no banco
```

---

## 🧪 TESTE PRÁTICO

Assumindo que você tem uma eleição criada com ID: `2a8761ab-9dc0-4436-8682-4095c0b7f014`

### 1. Sincronizar Candidatos de SP

```bash
curl -X POST http://localhost:3000/api/tse/sync/candidatos \
  -H "Content-Type: application/json" \
  -d '{
    "ano": 2026,
    "estado": "SP",
    "cargo": "governador",
    "election_id": "2a8761ab-9dc0-4436-8682-4095c0b7f014"
  }'
```

Esperado: ~500 candidatos inseridos em `candidates`

### 2. Buscar Resultados Presidenciais

```bash
curl "http://localhost:3000/api/tse/sync/resultados?cargo=presidente&election_id=2a8761ab-9dc0-4436-8682-4095c0b7f014"
```

Esperado: Resultado presidencial + candidatos salvos em `tse_apuracao` + `tse_apuracao_candidatos`

### 3. Sincronizar Todos os Governadores

```bash
curl -X POST http://localhost:3000/api/tse/sync/resultados \
  -H "Content-Type: application/json" \
  -d '{
    "ano": 2026,
    "turno": 1,
    "election_id": "2a8761ab-9dc0-4436-8682-4095c0b7f014"
  }'
```

Esperado: 28 registros inseridos (1 presidente + 27 governadores)

### 4. Verificar Dados no Supabase

```sql
-- Ver candidatos inseridos
SELECT COUNT(*) FROM candidates;

-- Ver apurações
SELECT cargo, estado, percentual_apuracao FROM tse_apuracao;

-- Ver votos por candidato
SELECT nome_candidato, votos_nominais FROM tse_apuracao_candidatos LIMIT 10;
```

---

## ⚠️ ERROS COMUNS

### Erro: "election_id é obrigatório"
**Causa:** Falta o `election_id` na request  
**Solução:** Adicione `election_id` na body ou query params

### Erro: "estado é obrigatório para cargo governador"
**Causa:** Está buscando governador sem especificar UF  
**Solução:** Adicione `estado=SP` nos query params

### Erro: "invalid input syntax for type uuid"
**Causa:** `election_id` inválido ou mal formatado  
**Solução:** Use um UUID válido (ex: `2a8761ab-9dc0-4436-8682-4095c0b7f014`)

### Erro: "Rate limit exceeded"
**Causa:** Muitas requisições para TSE API  
**Solução:** Aguarde 5-10 minutos ou use cache

---

## 📈 PRÓXIMOS PASSOS

1. **Testar endpoints** com dados reais
2. **Criar job agendado** para sincronizar candidatos (1x/semana)
3. **Criar job agendado** para sincronizar resultados (durante eleições, tempo real)
4. **Conectar institutos de pesquisa** (Datafolha, Quaest, AtlasIntel)
5. **Integrar UI** para mostrar dados de apuração

---

**Status:** ✅ Endpoints prontos para uso  
**Próxima Fase:** Testes + Jobs agendados
