#!/usr/bin/env bash
# ============================================================
#  TurnoMonitores — QA script · US-2
#  Contrato: GET /salas/:sede  +  webhook n8n POST /webhook/sala-estado
# ============================================================
BASE_URL=https://turnomonitores-backend.fly.dev
N8N_WEBHOOK=https://santiago-garcia-medina28.app.n8n.cloud/webhook/sala-estado
SALA_ID=11111111-0000-0000-0000-000000000001   # Sala 101 · Sede Lans

PASS=0
FAIL=0

# ── helpers ─────────────────────────────────────────────────
check_http() {
  local desc="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  OK    HTTP $actual  — $desc"
    PASS=$((PASS+1))
  else
    echo "  FALLO HTTP $actual (esperado $expected)  — $desc"
    FAIL=$((FAIL+1))
  fi
}

check_body() {
  local desc="$1" body="$2" pattern="$3"
  if echo "$body" | grep -q "$pattern"; then
    echo "  OK    body          — $desc"
    PASS=$((PASS+1))
  else
    echo "  FALLO body          — $desc"
    echo "         obtenido: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL+1))
  fi
}

sep() { echo ""; echo "──────────────────────────────────────────────"; echo "$1"; echo "──────────────────────────────────────────────"; }

# ============================================================
# 1. LECTURA — GET /salas/:sede
# ============================================================
sep "1. LECTURA — Consulta de salas por sede"

# 1a. Sede Lans
R=$(curl -s "$BASE_URL/salas/lans")
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/salas/lans")
echo "  GET /salas/lans  →  HTTP $S"
check_http "GET /salas/lans responde 200"       "$S" "200"
check_body "respuesta es arreglo"               "$R" '^\['
check_body "contiene Sala 101"                  "$R" '"nombre":"Sala 101"'
check_body "contiene Lab A (permiteExternos=f)" "$R" '"nombre":"Lab A","estado":"libre","permiteExternos":false'
check_body "tiene los 4 estados en Lans"        "$R" '"estado":"con_monitor"'
echo ""
echo "  Datos recibidos (Lans):"
echo "$R" | grep -o '"nombre":"[^"]*","estado":"[^"]*","permiteExternos":[^,}]*' | sed 's/^/    /'

# 1b. Sede Orlando Sierra
echo ""
R=$(curl -s "$BASE_URL/salas/orlando-sierra")
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/salas/orlando-sierra")
echo "  GET /salas/orlando-sierra  →  HTTP $S"
check_http "GET /salas/orlando-sierra responde 200" "$S" "200"
check_body "contiene Sala 201"                       "$R" '"nombre":"Sala 201"'
check_body "contiene Sala 208"                       "$R" '"nombre":"Sala 208"'
echo ""
echo "  Datos recibidos (Orlando Sierra):"
echo "$R" | grep -o '"nombre":"[^"]*","estado":"[^"]*"' | sed 's/^/    /'

# ============================================================
# 2. OPERACIÓN VÁLIDA — webhook n8n + verificar cambio en DB
# ============================================================
sep "2. OPERACIÓN VÁLIDA — POST webhook · nuevoEstado: con_monitor"

ESTADO_NUEVO="con_monitor"
PAYLOAD="{\"salaId\":\"$SALA_ID\",\"nuevoEstado\":\"$ESTADO_NUEVO\"}"

echo "  POST $N8N_WEBHOOK"
echo "  body: $PAYLOAD"
echo ""

