#!/bin/bash
# Setup: Cron para monitorar Poder360 semanalmente
# Uso: bash scripts/setup-poder360-cron.sh

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/monitor-poder360-deputado.ts"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "📋 Setup: Cron Poder360"
echo "Script: $SCRIPT_PATH"
echo "Projeto: $PROJECT_DIR"
echo ""

# Verificar se cron job já existe
CRON_EXISTS=$(crontab -l 2>/dev/null | grep -c "monitor-poder360-deputado.ts" || true)

if [ "$CRON_EXISTS" -gt 0 ]; then
  echo "✓ Cron job já existe"
  echo ""
  echo "Agenda atual:"
  crontab -l | grep "monitor-poder360-deputado.ts"
  exit 0
fi

# Criar novo cron job
# Segunda-feira, 09:00 (requer verificação manual)
CRON_JOB="0 9 * * 1 cd $PROJECT_DIR && npx tsx scripts/monitor-poder360-deputado.ts >> logs/poder360-deputado/cron.log 2>&1"

echo "Adicionando cron job (toda segunda-feira às 09:00)..."
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✓ Cron job adicionado!"
echo ""
echo "Para editar: crontab -e"
echo "Para remover: crontab -r"
echo "Para verificar logs: tail -f logs/poder360-deputado/cron.log"
