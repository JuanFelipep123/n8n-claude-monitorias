#!/usr/bin/env bash
BASE=http://localhost:3000

# 1. Sede válida en horario operativo (USE_MOCK=false o true, hora entre 07:00–15:00 Bogotá)
echo "=== lans — en horario ==="
curl -s "$BASE/salas/lans" | jq .

# 2. Sede válida fuera de horario — para forzar en demo: ajusta hora_cierre a '07:01' en SEDES
#    o ejecuta este curl después de las 15:00 hora Bogotá con USE_MOCK=true
echo ""
echo "=== lans — fuera de horario (todos estado: cerrada) ==="
curl -s "$BASE/salas/lans" | jq '[.[] | {nombre, estado}]'

# 3. Sede inválida — debe responder 400
echo ""
echo "=== sede inválida → 400 ==="
curl -s -w "\nHTTP %{http_code}\n" "$BASE/salas/xyz"
