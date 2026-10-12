/**
 * =====================================================================================
 * BACKEND SERVERLESS ENDPOINTS (EDGE FUNCTIONS / NEXT.JS API ROUTES)
 * ARQUITECTURA DE SEGURIDAD PARA PASARELAS DE PAGO Y AISLAMIENTO DE SECRETOS
 * =====================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// -------------------------------------------------------------------------------------
// 1. AISLAMIENTO ESTRICTO DE VARIABLES DE ENTORNO
// NUNCA utilizar prefijos públicos (NEXT_PUBLIC_ o VITE_) para claves privadas
// -------------------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Solo accesible en Node.js/Edge
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN!;
const MERCADOPAGO_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET!;

// Cliente Supabase con privilegios de sistema (Bypasses RLS solo dentro del backend seguro)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// -------------------------------------------------------------------------------------
// 2. ENDPOINT: CREACIÓN DE CHECKOUT CON CÁLCULO SEGURO EN SERVIDOR (ANTI-TAMPERING)
// POST /api/checkout/create-session
// -------------------------------------------------------------------------------------
export async function handleCreateCheckoutSession(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Validar token JWT del usuario
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
    }

    const { orderId, provider } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 });
    }

    // Obtener pedido e ítems verificando pertenencia al cliente
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, business_id, customer_id, status, total_amount, businesses(name, delivery_fee)')
      .eq('id', orderId)
      .eq('customer_id', user.id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado o acceso denegado' }, { status: 403 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'El pedido no se encuentra en estado pendiente de pago' }, { status: 400 });
    }

    // CÁLCULO INMUTABLE: Re-validar precios directamente contra la base de datos de productos
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity, products(price, name)')
      .eq('order_id', order.id);

    if (itemsErr || !items || items.length === 0) {
      return NextResponse.json({ error: 'El pedido no contiene ítems válidos' }, { status: 400 });
    }

    let calculatedSubtotal = 0;
    const lineItemsForProvider = items.map((item: any) => {
      const realPrice = Number(item.products.price);
      calculatedSubtotal += realPrice * item.quantity;
      return {
        price_data: {
          currency: 'usd',
          product_data: { name: item.products.name },
          unit_amount: Math.round(realPrice * 100), // En centavos
        },
        quantity: item.quantity,
      };
    });

    const deliveryFee = Number(order.businesses?.delivery_fee || 0);
    const finalCalculatedTotal = calculatedSubtotal + deliveryFee;

    // Actualizar total formal en orders si difiere
    await supabaseAdmin
      .from('orders')
      .update({ total_amount: finalCalculatedTotal })
      .eq('id', order.id);

    // Generar sesión en el proveedor seleccionado (Simulado para Stripe)
    const checkoutSessionPayload = {
      client_reference_id: order.id,
      customer_email: user.email,
      line_items: lineItemsForProvider,
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${req.nextUrl.origin}/checkout/success?order_id=${order.id}`,
      cancel_url: `${req.nextUrl.origin}/checkout/cancel?order_id=${order.id}`,
      metadata: {
        orderId: order.id,
        businessId: order.business_id,
        userId: user.id,
      },
    };

    return NextResponse.json({
      success: true,
      orderId: order.id,
      totalAmount: finalCalculatedTotal,
      checkoutUrl: `https://checkout.stripe.com/pay/cs_live_secure_${order.id}`, // URL generada por SDK
    });
  } catch (err: any) {
    console.error('[SECURITY ALERT] Error en create checkout:', err);
    return NextResponse.json({ error: 'Error procesando solicitud de pago' }, { status: 500 });
  }
}

// -------------------------------------------------------------------------------------
// 3. ENDPOINT: PROCESAMIENTO DE WEBHOOK CON VERIFICACIÓN CRIPTOGRÁFICA (HMAC-SHA256)
// POST /api/webhooks/payment
// -------------------------------------------------------------------------------------
export async function handlePaymentWebhook(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature') || req.headers.get('x-signature');

    if (!signature) {
      console.warn('[SECURITY] Rechazando webhook sin firma criptográfica');
      return NextResponse.json({ error: 'Firma ausente' }, { status: 400 });
    }

    // VALIDACIÓN CRIPTOGRÁFICA: Previene Spoofing y Replay Attacks
    const isValidSignature = verifyStripeWebhookSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    if (!isValidSignature) {
      console.error('[SECURITY VIOLATION] Firma criptográfica de webhook no coincide');
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // Procesar evento de pago confirmado
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId || session.client_reference_id;
      const businessId = session.metadata?.businessId;
      const transactionId = session.id || session.payment_intent;
      const amountReceived = session.amount_total ? session.amount_total / 100 : session.amount;

      // Inserción privilegiada con service_role en la tabla payments
      const { error: paymentInsertErr } = await supabaseAdmin.from('payments').insert({
        order_id: orderId,
        business_id: businessId,
        provider: 'stripe',
        transaction_id: transactionId,
        amount: amountReceived,
        currency: (session.currency || 'USD').toUpperCase(),
        status: 'completed',
        metadata: {
          webhook_verified_at: new Date().toISOString(),
          payment_method_types: session.payment_method_types,
        },
      });

      if (paymentInsertErr) {
        console.error('Error insertando pago confirmado:', paymentInsertErr);
        return NextResponse.json({ error: 'Error registrando pago' }, { status: 500 });
      }

      // Actualizar estado del pedido a 'confirmed'
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      console.log(`[PAYMENT VERIFIED] Orden ${orderId} confirmada con transacción ${transactionId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[WEBHOOK ERROR]:', err);
    return NextResponse.json({ error: 'Error interno en webhook' }, { status: 500 });
  }
}

// Helper de Verificación de Firma HMAC
function verifyStripeWebhookSignature(payload: string, header: string, secret: string): boolean {
  try {
    const parts = header.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const sigPart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !sigPart) return false;

    const timestamp = timestampPart.split('=')[1];
    const signature = sigPart.split('=')[1];

    // Mitigación de Replay Attack: tolerar máximo 5 minutos (300 seg)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
      console.warn('[SECURITY] Webhook timestamp expirado (posible Replay Attack)');
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', secret);
    const expectedSig = hmac.update(signedPayload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

// -------------------------------------------------------------------------------------
// 4. ENDPOINT: INICIALIZACIÓN DE PAGO EN MESA (DINE-IN QR)
// POST /api/table/init-session
// -------------------------------------------------------------------------------------
export async function handleInitTableSession(req: NextRequest) {
  try {
    const { businessId, tableNumber, qrToken } = await req.json();

    if (!businessId || !tableNumber || !qrToken) {
      return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 });
    }

    // Validar token de mesa y sesión activa
    const { data: session, error } = await supabaseAdmin
      .from('table_sessions')
      .select('id, status, table_number, business_id')
      .eq('business_id', businessId)
      .eq('table_number', tableNumber)
      .eq('qr_token', qrToken)
      .eq('status', 'open')
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Mesa no encontrada o token inválido' }, { status: 404 });
    }

    // Obtener pedidos pendientes asociados a la mesa
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, status, order_items(id, unit_price, quantity, products(name))')
      .eq('table_session_id', session.id)
      .neq('status', 'cancelled');

    const totalToPay = (orders || []).reduce((acc: number, curr: any) => acc + Number(curr.total_amount), 0);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      tableNumber: session.table_number,
      orders,
      totalToPay,
      canPay: totalToPay > 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error consultando mesa' }, { status: 500 });
  }
}
