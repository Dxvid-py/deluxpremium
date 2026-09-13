import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Send, ShoppingBag, Sparkles, X } from "lucide-react";
import { productsQuery, categoriesQuery, settingsQuery, type Product } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator } from "@/lib/i18n";
import { describeFlorencioFilters, parseFlorencioFilters, rankFlorencioProducts, type FlorencioFilters } from "@/lib/florencio-recommendations";

const QUICK_PROMPTS = [
  "Quiero un regalo para mi pareja",
  "Algo para un cumpleaños",
  "Quiero algo elegante",
  "Tengo máximo $200.000",
];

type Message = {
  id: number;
  role: "florencio" | "user";
  text: string;
  products?: Product[];
};

function ProductMiniCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const tc = useContentTranslator([product.name]);
  const trm = Number((settings as Record<string, string> | undefined)?.["trm_cop_usd"] ?? 3950);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="grid grid-cols-[82px_1fr] gap-3 p-2.5">
        <img src={product.images?.[0] ?? "/img/prod-01.jpg"} alt={tc(product.name)} className="h-24 w-full rounded-xl object-cover" />
        <div className="min-w-0 py-1">
          <p className="font-display text-lg leading-tight">{tc(product.name)}</p>
          <p className="mt-1 text-xs text-primary">{formatMoney(Number(product.price_cop), currency, trm)}</p>
          <div className="mt-2 flex gap-1.5">
            <Link to="/producto/$slug" params={{ slug: product.slug }} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-[9px] tracking-[0.12em] uppercase">
              Ver <ArrowRight className="h-3 w-3" />
            </Link>
            <button onClick={() => onAdd(product)} className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1.5 text-[9px] tracking-[0.1em] text-primary-foreground uppercase">
              <ShoppingBag className="h-3 w-3" /> Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FlorencioChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [filters, setFilters] = useState<FlorencioFilters>({ keywords: [] });
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { add } = useStore();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);

  const recommendations = useMemo(
    () => rankFlorencioProducts(products, categories, filters, 3),
    [products, categories, filters],
  );

  useEffect(() => {
    const openChat = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("florencio:open-chat", openChat);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("florencio:open-chat", openChat);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open || messages.length) return;
    setMessages([
      { id: nextId.current++, role: "florencio", text: "¡Hola! Soy Florencio 🧸✨ Estoy aquí para ayudarte a encontrar un detalle que se sienta perfecto." },
      { id: nextId.current++, role: "florencio", text: "Cuéntame para quién es, qué ocasión tienes y cuánto quieres invertir. Si no sabes exactamente qué buscas, yo te guío." },
    ]);
  }, [open, messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const nextFilters = parseFlorencioFilters(text);
    const merged: FlorencioFilters = {
      recipient: nextFilters.recipient ?? filters.recipient,
      occasion: nextFilters.occasion ?? filters.occasion,
      style: nextFilters.style ?? filters.style,
      color: nextFilters.color ?? filters.color,
      budgetMax: nextFilters.budgetMax ?? filters.budgetMax,
      keywords: Array.from(new Set([...filters.keywords, ...nextFilters.keywords])).slice(0, 12),
    };
    setFilters(merged);
    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text }]);
    setInput("");

    const parts = describeFlorencioFilters(merged);
    const reply = parts.length
      ? `Perfecto. Ya voy entendiendo: ${parts.join(" · ")}. Déjame cruzarlo con las piezas disponibles en nuestro catálogo. 🌷`
      : "Perfecto. Voy a tomar eso como punto de partida y buscar coincidencias dentro del catálogo real de Deluxury. ✨";
    window.setTimeout(() => setMessages((prev) => [...prev, { id: nextId.current++, role: "florencio", text: reply }]), 220);
  };

  const addRecommended = (product: Product) => {
    add(product);
    window.dispatchEvent(new CustomEvent("florencio:product-selected", { detail: { name: product.name } }));
    setMessages((prev) => [...prev, { id: nextId.current++, role: "florencio", text: `¡Listo! Añadí ${product.name} a tu carrito. 🛒 Si quieres, también puedo ayudarte a completar el detalle.` }]);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <aside
        className={`fixed right-3 bottom-3 z-[80] flex h-[min(720px,calc(100vh-24px))] w-[min(430px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px] border border-primary/20 bg-background/98 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-500 sm:right-6 sm:bottom-6 ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"}`}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-border bg-secondary/55 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xl">🧸</div>
            <div>
              <p className="font-display text-xl">Florencio</p>
              <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">Asistente Deluxury</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Cerrar chat" className="rounded-full border border-border p-2 hover:border-primary/50"><X className="h-4 w-4" /></button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] ${message.role === "user" ? "rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground" : "space-y-2"}`}>
                {message.role === "florencio" && (
                  <div className="flex items-start gap-2">
                    <span className="mt-1 text-sm">🧸</span>
                    <p className="rounded-2xl rounded-bl-md border border-border bg-secondary/55 px-4 py-3 text-sm leading-relaxed">{message.text}</p>
                  </div>
                )}
                {message.role === "user" && <p className="text-sm leading-relaxed">{message.text}</p>}
              </div>
            </div>
          ))}

          {recommendations.length > 0 && messages.length > 1 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2 px-1 text-[9px] tracking-[0.18em] text-muted-foreground uppercase"><Sparkles className="h-3 w-3 text-primary" /> Mis recomendaciones</div>
              {recommendations.map((product) => (
                <ProductMiniCard key={product.id} product={product} onAdd={addRecommended} />
              ))}
            </div>
          )}

          {products.length === 0 && messages.length > 1 && (
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">Estoy intentando conectar con el catálogo de Deluxury. Cuando Supabase tenga productos disponibles, aquí aparecerán recomendaciones reales.</div>
          )}
        </div>

        <div className="border-t border-border bg-background px-4 py-3">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map((prompt) => <button key={prompt} onClick={() => send(prompt)} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[9px] tracking-[0.05em] hover:border-primary/50">{prompt}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/35 p-1.5 focus-within:border-primary/50">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escríbele a Florencio…" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
            <button type="submit" aria-label="Enviar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40" disabled={!input.trim()}><Send className="h-4 w-4" /></button>
          </form>
          <p className="mt-2 text-center text-[8px] tracking-[0.1em] text-muted-foreground uppercase"><Bot className="mr-1 inline h-3 w-3" /> Recomendaciones basadas en el catálogo real</p>
        </div>
      </aside>
    </>
  );
}
