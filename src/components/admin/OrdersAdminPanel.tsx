import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, MapPin, MessageCircle, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ordersQuery, type Order } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { formatDeliveryDate } from "@/lib/delivery";
import { orderPaymentState, orderStatusLabel, type PaymentState } from "@/components/OrderPaymentPanel";

// "pagado", "pago_rechazado" y "anulado" los escribe el webhook de Bold.
const STATUSES = ["nuevo", "pagado", "pago_rechazado", "confirmado", "en preparación", "en ruta", "entregado", "cancelado", "anulado"];

type AdminOrder = Order & {
  payment_status?: string | null;
  payment_transaction_id?: string | null;
  payment_updated_at?: string | null;
};

type Filter = "todos" | "por_atender" | "en_proceso" | "entregados" | "sin_pagar";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "por_atender", label: "Pagados por atender" },
  { key: "en_proceso", label: "En proceso" },
  { key: "entregados", label: "Entregados" },
  { key: "sin_pagar", label: "Sin pagar" },
];

function matchesFilter(o: AdminOrder, f: Filter) {
  const state = orderPaymentState(o);
  const status = (o.status ?? "").toLowerCase();
  switch (f) {
    case "por_atender":
      return state === "paid" && (status === "pagado" || status === "confirmado");
    case "en_proceso":
      return ["en preparación", "en preparacion", "en ruta"].includes(status);
    case "entregados":
      return status === "entregado";
    case "sin_pagar":
      return state === "pending" || state === "failed";
    default:
      return true;
  }
}

const badge: Record<PaymentState, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  failed: "border-red-200 bg-red-50 text-red-800",
  cancelled: "border-border bg-secondary text-muted-foreground",
};

