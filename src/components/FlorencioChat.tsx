import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Send, ShoppingBag, Sparkles, X } from "lucide-react";
import { productsQuery, categoriesQuery, settingsQuery, type Product } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator } from "@/lib/i18n";
import {
  describeFlorencioFilters,
  parseFlorencioFilters,
  rankFlorencioProducts,
  type FlorencioFilters,
} from "@/lib/florencio-recommendations";
import { askFlorencioAI } from "@/lib/florencio-ai";

const FLORENCIO_IMAGE = "/img/florencio.png";
const QUICK_PROMPTS = [
  "Regalo para mi pareja",
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

function FlorencioAvatar({ small = false }: { small?: boolean }) {
  return (
    <span className={`florencio-avatar ${small ? "florencio-avatar-sm" : ""}`} aria-hidden="true">
      <img src={FLORENCIO_IMAGE} alt="" />
    </span>
  );
}

function ProductMiniCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const tc = useContentTranslator([product.name]);
  const trm = Number((settings as Record<string, string> | undefined)?.["trm_cop_usd"] ?? 3950);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2.5 p-2.5 sm:grid-cols-[82px_1fr] sm:gap-3">
        <img src={product.images?.[0] ?? "/img/prod-01.jpg"} alt={tc(product.name)} className="h-[76px] w-full rounded-xl object-cover sm:h-24" />
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

function mergeLocalFilters(current: FlorencioFilters, parsed: FlorencioFilters): FlorencioFilters {
  return {
    recipient: parsed.recipient ?? current.recipient,
    occasion: parsed.occasion ?? current.occasion,
    style: parsed.style ?? current.style,
    color: parsed.color ?? current.color,
    budgetMax: parsed.budgetMax ?? current.budgetMax,
    keywords: Array.from(new Set([...current.keywords, ...parsed.keywords])).slice(0, 16),
  };
}

function localReply(filters: FlorencioFilters) {
  const parts = describeFlorencioFilters(filters);
  if (parts.length) {
    return `Perfecto. ${parts.join(" · ")}. Ya estoy cruzando eso con el catálogo real de Deluxury y te muestro las opciones que mejor encajan.`;
  }
  return "Claro. Puedo ayudarte usando el catálogo real de Deluxury. Dime para quién es el regalo, la ocasión o tu presupuesto.";
}

export default function FlorencioChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [filters, setFilters] = useState<FlorencioFilters>({ keywords: [] });
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState<"ia" | "catalogo">("ia");
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
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
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
      { id: nextId.current++, role: "florencio", text: "¡Hola! Soy Florencio. Estoy aquí para ayudarte a encontrar el detalle perfecto." },
      { id: nextId.current++, role: "florencio", text: "Puedes contarme para quién es, qué ocasión tienes, qué estilo te gusta o cuánto quieres invertir." },
    ]);
  }, [open, messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, recommendations.length]);

  const applyLocalPrompt = (text: string) => {
    const parsed = parseFlorencioFilters(text);
    const merged = mergeLocalFilters(filters, parsed);
    setFilters(merged);
    setMode("catalogo");
    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text }, { id: nextId.current++, role: "florencio", text: localReply(merged) }]);
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text }]);
    setInput("");
    setThinking(true);

    try {
      const result = await askFlorencioAI({
        message: text,
        history: messages.slice(-8).map(({ role, text: messageText }) => ({ role, text: messageText })),
        currentFilters: filters,
      });
      const localParsed = parseFlorencioFilters(text);
      const merged: FlorencioFilters = mergeLocalFilters(
        filters,
        {
          recipient: result.filters.recipient ?? localParsed.recipient,
          occasion: result.filters.occasion ?? localParsed.occasion,
          style: result.filters.style ?? localParsed.style,
          color: result.filters.color ?? localParsed.color,
          budgetMax: result.filters.budgetMax ?? localParsed.budgetMax,
          keywords: Array.from(new Set([...(result.keywords ?? []), ...(result.filters.keywords ?? [])])),
        },
      );
      setFilters(merged);
      setMode("ia");
      setMessages((prev) => [...prev, { id: nextId.current++, role: "florencio", text: result.reply }]);
    } catch (error) {
      const parsed = parseFlorencioFilters(text);
      const merged = mergeLocalFilters(filters, parsed);
      setFilters(merged);
      setMode("catalogo");
      setMessages((prev) => [...prev, { id: nextId.current++, role: "florencio", text: localReply(merged) }]);
      console.warn("Florencio AI no disponible; usando modo catálogo.", error);
    } finally {
      setThinking(false);
    }
  };

  const addRecommended = (product: Product) => {
    add(product);
    window.dispatchEvent(new CustomEvent("florencio:product-selected", { detail: { name: product.name } }));
    setMessages((prev) => [...prev, { id: nextId.current++, role: "florencio", text: `Listo. Añadí ${product.name} a tu carrito. 🛒` }]);
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-[70] bg-foreground/15 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`fixed inset-x-2 bottom-2 z-[80] flex h-[min(780px,calc(100dvh-16px))] w-auto min-w-0 flex-col overflow-hidden rounded-[26px] border border-primary/20 bg-background/98 shadow-[0_30px_100px_-30px_rgba(0,0,0,.55)] backdrop-blur-xl transition-[opacity,transform] duration-300 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(720px,calc(100vh-24px))] sm:w-[430px] ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"}`} aria-hidden={!open}>
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-secondary/55 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <FlorencioAvatar />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-display text-lg sm:text-xl">Florencio</p>
                <span className="rounded-full border border-border px-2 py-0.5 text-[7px] tracking-[0.14em] text-muted-foreground uppercase">{mode === "ia" ? "IA" : "CATÁLOGO"}</span>
              </div>
              <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">Asistente Deluxury</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Cerrar chat" className="rounded-full border border-border p-2 hover:border-primary/50"><X className="h-4 w-4" /></button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3.5 py-4 sm:px-4 sm:py-5">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "florencio" ? (
                <div className="flex max-w-[92%] items-start gap-2.5">
                  <FlorencioAvatar small />
                  <p className="rounded-2xl rounded-bl-md border border-border bg-secondary/55 px-4 py-3 text-sm leading-relaxed">{message.text}</p>
                </div>
              ) : (
                <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">{message.text}</div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-2.5 px-1">
              <FlorencioAvatar small />
              <div className="florencio-thinking" aria-label="Florencio está pensando"><span /><span /><span /></div>
              <span className="text-xs text-muted-foreground">Florencio está pensando…</span>
            </div>
          )}

          {recommendations.length > 0 && messages.length > 1 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2 px-1 text-[9px] tracking-[0.18em] text-muted-foreground uppercase"><Sparkles className="h-3 w-3 text-primary" /> Mis recomendaciones</div>
              {recommendations.map((product) => <ProductMiniCard key={product.id} product={product} onAdd={addRecommended} />)}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-background px-3.5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4 sm:py-3 sm:pb-3">
          <div className="mb-2 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_PROMPTS.map((prompt) => <button key={prompt} onClick={() => void send(prompt)} disabled={thinking} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[9px] hover:border-primary/50 disabled:opacity-50">{prompt}</button>)}
          </div>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[8px] tracking-[0.12em] text-muted-foreground uppercase">{mode === "ia" ? "Asistente IA" : "Modo catálogo"}</span>
            {mode === "ia" && <button type="button" onClick={() => applyLocalPrompt(input || "Quiero una recomendación") } className="text-[8px] tracking-[0.12em] text-primary uppercase">Buscar sin IA</button>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-secondary/35 p-1.5 focus-within:border-primary/50">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escríbele a Florencio…" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
            <button type="submit" aria-label="Enviar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40" disabled={!input.trim() || thinking}><Send className="h-4 w-4" /></button>
          </form>
          <p className="mt-2 text-center text-[8px] tracking-[0.1em] text-muted-foreground uppercase"><Bot className="mr-1 inline h-3 w-3" /> Productos y recomendaciones del catálogo real</p>
        </div>
      </aside>
    </>
  );
}
