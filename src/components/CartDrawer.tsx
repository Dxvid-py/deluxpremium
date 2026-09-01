import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { settingsQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";

export default function CartDrawer() {
  const { lines, subtotal, cartOpen, setCartOpen, setQty, remove, currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const shipping = Number(settings?.["shipping_cop"] ?? 18000);
  const freeFrom = Number(settings?.["free_shipping_from_cop"] ?? 350000);
  const shippingDue = subtotal >= freeFrom || subtotal === 0 ? 0 : shipping;

  return (
    <>
      <div
        onClick={() => setCartOpen(false)}
        className={`fixed inset-0 z-60 bg-background/70 backdrop-blur-sm transition-opacity duration-500 ${
          cartOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed top-0 right-0 z-70 flex h-full w-full max-w-md flex-col border-l border-border bg-card transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div>
            <p className="eyebrow">Tu selección</p>
            <h2 className="mt-1 font-display text-2xl">Carrito</h2>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            aria-label="Cerrar carrito"
            className="rounded-full border border-border p-2 hover:border-primary/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="hairline mx-6" />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-display text-xl text-muted-foreground">
                Aún no has elegido flores
              </p>
              <Link
                to="/catalogo"
                onClick={() => setCartOpen(false)}
                className="eyebrow mt-4 hover:text-cream"
              >
                Explorar catálogo
              </Link>
            </div>
          ) : (
            <ul className="space-y-5">
              {lines.map((l) => (
                <li key={l.product_id} className="flex gap-4">
                  <img
                    src={l.image}
                    alt={l.name}
                    loading="lazy"
                    className="h-24 w-20 rounded-sm object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-display text-lg leading-tight">{l.name}</p>
                    <p className="mt-1 text-sm text-primary">
                      {formatMoney(l.price_cop, currency, trm)}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-border">
                        <button
                          onClick={() => setQty(l.product_id, l.qty - 1)}
                          aria-label="Quitar una unidad"
                          className="px-2.5 py-1.5"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-6 text-center text-xs">{l.qty}</span>
                        <button
                          onClick={() => setQty(l.product_id, l.qty + 1)}
                          aria-label="Añadir una unidad"
                          className="px-2.5 py-1.5"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => remove(l.product_id)}
                        aria-label="Eliminar"
                        className="text-muted-foreground transition-colors hover:text-accent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-border px-6 py-6">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal, currency, trm)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Envío</span>
              <span>
                {shippingDue === 0 ? "Cortesía" : formatMoney(shippingDue, currency, trm)}
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="eyebrow">Total</span>
              <span className="font-display text-2xl text-primary">
                {formatMoney(subtotal + shippingDue, currency, trm)}
              </span>
            </div>
            <Link
              to="/checkout"
              onClick={() => setCartOpen(false)}
              className="mt-6 block w-full bg-primary py-4 text-center text-[11px] tracking-[0.28em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
            >
              Finalizar pedido
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