export default function OrdersAdminPanel() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    ...ordersQuery,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
  const orders = (data ?? []) as AdminOrder[];
  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recientes" | "entrega">("recientes");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const removeOrders = async (ids: string[], label: string) => {
    if (!ids.length) return;
    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("orders").delete().in("id", ids);
    if (error) {
      toast.error(`No se pudo eliminar: ${error.message}`);
      return;
    }
    setSelected(new Set());
    toast.success(ids.length === 1 ? "Pedido eliminado" : `${ids.length} pedidos eliminados`);
    await qc.invalidateQueries({ queryKey: ordersQuery.queryKey });
  };

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todos: orders.length, por_atender: 0, en_proceso: 0, entregados: 0, sin_pagar: 0 };
    for (const o of orders) for (const f of FILTERS) if (f.key !== "todos" && matchesFilter(o, f.key)) c[f.key] += 1;
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (!matchesFilter(o, filter)) return false;
      if (!q) return true;
      return [o.order_number, o.customer_name, o.customer_phone, o.recipient_name, o.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    if (sort === "entrega") {
      list.sort((a, b) => `${a.delivery_date ?? "9999"} ${a.delivery_slot ?? ""}`.localeCompare(`${b.delivery_date ?? "9999"} ${b.delivery_slot ?? ""}`));
    }
    return list;
  }, [orders, filter, search, sort]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(`No se pudo actualizar: ${error.message}`);
      return;
    }
    toast.success("Estado actualizado");
    await qc.invalidateQueries({ queryKey: ordersQuery.queryKey });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando pedidos…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pedidos</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Se actualiza solo cada 20 segundos
            {dataUpdatedAt ? ` · última lectura ${new Date(dataUpdatedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:border-primary"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`border px-4 py-2 text-[10px] tracking-[0.18em] uppercase ${
              filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/60"
            }`}
          >
            {f.label} <span className="ml-1 opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="relative block w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente o teléfono…"
            className="w-full border border-input bg-transparent py-3 pr-4 pl-10 text-sm outline-none focus:border-primary"
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "recientes" | "entrega")}
          className="border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        >
          <option value="recientes">Más recientes primero</option>
          <option value="entrega">Por fecha de entrega</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map((o) => o.id)))}
          className="border border-border px-4 py-2 text-[10px] tracking-[0.18em] uppercase hover:border-primary"
        >
          {selected.size === visible.length && visible.length > 0 ? "Quitar selección" : `Seleccionar los ${visible.length} visibles`}
        </button>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => void removeOrders([...selected], `${selected.size} pedido(s) seleccionados`)}
            className="inline-flex items-center gap-2 border border-red-300 bg-red-50 px-4 py-2 text-[10px] tracking-[0.18em] text-red-700 uppercase hover:bg-red-100"
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar seleccionados ({selected.size})
          </button>
        )}
        {counts.sin_pagar > 0 && (
          <button
            type="button"
            onClick={() => void removeOrders(orders.filter((o) => matchesFilter(o, "sin_pagar")).map((o) => o.id), `todos los pedidos sin pagar (${counts.sin_pagar})`)}
            className="ml-auto border border-border px-4 py-2 text-[10px] tracking-[0.18em] text-muted-foreground uppercase hover:border-red-300 hover:text-red-700"
          >
            Eliminar todos los sin pagar ({counts.sin_pagar})
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No hay pedidos con esos filtros.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {visible.map((o) => {
            const state = orderPaymentState(o);
            const options = STATUSES.includes(o.status) ? STATUSES : [o.status, ...STATUSES];
            const phoneDigits = (o.customer_phone ?? "").replace(/\D/g, "");
            const waPhone = phoneDigits.length === 10 ? `57${phoneDigits}` : phoneDigits;
            return (
              <article key={o.id} className={`border bg-white/60 p-5 md:p-6 ${selected.has(o.id) ? "border-primary" : "border-border"}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Seleccionar ${o.order_number}`} className="h-4 w-4 accent-[var(--primary)]" />
                      <p className="font-display text-xl text-primary">{o.order_number}</p>
                      <span className={`rounded-full border px-3 py-1 text-[9px] tracking-[0.14em] uppercase ${badge[state]}`}>
                        {state === "paid" ? "Pago confirmado" : state === "failed" ? "Pago fallido" : state === "cancelled" ? "Cancelado" : "Sin pagar"}
                      </span>
                      <span className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{orderStatusLabel(o)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                      {o.payment_transaction_id ? ` · Transacción Bold ${o.payment_transaction_id}` : ""}
                      {o.payment_status ? ` · Bold: ${o.payment_status}` : ""}
                    </p>
                    <p className="mt-3 text-sm">
                      {o.customer_name} · {o.customer_phone}
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-3 inline-flex items-center gap-1 text-xs text-[#128C7E] underline-offset-2 hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      )}
                    </p>
                    {o.recipient_name && <p className="text-sm text-muted-foreground">Recibe: {o.recipient_name}</p>}
                  </div>

                  <div className="text-right">
                    <p className="font-display text-2xl">{formatMoney(Number(o.total_cop), "COP", 1)}</p>
                    <select
                      value={o.status}
                      onChange={(e) => void updateStatus(o.id, e.target.value)}
                      className="mt-2 border border-input bg-card px-3 py-2 text-xs"
                      aria-label="Estado del pedido"
                    >
                      {options.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void removeOrders([o.id], `el pedido ${o.order_number}`)}
                      className="mt-2 ml-2 inline-flex items-center gap-1.5 border border-border px-3 py-2 text-[10px] tracking-[0.14em] text-muted-foreground uppercase hover:border-red-300 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-xl bg-secondary/40 p-4 text-sm sm:grid-cols-2">
                  <p className="flex items-start gap-2">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <strong className="font-medium">Entrega:</strong> {o.delivery_date ? formatDeliveryDate(o.delivery_date) : "sin fecha"}
                      {o.delivery_slot ? ` · ${o.delivery_slot}` : ""}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {o.address}, {o.city}
                    </span>
                  </p>
                </div>

                <ul className="mt-4 space-y-2">
                  {(o.items ?? []).map((it, i) => (
                    <li key={`${it.product_id}-${i}`} className="flex items-center gap-3 text-sm">
                      <img src={it.image || "/img/prod-01.jpg"} alt={it.name} loading="lazy" className="h-12 w-10 rounded object-cover" />
                      <span>
                        {it.qty} × {it.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {o.dedication && <p className="mt-3 text-sm italic text-muted-foreground">“{o.dedication}”</p>}
                {o.notes && <p className="mt-1 text-xs text-muted-foreground">Notas: {o.notes}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
