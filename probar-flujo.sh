#!/bin/bash
# Prueba el flujo completo del backend SMSeguro: registro, login, reporte y dashboard.
# Uso:  bash probar-flujo.sh
# Requisitos: el servidor corriendo (npm run start:dev) y los datos de prueba cargados.

BASE="http://localhost:3000"
OK="✅"; NO="❌"

# Saca un campo de un JSON (lo recibe por stdin). Ej: echo "$RESP" | campo "o.accessToken"
campo() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(eval('('+'JSON.parse(d)'+').'+process.argv[1]))}catch(e){console.log('')}})" "$1" 2>/dev/null; }

# Hace una petición y deja el cuerpo en $BODY y el código HTTP en $CODE
pedir() {
  local resp
  resp=$(curl -s -w $'\n%{http_code}' "$@")
  CODE=$(echo "$resp" | tail -n1)
  BODY=$(echo "$resp" | sed '$d')
}

echo "================================================"
echo "  Probando backend SMSeguro en $BASE"
echo "================================================"

# 0. ¿Está vivo el servidor?
if ! curl -s -o /dev/null "$BASE/auth/login" ; then
  echo "$NO No puedo conectar con $BASE"
  echo "   Levanta el servidor con:  npm run start:dev"
  exit 1
fi
echo "$OK El servidor responde"

# 1. REGISTRO (correo único con la hora actual para no chocar)
CORREO="prueba_$(date +%s)@smseguro.com"
echo
echo "--- 1. Registro de usuario nuevo ($CORREO) ---"
pedir -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"nombre_usuario\":\"Estudiante Prueba\",\"correo_electronico\":\"$CORREO\",\"contrasena\":\"Password123\"}"
if [ "$CODE" = "201" ]; then echo "$OK 201 Registrado"; else echo "$NO Esperaba 201, llegó $CODE: $BODY"; fi

# 2. LOGIN con ese usuario nuevo
echo
echo "--- 2. Login del usuario nuevo ---"
pedir -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"correo_electronico\":\"$CORREO\",\"contrasena\":\"Password123\"}"
TOKEN_CIUDADANO=$(echo "$BODY" | campo "accessToken")
if [ "$CODE" = "201" ] && [ -n "$TOKEN_CIUDADANO" ]; then echo "$OK 201 Login OK, token recibido"; else echo "$NO Esperaba 201 con token, llegó $CODE: $BODY"; fi

# 3. CREAR un reporte con ese token
echo
echo "--- 3. Crear un reporte ---"
pedir -X POST "$BASE/reportes" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CIUDADANO" \
  -d "{\"url\":\"https://sitio-falso-$(date +%s).com/oferta\",\"descripcion\":\"Reporte de prueba automatico\",\"id_tipo_fraude\":1}"
ID_REPORTE=$(echo "$BODY" | campo "reporte.id_reporte")
FOLIO=$(echo "$BODY" | campo "reporte.folio_publico")
if [ "$CODE" = "201" ]; then echo "$OK 201 Reporte creado (id=$ID_REPORTE, folio=$FOLIO)"; else echo "$NO Esperaba 201, llegó $CODE: $BODY"; fi

# 4. MIS-ESTADISTICAS del usuario nuevo (debe decir 1)
echo
echo "--- 4. Mis estadisticas (reportes enviados) ---"
pedir "$BASE/reportes/mis-estadisticas" -H "Authorization: Bearer $TOKEN_CIUDADANO"
TOTAL=$(echo "$BODY" | campo "total_reportes")
if [ "$CODE" = "200" ]; then echo "$OK 200 total_reportes = $TOTAL"; else echo "$NO Esperaba 200, llegó $CODE: $BODY"; fi

# 5. DASHBOARD como CIUDADANO -> debe ser 403
echo
echo "--- 5. Dashboard como ciudadano (debe ser 403) ---"
pedir "$BASE/reportes/estadisticas/dashboard" -H "Authorization: Bearer $TOKEN_CIUDADANO"
if [ "$CODE" = "403" ]; then echo "$OK 403 Bloqueado correctamente (seguridad por rol)"; else echo "$NO Esperaba 403, llegó $CODE: $BODY"; fi

# 6. LOGIN como ANALISTA
echo
echo "--- 6. Login como analista ---"
pedir -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"correo_electronico\":\"analista@smseguro.com\",\"contrasena\":\"Analista123!\"}"
TOKEN_ANALISTA=$(echo "$BODY" | campo "accessToken")
if [ "$CODE" = "201" ] && [ -n "$TOKEN_ANALISTA" ]; then echo "$OK 201 Login analista OK"; else echo "$NO Esperaba 201, llegó $CODE: $BODY"; echo "   (Revisa que corriste dictamen.sql, que crea al analista)"; fi

# 7. DASHBOARD como ANALISTA -> 200
echo
echo "--- 7. Dashboard como analista (debe ser 200) ---"
pedir "$BASE/reportes/estadisticas/dashboard" -H "Authorization: Bearer $TOKEN_ANALISTA"
if [ "$CODE" = "200" ]; then
  echo "$OK 200 Dashboard OK. Total de reportes: $(echo "$BODY" | campo "total_reportes")"
  echo "   Por categoria:"
  echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{JSON.parse(d).por_categoria.forEach(c=>console.log('     - '+c.nombre_tipo+': '+c.total))}catch(e){}})"
else echo "$NO Esperaba 200, llegó $CODE: $BODY"; fi

echo
echo "================================================"
echo "  Fin de la prueba"
echo "================================================"
