import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Check, MapPin, MessageCircle, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import DeliveryPicker, { type DeliveryChoice } from "@/components/DeliveryPicker";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { getDeliveryConfig, isSlotAvailable } from "@/lib/delivery";
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
  const { data: settings } = useQuery(settingsQuery);
  const deliveryConfig = getDeliveryConfig(settings);
  const status = (order.status ?? "").toLowerCase();
  const canReschedule = ["nuevo", "pagado", "confirmado"].includes(status) && state !== "cancelled" && state !== "failed";
  const canDelete = state !== "paid"; // los pedidos pagados son un registro de compra: no se borran desde la cuenta
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<DeliveryChoice>(null);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const friendly = (message: string) =>
    /function .* does not exist|could not find the function|schema cache/i.test(message)
      ? "Falta activar esta función en la base de datos (migración order_self_service)."
      : message;

  const saveSchedule = async () => {
    if (!choice) {
      toast.error("Elige el día y la hora de entrega.");
      return;
    }
    if (!isSlotAvailable(choice.date, choice.slot, deliveryConfig)) {
      setChoice(null);
      toast.error("Ese horario ya no está disponible. Elige otro.");
      return;
    }
    setBusy("save");
    const { error } = await supabase.rpc("reschedule_my_order" as never, { p_order_id: order.id, p_date: choice.date, p_slot: choice.slot } as never);
    setBusy(null);
    if (error) {
      toast.error(friendly(error.message));
      return;
    }
    toast.success("Listo, actualizamos la fecha y hora de entrega.");
    setEditing(false);
    setChoice(null);
    onChanged?.();
  };

  const removeOrder = async () => {
    setBusy("delete");
    const { error } = await supabase.rpc("delete_my_order" as never, { p_order_id: order.id } as never);
    setBusy(null);
    if (error) {
      toast.error(friendly(error.message));
      return;
    }
    toast.success("Pedido eliminado.");
    onChanged?.();
  };
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

        {canReschedule && (
          <div className="mt-5">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2.5 text-[10px] tracking-[0.16em] text-primary uppercase transition hover:bg-primary/5"
              >
                <CalendarClock className="h-3.5 w-3.5" /> Cambiar fecha u hora de entrega
              </button>
            ) : (
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="mb-3 text-sm font-medium">Elige la nueva fecha y hora</p>
                <DeliveryPicker config={deliveryConfig} value={choice} onChange={setChoice} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveSchedule()}
                    disabled={busy !== null || !choice}
                    className="rounded-full bg-primary px-5 py-2.5 text-[10px] tracking-[0.16em] text-primary-foreground uppercase disabled:opacity-50"
                  >
                    {busy === "save" ? "Guardando…" : "Guardar cambio"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setChoice(null); }}
                    className="rounded-full border border-border px-5 py-2.5 text-[10px] tracking-[0.16em] uppercase"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-secondary/20 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">Total</p>
          <p className="font-display text-2xl text-primary">{formatMoney(Number(order.total_cop), "COP", 1)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {canDelete &&
          (confirmDelete ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] text-red-800">
              ¿Eliminar este pedido?
              <button type="button" onClick={() => void removeOrder()} disabled={busy !== null} className="rounded-full bg-red-600 px-3 py-1.5 tracking-[0.12em] text-white uppercase disabled:opacity-50">
                {busy === "delete" ? "…" : "Sí, eliminar"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="underline">No</button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-3 text-[10px] tracking-[0.16em] text-muted-foreground uppercase transition hover:border-red-300 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </button>
          ))}
        <button
          type="button"
          onClick={() => openWhatsApp(whatsapp ?? DEFAULT_WHATSAPP, orderWhatsAppMessage(order))}
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-[10px] tracking-[0.16em] text-white uppercase shadow-sm transition hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Preguntar por mi pedido
        </button>
        </div>
      </footer>
    </article>
  );
}
