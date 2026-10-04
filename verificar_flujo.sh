#!/bin/bash
# =====================================================================
#  verificar_flujo.sh  -  Prueba de humo del backend SMSeguro
#
#  COMO USARLO:
#    1) En una terminal, deja el backend corriendo:
#         npm run start:dev
#    2) En OTRA terminal, dentro de esta carpeta, ejecuta:
#         bash verificar_flujo.sh
# =====================================================================

BASE="http://localhost:3000"
CIU_EMAIL="ciudadano@smseguro.com";  CIU_PASS="Ciudadano123!"
ANA_EMAIL="analista@smseguro.com";   ANA_PASS="Analista123!"

PASS=0; FAILS=0
ok(){   echo "  OK  - $1"; PASS=$((PASS+1)); }
bad(){  echo "  MAL - $1"; FAILS=$((FAILS+1)); }
login(){ curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
         -d "{\"correo_electronico\":\"$1\",\"contrasena\":\"$2\"}" | jq -r '.accessToken // empty'; }

echo ""
echo "============================================"
echo "   PRUEBA DEL BACKEND SMSEGURO"
echo "============================================"

echo ""
echo "[1] Backend vivo"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
if [ "$CODE" != "000" ] && [ -n "$CODE" ]; then ok "El servidor responde en $BASE (codigo $CODE)"
else bad "El backend no responde. Corre primero: npm run start:dev"; echo ""; exit 1; fi

echo ""
echo "[2] Login de los dos usuarios"
TOK_CIU=$(login "$CIU_EMAIL" "$CIU_PASS")
[ -n "$TOK_CIU" ] && ok "Login ciudadano" || bad "Login ciudadano fallo"
TOK_ANA=$(login "$ANA_EMAIL" "$ANA_PASS")
[ -n "$TOK_ANA" ] && ok "Login analista"  || bad "Login analista fallo"

echo ""
echo "[3] Categoria valida"
CAT=$(curl -s "$BASE/categorias" -H "Authorization: Bearer $TOK_CIU" | jq -r '.[0].id_tipo_fraude // 1')
ok "Usando categoria id=$CAT"

echo ""
echo "[4] Ciudadano crea un reporte"
CREA=$(curl -s -X POST "$BASE/reportes" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK_CIU" \
       -d "{\"url\":\"https://sitio-de-prueba-$(date +%s).com\",\"descripcion\":\"Reporte de prueba automatico\",\"id_tipo_fraude\":$CAT}")
ID=$(echo "$CREA" | jq -r '.reporte.id_reporte // empty')
[ -n "$ID" ] && ok "Reporte creado (id=$ID)" || bad "No se creo el reporte: $CREA"

echo ""
echo "[5] El reporte aparece en 'mis-reportes' del ciudadano"
MINE=$(curl -s "$BASE/reportes/mis-reportes" -H "Authorization: Bearer $TOK_CIU" | jq "[.[] | select(.id_reporte==$ID)] | length")
[ "$MINE" = "1" ] && ok "Aparece en mis-reportes" || bad "No aparece en mis-reportes (resultado=$MINE)"

echo ""
echo "[6] El reporte aparece en la bandeja del analista (pendientes)"
PEND=$(curl -s "$BASE/reportes/pendientes" -H "Authorization: Bearer $TOK_ANA" | jq "[.[] | select(.id_reporte==$ID)] | length")
[ "$PEND" = "1" ] && ok "Aparece en pendientes" || bad "No aparece en pendientes (resultado=$PEND)"

echo ""
echo "[7] Seguridad: el ciudadano NO puede ver pendientes (se espera 403)"
C=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/reportes/pendientes" -H "Authorization: Bearer $TOK_CIU")
[ "$C" = "403" ] && ok "Ciudadano recibe 403 en pendientes" || bad "Se esperaba 403 y llego $C"

echo ""
echo "[8] Seguridad: dashboard de estadisticas solo para analista"
A=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/reportes/estadisticas/dashboard" -H "Authorization: Bearer $TOK_ANA")
[ "$A" = "200" ] && ok "Analista ve el dashboard (200)" || bad "Analista esperaba 200 y llego $A"
D=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/reportes/estadisticas/dashboard" -H "Authorization: Bearer $TOK_CIU")
[ "$D" = "403" ] && ok "Ciudadano recibe 403 en dashboard" || bad "Ciudadano esperaba 403 y llego $D"

echo ""
echo "[9] El analista dictamina el reporte (Aprobado)"
DIC=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/reportes/$ID/dictamen" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $TOK_ANA" -d '{"id_resolucion":1}')
[ "$DIC" = "201" ] && ok "Dictamen registrado (201)" || bad "Dictamen esperaba 201 y llego $DIC"

echo ""
echo "[10] El estado del reporte cambio a Aprobado (2)"
EST=$(curl -s "$BASE/reportes/$ID" -H "Authorization: Bearer $TOK_ANA" | jq -r '.id_estado_actual // .reporte.id_estado_actual // empty')
[ "$EST" = "2" ] && ok "id_estado_actual = 2 (Aprobado)" || bad "Se esperaba estado 2 y es '$EST'"

echo ""
echo "============================================"
echo "   RESULTADO:  $PASS correctas, $FAILS fallidas"
echo "============================================"
echo ""
