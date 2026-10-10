import { CalendarClock, Check, MapPin, MessageCircle, User } from "lucide-react";
import OrderPaymentPanel, { orderPaymentState, orderStatusLabel, PROGRESS_STEPS, type PaymentOrder } from "@/components/OrderPaymentPanel";
import { formatDeliveryDate } from "@/lib/delivery";
import { formatMoney } from "@/lib/format";
import { DEFAULT_WHATSAPP, openWhatsApp } from "@/lib/florencio-support";

export type OrderCardData = PaymentOrder & {
  id: string;
  total_cop: number;
  created_at: string;
  delivery_date?: string | null;
  delivery_slot?: string | null;
  recipient_name?: string | null;
  items: Array<{ product_id: string; name: string; image?: string; qty: number; price_cop: number }>;
};

const STEP_LABELS = ["Pago confirmado", "Confirmado", "En preparación", "En ruta", "Entregado"];

function pillClass(state: ReturnType<typeof orderPaymentState>) {
  if (state === "paid") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (state === "failed") return "bg-red-50 text-red-800 border-red-200";
  if (state === "cancelled") return "bg-secondary text-muted-foreground border-border";
  return "bg-amber-50 text-amber-900 border-amber-200";
}

export function orderWhatsAppMessage(order: OrderCardData) {
  const when = order.delivery_date ? `${formatDeliveryDate(order.delivery_date)}${order.delivery_slot ? ` · ${order.delivery_slot}` : ""}` : "por coordinar";
  return [
    `Hola, Deluxury. Quisiera saber cómo va mi pedido ${order.order_number}.`,
    `Entrega programada: ${when}.`,
    order.customer_name ? `A nombre de: ${order.customer_name}.` : "",
    "¡Gracias!",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function OrderCard({
  order,
  whatsapp,
  onChanged,
}: {
  order: OrderCardData;
  whatsapp?: string | undefined;
  onChanged?: () => void;
}) {
  const state = orderPaymentState(order);
  const paid = state === "paid";
  const current = Math.max(0, PROGRESS_STEPS.indexOf((order.status || "").toLowerCase()));
  const created = new Date(order.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_55px_-42px_rgba(62,37,20,.4)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-[#fbf6ed] px-5 py-4 sm:px-6">
        <div>
          <p className="text-[9px] tracking-[0.22em] text-muted-foreground uppercase">Pedido</p>
          <p className="mt-0.5 font-display text-xl">{order.order_number}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Realizado el {created}</p>
        </div>
        <span className={`rounded-full border px-3.5 py-1.5 text-[9px] tracking-[0.16em] uppercase ${pillClass(state)}`}>
          {orderStatusLabel(order)}
        </span>
      </header>

      <div className="px-5 py-5 sm:px-6">
        {paid ? (
          <div>
            <ol className="flex items-start">
              {STEP_LABELS.map((label, i) => {
                const done = i <= current;
                return (
                  <li key={label} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
                    {i > 0 && (
                      <span className={`absolute top-3 right-1/2 h-px w-full ${i <= current ? "bg-primary" : "bg-border"}`} aria-hidden="true" />
                    )}
                    <span
                      className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${
                        done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className={`mt-2 px-0.5 text-[9px] leading-tight sm:text-[10px] ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 rounded-xl bg-emerald-50/70 px-4 py-3 text-xs leading-relaxed text-emerald-900">
              Tu pago está confirmado y tu pedido ya está en manos del atelier. Si necesitas algo, escríbenos con el botón de abajo.
            </p>
          </div>
        ) : (
          <OrderPaymentPanel order={order} {...(onChanged ? { onChanged } : {})} />
        )}

        <ul className="mt-6 divide-y divide-border/70">
          {(order.items ?? []).map((item, i) => (
            <li key={`${item.product_id}-${i}`} className="flex items-center gap-4 py-3">
              <img
                src={item.image || "/img/prod-01.jpg"}
                alt={item.name}
                loading="lazy"
                className="h-16 w-14 shrink-0 rounded-lg border border-border/60 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg leading-tight">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.qty} × {formatMoney(Number(item.price_cop), "COP", 1)}
                </p>
              </div>
              <p className="shrink-0 text-sm">{formatMoney(Number(item.price_cop) * item.qty, "COP", 1)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 grid gap-4 border-t border-border/70 pt-5 text-sm sm:grid-cols-3">
          <div className="flex gap-2.5">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">Entrega</dt>
              <dd className="mt-1 leading-snug">
                {order.delivery_date ? formatDeliveryDate(order.delivery_date) : "Por coordinar"}
                {order.delivery_slot ? <span className="block text-xs text-muted-foreground">{order.delivery_slot}</span> : null}
              </dd>
            </div>
          </div>
          <div className="flex gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">Dirección</dt>
              <dd className="mt-1 leading-snug break-words">
                {order.address || "Por coordinar"}
                {order.city ? <span className="block text-xs text-muted-foreground">{order.city}</span> : null}
              </dd>
            </div>
          </div>
          <div className="flex gap-2.5">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">Recibe</dt>
              <dd className="mt-1 leading-snug break-words">{order.recipient_name || order.customer_name || "—"}</dd>
            </div>
          </div>
        </dl>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-secondary/20 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">Total</p>
          <p className="font-display text-2xl text-primary">{formatMoney(Number(order.total_cop), "COP", 1)}</p>
        </div>
        <button
          type="button"
          onClick={() => openWhatsApp(whatsapp ?? DEFAULT_WHATSAPP, orderWhatsAppMessage(order))}
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-[10px] tracking-[0.16em] text-white uppercase shadow-sm transition hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Preguntar por mi pedido
        </button>
      </footer>
    </article>
  );
}
