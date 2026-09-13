import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";
import { ordersQuery, type Order } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";

type AdminCustomer = { key: string; id: string | null; user_id: string | null; full_name: string | null; phone: string | null; email: string | null; addressCount: number };

async function loadCustomers(): Promise<AdminCustomer[]> {
  const [profilesRes, addressesRes, ordersRes] = await Promise.all([
    supabase.from("profiles").select("id,user_id,full_name,phone,email").order("full_name", { ascending: true }),
    supabase.from("customer_addresses").select("user_id"),
    supabase.from("orders").select("user_id,customer_name,customer_phone,customer_email"),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (ordersRes.error) throw ordersRes.error;

  const addressCount = new Map<string, number>();
  for (const row of (addressesRes.data ?? []) as { user_id: string }[]) addressCount.set(row.user_id, (addressCount.get(row.user_id) ?? 0) + 1);

  const map = new Map<string, AdminCustomer>();
  for (const profile of (profilesRes.data ?? []) as { id: string; user_id: string; full_name: string | null; phone: string | null; email: string | null }[]) {
    map.set(`user:${profile.user_id}`, { key: `user:${profile.user_id}`, id: profile.id, user_id: profile.user_id, full_name: profile.full_name, phone: profile.phone, email: profile.email, addressCount: addressCount.get(profile.user_id) ?? 0 });
  }

  for (const order of (ordersRes.data ?? []) as { user_id: string | null; customer_name: string | null; customer_phone: string | null; customer_email: string | null }[]) {
    if (order.user_id) continue;
    const identity = (order.customer_email || order.customer_phone || order.customer_name || "guest").trim().toLocaleLowerCase();
    const key = `guest:${identity}`;
    if (!map.has(key)) map.set(key, { key, id: null, user_id: null, full_name: order.customer_name, phone: order.customer_phone, email: order.customer_email, addressCount: 0 });
  }

  return Array.from(map.values()).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "es"));
}

function orderStats(orders: Order[]) {
  const map = new Map<string, { count: number; total: number; last: string | null }>();
  for (const order of orders) {
    if (!order.user_id) continue;
    const current = map.get(order.user_id) ?? { count: 0, total: 0, last: null };
    current.count += 1;
    current.total += Number(order.total_cop || 0);
    if (!current.last || new Date(order.created_at).getTime() > new Date(current.last).getTime()) current.last = order.created_at;
    map.set(order.user_id, current);
  }
  return map;
}

export default function CustomersPanel() {
  const { data: customers, isLoading, error } = useQuery({ queryKey: ["admin-customers"], queryFn: loadCustomers });
  const { data: orders = [] } = useQuery(ordersQuery);
  const [search, setSearch] = useState("");
  const stats = useMemo(() => orderStats(orders), [orders]);
  if (error) return <p className="text-sm text-muted-foreground">No se pudo cargar la base de clientes. Ejecuta las políticas RLS del archivo SQL de esta actualización.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando clientes…</p>;
  const needle = search.trim().toLocaleLowerCase();
  const list = (customers ?? []).filter((c) => !needle || [c.full_name, c.email, c.phone].filter(Boolean).join(" ").toLocaleLowerCase().includes(needle));
  const associatedOrders = orders.filter((o) => !!o.customer_email || !!o.customer_phone || !!o.customer_name);
  const totalSales = associatedOrders.reduce((sum, o) => sum + Number(o.total_cop || 0), 0);

  return (
    <div>
      <div className="flex flex-col gap-4 border border-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="eyebrow">CRM básico</p><h2 className="mt-2 font-display text-3xl">Clientes</h2><p className="mt-2 text-sm text-muted-foreground">Perfiles reales de Supabase + resumen de compras.</p></div>
        <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border border-input bg-transparent py-3 pr-3 pl-10 text-sm outline-none focus:border-primary" placeholder="Buscar cliente…" /></div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="surface-glass p-5"><p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Clientes registrados</p><p className="mt-2 font-display text-3xl">{customers?.length ?? 0}</p></div>
        <div className="surface-glass p-5"><p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Pedidos asociados</p><p className="mt-2 font-display text-3xl">{associatedOrders.length}</p></div>
        <div className="surface-glass p-5"><p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Ventas asociadas</p><p className="mt-2 font-display text-2xl">{formatMoney(totalSales, "COP", 1)}</p></div>
      </div>
      <div className="mt-6 space-y-3">
        {list.map((customer) => {
          const stat = customer.user_id ? (stats.get(customer.user_id) ?? { count: 0, total: 0, last: null }) : (orders.reduce((acc, order) => {
            const same = (order.user_id == null) && ((customer.email && order.customer_email === customer.email) || (customer.phone && order.customer_phone === customer.phone));
            if (same) { acc.count += 1; acc.total += Number(order.total_cop || 0); if (!acc.last || new Date(order.created_at).getTime() > new Date(acc.last).getTime()) acc.last = order.created_at; }
            return acc;
          }, { count: 0, total: 0, last: null as string | null }));
          return <article key={customer.key} className="flex min-w-0 flex-col gap-4 border border-border p-5 md:flex-row md:items-center"><div className="flex min-w-0 items-center gap-4 md:w-[34%]"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><h3 className="truncate font-display text-xl">{customer.full_name || "Cliente sin nombre"}</h3><p className="truncate text-sm text-muted-foreground">{customer.email || "Sin correo"}</p><p className="text-xs text-muted-foreground">{customer.phone || "Sin teléfono"}</p></div></div><div className="grid min-w-0 grid-cols-2 gap-3 text-sm sm:grid-cols-4 md:flex-1"><div><p className="text-[9px] tracking-[0.16em] text-muted-foreground uppercase">Pedidos</p><p className="mt-1 font-medium">{stat.count}</p></div><div><p className="text-[9px] tracking-[0.16em] text-muted-foreground uppercase">Compras</p><p className="mt-1 font-medium">{formatMoney(stat.total, "COP", 1)}</p></div><div><p className="text-[9px] tracking-[0.16em] text-muted-foreground uppercase">Direcciones</p><p className="mt-1 font-medium">{customer.addressCount}</p></div><div><p className="text-[9px] tracking-[0.16em] text-muted-foreground uppercase">Último pedido</p><p className="mt-1 font-medium">{stat.last ? new Date(stat.last).toLocaleDateString("es-CO") : "—"}</p></div></div></article>;
        })}
        {list.length === 0 && <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay clientes que coincidan con la búsqueda.</p>}
      </div>
    </div>
  );
}
