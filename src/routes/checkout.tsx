import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import { getBoldPaymentStatus, openBoldCheckout, prepareBoldPayment } from "@/lib/bold-payment";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar pedido · Floristería Deluxury" },
      {
        name: "description",
        content:
          "Completa los datos de entrega y paga tu pedido de flores premium de forma segura.",
      },
      { property: "og:title", content: "Finalizar pedido · Deluxury" },
      {
        property: "og:description",
        content: "Datos de entrega, dedicatoria y pago seguro.",
      },
    ],
  }),
  component: Checkout,
});

const SLOTS = ["9:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00", "18:00 – 20:00"];

function Checkout() {
  const { lines, subtotal, clear, currency, deliveryWithFlorencio, setDeliveryWithFlorencio } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const [sending, setSending] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<"checking" | "approved" | "rejected" | null>(null);
  const [paymentOrderNumber, setPaymentOrderNumber] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    recipient_name: "",
    address: "",
    city: "Barranquilla",
    delivery_date: "",
    delivery_slot: SLOTS[0]!,
    dedication: "",
    notes: "",
  });

  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const shipping = Number(settings?.["shipping_cop"] ?? 18000);
  const freeFrom = Number(settings?.["free_shipping_from_cop"] ?? 350000);
  const shippingDue = subtotal >= freeFrom ? 0 : shipping;
  const florencioEnabled = settings?.["florencio_delivery_enabled"] !== "false";
  const florencioFee = florencioEnabled && deliveryWithFlorencio ? Number(settings?.["florencio_delivery_price_cop"] ?? 0) : 0;
  const total = subtotal + shippingDue + florencioFee;
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackOrder = params.get("bold-order-id") || params.get("bold_order_id");
    const callbackStatus = (params.get("bold-tx-status") || params.get("bold_tx_status") || "").toLowerCase();
    if (!callbackOrder) return;

    let cancelled = false;
    setPaymentOrderNumber(callbackOrder);
    setPaymentNotice("checking");

    const check = async () => {
      try {
        const result = await getBoldPaymentStatus(callbackOrder);
        if (cancelled) return;
        const status = result.paymentStatus.toLowerCase();
        if (status === "approved") {
          setPaymentNotice("approved");
          clear();
          setDeliveryWithFlorencio(false);
          return true;
        }
        if (["rejected", "failed", "voided"].includes(status) || callbackStatus === "rejected") {
          setPaymentNotice("rejected");
          return true;
        }
      } catch (error) {
        console.error("No se pudo verificar el pago Bold", error);
      }
      return false;
    };

    void (async () => {
      for (let attempt = 0; attempt < 5 && !cancelled; attempt += 1) {
        if (await check()) break;
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }
    })();

    return () => { cancelled = true; };
  }, [clear, setDeliveryWithFlorencio]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) return;
    if (!form.customer_name || !form.customer_phone || !form.address) {
      toast.error("Completa nombre, teléfono y dirección de entrega.");
      return;
    }
    setSending(true);

    const { data: sessionData } = await supabase.auth.getSession();

    const payload = {
      user_id: sessionData.session?.user.id ?? null,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email || null,
      recipient_name: form.recipient_name || null,
      address: form.address,
      city: form.city,
      delivery_date: form.delivery_date || null,
      delivery_slot: form.delivery_slot,
      dedication: form.dedication || null,
      notes: [form.notes, deliveryWithFlorencio ? `Domicilio especial con Florencio${florencioFee ? `: +${florencioFee}` : ""}` : ""].filter(Boolean).join(" · ") || null,
      items: lines.map((l) => ({
        product_id: l.product_id,
        name: l.name,
        slug: l.slug,
        image: l.image,
        qty: l.qty,
        price_cop: l.price_cop,
      })),
      subtotal_cop: subtotal,
      shipping_cop: shippingDue,
      total_cop: total,
    };

    const { data, error } = await supabase
      .from("orders")
      .insert(payload)
      .select("order_number")
      .single();

    setSending(false);

    if (error) {
      toast.error("No pudimos registrar el pedido. Intenta de nuevo.");
      return;
    }

    const orderNumber = (data as { order_number: string } | null)?.order_number ?? "";
    if (!orderNumber) {
      setSending(false);
      toast.error("No recibimos el número del pedido.");
      return;
    }

    try {
      const callbackUrl = `${window.location.origin}/checkout`;
      const payment = await prepareBoldPayment(orderNumber, callbackUrl);
      setPaymentOrderNumber(orderNumber);
      toast.success("Abriendo el pago seguro…");
      await openBoldCheckout({
        payment,
        callbackUrl,
        customer: { name: form.customer_name, phone: form.customer_phone, email: form.customer_email || null },
        address: { address: form.address, city: form.city, country: "CO" },
      });
    } catch (error) {
      console.error("Bold checkout error", error);
      toast.error("No pudimos abrir el pago. Puedes continuar por WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  const whatsappMessage = [
    `Hola, Deluxury. Quiero cotizar mi pedido${paymentOrderNumber ? ` ${paymentOrderNumber}` : ""} por WhatsApp.`,
    "",
    ...lines.map((l) => `• ${l.qty} × ${l.name} — ${formatMoney(l.price_cop * l.qty, "COP", trm)}`),
    "",
    `Total estimado: ${formatMoney(total, "COP", trm)}`,
    `Cliente: ${form.customer_name || "Por confirmar"} (${form.customer_phone || "Por confirmar"})`,
    `Dirección: ${form.address || "Por confirmar"}, ${form.city}`,
  ].join("\n");

  const field =
    "w-full border border-input bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-primary";

  return (
    <div className="pt-32 pb-24 md:pt-40">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
          Datos de <span className="text-lux-gradient italic">entrega</span>
        </h1>

        {lines.length === 0 ? (
          <div className="mt-16">
            {paymentNotice === "approved" ? (
              <div className="max-w-2xl rounded-2xl border border-primary/20 bg-secondary/40 p-8">
                <p className="eyebrow">Pago confirmado</p>
                <h2 className="mt-3 font-display text-3xl">Gracias por confiar en Deluxury.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Tu pedido {paymentOrderNumber} fue registrado correctamente. Conserva esta referencia para cualquier consulta.
                </p>
                <Link
                  to="/catalogo"
                  className="mt-6 inline-flex bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase"
                >
                  Volver al catálogo
                </Link>
              </div>
            ) : paymentNotice === "checking" ? (
              <div className="max-w-2xl rounded-2xl border border-border bg-secondary/30 p-8">
                <p className="eyebrow">Verificando pago</p>
                <h2 className="mt-3 font-display text-3xl">Estamos confirmando tu pedido.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  No cierres esta página todavía. Estamos consultando el estado de la transacción con Bold.
                </p>
              </div>
            ) : (
              <>
                <p className="font-display text-2xl text-muted-foreground">Tu carrito está vacío.</p>
                <Link
                  to="/catalogo"
                  className="mt-6 inline-block bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase"
                >
                  Ver catálogo
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
            <form onSubmit={submit} className="space-y-8">
              <fieldset className="space-y-4">
                <legend className="eyebrow mb-3">Quién ordena</legend>
                <input
                  className={field}
                  placeholder="Nombre completo *"
                  value={form.customer_name}
                  onChange={(e) => set("customer_name", e.target.value)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className={field}
                    placeholder="Teléfono / WhatsApp *"
                    value={form.customer_phone}
                    onChange={(e) => set("customer_phone", e.target.value)}
                  />
                  <input
                    className={field}
                    type="email"
                    placeholder="Correo electrónico"
                    value={form.customer_email}
                    onChange={(e) => set("customer_email", e.target.value)}
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="eyebrow mb-3">Entrega</legend>
                <input
                  className={field}
                  placeholder="Nombre de quien recibe"
                  value={form.recipient_name}
                  onChange={(e) => set("recipient_name", e.target.value)}
                />
                <input
                  className={field}
                  placeholder="Dirección completa (con apto / torre) *"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <input
                    className={field}
                    placeholder="Ciudad"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                  <input
                    className={field}
                    type="date"
                    value={form.delivery_date}
                    onChange={(e) => set("delivery_date", e.target.value)}
                  />
                  <select
                    className={`${field} bg-card`}
                    value={form.delivery_slot}
                    onChange={(e) => set("delivery_slot", e.target.value)}
                  >
                    {SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>

              {florencioEnabled && (
                <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-primary/20 bg-secondary/35 p-4">
                  <input type="checkbox" checked={deliveryWithFlorencio} onChange={(e) => setDeliveryWithFlorencio(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">Domicilio especial con Florencio</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{florencioFee > 0 ? `Suma ${formatMoney(florencioFee, currency, trm)} al total.` : "Tarifa a coordinar."}</span>
                  </span>
                </label>
              )}

              <fieldset className="space-y-4">
                <legend className="eyebrow mb-3">Detalles</legend>
                <textarea
                  className={`${field} min-h-24`}
                  placeholder="Dedicatoria para la tarjeta"
                  value={form.dedication}
                  onChange={(e) => set("dedication", e.target.value)}
                />
                <textarea
                  className={`${field} min-h-20`}
                  placeholder="Notas para el mensajero"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </fieldset>

              {paymentNotice === "approved" && (
                <div className="rounded-2xl border border-primary/20 bg-secondary/40 p-5 text-sm">
                  <p className="font-medium">Pago confirmado.</p>
                  <p className="mt-1 text-muted-foreground">Tu pedido {paymentOrderNumber} quedó registrado. Gracias por confiar en Deluxury.</p>
                </div>
              )}

              {paymentNotice === "rejected" && (
                <div className="rounded-2xl border border-border bg-secondary/30 p-5 text-sm">
                  <p className="font-medium">No pudimos completar el pago.</p>
                  <p className="mt-1 text-muted-foreground">No te preocupes. Puedes terminar tu pedido directamente por WhatsApp.</p>
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center bg-primary px-6 py-3 text-[11px] tracking-[0.2em] text-primary-foreground uppercase"
                  >
                    Cotizar por WhatsApp
                  </a>
                </div>
              )}

              {paymentNotice !== "approved" && (
                <>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-primary py-4 text-[11px] tracking-[0.28em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {sending ? "Preparando pago…" : "Pagar ahora"}
                  </button>
                  <p className="text-center text-xs leading-5 text-muted-foreground">
                    Pago seguro. Si tienes problemas para pagar o prefieres hacerlo por WhatsApp, podemos ayudarte con tu pedido.
                  </p>
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center text-xs font-medium underline underline-offset-4"
                  >
                    ¿Prefieres cotizar por WhatsApp?
                  </a>
                </>
              )}
            </form>

            <aside className="surface-glass h-fit rounded-sm p-7">
              <p className="eyebrow">Resumen</p>
              <ul className="mt-6 space-y-4">
                {lines.map((l) => (
                  <li key={l.product_id} className="flex gap-4">
                    <img
                      src={l.image}
                      alt={l.name}
                      loading="lazy"
                      className="h-20 w-16 rounded-sm object-cover"
                    />
                    <div className="flex-1 text-sm">
                      <p className="font-display text-lg leading-tight">{l.name}</p>
                      <p className="text-muted-foreground">
                        {l.qty} × {formatMoney(l.price_cop, currency, trm)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hairline my-6" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal, currency, trm)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span>
                    {shippingDue === 0 ? "Cortesía" : formatMoney(shippingDue, currency, trm)}
                  </span>
                </div>
                {deliveryWithFlorencio && (
                  <div className="flex justify-between">
                    <span>Domicilio con Florencio</span>
                    <span>{florencioFee ? formatMoney(florencioFee, currency, trm) : "A coordinar"}</span>
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-baseline justify-between">
                <span className="eyebrow">Total</span>
                <span className="font-display text-2xl text-primary">
                  {formatMoney(total, currency, trm)}
                </span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
