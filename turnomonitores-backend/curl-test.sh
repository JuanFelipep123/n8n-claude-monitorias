#!/usr/bin/env bash
BASE=http://localhost:3000
PASS=0
FAIL=0

check() {
  local desc="$1" result="$2" expected="$3"
  if echo "$result" | grep -q "$expected"; then
    echo "  PASS  $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $desc"
    echo "        esperado: $expected"
    echo "        obtenido: $(echo "$result" | head -c 120)"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "============================================"
echo "  TurnoMonitores — curl tests · $BASE"
echo "============================================"

# ── 1. GET /salas/lans ─────────────────────────
echo ""
echo "[ GET /salas/lans ]"
R=$(curl -s "$BASE/salas/lans")
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/salas/lans")
check "responde 200"                              "$S" "200"
check "contiene Sala 101"                         "$R" '"nombre":"Sala 101"'
check "contiene Lab A"                            "$R" '"nombre":"Lab A"'
check "Lab A tiene permiteExternos false"         "$R" '"nombre":"Lab A","estado":"libre","permiteExternos":false'
check "Lab B tiene permiteExternos false"         "$R" '"nombre":"Lab B"'
check "tiene campo updatedAt"                     "$R" '"updatedAt":'
check "estado libre existe en la respuesta"       "$R" '"estado":"libre"'
check "estado en_clase existe"                    "$R" '"estado":"en_clase"'
check "estado con_monitor existe"                 "$R" '"estado":"con_monitor"'
check "estado cerrada existe"                     "$R" '"estado":"cerrada"'

# ── 2. GET /salas/orlando-sierra ───────────────
echo ""
echo "[ GET /salas/orlando-sierra ]"
R=$(curl -s "$BASE/salas/orlando-sierra")
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/salas/orlando-sierra")
check "responde 200"                              "$S" "200"
check "contiene Sala 201"                         "$R" '"nombre":"Sala 201"'
check "contiene Sala 208"                         "$R" '"nombre":"Sala 208"'
check "tiene campo permiteExternos"               "$R" '"permiteExternos":'

# ── 3. GET /salas/xyz — sede inválida ──────────
echo ""
echo "[ GET /salas/xyz — sede inválida ]"
R=$(curl -s "$BASE/salas/xyz")
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/salas/xyz")
check "responde 400"                              "$S" "400"
check "body tiene statusCode 400"                 "$R" '"statusCode":400'
check "body tiene error Bad Request"              "$R" '"error":"Bad Request"'
check "mensaje menciona la sede xyz"              "$R" "Sede 'xyz' no reconocida"
check "mensaje lista los valores válidos"         "$R" "lans, orlando-sierra"

# ── 4. GET /salas/LANS — case-sensitive ────────
echo ""
echo "[ GET /salas/LANS — case-sensitive ]"
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/salas/LANS")
check "responde 400 (mayúsculas no son válidas)"  "$S" "400"

# ── Resumen ────────────────────────────────────
echo ""
echo "============================================"
echo "  $PASS pasaron   $FAIL fallaron"
echo "============================================"
echo ""
[ $FAIL -eq 0 ] && exit 0 || exit 1
