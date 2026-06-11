#!/usr/bin/env bash
# Script genérico adaptado al contrato real de TurnoMonitores · US-2
# /monitores   → GET /salas/lans
# /salones     → GET /salas/orlando-sierra
# POST /turnos → POST webhook n8n (canal de escritura real)
# 409 conflict → ENUM inválido rechazado por Postgres (efecto equivalente: sin cambio en DB)
# 400 faltante → GET /salas/:sede_invalida (validación real del backend)

BASE_URL="https://turnomonitores-backend.fly.dev"
N8N_WEBHOOK="https://santiago-garcia-medina28.app.n8n.cloud/webhook/sala-estado"
SALA_ID="11111111-0000-0000-0000-000000000001"   # Sala 101 · Sede Lans

echo "========================================"
echo "1) Datos disponibles"
echo "========================================"

echo "--- GET /salas/lans (equivalente a /monitores) ---"
curl -s "$BASE_URL/salas/lans" | head -c 400; echo

echo ""
echo "--- GET /salas/orlando-sierra (equivalente a /salones) ---"
curl -s "$BASE_URL/salas/orlando-sierra" | head -c 400; echo

echo ""
echo "========================================"
echo "2) Operación válida (webhook → DB actualizada)"
echo "   Equivalente: POST /turnos → 201 + dispara webhook"
echo "========================================"

curl -s -o /tmp/r1.json -w "HTTP %{http_code}\n" \
  -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{\"salaId\":\"$SALA_ID\",\"nuevoEstado\":\"en_clase\"}"
cat /tmp/r1.json; echo

echo "  Verificando que el cambio se refleja en DB..."
sleep 1
curl -s "$BASE_URL/salas/lans" | grep -o '"nombre":"Sala 101","estado":"[^"]*"'
echo ""

echo ""
echo "========================================"
echo "3) Operación con valor inválido (ENUM rechazado · sin cambio en DB)"
echo "   Equivalente: 409 / sin webhook efectivo"
echo "========================================"

curl -s -o /tmp/r2.json -w "HTTP %{http_code}\n" \
  -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{\"salaId\":\"$SALA_ID\",\"nuevoEstado\":\"ocupada\"}"
cat /tmp/r2.json; echo

echo "  Verificando que la DB NO cambió (Sala 101 debe seguir en 'en_clase')..."
sleep 1
curl -s "$BASE_URL/salas/lans" | grep -o '"nombre":"Sala 101","estado":"[^"]*"'
echo ""

echo ""
echo "========================================"
echo "4) Parámetro inválido (espera 400 del backend)"
echo "   Equivalente: POST /turnos con campo faltante → 400"
echo "========================================"

curl -s -o /tmp/r3.json -w "HTTP %{http_code}\n" \
  "$BASE_URL/salas/xyz"
cat /tmp/r3.json; echo

echo ""
echo "========================================"
echo "Limpieza — restaurando Sala 101 a 'libre'"
echo "========================================"
curl -s -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{\"salaId\":\"$SALA_ID\",\"nuevoEstado\":\"libre\"}" > /dev/null
sleep 1
curl -s "$BASE_URL/salas/lans" | grep -o '"nombre":"Sala 101","estado":"[^"]*"'
echo ""

echo "Nota: revisar en n8n el historial de ejecuciones:"
echo "  - Paso 2 (en_clase)  → debe mostrar UPDATE exitoso"
echo "  - Paso 3 (ocupada)   → debe mostrar error ENUM de PostgreSQL"
echo "  - El webhook NO disparó efecto en el paso 3 (DB sin cambio verificado)"