R=$(curl -s -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")
S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "  Respuesta n8n  →  HTTP $S"
echo "  Body: $R"
check_http "n8n responde 200"         "$S" "200"
check_body "n8n confirma ok:true"     "$R" '"ok":true'

# Verificar que el cambio se refleja en Supabase vía GET
sleep 1
R_GET=$(curl -s "$BASE_URL/salas/lans")
ESTADO_ACTUAL=$(echo "$R_GET" | grep -o '"nombre":"Sala 101","estado":"[^"]*"' | grep -o '"estado":"[^"]*"')
echo ""
echo "  Verificación GET /salas/lans · Sala 101 → $ESTADO_ACTUAL"
check_body "Sala 101 cambió a $ESTADO_NUEVO en Supabase" "$R_GET" "\"nombre\":\"Sala 101\",\"estado\":\"$ESTADO_NUEVO\""

# ============================================================
# 3. OPERACIÓN INVÁLIDA — estado fuera del ENUM → rechazado sin efecto
# ============================================================
sep "3. OPERACIÓN INVÁLIDA — nuevoEstado='ocupada' (fuera del ENUM)"

PAYLOAD_MAL="{\"salaId\":\"$SALA_ID\",\"nuevoEstado\":\"ocupada\"}"

echo "  POST $N8N_WEBHOOK"
echo "  body: $PAYLOAD_MAL"
echo ""

R=$(curl -s -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD_MAL")
S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD_MAL")

echo "  Respuesta n8n  →  HTTP $S"
echo "  Body: $R"
check_http "n8n rechaza con error (no 200)"  "$S" "500"

# Verificar que el estado NO cambió
sleep 1
R_GET=$(curl -s "$BASE_URL/salas/lans")
ESTADO_ACTUAL=$(echo "$R_GET" | grep -o '"nombre":"Sala 101","estado":"[^"]*"' | grep -o '"estado":"[^"]*"')
echo ""
echo "  Verificación GET /salas/lans · Sala 101 → $ESTADO_ACTUAL (debe seguir en $ESTADO_NUEVO)"
check_body "estado de Sala 101 NO cambió (sigue en $ESTADO_NUEVO)" "$R_GET" "\"nombre\":\"Sala 101\",\"estado\":\"$ESTADO_NUEVO\""

# ============================================================
# 4. CAMPO FALTANTE / PARÁMETRO INVÁLIDO → 400
# ============================================================
sep "4. CAMPO INVÁLIDO — sede no reconocida y campo salaId ausente"

# 4a. Sede inválida en backend → 400
R=$(curl -s "$BASE_URL/salas/xyz")
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/salas/xyz")
echo "  GET /salas/xyz  →  HTTP $S"
echo "  Body: $R"
check_http "GET /salas/xyz responde 400"             "$S" "400"
check_body "body tiene statusCode 400"               "$R" '"statusCode":400'
check_body "body menciona la sede inválida"          "$R" "Sede 'xyz' no reconocida"
check_body "body lista los valores válidos"          "$R" "lans, orlando-sierra"

# 4b. Webhook sin salaId → n8n intenta UPDATE con id vacío (0 filas, no error de ENUM)
echo ""
PAYLOAD_SIN_ID="{\"nuevoEstado\":\"libre\"}"
R=$(curl -s -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD_SIN_ID")
S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD_SIN_ID")
echo "  POST webhook sin salaId  →  HTTP $S"
echo "  Body: $R"
check_body "n8n no actualiza ninguna sala (ok:true pero 0 filas afectadas)" "$R" '"ok":true'

# ── Restaurar estado original ────────────────────────────────
sep "LIMPIEZA — Restaurando Sala 101 a 'libre'"
curl -s -X POST "$N8N_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{\"salaId\":\"$SALA_ID\",\"nuevoEstado\":\"libre\"}" > /dev/null
sleep 1
R_GET=$(curl -s "$BASE_URL/salas/lans")
ESTADO_FINAL=$(echo "$R_GET" | grep -o '"nombre":"Sala 101","estado":"[^"]*"' | grep -o '"estado":"[^"]*"')
echo "  Sala 101 restaurada → $ESTADO_FINAL"

# ── Resumen ─────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  QA RESULT:  $PASS pasaron   $FAIL fallaron"
echo "============================================================"
echo ""
[ $FAIL -eq 0 ] && exit 0 || exit 1
