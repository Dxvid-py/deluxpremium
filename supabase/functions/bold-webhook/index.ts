import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-bold-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

async function hmacHex(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function updateOrder(orderNumber: string, values: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) throw new Error("Faltan variables de Supabase.");
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

function findReference(data: Record<string, unknown>) {
  const candidates = [
    data.reference_id,
    data.external_reference,
    data.order_id,
    (data.metadata as Record<string, unknown> | undefined)?.reference,
    (data.metadata as Record<string, unknown> | undefined)?.order_number,
  ];
  return candidates.find((value): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(value));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-bold-signature")?.trim() ?? "";
    const secretKey = Deno.env.get("BOLD_SECRET_KEY")?.trim();
    if (!secretKey) throw new Error("Falta configurar BOLD_SECRET_KEY");
    if (!signature) return new Response("Missing signature", { status: 400, headers: corsHeaders });

    const expected = await hmacHex(bytesToBase64(new TextEncoder().encode(rawBody)), secretKey);
    if (!timingSafeEqual(expected, signature)) return new Response("Invalid signature", { status: 400, headers: corsHeaders });

    const event = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = String(event.type ?? "").toUpperCase();
    const data = event.data && typeof event.data === "object" ? event.data as Record<string, unknown> : {};
    const orderNumber = findReference(data);

    if (!orderNumber) {
      console.warn("Bold webhook sin referencia de pedido", event);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const transactionId = typeof data.payment_id === "string" ? data.payment_id : typeof event.subject === "string" ? event.subject : null;
    const map: Record<string, string> = {
      SALE_APPROVED: "approved",
      SALE_REJECTED: "rejected",
      VOID_APPROVED: "voided",
      VOID_REJECTED: "void_rejected",
    };
    const paymentStatus = map[eventType] ?? "unknown";
    const updates: Record<string, unknown> = {
      payment_provider: "bold",
      payment_status: paymentStatus,
      payment_transaction_id: transactionId,
      payment_updated_at: new Date().toISOString(),
    };
    if (eventType === "SALE_APPROVED") updates.status = "pagado";
    if (eventType === "SALE_REJECTED") updates.status = "pago_rechazado";
    if (eventType === "VOID_APPROVED") updates.status = "anulado";

    await updateOrder(orderNumber, updates);
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("bold-webhook:", error);
    return new Response("Webhook error", { status: 500, headers: corsHeaders });
  }
});
