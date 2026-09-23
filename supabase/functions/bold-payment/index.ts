import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function getEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Falta configurar ${name}`);
  return value;
}

function validOrderNumber(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(value);
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getOrder(orderNumber: string) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const query = new URLSearchParams({
    select: "id,order_number,total_cop,customer_name,customer_phone,customer_email,address,city,payment_status,payment_transaction_id",
    order_number: `eq.${orderNumber}`,
    limit: "1",
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/orders?${query.toString()}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) throw new Error(`No se pudo consultar el pedido (${response.status}).`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function updateOrder(orderNumber: string, values: Record<string, unknown>) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error(`No se pudo actualizar el pedido (${response.status}).`);
}

async function prepare(body: Record<string, unknown>) {
  const orderNumber = body.orderNumber;
  if (!validOrderNumber(orderNumber)) throw new Error("Referencia de pedido inválida.");

  const callbackUrl = typeof body.callbackUrl === "string" ? body.callbackUrl.trim() : "";
  if (!/^https:\/\//i.test(callbackUrl)) throw new Error("La URL de retorno debe usar HTTPS.");

  const order = await getOrder(orderNumber);
  if (!order) throw new Error("No encontramos el pedido.");

  if (String(order.payment_status ?? "").toLowerCase() === "approved") throw new Error("Este pedido ya figura como pagado.");

  const amount = Math.round(Number(order.total_cop));
  if (!Number.isFinite(amount) || amount < 1000) throw new Error("El total del pedido no es válido para Bold.");

  const identityKey = getEnv("BOLD_IDENTITY_KEY");
  const secretKey = getEnv("BOLD_SECRET_KEY");
  const integritySignature = await sha256Hex(`${order.order_number}${amount}COP${secretKey}`);

  await updateOrder(order.order_number, {
    payment_provider: "bold",
    payment_status: "pending",
    payment_updated_at: new Date().toISOString(),
  });

  return {
    orderId: order.order_number,
    amount,
    currency: "COP",
    apiKey: identityKey,
    integritySignature,
    description: `Pedido ${order.order_number} · Floristería Deluxury`,
  };
}

async function status(body: Record<string, unknown>) {
  const orderNumber = body.orderNumber;
  if (!validOrderNumber(orderNumber)) throw new Error("Referencia de pedido inválida.");

  const order = await getOrder(orderNumber);
  if (!order) throw new Error("No encontramos el pedido.");

  const identityKey = getEnv("BOLD_IDENTITY_KEY");
  const response = await fetch(`https://payments.api.bold.co/v2/payment-voucher/${encodeURIComponent(order.order_number)}`, {
    headers: { Authorization: `x-api-key ${identityKey}` },
  });

  if (response.status === 404) {
    return { orderNumber: order.order_number, paymentStatus: order.payment_status ?? "pending", orderStatus: order.status, found: false };
  }

  if (!response.ok) throw new Error(`Bold respondió ${response.status} al consultar el pago.`);
  const data = await response.json();
  const paymentStatus = String(data?.payment_status ?? "UNKNOWN").toUpperCase();
  const transactionId = typeof data?.transaction_id === "string" ? data.transaction_id : null;

  const updates: Record<string, unknown> = {
    payment_provider: "bold",
    payment_status: paymentStatus.toLowerCase(),
    payment_transaction_id: transactionId,
    payment_updated_at: new Date().toISOString(),
  };
  if (paymentStatus === "APPROVED") updates.status = "pagado";
  if (["REJECTED", "FAILED", "VOIDED"].includes(paymentStatus)) updates.status = "pago_rechazado";

  await updateOrder(order.order_number, updates);

  return {
    orderNumber: order.order_number,
    paymentStatus: paymentStatus.toLowerCase(),
    orderStatus: paymentStatus === "APPROVED" ? "pagado" : paymentStatus === "REJECTED" || paymentStatus === "FAILED" || paymentStatus === "VOIDED" ? "pago_rechazado" : order.status,
    transactionId,
    found: true,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json() as Record<string, unknown>;
    const action = body.action === "status" ? "status" : "prepare";
    const result = action === "status" ? await status(body) : await prepare(body);
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    console.error("bold-payment:", message);
    return json({ error: message }, 400);
  }
});
