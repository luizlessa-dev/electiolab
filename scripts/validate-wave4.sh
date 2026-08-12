#!/bin/bash

# Wave 4 Validation Script
# Tests all Phase 1, 2, and 3 functionality

set -e

echo "════════════════════════════════════════════════════════════════"
echo "Wave 4 Production Validation"
echo "════════════════════════════════════════════════════════════════"
echo ""

BASE_URL="${BASE_URL:-http://localhost:3000}"
SCORE=0
TOTAL=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_code=$5

    TOTAL=$((TOTAL + 1))

    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" == "$expected_code" ]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $http_code)"
        SCORE=$((SCORE + 1))
    else
        echo -e "${RED}✗${NC} $name (Expected $expected_code, got $http_code)"
        echo "  Response: $body"
    fi
}

# ═══════════════════════════════════════════════════════════════════
# Phase 1: Alertas & Notificações
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}Phase 1: Alertas & Notificações${NC}"
echo "───────────────────────────────────────────────────────────────"

# Test notification configuration
test_endpoint "Test Notifications" "GET" "/api/admin/notifications/test" "" "200"

# Test admin discrepancies endpoint
test_endpoint "List Discrepancies" "GET" "/api/admin/discrepancies?state=SP&limit=5" "" "200"

# Test send anomaly alert
anomaly_payload='{"anomaly":{"state":"SP","position":"governador","candidateName":"João Silva","researchPercentage":30,"aggregatedPercentage":38,"deviation":8,"confidence":0.85,"severity":"critical","timestamp":"2026-08-08T12:00:00Z"},"channels":["log"]}'
test_endpoint "Send Anomaly Alert" "POST" "/api/alerts/anomaly" "$anomaly_payload" "202"

# ═══════════════════════════════════════════════════════════════════
# Phase 2: Enriquecimento de Dados
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}Phase 2: Enriquecimento de Dados${NC}"
echo "───────────────────────────────────────────────────────────────"

# Test approval aggregation
test_endpoint "Presidential Approval" "GET" "/api/approval/aggregated?position=presidencial" "" "200"
test_endpoint "Governor Approval (SP)" "GET" "/api/approval/aggregated?position=governador&uf=SP" "" "200"

# Test regional aggregation
test_endpoint "Regional Aggregation (Sudeste)" "GET" "/api/regions/aggregated?region=sudeste&position=governador" "" "200"

# Test multi-region batch
regions_payload='{"regions":["sul","sudeste"],"position":"governador","days":30}'
test_endpoint "Multi-Region Batch" "POST" "/api/regions/aggregated" "$regions_payload" "200"

# ═══════════════════════════════════════════════════════════════════
# Phase 3: Analytics & Histórico
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}Phase 3: Analytics & Histórico${NC}"
echo "───────────────────────────────────────────────────────────────"

# Test candidate history
test_endpoint "Candidate History" "GET" "/api/history/candidate?candidate=Test&state=SP&days=90" "" "200"

# Test trends
test_endpoint "Trend Analysis (All)" "GET" "/api/history/trends?state=SP&days=30" "" "200"

# Test period comparison
test_endpoint "Period Comparison" "GET" "/api/history/comparison?state=SP" "" "200"

# ═══════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Validation Results"
echo "════════════════════════════════════════════════════════════════"

percentage=$((SCORE * 100 / TOTAL))

if [ $SCORE -eq $TOTAL ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED ($SCORE/$TOTAL)${NC}"
    echo ""
    echo "Wave 4 is ready for production!"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED ($SCORE/$TOTAL - $percentage%)${NC}"
    echo ""
    echo "Please fix the failing endpoints before proceeding."
    exit 1
fi
