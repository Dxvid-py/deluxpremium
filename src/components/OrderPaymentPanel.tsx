import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getBoldPaymentStatus, openBoldCheckout, prepareBoldPayment } from "@/lib/bold-payment";

/**
 * El estado del pago NO lo decide el navegador: lo escribe el webhook de Bold
 * (`bold-webhook`) en `orders.payment_status` / `orders.status`.
 * Este panel solo lee ese resultado y, si el pedido no quedó pagado,
 * le pide al cliente que confirme o pague de nuevo.
 */

export type PaymentOrder = {
  order_number: string;
  status: string;
  payment_status?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  address?: string | null;
  city?: string | null;
};

export type PaymentState = "paid" | "failed" | "pending" | "cancelled";

const PAID_STATUSES = ["pagado", "confirmado", "en preparación", "en preparacion", "en ruta", "entregado"];
const FAILED_PAYMENT = ["rejected", "failed", "void_rejected"];

export function orderPaymentState(order: Pick<PaymentOrder, "status" | "payment_status">): PaymentState {
  const payment = (order.payment_status ?? "").toLowerCase();
  const status = (order.status ?? "").toLowerCase();
  if (payment === "approved" || PAID_STATUSES.includes(status)) return "paid";
  if (status === "cancelado" || status === "anulado" || payment === "voided") return "cancelled";
  if (FAILED_PAYMENT.includes(payment) || status === "pago_rechazado") return "failed";
  return "pending";
}

export function orderStatusLabel(order: Pick<PaymentOrder, "status" | "payment_status">): string {
  const state = orderPaymentState(order);
  if (state === "failed") return "Pago no completado";
  if (state === "pending") return "Pago pendiente";
  if (state === "cancelled") return "Cancelado";
  const status = (order.status ?? "").toLowerCase();
  return status === "pagado" ? "Pago confirmado" : order.status;
}

/** Pasos que se muestran en la línea de progreso, una vez el pedido está pagado. */
export const PROGRESS_STEPS = ["pagado", "confirmado", "en preparación", "en ruta", "entregado"];

export default function OrderPaymentPanel({ order, onChanged }: { order: PaymentOrder; onChanged?: () => void }) {
  const [busy, setBusy] = useState<"check" | "pay" | null>(null);
  const state = orderPaymentState(order);

  if (state === "paid") {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> Pago confirmado por Bold. Tu pedido está en manos del atelier.
      </div>
    );
  }
  if (state === "cancelled") return null;

  const failed = state === "failed";

  const check = async () => {
    setBusy("check");
    try {
      const result = await getBoldPaymentStatus(order.order_number);
      const payment = result.paymentStatus.toLowerCase();
      if (payment === "approved") {
        toast.success("¡Pago confirmado! Gracias por tu compra.");
      } else if (!result.found) {
        toast.info("Aún no vemos un pago para este pedido. Puedes pagarlo ahora.");
      } else {
        toast.info("El pago todavía no aparece como aprobado.");
      }
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error("No pudimos verificar el pago. Inténtalo de nuevo en un momento.");
    } finally {
      setBusy(null);
    }
  };

  const pay = async () => {
    setBusy("pay");
    try {
      const callbackUrl = `${window.location.origin}/checkout`;
      const payment = await prepareBoldPayment(order.order_number, callbackUrl);
      await openBoldCheckout({
        payment,
        callbackUrl,
        customer: { name: order.customer_name ?? "", phone: order.customer_phone ?? "", email: order.customer_email ?? null },
        address: { address: order.address ?? "", city: order.city ?? "Barranquilla", country: "CO" },
      });
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error && error.message ? error.message : "No pudimos abrir el pago. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`mt-5 rounded-2xl border p-4 ${failed ? "border-red-200 bg-red-50/70" : "border-amber-200 bg-amber-50/70"}`}>
      <div className={`flex items-start gap-2.5 text-sm ${failed ? "text-red-800" : "text-amber-900"}`}>
        {failed ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock className="mt-0.5 h-4 w-4 shrink-0" />}
        <p className="leading-relaxed">
          {failed
            ? "Tu pago no se completó, así que tu pedido todavía no está confirmado. Puedes volver a confirmarlo o pagar de nuevo."
            : "Aún no recibimos la confirmación de tu pago, por eso tu pedido no está confirmado. Si ya pagaste, confírmalo; si no, puedes pagar ahora."}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void check()}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-[9px] tracking-[.14em] uppercase transition hover:border-primary disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy === "check" ? "animate-spin" : ""}`} />
          {busy === "check" ? "Verificando…" : "Confirmar mi pago"}
        </button>
        <button
          type="button"
          onClick={() => void pay()}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[9px] tracking-[.14em] text-primary-foreground uppercase transition hover:opacity-90 disabled:opacity-50"
        >
          <CreditCard className="h-3.5 w-3.5" />
          {busy === "pay" ? "Abriendo…" : failed ? "Pagar de nuevo" : "Pagar ahora"}
        </button>
      </div>
    </div>
  );
}
