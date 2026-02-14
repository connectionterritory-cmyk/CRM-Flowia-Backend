#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-https://api.flowiadigital.com}"
ORIGIN="${ORIGIN:-https://crm.flowiadigital.com}"
ADMIN_DIAG_TOKEN="${ADMIN_DIAG_TOKEN:-REPLACE_ME}"

echo "1) Health"
curl -i "${API_BASE}/api/health"

echo ""
echo "2) CORS preflight"
curl -i -X OPTIONS "${API_BASE}/api/auth/login" \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type, authorization"

echo ""
echo "3) Login (expected 200/401/403/409)"
login_status=$(curl -s -o /tmp/login.response -w "%{http_code}" -X POST "${API_BASE}/api/auth/login" \
  -H "Origin: ${ORIGIN}" \
  -H "Content-Type: application/json" \
  -d '{"codigo":"REPLACE_ME","password":"REPLACE_ME"}')
cat /tmp/login.response
echo ""
echo "Login status: ${login_status}"
if [ "${login_status}" = "500" ]; then
  echo "ERROR: login returned 500"
  exit 1
fi

echo ""
echo "4) Diag health-db"
curl -i "${API_BASE}/api/diag/health-db" \
  -H "Authorization: Bearer ${ADMIN_DIAG_TOKEN}"
