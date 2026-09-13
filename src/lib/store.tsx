import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Currency } from "./format";
import type { Product } from "./queries";

export type CartLine = {
  product_id: string;
  name: string;
  slug: string;
  image: string;
  price_cop: number;
  qty: number;
};

type StoreValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (product: Product, qty?: number) => void;
  buyNow: (product: Product, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  deliveryWithFlorencio: boolean;
  setDeliveryWithFlorencio: (enabled: boolean) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const CART_KEY = "fdp-cart-v1";
const CURRENCY_KEY = "fdp-currency-v1";
const FLORENCIO_DELIVERY_KEY = "fdp-florencio-delivery-v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [currency, setCurrencyState] = useState<Currency>("COP");
  const [deliveryWithFlorencio, setDeliveryState] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
      const cur = localStorage.getItem(CURRENCY_KEY);
      if (cur === "USD" || cur === "COP") setCurrencyState(cur);
      setDeliveryState(localStorage.getItem(FLORENCIO_DELIVERY_KEY) === "1");
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* ignorar */
    }
  }, [lines]);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      /* ignorar */
    }
  }, []);

  const setDeliveryWithFlorencio = useCallback((enabled: boolean) => {
    setDeliveryState(enabled);
    try { localStorage.setItem(FLORENCIO_DELIVERY_KEY, enabled ? "1" : "0"); } catch {}
  }, []);

  const add = useCallback((product: Product, qty = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.product_id === product.id);
      if (found) {
        return prev.map((l) =>
          l.product_id === product.id ? { ...l, qty: Math.min(l.qty + qty, 20) } : l,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] ?? "",
          price_cop: Number(product.price_cop),
          qty,
        },
      ];
    });
    setCartOpen(true);
  }, []);

  const buyNow = useCallback((product: Product, qty = 1) => {
    setLines([{
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0] ?? "",
      price_cop: Number(product.price_cop),
      qty: Math.min(Math.max(1, qty), 20),
    }]);
    setCartOpen(false);
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.product_id !== productId));
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product_id !== productId)
        : prev.map((l) => (l.product_id === productId ? { ...l, qty: Math.min(qty, 20) } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<StoreValue>(() => {
    const count = lines.reduce((acc, l) => acc + l.qty, 0);
    const subtotal = lines.reduce((acc, l) => acc + l.qty * l.price_cop, 0);
    return {
      lines,
      count,
      subtotal,
      add,
      buyNow,
      remove,
      setQty,
      clear,
      cartOpen,
      setCartOpen,
      currency,
      setCurrency,
      deliveryWithFlorencio,
      setDeliveryWithFlorencio,
    };
  }, [lines, add, buyNow, remove, setQty, clear, cartOpen, currency, setCurrency, deliveryWithFlorencio, setDeliveryWithFlorencio]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
