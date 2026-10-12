#!/usr/bin/env bash
# =====================================================================================
# SECURITY PENETRATION & RLS VERIFICATION TEST SUITE
# SIMULACIÓN DE ATAQUES DIRECTOS (ANÓNIMOS, CLIENTES MALICIOSOS, CROSS-TENANT)
# =====================================================================================

SUPABASE_URL="https://tu-proyecto.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Supabase anon key pública
CUSTOMER_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.CUSTOMER_A..." # Token de Cliente A
MERCHANT_A_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.MERCHANT_A..." # Token de Dueño Negocio A
ATTACKER_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ATTACKER..." # Token de Cliente Atacante

echo "==========================================================================="
echo "INICIANDO BATERÍA DE PRUEBAS DE SEGURIDAD Y MÍNIMO PRIVILEGIO"
echo "==========================================================================="

# -------------------------------------------------------------------------------------
# VECTOR 1: ATAQUE ANÓNIMO - INTENTO DE VOLCADO DE BASE DE DATOS (PEDIDOS Y PAGOS)
# -------------------------------------------------------------------------------------
echo -e "\n[TEST 1] Petición anónima intentando leer la tabla 'orders'..."
curl -i -X GET "${SUPABASE_URL}/rest/v1/orders" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json"

# RESULTADO ESPERADO:
# HTTP/1.1 401 Unauthorized / 403 Forbidden
# Mensaje: "permission denied for table orders" (Por REVOKE ALL a anon a nivel de motor).

echo -e "\n[TEST 2] Petición anónima intentando leer la tabla 'payments'..."
curl -i -X GET "${SUPABASE_URL}/rest/v1/payments" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json"

# RESULTADO ESPERADO:
# HTTP/1.1 401 Unauthorized / 403 Forbidden

# -------------------------------------------------------------------------------------
# VECTOR 2: IDOR (INSECURE DIRECT OBJECT REFERENCE) ENTRE CLIENTES
# Cliente Atacante intenta leer el pedido del Cliente Víctima
# -------------------------------------------------------------------------------------
VICTIM_ORDER_ID="a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

echo -e "\n[TEST 3] Cliente Atacante intentando leer el pedido de la víctima (IDOR)..."
curl -i -X GET "${SUPABASE_URL}/rest/v1/orders?id=eq.${VICTIM_ORDER_ID}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATTACKER_JWT}" \
  -H "Content-Type: application/json"

# RESULTADO ESPERADO:
# HTTP/1.1 200 OK pero respuesta: [] (Array vacío).
# La política RLS filtra 'customer_id = auth.uid()'. El atacante no puede extraer los datos.

# -------------------------------------------------------------------------------------
# VECTOR 3: PARAMETER TAMPERING (MANIPULACIÓN DE PRECIOS EN EL CLIENTE)
# Atacante envía 'unit_price: 0.01' para un producto que cuesta $20.00
# -------------------------------------------------------------------------------------
ORDER_ID_ATTACKER="b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380b22"
EXPENSIVE_PRODUCT_ID="c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33"

echo -e "\n[TEST 4] Atacante intentando forzar un precio adulterado de $0.01..."
curl -i -X POST "${SUPABASE_URL}/rest/v1/order_items" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATTACKER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'"${ORDER_ID_ATTACKER}"'",
    "product_id": "'"${EXPENSIVE_PRODUCT_ID}"'",
    "quantity": 2,
    "unit_price": 0.01,
    "subtotal": 0.02
  }'

# RESULTADO ESPERADO:
# El Trigger PostgreSQL 'trg_before_insert_order_item' intercepta la transacción, consulta
# el precio oficial de 'products' ($20.00) y sobrescribe unit_price a 20.00 y subtotal a 40.00.

# -------------------------------------------------------------------------------------
# VECTOR 4: CLIENTE INTENTANDO AUTO-CONFIRMAR SU PAGO O INSERTAR EN 'payments'
# -------------------------------------------------------------------------------------
echo -e "\n[TEST 5] Atacante intentando inyectar un pago falso completado..."
curl -i -X POST "${SUPABASE_URL}/rest/v1/payments" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATTACKER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'"${ORDER_ID_ATTACKER}"'",
    "business_id": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44",
    "provider": "stripe",
    "transaction_id": "fake_tx_12345",
    "amount": 40.00,
    "status": "completed"
  }'

# RESULTADO ESPERADO:
# HTTP/1.1 403 Forbidden / "new row violates row-level security policy for table payments".
# Solo service_role o superadmin tienen autorización para insertar en la tabla de pagos.

# -------------------------------------------------------------------------------------
# VECTOR 5: CROSS-TENANT MODIFICATION (COMERCIO A ATACANDO A COMERCIO B)
# -------------------------------------------------------------------------------------
PRODUCT_OF_BUSINESS_B="e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55"

echo -e "\n[TEST 6] Comercio A intentando modificar el producto del Comercio B..."
curl -i -X PATCH "${SUPABASE_URL}/rest/v1/products?id=eq.${PRODUCT_OF_BUSINESS_B}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${MERCHANT_A_JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 0.00,
    "name": "Comercio Hackeado"
  }'

# RESULTADO ESPERADO:
# HTTP/1.1 200 OK con 0 filas actualizadas o 403 Forbidden.
# RLS evalúa: is_merchant(business_id) -> FALSE. El Comercio A no es dueño del Comercio B.

# -------------------------------------------------------------------------------------
# VECTOR 6: ACCESO ILEGAL A COMPROBANTES DE PAGO PRIVADOS EN STORAGE
# -------------------------------------------------------------------------------------
VICTIM_USER_ID="f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66"

echo -e "\n[TEST 7] Descarga de comprobante de pago privado de otro usuario..."
curl -i -X GET "${SUPABASE_URL}/storage/v1/object/payment_receipts/${VICTIM_USER_ID}/recibo_bancario.pdf" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATTACKER_JWT}"

# RESULTADO ESPERADO:
# HTTP/1.1 403 Forbidden / {"statusCode": 403, "message": "Access Denied"}
# La política RLS de Storage exige que (storage.foldername(name))[1] coincida con auth.uid().
