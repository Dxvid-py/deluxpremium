import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar pedido · Floristería Deluxe Premium" },
      {
        name: "description",
        content:
          "Completa los datos de entrega y confirma tu pedido de flores premium por WhatsApp.",
      },
      { property: "og:title", content: "Finalizar pedido · Deluxe Premium" },
      {
        property: "og:description",
        content: "Datos de entrega, dedicatoria y confirmación por WhatsApp.",
      },
    ],
  }),
  component: Checkout,
});

const SLOTS = ["9:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00", "18:00 – 20:00"];

function Checkout() {
  const { lines, subtotal, clear, currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const [sending, setSending] = useState(false);
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
  const total = subtotal + shippingDue;
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";

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

    const payload = {
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email || null,
      recipient_name: form.recipient_name || null,
      address: form.address,
      city: form.city,
      delivery_date: form.delivery_date || null,
      delivery_slot: form.delivery_slot,
      dedication: form.dedication || null,
      notes: form.notes || null,
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
    const message = [
      `*Nuevo pedido ${orderNumber}* — Floristería Deluxe Premium`,
      "",
      ...lines.map((l) => `• ${l.qty} × ${l.name} — ${formatMoney(l.price_cop * l.qty, "COP", trm)}`),
      "",
      `Subtotal: ${formatMoney(subtotal, "COP", trm)}`,
      `Envío: ${shippingDue === 0 ? "Cortesía" : formatMoney(shippingDue, "COP", trm)}`,
      `*Total: ${formatMoney(total, "COP", trm)}*`,
      "",
      `Cliente: ${form.customer_name} (${form.customer_phone})`,
      form.recipient_name ? `Recibe: ${form.recipient_name}` : "",
      `Dirección: ${form.address}, ${form.city}`,
      form.delivery_date ? `Fecha: ${form.delivery_date} · ${form.delivery_slot}` : "",
      form.dedication ? `Dedicatoria: ${form.dedication}` : "",
      form.notes ? `Notas: ${form.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    clear();
    toast.success(`Pedido ${orderNumber} registrado. Te llevamos a WhatsApp.`);
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, "_blank");
  };

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
            <p className="font-display text-2xl text-muted-foreground">Tu carrito está vacío.</p>
            <Link
              to="/catalogo"
              className="mt-6 inline-block bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase"
            >
              Ver catálogo
            </Link>
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

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-primary py-4 text-[11px] tracking-[0.28em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "Registrando…" : "Confirmar y enviar por WhatsApp"}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Coordinamos el pago (transferencia o link seguro) directamente por WhatsApp.
              </p>
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
